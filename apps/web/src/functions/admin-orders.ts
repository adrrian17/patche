import { createDb } from "@patche/db";
import { user } from "@patche/db/schema/auth";
import {
  downloadGrant,
  fulfillmentStatuses,
  order,
  orderItem,
} from "@patche/db/schema/orders";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { adminMiddleware } from "@/middleware/admin";

const idSchema = z.string().min(1).max(32);
const orderNotFoundMessage = "Order no encontrada";
const fulfillmentConflictMessage =
  "Una Order entregada no puede volver a Shipped";
const concurrentFulfillmentConflictMessage =
  "La Order cambió mientras se actualizaba. Vuelve a intentarlo";

export const listAdminOrders = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(
    async () =>
      await createDb()
        .select({
          createdAt: order.createdAt,
          customerEmail: user.email,
          customerName: user.name,
          fulfillmentStatus: order.fulfillmentStatus,
          id: order.id,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
        })
        .from(order)
        .innerJoin(user, eq(order.customerId, user.id))
        .orderBy(desc(order.createdAt))
  );

export const getAdminOrder = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const db = createDb();
    const matchingOrder = await db
      .select({
        customerEmail: user.email,
        customerName: user.name,
        order,
      })
      .from(order)
      .innerJoin(user, eq(order.customerId, user.id))
      .where(eq(order.id, data.id))
      .get();
    if (!matchingOrder) {
      throw new Error(orderNotFoundMessage);
    }

    const items = await db
      .select()
      .from(orderItem)
      .where(eq(orderItem.orderId, data.id));
    const itemIds = items.map((item) => item.id);
    const grants = itemIds.length
      ? await db
          .select()
          .from(downloadGrant)
          .where(inArray(downloadGrant.orderItemId, itemIds))
      : [];

    return { ...matchingOrder, grants, items };
  });

export const updateOrderFulfillment = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      id: idSchema,
      status: z
        .enum(fulfillmentStatuses)
        .refine((value) => value !== "unfulfilled"),
    })
  )
  .handler(async ({ data }) => {
    const db = createDb();
    const current = await db
      .select({ fulfillmentStatus: order.fulfillmentStatus })
      .from(order)
      .where(eq(order.id, data.id))
      .get();
    if (!current) {
      throw new Error(orderNotFoundMessage);
    }
    if (
      current.fulfillmentStatus === "delivered" &&
      data.status !== "delivered"
    ) {
      throw new Error(fulfillmentConflictMessage);
    }

    const updated = await db
      .update(order)
      .set({ fulfillmentStatus: data.status })
      .where(
        and(
          eq(order.id, data.id),
          eq(order.fulfillmentStatus, current.fulfillmentStatus)
        )
      )
      .returning({ fulfillmentStatus: order.fulfillmentStatus })
      .get();
    if (!updated) {
      const latest = await db
        .select({ fulfillmentStatus: order.fulfillmentStatus })
        .from(order)
        .where(eq(order.id, data.id))
        .get();
      if (!latest) {
        throw new Error(orderNotFoundMessage);
      }
      if (
        latest.fulfillmentStatus === "delivered" &&
        data.status !== "delivered"
      ) {
        throw new Error(fulfillmentConflictMessage);
      }
      throw new Error(concurrentFulfillmentConflictMessage);
    }
    return updated;
  });
