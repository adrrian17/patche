import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const storeSetting = sqliteTable(
  "store_setting",
  {
    key: text("key").notNull(),
    value: text("value").notNull(),
  },
  (table) => [primaryKey({ columns: [table.key] })]
);
