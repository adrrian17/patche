import { readdirSync } from "node:fs";
import path from "node:path";

import Database from "libsql";

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
      const { changes } = db
        .prepare("UPDATE user SET role = 'admin' WHERE email = ?")
        .run(email);
      if (changes > 0) {
        return;
      }
    } finally {
      db.close();
    }
  }
  throw new Error(`No local D1 database has a user with email ${email}`);
}
