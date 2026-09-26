import { readdirSync } from "node:fs";
import path from "node:path";

import type { Page } from "@playwright/test";
import Database from "libsql";

import { alchemyDir } from "./env";

const d1Directory = path.join(
  alchemyDir,
  "local/d1/cloudflare-runtime-D1DatabaseObject"
);

function randomId() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 21);
}

export async function signedInEmail(page: Page) {
  const session = await page.request.get("/api/auth/get-session");
  // SAFETY: the admin storageState always carries a signed-in Better Auth session.
  const { user } = (await session.json()) as { user: { email: string } };
  return user.email;
}

// Old stages leave their D1 files behind, so target the one holding the signed-in Admin.
function withAdminDatabase<T>(
  adminEmail: string,
  run: (db: Database.Database) => T
) {
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
        return run(db);
      }
    } finally {
      db.close();
    }
  }
  throw new Error(`No local D1 database has a user with email ${adminEmail}`);
}

// Inserts straight into local D1 so the test does not need a real Stripe Product.
export function seedProduct(name: string, adminEmail: string) {
  const id = randomId();
  withAdminDatabase(adminEmail, (db) =>
    db
      .prepare(
        "INSERT INTO product (id, name, slug, stripe_product_id) VALUES (?, ?, ?, ?)"
      )
      .run(id, name, `e2e-${id}`, `prod_e2e_${id}`)
  );
  return id;
}

// Inserts straight into local D1 so the test does not need a real Stripe Price.
export function seedVariant(
  adminEmail: string,
  variant: { name: string; priceAmount: number; productId: string }
) {
  const id = randomId();
  withAdminDatabase(adminEmail, (db) =>
    db
      .prepare(
        "INSERT INTO variant (id, product_id, name, sku, kind, price_amount, stripe_price_id) VALUES (?, ?, ?, ?, 'physical', ?, ?)"
      )
      .run(
        id,
        variant.productId,
        variant.name,
        `E2E-${id}`,
        variant.priceAmount,
        `price_e2e_${id}`
      )
  );
  return id;
}
