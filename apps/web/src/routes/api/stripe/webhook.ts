import { env } from "@patche/env/server";
import { processStripeEvent, verifyWebhookEvent } from "@patche/payments";
import { createFileRoute } from "@tanstack/react-router";
import type { AuditableLogger } from "evlog";
import { useRequest as getRequest } from "nitro/context";

import { createWebhookStore, getStripeClient } from "@/lib/payments.server";

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          return new Response("Missing Stripe-Signature", { status: 400 });
        }

        const body = await request.text();
        let event;
        try {
          event = await verifyWebhookEvent(getStripeClient(), {
            body,
            secret: env.STRIPE_WEBHOOK_SECRET,
            signature,
          });
        } catch {
          return new Response("Invalid Stripe signature", { status: 400 });
        }

        try {
          const result = await processStripeEvent(event, createWebhookStore());
          return Response.json({ received: true, result });
        } catch (error) {
          // SAFETY: evlog attaches an AuditableLogger to the Nitro request context.
          const logger = getRequest().context?.log as
            | AuditableLogger
            | undefined;
          logger?.error(
            error instanceof Error ? error : new Error(String(error)),
            { step: "stripe_webhook" }
          );
          return new Response("Webhook processing failed", { status: 500 });
        }
      },
    },
  },
});
