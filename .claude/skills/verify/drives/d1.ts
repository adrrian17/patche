import { readdirSync } from "node:fs";
import path from "node:path";

import Database from "libsql";

// Relative to apps/web, where drive.sh runs Playwright.
const d1Directory = "../../packages/infra/.alchemy/local/d1/cloudflare-runtime-D1DatabaseObject";

// Local D1 files are named by hash and old stages leave theirs behind, so return the first non-empty result.
// Aggregates (COUNT, SUM) return a row from every file, so they would read the wrong database: select plain rows.
export function findRows(sql: string, ...params: unknown[]) {
  for (const fileName of readdirSync(d1Directory)) {
    if (fileName === "metadata.sqlite" || !fileName.endsWith(".sqlite")) {
      continue;
    }
    const db = new Database(path.join(d1Directory, fileName), { readonly: true });
    try {
      const rows = db.prepare(sql).all(...params);
      if (rows.length > 0) {
        return rows as Record<string, unknown>[];
      }
    } catch {
      // Databases from other stages may predate the table being queried.
    } finally {
      db.close();
    }
  }
  return [];
}

export function findRow(sql: string, ...params: unknown[]) {
  return findRows(sql, ...params)[0];
}
