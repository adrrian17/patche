import { createDb } from "@patche/db";
import { downloadGrant, order, orderItem } from "@patche/db/schema/orders";
import type {
  fulfillmentStatuses,
  paymentStatuses,
  ShippingAddress,
} from "@patche/db/schema/orders";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { authenticatedMiddleware } from "@/middleware/authenticated";

export type PaymentStatus = (typeof paymentStatuses)[number];
export type FulfillmentStatus = (typeof fulfillmentStatuses)[number];

export interface CustomerOrderSummary {
  id: string;
  createdAt: Date;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  totalAmount: number;
  currency: "mxn";
}

interface CustomerPurchasedItem {
  id: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitAmount: number;
}

export type DigitalDownload =
  | { state: "available"; grantId: string }
  | { state: "unavailable" };

export type CustomerOrderItem =
  | (CustomerPurchasedItem & { kind: "physical" })
  | (CustomerPurchasedItem & {
      kind: "digital";
      download: DigitalDownload;
    });

export interface CustomerOrderDetail extends CustomerOrderSummary {
  subtotalAmount: number;
  shippingAmount: number;
  shippingName: string | null;
  shippingAddress: ShippingAddress | null;
  items: CustomerOrderItem[];
}

const orderIdSchema = z.string().min(1).max(32);

export const listCustomerOrders = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }): Promise<CustomerOrderSummary[]> => {
    const customerId = context.session.user.id;
    return await createDb()
      .select({
        createdAt: order.createdAt,
        currency: order.currency,
        fulfillmentStatus: order.fulfillmentStatus,
        id: order.id,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
      })
      .from(order)
      .where(eq(order.customerId, customerId))
      .orderBy(desc(order.createdAt), desc(order.id));
  });

export const getCustomerOrder = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .validator(z.object({ id: orderIdSchema }))
  .handler(async ({ context, data }): Promise<CustomerOrderDetail | null> => {
    const db = createDb();
    const customerId = context.session.user.id;
    const matchingOrder = await db
      .select({
        createdAt: order.createdAt,
        currency: order.currency,
        fulfillmentStatus: order.fulfillmentStatus,
        id: order.id,
        paymentStatus: order.paymentStatus,
        shippingAddress: order.shippingAddress,
        shippingAmount: order.shippingAmount,
        shippingName: order.shippingName,
        subtotalAmount: order.subtotalAmount,
        totalAmount: order.totalAmount,
      })
      .from(order)
      .where(and(eq(order.id, data.id), eq(order.customerId, customerId)))
      .get();

    if (!matchingOrder) {
      return null;
    }

    const items = await db
      .select({
        id: orderItem.id,
        kind: orderItem.kind,
        productName: orderItem.productName,
        quantity: orderItem.quantity,
        unitAmount: orderItem.unitAmount,
        variantName: orderItem.variantName,
      })
      .from(orderItem)
      .where(eq(orderItem.orderId, matchingOrder.id));
    const itemIds = items.map((item) => item.id);
    const grants = itemIds.length
      ? await db
          .select({
            id: downloadGrant.id,
            orderItemId: downloadGrant.orderItemId,
            revokedAt: downloadGrant.revokedAt,
          })
          .from(downloadGrant)
          .where(
            and(
              inArray(downloadGrant.orderItemId, itemIds),
              eq(downloadGrant.customerId, customerId)
            )
          )
      : [];
    const grantsByItemId = new Map(
      grants.map((grant) => [grant.orderItemId, grant] as const)
    );
    const hasPhysicalItems = items.some((item) => item.kind === "physical");

    return {
      items: items.map((item): CustomerOrderItem => {
        const purchasedItem = {
          id: item.id,
          productName: item.productName,
          quantity: item.quantity,
          unitAmount: item.unitAmount,
          variantName: item.variantName,
        };
        if (item.kind === "physical") {
          return { ...purchasedItem, kind: "physical" };
        }

        const grant = grantsByItemId.get(item.id);
        const download =
          matchingOrder.paymentStatus === "succeeded" &&
          grant &&
          !grant.revokedAt
            ? { grantId: grant.id, state: "available" as const }
            : { state: "unavailable" as const };

        return { ...purchasedItem, download, kind: "digital" };
      }),
      ...matchingOrder,
      shippingAddress: hasPhysicalItems ? matchingOrder.shippingAddress : null,
      shippingName: hasPhysicalItems ? matchingOrder.shippingName : null,
    };
  });
