import { createDb } from "@patche/db";
import { order } from "@patche/db/schema/orders";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getStripeClient } from "@/lib/payments.server";
import { adminMiddleware } from "@/middleware/admin";

export const refundOrder = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ orderId: z.string().min(1).max(32) }))
  .handler(async ({ data }) => {
    const db = createDb();
    const matchingOrder = await db
      .select({
        paymentIntentId: order.stripePaymentIntentId,
        paymentStatus: order.paymentStatus,
      })
      .from(order)
      .where(eq(order.id, data.orderId))
      .get();
    if (!matchingOrder) {
      throw new Error("Order no encontrada");
    }
    if (!matchingOrder.paymentIntentId) {
      throw new Error("Order sin Payment Intent");
    }
    if (matchingOrder.paymentStatus === "refunded") {
      return { status: "refunded" as const };
    }

    const stripe = getStripeClient();
    await stripe.refunds.create(
      { payment_intent: matchingOrder.paymentIntentId },
      { idempotencyKey: `refund:${data.orderId}` }
    );

    return { status: "pending" as const };
  });
