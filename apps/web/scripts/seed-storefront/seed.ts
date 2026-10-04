// Seeds demo Products into the running local app (`bun run dev` on :3001).
// Rerunning skips Products that already exist, matched by their `demo-` slug.
import { Database } from "bun:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import { categories, products } from "./catalog";

const baseURL = process.env.SEED_BASE_URL ?? "http://localhost:3001";
const alchemyDir = path.resolve(
  import.meta.dir,
  "../../../../packages/infra/.alchemy"
);
const d1Directory = path.join(
  alchemyDir,
  "local/d1/cloudflare-runtime-D1DatabaseObject"
);
const emailDirectory = path.join(alchemyDir, "local/email/text");
const seedEmail = "seed-admin@patche.local";
// oxlint-disable-next-line sonarjs/no-hardcoded-passwords -- Local-only demo admin.
const seedPassword = "Patche-seed-password-2026";
const shippingRateKey = "shipping_rate_amount";
const signInEndpoint = "sign-in/email";

function randomId() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 21);
}

function slugify(name: string) {
  return `demo-${name
    .normalize("NFD")
    .replaceAll(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "")}`;
}

interface AuthBody {
  email: string;
  name?: string;
  password: string;
}

function authRequest(endpoint: string, body: AuthBody) {
  return fetch(`${baseURL}/api/auth/${endpoint}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: baseURL },
    method: "POST",
    redirect: "manual",
  });
}

async function findVerificationLink() {
  const entries = await readdir(emailDirectory, { recursive: true });
  let link: string | undefined;
  for (const entry of entries) {
    if (!entry.endsWith(".txt")) {
      continue;
    }
    const body = readFileSync(path.join(emailDirectory, entry), "utf-8");
    if (body.includes(seedEmail)) {
      link = body.match(/https?:\/\/\S+\/verify-email\?\S+/u)?.[0] ?? link;
    }
  }
  return link;
}

function openDevDatabase() {
  for (const fileName of readdirSync(d1Directory)) {
    if (fileName === "metadata.sqlite" || !fileName.endsWith(".sqlite")) {
      continue;
    }
    const db = new Database(path.join(d1Directory, fileName));
    const hasUsers = db
      .query(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'user'"
      )
      .get();
    if (
      hasUsers &&
      db.query("SELECT 1 FROM user WHERE email = ?").get(seedEmail)
    ) {
      db.exec("PRAGMA busy_timeout = 5000");
      return db;
    }
    db.close();
  }
  throw new Error(
    `No local D1 database has ${seedEmail}; is the dev server running?`
  );
}

async function signInSeedAdmin() {
  let signIn = await authRequest(signInEndpoint, {
    email: seedEmail,
    password: seedPassword,
  });
  if (signIn.status !== 200) {
    await authRequest("sign-up/email", {
      email: seedEmail,
      name: "Seed Admin",
      password: seedPassword,
    });
    let link: string | undefined;
    for (let attempt = 0; attempt < 20 && !link; attempt += 1) {
      // oxlint-disable-next-line no-await-in-loop -- polling for the email file.
      link = await findVerificationLink();
      if (!link) {
        // oxlint-disable-next-line no-await-in-loop -- polling for the email file.
        await Bun.sleep(250);
      }
    }
    if (!link) {
      throw new Error("No verification email arrived for the seed admin");
    }
    await fetch(link, { redirect: "manual" });
    signIn = await authRequest(signInEndpoint, {
      email: seedEmail,
      password: seedPassword,
    });
  }
  if (signIn.status !== 200) {
    throw new Error(`Seed admin sign-in failed: ${await signIn.text()}`);
  }
  const db = openDevDatabase();
  db.query("UPDATE user SET role = 'admin' WHERE email = ?").run(seedEmail);
  // Sign in again so the session carries the admin role.
  const adminSignIn = await authRequest(signInEndpoint, {
    email: seedEmail,
    password: seedPassword,
  });
  const cookie = adminSignIn.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  return { cookie, db };
}

async function uploadImage(
  cookie: string,
  productId: string,
  image: string,
  alt: string
) {
  // Placeholder photos: nothing is stored in the repo, the file goes straight to local R2.
  const source = await fetch(`https://picsum.photos/seed/${image}/800/800.jpg`);
  if (!source.ok) {
    throw new Error(`Download of ${image} failed: ${source.status}`);
  }
  const form = new FormData();
  form.set("productId", productId);
  form.set("alt", alt);
  form.set(
    "file",
    new File([await source.arrayBuffer()], `${image}.jpg`, {
      type: "image/jpeg",
    })
  );
  const response = await fetch(`${baseURL}/api/admin/media`, {
    body: form,
    headers: { cookie, origin: baseURL },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(
      `Upload of ${image} failed: ${response.status} ${await response.text()}`
    );
  }
}

const { cookie, db } = await signInSeedAdmin();

const categoryIds = new Map<string, string>();
for (const category of categories) {
  db.query(
    "INSERT OR IGNORE INTO category (id, name, slug) VALUES (?, ?, ?)"
  ).run(randomId(), category.name, category.slug);
  const row = db
    .query<{ id: string }, [string]>("SELECT id FROM category WHERE slug = ?")
    .get(category.slug);
  if (row) {
    categoryIds.set(category.slug, row.id);
  }
}

db.query(
  "INSERT OR IGNORE INTO store_setting (key, value) VALUES (?, '9900')"
).run(shippingRateKey);

let created = 0;
const now = Date.now();
for (const [index, item] of products.entries()) {
  const slug = slugify(item.name);
  const existing = db
    .query<{ id: string }, [string]>("SELECT id FROM product WHERE slug = ?")
    .get(slug);
  if (existing) {
    // Resume a Product whose uploads failed on an earlier run; the first images keep their order.
    const uploaded =
      db
        .query<{ count: number }, [string]>(
          "SELECT COUNT(*) AS count FROM product_media WHERE product_id = ?"
        )
        .get(existing.id)?.count ?? 0;
    for (const image of item.images.slice(uploaded)) {
      // oxlint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- uploads keep their order so the first image is the main one.
      await uploadImage(cookie, existing.id, image, item.name);
    }
    continue;
  }
  const productId = randomId();
  // Stagger creation times so "Más recientes" has a stable order.
  const createdAt = now - (products.length - index) * 60_000;
  db.query(
    "INSERT INTO product (id, name, slug, description, status, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)"
  ).run(
    productId,
    item.name,
    slug,
    item.description,
    categoryIds.get(item.category) ?? null,
    createdAt,
    createdAt
  );
  for (const variant of item.variants) {
    const variantId = randomId();
    db.query(
      "INSERT INTO variant (id, product_id, name, sku, kind, price_amount) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      variantId,
      productId,
      variant.name,
      `DEMO-${variantId}`,
      variant.kind,
      variant.price
    );
    if (variant.kind === "physical" && variant.stock) {
      db.query(
        "INSERT INTO stock_movement (id, variant_id, quantity, reason, note) VALUES (?, ?, ?, 'received', 'Demo')"
      ).run(randomId(), variantId, variant.stock);
    }
  }
  for (const image of item.images) {
    // oxlint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- uploads keep their order so the first image is the main one.
    await uploadImage(cookie, productId, image, item.name);
  }
  created += 1;
  console.log(`created ${item.name}`);
}

db.close();
console.log(
  `${created} Products created, ${products.length - created} already existed.`
);
