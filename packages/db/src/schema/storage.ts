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
import { variant } from "./catalog";

export const digitalUploadStatuses = [
  "pending",
  "uploading",
  "uploaded",
  "confirming",
  "confirmed",
  "expired",
] as const;

export const digitalUploadIntent = sqliteTable(
  "digital_upload_intent",
  {
    id: text("id").notNull().$defaultFn(nanoid),
    variantId: text("variant_id")
      .notNull()
      .references(() => variant.id),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    temporaryKey: text("temporary_key").notNull().unique(),
    finalKey: text("final_key").notNull().unique(),
    replacedKey: text("replaced_key"),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    expectedSize: integer("expected_size").notNull(),
    status: text("status", { enum: digitalUploadStatuses })
      .default("pending")
      .notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    uploadedAt: integer("uploaded_at", { mode: "timestamp_ms" }),
    confirmedAt: integer("confirmed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    index("digital_upload_intent_status_expires_at_idx").on(
      table.status,
      table.expiresAt
    ),
    index("digital_upload_intent_variant_id_idx").on(table.variantId),
    check(
      "digital_upload_intent_expected_size_check",
      sql`${table.expectedSize} > 0`
    ),
    check(
      "digital_upload_intent_status_check",
      sql`${table.status} in ('pending', 'uploading', 'uploaded', 'confirming', 'confirmed', 'expired')`
    ),
  ]
);
