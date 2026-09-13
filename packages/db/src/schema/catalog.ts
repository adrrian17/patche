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

export const productStatuses = ["draft", "active", "archived"] as const;
export const variantKinds = ["physical", "digital"] as const;

export const category = sqliteTable(
  "category",
  {
    id: text("id").notNull().$defaultFn(nanoid),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
  },
  (table) => [primaryKey({ columns: [table.id] })]
);

export const product = sqliteTable(
  "product",
  {
    id: text("id").notNull().$defaultFn(nanoid),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").default("").notNull(),
    status: text("status", { enum: productStatuses })
      .default("draft")
      .notNull(),
    categoryId: text("category_id").references(() => category.id, {
      onDelete: "set null",
    }),
    stripeProductId: text("stripe_product_id").notNull().unique(),
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
    index("product_category_id_idx").on(table.categoryId),
    index("product_status_idx").on(table.status),
    check(
      "product_status_check",
      sql`${table.status} in ('draft', 'active', 'archived')`
    ),
  ]
);

export const productMedia = sqliteTable(
  "product_media",
  {
    id: text("id").notNull().$defaultFn(nanoid),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    r2Key: text("r2_key").notNull().unique(),
    alt: text("alt").default("").notNull(),
    sort: integer("sort").default(0).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    index("product_media_product_id_sort_idx").on(table.productId, table.sort),
    check("product_media_sort_check", sql`${table.sort} >= 0`),
  ]
);

export const variant = sqliteTable(
  "variant",
  {
    id: text("id").notNull().$defaultFn(nanoid),
    productId: text("product_id")
      .notNull()
      .references(() => product.id),
    name: text("name").notNull(),
    sku: text("sku").notNull().unique(),
    kind: text("kind", { enum: variantKinds }).notNull(),
    priceAmount: integer("price_amount").notNull(),
    currency: text("currency", { enum: ["mxn"] })
      .default("mxn")
      .notNull(),
    stripePriceId: text("stripe_price_id").notNull().unique(),
    lowStockThreshold: integer("low_stock_threshold").default(5).notNull(),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    digitalFileKey: text("digital_file_key"),
    digitalFileSize: integer("digital_file_size"),
    digitalFileName: text("digital_file_name"),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    index("variant_product_id_idx").on(table.productId),
    index("variant_kind_archived_at_idx").on(table.kind, table.archivedAt),
    check("variant_currency_check", sql`${table.currency} = 'mxn'`),
    check(
      "variant_digital_file_size_check",
      sql`${table.digitalFileSize} is null or ${table.digitalFileSize} >= 0`
    ),
    check("variant_kind_check", sql`${table.kind} in ('physical', 'digital')`),
    check(
      "variant_low_stock_threshold_check",
      sql`${table.lowStockThreshold} >= 0`
    ),
    check("variant_price_amount_check", sql`${table.priceAmount} >= 0`),
  ]
);
