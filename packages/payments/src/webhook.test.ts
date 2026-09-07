import { describe, expect, test } from "bun:test";

import { Stripe } from "stripe";

import { createStripeClient, verifyWebhookEvent } from "./index";

const webhookSecret = "whsec_test_secret";
const payload = JSON.stringify({
  api_version: "2025-03-31.basil",
  created: 1_750_000_000,
  data: { object: { id: "cs_test" } },
  id: "evt_test",
  livemode: false,
  object: "event",
  pending_webhooks: 1,
  request: null,
  type: "checkout.session.expired",
});

describe("verifyWebhookEvent", () => {
  test("accepts a payload with a valid Stripe signature", async () => {
    const stripe = createStripeClient("sk_test_placeholder");
    const signature = await Stripe.webhooks.generateTestHeaderStringAsync({
      payload,
      secret: webhookSecret,
    });

    const event = await verifyWebhookEvent(stripe, {
      body: payload,
      secret: webhookSecret,
      signature,
    });

    expect(event.id).toBe("evt_test");
  });

  test("rejects a payload with an invalid Stripe signature", async () => {
    const stripe = createStripeClient("sk_test_placeholder");

    await expect(
      verifyWebhookEvent(stripe, {
        body: payload,
        secret: webhookSecret,
        signature: "invalid",
      })
    ).rejects.toThrow();
  });
});
