import type Stripe from "stripe";

export interface WebhookTransaction {
  createOrder: (session: Stripe.Checkout.Session) => Promise<void>;
  markPaymentFailed: (paymentIntentId: string) => Promise<void>;
  markRefunded: (paymentIntentId: string) => Promise<void>;
}

export interface WebhookStore {
  runOnce: (
    eventId: string,
    eventType: string,
    effect: (transaction: WebhookTransaction) => Promise<void>
  ) => Promise<boolean>;
}

export type StripeEventResult = "processed" | "duplicate";

function getExpandableId(value: string | { id: string } | null): string | null {
  // Stripe models expandable fields as a documented string-or-object union.
  // oxlint-disable-next-line anti-slop/no-runtime-typeof
  if (typeof value === "string") {
    return value;
  }
  return value?.id ?? null;
}

export async function processStripeEvent(
  event: Stripe.Event,
  store: WebhookStore
): Promise<StripeEventResult> {
  const processed = await store.runOnce(event.id, event.type, async (tx) => {
    switch (event.type) {
      case "checkout.session.completed": {
        await tx.createOrder(event.data.object);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        if (!charge.refunded) {
          return;
        }
        const paymentIntentId = getExpandableId(charge.payment_intent);
        if (!paymentIntentId) {
          throw new Error("El reembolso no incluye Payment Intent");
        }
        await tx.markRefunded(paymentIntentId);
        break;
      }
      case "payment_intent.payment_failed": {
        await tx.markPaymentFailed(event.data.object.id);
        break;
      }
      case "checkout.session.expired": {
        break;
      }
      default: {
        break;
      }
    }
  });

  return processed ? "processed" : "duplicate";
}
