import { createDb } from "@patche/db";
import { order } from "@patche/db/schema/orders";
import { env } from "@patche/env/server";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getStripeClient } from "@/lib/payments.server";
import { adminMiddleware } from "@/middleware/admin";

function isDefinitiveStripeRejection(error: Error): boolean {
  if (!("statusCode" in error)) {
    return false;
  }

  // oxlint-disable-next-line anti-slop/no-runtime-typeof
  if (typeof error.statusCode !== "number") {
    return false;
  }

  return error.statusCode >= 400 && error.statusCode < 500;
}

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
    if (matchingOrder.paymentStatus === "refund_pending") {
      return { status: "pending" as const };
    }
    if (matchingOrder.paymentStatus !== "succeeded") {
      throw new Error("Solo una Order pagada admite reembolso");
    }

    const revokedAt = Date.now();
    const [claimResult] = await env.DB.batch([
      env.DB.prepare(`
        UPDATE "order"
        SET payment_status = 'refund_pending', updated_at = ?
        WHERE id = ? AND payment_status = 'succeeded'
      `).bind(revokedAt, data.orderId),
      env.DB.prepare(`
        UPDATE download_grant
        SET revoked_at = ?
        WHERE revoked_at IS NULL
          AND order_item_id IN (
            SELECT id FROM order_item WHERE order_id = ?
          )
      `).bind(revokedAt, data.orderId),
    ]);
    if (claimResult.meta.changes !== 1) {
      return { status: "pending" as const };
    }

    const stripe = getStripeClient();
    try {
      await stripe.refunds.create(
        { payment_intent: matchingOrder.paymentIntentId },
        { idempotencyKey: `refund:${data.orderId}` }
      );
    } catch (error) {
      if (error instanceof Error && isDefinitiveStripeRejection(error)) {
        await env.DB.batch([
          env.DB.prepare(`
            UPDATE download_grant
            SET revoked_at = NULL
            WHERE revoked_at = ?
              AND order_item_id IN (
                SELECT item.id
                FROM order_item AS item
                INNER JOIN "order" AS purchase ON purchase.id = item.order_id
                WHERE purchase.id = ?
                  AND purchase.payment_status = 'refund_pending'
              )
          `).bind(revokedAt, data.orderId),
          env.DB.prepare(`
            UPDATE "order"
            SET payment_status = 'succeeded', updated_at = ?
            WHERE id = ? AND payment_status = 'refund_pending'
          `).bind(Date.now(), data.orderId),
        ]);
      }
      throw error;
    }

    return { status: "pending" as const };
  });
