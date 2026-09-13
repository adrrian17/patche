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

import { variant } from "./catalog";
import { order } from "./orders";

export const stockMovementReasons = [
  "received",
  "sold",
  "adjusted",
  "returned",
] as const;

export const stockMovement = sqliteTable(
  "stock_movement",
  {
    id: text("id").notNull().$defaultFn(nanoid),
    variantId: text("variant_id")
      .notNull()
      .references(() => variant.id),
    quantity: integer("quantity").notNull(),
    reason: text("reason", { enum: stockMovementReasons }).notNull(),
    note: text("note"),
    orderId: text("order_id").references(() => order.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    index("stock_movement_order_id_idx").on(table.orderId),
    index("stock_movement_variant_id_created_at_idx").on(
      table.variantId,
      table.createdAt
    ),
    check("stock_movement_quantity_check", sql`${table.quantity} <> 0`),
    check(
      "stock_movement_reason_check",
      sql`${table.reason} in ('received', 'sold', 'adjusted', 'returned')`
    ),
  ]
);
