import { createDb } from "@patche/db";
import { variant } from "@patche/db/schema/catalog";
import { downloadGrant, order, orderItem } from "@patche/db/schema/orders";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { isAdminUser } from "@/lib/session";
import { authMiddleware } from "@/middleware/auth";

export const createDownloadUrl = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ grantId: z.string().min(1).max(32) }))
  .handler(async ({ context, data }) => {
    if (!context.session) {
      throw redirect({ to: "/login" });
    }

    const db = createDb();
    const grant = await db
      .select({
        customerId: downloadGrant.customerId,
        digitalFileKey: variant.digitalFileKey,
        revokedAt: downloadGrant.revokedAt,
      })
      .from(downloadGrant)
      .innerJoin(variant, eq(downloadGrant.variantId, variant.id))
      .innerJoin(orderItem, eq(downloadGrant.orderItemId, orderItem.id))
      .innerJoin(order, eq(orderItem.orderId, order.id))
      .where(
        and(
          eq(downloadGrant.id, data.grantId),
          isNull(downloadGrant.revokedAt),
          eq(order.paymentStatus, "succeeded")
        )
      )
      .get();
    if (!grant?.digitalFileKey) {
      throw new Error("Download Grant no disponible");
    }

    const isOwner = grant.customerId === context.session.user.id;
    if (!(isOwner || isAdminUser(context.session.user))) {
      throw new Error("Download Grant no disponible");
    }

    return { url: `/api/download/${encodeURIComponent(data.grantId)}` };
  });
