import { createStripeClient } from "@patche/payments";
import type { Stripe } from "@patche/payments";
import type { APIRequestContext } from "@playwright/test";

// Test runs through `varlock run`, so STRIPE_* come from the e2e environment.
const stripe = createStripeClient(process.env.STRIPE_SECRET_KEY ?? "");

// Synthetic events are built by the caller and cast to Stripe.Event.
export async function postSignedEvent(
  request: APIRequestContext,
  event: Stripe.Event
) {
  const payload = JSON.stringify(event);
  const signature = await stripe.webhooks.generateTestHeaderStringAsync({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  });
  return await request.post("/api/stripe/webhook", {
    data: payload,
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
  });
}

// Finds the real event Stripe emitted for a Checkout Session or Payment Intent.
export async function findStripeEvent(
  type: Stripe.Event.Type,
  objectId: string
) {
  const events = await stripe.events.list({ limit: 20, type });
  return events.data.find(({ data: { object } }) =>
    [
      "id" in object ? object.id : undefined,
      "payment_intent" in object ? object.payment_intent : undefined,
    ].includes(objectId)
  );
}
