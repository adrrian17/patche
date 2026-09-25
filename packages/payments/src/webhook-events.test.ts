import { describe, expect, test } from "bun:test";

import type { Stripe } from "./index";
import { processStripeEvent } from "./webhook-events";
import type { WebhookStore, WebhookTransaction } from "./webhook-events";

// Records the transaction calls the processor routes each event to. Idempotency
// and persistence are owned by the D1 store (apps/web payments.integration.ts).
class RecordingWebhookStore implements WebhookStore, WebhookTransaction {
  readonly calls: unknown[][] = [];

  createOrder(session: Stripe.Checkout.Session): Promise<void> {
    this.calls.push(["createOrder", session.id]);
    return Promise.resolve();
  }

  markPaymentFailed(
    paymentIntentId: string,
    reservationId: string | null
  ): Promise<void> {
    this.calls.push(["markPaymentFailed", paymentIntentId, reservationId]);
    return Promise.resolve();
  }

  markRefunded(paymentIntentId: string): Promise<void> {
    this.calls.push(["markRefunded", paymentIntentId]);
    return Promise.resolve();
  }

  releaseCheckoutSession(checkoutSessionId: string): Promise<void> {
    this.calls.push(["releaseCheckoutSession", checkoutSessionId]);
    return Promise.resolve();
  }

  async runOnce(
    _eventId: string,
    _eventType: string,
    effect: (transaction: WebhookTransaction) => Promise<void>
  ): Promise<boolean> {
    await effect(this);
    return true;
  }
}

function stripeEvent(
  type: string,
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- partial Stripe object fixture
  object: unknown
): Stripe.Event {
  // SAFETY: The processor only reads the fields supplied by these fixtures.
  // oxlint-disable-next-line anti-slop/no-chained-type-assertions -- minimal Stripe fixture
  return { data: { object }, id: "evt_test", type } as unknown as Stripe.Event;
}

describe("processStripeEvent", () => {
  test.each<{ event: Stripe.Event; expected: unknown[][]; name: string }>([
    {
      event: stripeEvent("charge.refunded", {
        payment_intent: "pi_test",
        refunded: true,
      }),
      expected: [["markRefunded", "pi_test"]],
      name: "a refunded Charge by Payment Intent id",
    },
    {
      event: stripeEvent("charge.refunded", {
        payment_intent: { id: "pi_expanded" },
        refunded: true,
      }),
      expected: [["markRefunded", "pi_expanded"]],
      name: "a refunded Charge with an expanded Payment Intent",
    },
    {
      event: stripeEvent("charge.refunded", {
        payment_intent: "pi_test",
        refunded: false,
      }),
      expected: [],
      name: "a partially refunded Charge to nothing",
    },
    {
      event: stripeEvent("checkout.session.expired", { id: "cs_expired" }),
      expected: [["releaseCheckoutSession", "cs_expired"]],
      name: "an expired Checkout Session to its reservation release",
    },
    {
      event: stripeEvent("payment_intent.payment_failed", {
        id: "pi_failed",
        metadata: { reservationId: "reservation_1" },
      }),
      expected: [["markPaymentFailed", "pi_failed", "reservation_1"]],
      name: "a failed Payment Intent with its reservation",
    },
  ])("routes $name", async ({ event, expected }) => {
    const store = new RecordingWebhookStore();

    expect(await processStripeEvent(event, store)).toBe("processed");
    expect(store.calls).toEqual(expected);
  });

  test("rejects a refunded Charge without a Payment Intent", async () => {
    const store = new RecordingWebhookStore();
    const event = stripeEvent("charge.refunded", {
      payment_intent: null,
      refunded: true,
    });

    await expect(processStripeEvent(event, store)).rejects.toThrow(
      "El reembolso no incluye Payment Intent"
    );
    expect(store.calls).toEqual([]);
  });
});
