import { describe, expect, test } from "bun:test";

import type { Stripe } from "./index";
import { processStripeEvent } from "./webhook-events";
import type { WebhookStore, WebhookTransaction } from "./webhook-events";

class MemoryWebhookStore implements WebhookStore, WebhookTransaction {
  readonly orders = new Map<string, "succeeded" | "failed" | "refunded">();
  readonly processedEvents = new Set<string>();
  checkoutEffects = 0;
  releasedReservations: string[] = [];
  releasedSessions = 0;

  createOrder(session: Stripe.Checkout.Session): Promise<void> {
    this.checkoutEffects += 1;
    const paymentIntentId = String(session.payment_intent);
    this.orders.set(
      paymentIntentId,
      session.payment_status === "paid" ? "succeeded" : "failed"
    );
    return Promise.resolve();
  }

  markPaymentFailed(
    paymentIntentId: string,
    reservationId: string | null
  ): Promise<void> {
    if (reservationId) {
      this.releasedReservations.push(reservationId);
    }
    if (this.orders.has(paymentIntentId)) {
      this.orders.set(paymentIntentId, "failed");
    }
    return Promise.resolve();
  }

  markRefunded(paymentIntentId: string): Promise<void> {
    if (!this.orders.has(paymentIntentId)) {
      return Promise.reject(new Error("Order pendiente"));
    }
    this.orders.set(paymentIntentId, "refunded");
    return Promise.resolve();
  }

  releaseCheckoutSession(_checkoutSessionId: string): Promise<void> {
    this.releasedSessions += 1;
    return Promise.resolve();
  }

  async runOnce(
    eventId: string,
    _eventType: string,
    effect: (transaction: WebhookTransaction) => Promise<void>
  ): Promise<boolean> {
    if (this.processedEvents.has(eventId)) {
      return false;
    }
    await effect(this);
    this.processedEvents.add(eventId);
    return true;
  }
}

function checkoutCompletedEvent(eventId: string): Stripe.Event {
  // SAFETY: The processor only reads the fields supplied by this fixture.
  // oxlint-disable-next-line anti-slop/no-chained-type-assertions -- minimal Stripe fixture
  return {
    data: {
      object: {
        id: "cs_test",
        payment_intent: "pi_test",
        payment_status: "paid",
      },
    },
    id: eventId,
    type: "checkout.session.completed",
  } as unknown as Stripe.Event;
}

function refundedEvent(eventId: string): Stripe.Event {
  // SAFETY: The processor only reads the fields supplied by this fixture.
  return {
    data: {
      object: {
        id: "ch_test",
        payment_intent: "pi_test",
        refunded: true,
      },
    },
    id: eventId,
    type: "charge.refunded",
  } as Stripe.Event;
}

function checkoutExpiredEvent(eventId: string): Stripe.Event {
  // SAFETY: The processor only reads the fields supplied by this fixture.
  return {
    data: { object: { id: "cs_expired" } },
    id: eventId,
    type: "checkout.session.expired",
  } as Stripe.Event;
}

function paymentFailedEvent(eventId: string): Stripe.Event {
  // SAFETY: The processor only reads the fields supplied by this fixture.
  // oxlint-disable-next-line anti-slop/no-chained-type-assertions -- minimal Stripe fixture
  return {
    data: {
      object: {
        id: "pi_failed",
        metadata: { reservationId: "reservation_1" },
      },
    },
    id: eventId,
    type: "payment_intent.payment_failed",
  } as unknown as Stripe.Event;
}

describe("processStripeEvent", () => {
  test("does not repeat effects for a duplicate event", async () => {
    const store = new MemoryWebhookStore();
    const event = checkoutCompletedEvent("evt_checkout");

    expect(await processStripeEvent(event, store)).toBe("processed");
    expect(await processStripeEvent(event, store)).toBe("duplicate");
    expect(store.checkoutEffects).toBe(1);
  });

  test("a refunded Charge delivered first does not leave the Order succeeded", async () => {
    const store = new MemoryWebhookStore();
    const refund = refundedEvent("evt_refund");

    await expect(processStripeEvent(refund, store)).rejects.toThrow(
      "Order pendiente"
    );
    await processStripeEvent(checkoutCompletedEvent("evt_checkout"), store);
    await processStripeEvent(refund, store);

    expect(store.orders.get("pi_test")).toBe("refunded");
  });

  test("releases reservations for expired Checkout Sessions", async () => {
    const store = new MemoryWebhookStore();

    await processStripeEvent(checkoutExpiredEvent("evt_expired"), store);

    expect(store.releasedSessions).toBe(1);
  });

  test("passes the reservation through a failed Payment Intent", async () => {
    const store = new MemoryWebhookStore();

    await processStripeEvent(paymentFailedEvent("evt_failed"), store);

    expect(store.releasedReservations).toEqual(["reservation_1"]);
  });
});
