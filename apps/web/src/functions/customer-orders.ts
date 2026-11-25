import { createDb } from "@patche/db";
import { product, productMedia, variant } from "@patche/db/schema/catalog";
import { downloadGrant, order, orderItem } from "@patche/db/schema/orders";
import type {
  fulfillmentStatuses,
  paymentStatuses,
  ShippingAddress,
} from "@patche/db/schema/orders";
import { mediaPublicUrl } from "@patche/storage";
import { createServerFn } from "@tanstack/react-start";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { getMediaPublicBaseUrl } from "@/lib/storage.server";
import { authenticatedMiddleware } from "@/middleware/authenticated";

export type PaymentStatus = (typeof paymentStatuses)[number];
export type FulfillmentStatus = (typeof fulfillmentStatuses)[number];

export interface OrderItemImage {
  alt: string;
  url: string;
}

export interface CustomerOrderSummary {
  id: string;
  createdAt: Date;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  totalAmount: number;
  currency: "mxn";
}

export interface CustomerOrderListEntry extends CustomerOrderSummary {
  lineCount: number;
  // Up to three items, for thumbnails and a one-line summary.
  preview: { image: OrderItemImage | null; productName: string }[];
}

interface CustomerPurchasedItem {
  id: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitAmount: number;
  image: OrderItemImage | null;
  // Set only while the Product is still Active, so the link never lands on a missing page.
  productSlug: string | null;
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
const previewLimit = 3;
// D1 caps bound parameters per statement at 100, so long id lists go in batches.
const idBatchSize = 90;

type Db = ReturnType<typeof createDb>;

async function inBatches<T>(
  ids: string[],
  load: (batch: string[]) => Promise<T[]>
) {
  const batches: string[][] = [];
  for (let start = 0; start < ids.length; start += idBatchSize) {
    batches.push(ids.slice(start, start + idBatchSize));
  }
  const results = await Promise.all(batches.map(load));
  return results.flat();
}

// First image and storefront slug of each purchased Variant's Product, for display only.
async function loadVariantProducts(db: Db, variantIds: string[]) {
  const result = new Map<
    string,
    { image: OrderItemImage | null; productSlug: string | null }
  >();
  if (variantIds.length === 0) {
    return result;
  }
  const rows = await inBatches(variantIds, (batch) =>
    db
      .select({
        productId: product.id,
        slug: product.slug,
        status: product.status,
        variantId: variant.id,
      })
      .from(variant)
      .innerJoin(product, eq(variant.productId, product.id))
      .where(inArray(variant.id, batch))
  );
  const productIds = [...new Set(rows.map((row) => row.productId))];
  const media = await inBatches(productIds, (batch) =>
    db
      .select({
        alt: productMedia.alt,
        productId: productMedia.productId,
        r2Key: productMedia.r2Key,
      })
      .from(productMedia)
      .where(inArray(productMedia.productId, batch))
      .orderBy(asc(productMedia.sort), asc(productMedia.id))
  );
  const baseUrl = getMediaPublicBaseUrl();
  const images = new Map<string, OrderItemImage>();
  for (const item of media) {
    if (!images.has(item.productId)) {
      images.set(item.productId, {
        alt: item.alt,
        url: mediaPublicUrl(baseUrl, item.r2Key),
      });
    }
  }
  for (const row of rows) {
    result.set(row.variantId, {
      image: images.get(row.productId) ?? null,
      productSlug: row.status === "active" ? row.slug : null,
    });
  }
  return result;
}

export const listCustomerOrders = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }): Promise<CustomerOrderListEntry[]> => {
    const db = createDb();
    const customerId = context.session.user.id;
    const orders = await db
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
    const items = await inBatches(
      orders.map(({ id }) => id),
      (batch) =>
        db
          .select({
            orderId: orderItem.orderId,
            productName: orderItem.productName,
            quantity: orderItem.quantity,
            variantId: orderItem.variantId,
          })
          .from(orderItem)
          .where(inArray(orderItem.orderId, batch))
          // Insertion order matches the order of the checkout lines.
          .orderBy(sql`${orderItem}.rowid`)
    );
    const products = await loadVariantProducts(db, [
      ...new Set(items.map(({ variantId }) => variantId)),
    ]);

    return orders.map((entry) => {
      const own = items.filter((item) => item.orderId === entry.id);
      return {
        ...entry,
        lineCount: own.length,
        preview: own.slice(0, previewLimit).map((item) => ({
          image: products.get(item.variantId)?.image ?? null,
          productName: item.productName,
        })),
      };
    });
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
        variantId: orderItem.variantId,
        variantName: orderItem.variantName,
      })
      .from(orderItem)
      .where(eq(orderItem.orderId, matchingOrder.id));
    const products = await loadVariantProducts(db, [
      ...new Set(items.map(({ variantId }) => variantId)),
    ]);
    const itemIds = items.map((item) => item.id);
    const grants = itemIds.length
      ? await db
          .select({
            id: downloadGrant.id,
            orderItemId: downloadGrant.orderItemId,
          })
          .from(downloadGrant)
          .innerJoin(variant, eq(downloadGrant.variantId, variant.id))
          .where(
            and(
              inArray(downloadGrant.orderItemId, itemIds),
              eq(downloadGrant.customerId, customerId),
              isNull(downloadGrant.revokedAt),
              // A digital Variant can be sold before its file is uploaded.
              isNotNull(variant.digitalFileKey)
            )
          )
      : [];
    // Only grants that can be downloaded right now reach this map.
    const grantsByItemId = new Map(
      grants.map((grant) => [grant.orderItemId, grant] as const)
    );
    const hasPhysicalItems = items.some((item) => item.kind === "physical");

    return {
      items: items.map((item): CustomerOrderItem => {
        const purchasedItem = {
          id: item.id,
          image: products.get(item.variantId)?.image ?? null,
          productName: item.productName,
          productSlug: products.get(item.variantId)?.productSlug ?? null,
          quantity: item.quantity,
          unitAmount: item.unitAmount,
          variantName: item.variantName,
        };
        if (item.kind === "physical") {
          return { ...purchasedItem, kind: "physical" };
        }

        const grant = grantsByItemId.get(item.id);
        const download =
          matchingOrder.paymentStatus === "succeeded" && grant
            ? { grantId: grant.id, state: "available" as const }
            : { state: "unavailable" as const };

        return { ...purchasedItem, download, kind: "digital" };
      }),
      ...matchingOrder,
      shippingAddress: hasPhysicalItems ? matchingOrder.shippingAddress : null,
      shippingName: hasPhysicalItems ? matchingOrder.shippingName : null,
    };
  });
