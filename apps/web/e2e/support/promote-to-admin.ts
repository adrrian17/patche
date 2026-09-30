import { readdirSync } from "node:fs";
import path from "node:path";

import Database from "libsql";
import { z } from "zod";

import { alchemyDir } from "./env";

const d1Directory = path.join(
  alchemyDir,
  "local/d1/cloudflare-runtime-D1DatabaseObject"
);

// Local D1 files are named by hash, so update whichever database holds the user.
export function promoteToAdmin(email: string) {
  for (const fileName of readdirSync(d1Directory)) {
    if (fileName === "metadata.sqlite" || !fileName.endsWith(".sqlite")) {
      continue;
    }
    const db = new Database(path.join(d1Directory, fileName));
    try {
      const hasUserTable = db
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'user'"
        )
        .get();
      if (hasUserTable) {
        const { changes } = db
          .prepare("UPDATE user SET role = 'admin' WHERE email = ?")
          .run(email);
        if (changes > 0) {
          return;
        }
      }
    } finally {
      db.close();
    }
  }
  throw new Error(`No local D1 database has a user with email ${email}`);
}

// Preserve the verified user and session, matching Customers created by magic links.
export function removeCredential(email: string): string {
  for (const fileName of readdirSync(d1Directory).filter(
    (entry) => entry !== "metadata.sqlite" && entry.endsWith(".sqlite")
  )) {
    const db = new Database(path.join(d1Directory, fileName));
    try {
      if (
        !db
          .prepare(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'user'"
          )
          .get()
      ) {
        continue;
      }
      const customer = db
        .prepare("SELECT id FROM user WHERE email = ?")
        .get(email);
      if (customer) {
        const { id } = z.object({ id: z.string() }).parse(customer);
        db.prepare(
          "DELETE FROM account WHERE user_id = ? AND provider_id = 'credential'"
        ).run(id);
        return id;
      }
    } finally {
      db.close();
    }
  }
  throw new Error(`No local D1 user for ${email}`);
}
