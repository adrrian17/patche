import { readdirSync } from "node:fs";
import path from "node:path";

import Database from "libsql";

import { alchemyDir } from "./env";

const d1Directory = path.join(
  alchemyDir,
  "local/d1/cloudflare-runtime-D1DatabaseObject"
);

// Inserts straight into local D1 so the test does not need a real Stripe Product.
// Old stages leave their D1 files behind, so target the one holding the signed-in Admin.
export function seedProduct(name: string, adminEmail: string) {
  const id = crypto.randomUUID().replaceAll("-", "").slice(0, 21);
  const fileNames = readdirSync(d1Directory).filter(
    (fileName) => fileName !== "metadata.sqlite" && fileName.endsWith(".sqlite")
  );
  for (const fileName of fileNames) {
    const db = new Database(path.join(d1Directory, fileName));
    try {
      const hasAdmin = db
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'user'"
        )
        .get()
        ? db.prepare("SELECT 1 FROM user WHERE email = ?").get(adminEmail)
        : undefined;
      if (hasAdmin) {
        db.prepare(
          "INSERT INTO product (id, name, slug, stripe_product_id) VALUES (?, ?, ?, ?)"
        ).run(id, name, `e2e-${id}`, `prod_e2e_${id}`);
        return id;
      }
    } finally {
      db.close();
    }
  }
  throw new Error(`No local D1 database has a user with email ${adminEmail}`);
}
