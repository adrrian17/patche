import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

import { user } from "./auth";
import { variant, variantKinds } from "./catalog";

export const paymentStatuses = [
  "pending",
  "succeeded",
  "failed",
  "canceled",
  "refunded",
] as const;
export const fulfillmentStatuses = [
  "unfulfilled",
  "shipped",
  "delivered",
] as const;

export interface ShippingAddress {
  city: string | null;
  country: string | null;
  line1: string | null;
  line2: string | null;
  postalCode: string | null;
  state: string | null;
}

export const order = sqliteTable(
  "order",
  {
    id: text("id").notNull().$defaultFn(nanoid),
    customerId: text("customer_id")
      .notNull()
      .references(() => user.id),
    stripeCheckoutSessionId: text("stripe_checkout_session_id")
      .notNull()
      .unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeCustomerId: text("stripe_customer_id"),
    paymentStatus: text("payment_status", { enum: paymentStatuses })
      .default("pending")
      .notNull(),
    fulfillmentStatus: text("fulfillment_status", {
      enum: fulfillmentStatuses,
    })
      .default("unfulfilled")
      .notNull(),
    subtotalAmount: integer("subtotal_amount").notNull(),
    shippingAmount: integer("shipping_amount").notNull(),
    totalAmount: integer("total_amount").notNull(),
    currency: text("currency", { enum: ["mxn"] })
      .default("mxn")
      .notNull(),
    paymentMethodType: text("payment_method_type"),
    shippingName: text("shipping_name"),
    shippingAddress: text("shipping_address", {
      mode: "json",
    }).$type<ShippingAddress | null>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    index("order_customer_id_created_at_idx").on(
      table.customerId,
      table.createdAt
    ),
    index("order_fulfillment_status_idx").on(table.fulfillmentStatus),
    index("order_payment_status_idx").on(table.paymentStatus),
    check("order_currency_check", sql`${table.currency} = 'mxn'`),
    check(
      "order_fulfillment_status_check",
      sql`${table.fulfillmentStatus} in ('unfulfilled', 'shipped', 'delivered')`
    ),
    check(
      "order_payment_status_check",
      sql`${table.paymentStatus} in ('pending', 'succeeded', 'failed', 'canceled', 'refunded')`
    ),
    check("order_shipping_amount_check", sql`${table.shippingAmount} >= 0`),
    check("order_subtotal_amount_check", sql`${table.subtotalAmount} >= 0`),
    check("order_total_amount_check", sql`${table.totalAmount} >= 0`),
  ]
);

export const orderItem = sqliteTable(
  "order_item",
  {
    id: text("id").notNull().$defaultFn(nanoid),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id),
    variantId: text("variant_id")
      .notNull()
      .references(() => variant.id),
    productName: text("product_name").notNull(),
    variantName: text("variant_name").notNull(),
    kind: text("kind", { enum: variantKinds }).notNull(),
    unitAmount: integer("unit_amount").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    index("order_item_order_id_idx").on(table.orderId),
    index("order_item_variant_id_idx").on(table.variantId),
    check(
      "order_item_kind_check",
      sql`${table.kind} in ('physical', 'digital')`
    ),
    check("order_item_quantity_check", sql`${table.quantity} > 0`),
    check("order_item_unit_amount_check", sql`${table.unitAmount} >= 0`),
  ]
);

export const downloadGrant = sqliteTable(
  "download_grant",
  {
    id: text("id").notNull().$defaultFn(nanoid),
    orderItemId: text("order_item_id")
      .notNull()
      .unique()
      .references(() => orderItem.id),
    customerId: text("customer_id")
      .notNull()
      .references(() => user.id),
    variantId: text("variant_id")
      .notNull()
      .references(() => variant.id),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    index("download_grant_customer_id_idx").on(table.customerId),
    index("download_grant_variant_id_idx").on(table.variantId),
  ]
);

export const stripeEvent = sqliteTable(
  "stripe_event",
  {
    id: text("id").notNull(),
    type: text("type").notNull(),
    processedAt: integer("processed_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.id] })]
);
