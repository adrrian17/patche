import { env } from "cloudflare:workers";
import { afterEach, expect, test } from "vitest";

import { deleteOrphanMedia } from "./storage.server";

const hour = 60 * 60 * 1000;
const keptKey = "products/p1/kept";
const otherProductKey = "products/p10/other";

async function seedProduct(id: string) {
  await env.DB.prepare(
    "INSERT INTO product (id, name, slug, stripe_product_id) VALUES (?, ?, ?, ?)"
  )
    .bind(id, id, id, `prod_${id}`)
    .run();
}

afterEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM product_media"),
    env.DB.prepare("DELETE FROM product"),
  ]);
  const listed = await env.MEDIA_BUCKET.list();
  await env.MEDIA_BUCKET.delete(listed.objects.map(({ key }) => key));
});

test("deletes only old media objects without a row for that product", async () => {
  await seedProduct("p1");
  await seedProduct("p10");
  await env.DB.prepare(
    "INSERT INTO product_media (id, product_id, r2_key) VALUES (?, ?, ?)"
  )
    .bind("m1", "p1", keptKey)
    .run();
  await Promise.all(
    [keptKey, "products/p1/orphan", otherProductKey].map((key) =>
      env.MEDIA_BUCKET.put(key, "x")
    )
  );

  // Pretend two hours passed so every object counts as old.
  await deleteOrphanMedia("p1", Date.now() + 2 * hour);

  const listed = await env.MEDIA_BUCKET.list();
  expect(listed.objects.map(({ key }) => key)).toEqual([
    keptKey,
    otherProductKey,
  ]);
});

test("keeps a fresh orphan because its upload may still be in flight", async () => {
  await seedProduct("p1");
  await env.MEDIA_BUCKET.put("products/p1/in-flight", "x");

  await deleteOrphanMedia("p1");

  expect(await env.MEDIA_BUCKET.head("products/p1/in-flight")).not.toBeNull();
});
