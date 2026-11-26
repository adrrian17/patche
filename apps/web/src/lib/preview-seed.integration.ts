import { homeImageObjectKey } from "@patche/storage";
import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Route } from "@/routes/api/preview/seed";

import {
  demoCategories,
  demoHomeImages,
  demoImageSources,
  demoProducts,
  demoShippingRateAmount,
  demoVariantSku,
  slugifyDemoProduct,
} from "./demo-catalog";
import { previewSeedTokenHeader } from "./preview-seed";
import { seedPreviewCatalog } from "./preview-seed.server";

const token = "preview-token-0123456789abcdef";
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0xff, 0xd9]);
const homeSlots = ["hero", "washi", "pens"] as const;

const allVariants = demoProducts.flatMap((item) => item.variants);
let stockedVariantCount = 0;
for (const variant of allVariants) {
  if (variant.kind === "physical" && (variant.stock ?? 0) > 0) {
    stockedVariantCount += 1;
  }
}
const totalVariants = allVariants.length;
const totalProductImages = demoProducts.flatMap((item) => item.images).length;
const distinctImageKeys = new Set([
  ...Object.values(demoHomeImages),
  ...demoProducts.flatMap((item) => item.images),
]);

type FetchMode = "ok" | "primary-500" | "primary-not-image" | "all-fail";

function stubFetch(mode: FetchMode = "ok") {
  const mock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    const isPrimary = url.startsWith("https://images.unsplash.com/");
    if (mode === "all-fail") {
      return Promise.resolve(new Response("nope", { status: 503 }));
    }
    if (isPrimary && mode === "primary-500") {
      return Promise.resolve(new Response("boom", { status: 500 }));
    }
    if (isPrimary && mode === "primary-not-image") {
      return Promise.resolve(
        new Response("<html></html>", {
          headers: { "content-type": "text/html" },
          status: 200,
        })
      );
    }
    return Promise.resolve(
      new Response(jpegBytes, {
        headers: { "content-type": "image/jpeg; charset=binary" },
        status: 200,
      })
    );
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

async function count(table: string): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM ${table}`
  ).first<{
    count: number;
  }>();
  return row?.count ?? 0;
}

function sorted(values: string[]): string[] {
  // oxlint-disable-next-line unicorn/no-array-sort -- sorts a fresh copy.
  return [...values].sort();
}

async function mediaKeys(): Promise<string[]> {
  const listed = await env.MEDIA_BUCKET.list();
  return sorted(listed.objects.map(({ key }) => key));
}

async function postSeed(headers: Record<string, string>, body = "") {
  const handlers = Route.options.server?.handlers;
  if (!(handlers && "POST" in handlers && handlers.POST)) {
    throw new Error("The preview seed route has no POST handler");
  }
  const request = new Request("http://localhost/api/preview/seed", {
    body: body || null,
    headers,
    method: "POST",
  });
  // SAFETY: the handler only reads `request`; router-supplied context fields are unused.
  const response = await handlers.POST({ request } as never);
  if (!(response instanceof Response)) {
    throw new Error("The preview seed route did not answer with a Response");
  }
  return response;
}

function setPreviewEnv(appEnv: string | null, seedToken: string | null) {
  for (const [name, value] of [
    ["APP_ENV", appEnv],
    ["PREVIEW_SEED_TOKEN", seedToken],
  ] as const) {
    if (value === null) {
      Reflect.deleteProperty(env, name);
    } else {
      Reflect.set(env, name, value);
    }
  }
}

beforeEach(() => {
  setPreviewEnv("preview", token);
});

async function resetState() {
  await env.DB.batch(
    [
      "stock_movement",
      "variant",
      "product_media",
      "product",
      "category",
      "store_setting",
    ].map((table) => env.DB.prepare(`DELETE FROM ${table}`))
  );
  const listed = await env.MEDIA_BUCKET.list();
  if (listed.objects.length > 0) {
    await env.MEDIA_BUCKET.delete(listed.objects.map(({ key }) => key));
  }
}

afterEach(async () => {
  vi.unstubAllGlobals();
  setPreviewEnv(null, null);
  await resetState();
});

describe("POST /api/preview/seed", () => {
  test("answers 404 outside preview or without the right token", async () => {
    const fetchMock = stubFetch();
    const valid = { [previewSeedTokenHeader]: token };
    const body = JSON.stringify({ limit: 1 });

    setPreviewEnv("production", token);
    const inProduction = await postSeed(valid, body);
    setPreviewEnv(null, token);
    const withoutAppEnv = await postSeed(valid, body);
    setPreviewEnv("preview", token);
    const wrongToken = await postSeed(
      { [previewSeedTokenHeader]: "wrong-token-0123456789" },
      body
    );
    // oxlint-disable-next-line react-doctor/server-sequential-independent-await -- each request runs after the previous env change.
    const noToken = await postSeed({}, body);

    expect(inProduction.status).toBe(404);
    expect(withoutAppEnv.status).toBe(404);
    expect(wrongToken.status).toBe(404);
    expect(noToken.status).toBe(404);
    expect(await count("product")).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("rejects malformed bodies with 400", async () => {
    stubFetch();
    const valid = { [previewSeedTokenHeader]: token };

    const outOfRange = await postSeed(valid, JSON.stringify({ limit: 0 }));
    // oxlint-disable-next-line react-doctor/server-sequential-independent-await -- both requests are independent but cheap.
    const notJson = await postSeed(valid, "{not json");

    expect(outOfRange.status).toBe(400);
    expect(notJson.status).toBe(400);
    expect(await count("product")).toBe(0);
  });

  test("seeds one chunk in preview with a valid token", async () => {
    stubFetch();
    const response = await postSeed(
      { [previewSeedTokenHeader]: token },
      JSON.stringify({ limit: 1 })
    );
    expect(response.status).toBe(200);
    const summary = await response.json<{ nextOffset: number | null }>();
    expect(summary.nextOffset).toBe(1);
    expect(await count("product")).toBe(1);
  });
});

describe("seedPreviewCatalog", () => {
  test("creates the whole demo catalog with photos in R2", async () => {
    const fetchMock = stubFetch();

    const summary = await seedPreviewCatalog();

    expect(summary.nextOffset).toBeNull();
    expect(await count("category")).toBe(demoCategories.length);
    expect(await count("product")).toBe(demoProducts.length);
    expect(await count("variant")).toBe(totalVariants);
    expect(await count("stock_movement")).toBe(stockedVariantCount);
    expect(await count("product_media")).toBe(totalProductImages);
    const shipping = await env.DB.prepare(
      "SELECT value FROM store_setting WHERE key = 'shipping_rate_amount'"
    ).first<{ value: string }>();
    expect(shipping?.value).toBe(demoShippingRateAmount);

    const homeRows = await env.DB.prepare(
      "SELECT key, value FROM store_setting WHERE key LIKE 'home_image_%'"
    ).all<{ key: string; value: string }>();
    expect(sorted(homeRows.results.map(({ key }) => key))).toEqual(
      sorted(homeSlots.map((slot) => `home_image_${slot}`))
    );
    const homeObjects = await Promise.all(
      homeRows.results.map(({ value }) => env.MEDIA_BUCKET.head(value))
    );
    for (const object of homeObjects) {
      expect(object?.httpMetadata?.contentType).toBe("image/jpeg");
    }
    expect(await mediaKeys()).toHaveLength(
      homeSlots.length + totalProductImages
    );

    // One download per distinct image key within a single run.
    const downloadedKeys = fetchMock.mock.calls.length;
    expect(downloadedKeys).toBe(distinctImageKeys.size);
  });

  test("keeps stock only on physical variants that have stock", async () => {
    stubFetch();
    await seedPreviewCatalog();

    const skuRows = await env.DB.prepare(
      "SELECT v.sku AS sku, v.kind AS kind, COALESCE(SUM(m.quantity), 0) AS stock FROM variant v LEFT JOIN stock_movement m ON m.variant_id = v.id GROUP BY v.id"
    ).all<{ kind: string; sku: string; stock: number }>();
    const stockBySku = new Map(skuRows.results.map((row) => [row.sku, row]));
    for (const item of demoProducts) {
      for (const [index, variant] of item.variants.entries()) {
        const row = stockBySku.get(
          demoVariantSku(slugifyDemoProduct(item.name), index)
        );
        expect(row?.kind).toBe(variant.kind);
        expect(row?.stock).toBe(
          variant.kind === "physical" ? (variant.stock ?? 0) : 0
        );
      }
    }
  });

  test("falls back to picsum when the primary photo fails", async () => {
    for (const mode of ["primary-500", "primary-not-image"] as const) {
      const fetchMock = stubFetch(mode);
      // oxlint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- each mode needs a clean database.
      await seedPreviewCatalog({ limit: 1 });

      const urls = fetchMock.mock.calls.map(([input]) => String(input));
      expect(urls.some((url) => url.startsWith("https://picsum.photos/"))).toBe(
        true
      );
      // oxlint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- see above.
      const mediaCount = await count("product_media");
      expect(mediaCount).toBe(demoProducts[0]?.images.length);
      const [firstKey] = demoProducts[0]?.images ?? [];
      expect(urls).toContain(demoImageSources[firstKey ?? "hero"].fallbackUrl);
      // oxlint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- see above.
      await resetState();
    }
  });

  test("fails loudly when both sources fail and keeps R2 clean", async () => {
    stubFetch("all-fail");
    await expect(seedPreviewCatalog()).rejects.toThrow(/hero/u);
    expect(await mediaKeys()).toEqual([]);
  });

  test("fills empty home images without replacing Admin choices or deleting shared uploads", async () => {
    const adminWashi = homeImageObjectKey("washi", "admin");
    const adminPens = homeImageObjectKey("pens", "admin");
    await env.DB.prepare(
      "INSERT INTO store_setting (key, value) VALUES ('home_image_hero', ''), ('home_image_washi', ''), ('home_image_pens', ?)"
    )
      .bind(adminPens)
      .run();
    stubFetch().mockImplementationOnce(async () => {
      await env.DB.prepare(
        "UPDATE store_setting SET value = ? WHERE key = 'home_image_washi'"
      )
        .bind(adminWashi)
        .run();
      return new Response(jpegBytes, {
        headers: { "content-type": "image/jpeg" },
      });
    });

    const summary = await seedPreviewCatalog({ limit: 1 });

    const previewHero = homeImageObjectKey("hero", "preview");
    const rows = await env.DB.prepare(
      "SELECT key, value FROM store_setting WHERE key LIKE 'home_image_%' ORDER BY key"
    ).all<{ key: string; value: string }>();
    expect(rows.results).toEqual([
      { key: "home_image_hero", value: previewHero },
      { key: "home_image_pens", value: adminPens },
      { key: "home_image_washi", value: adminWashi },
    ]);
    expect(summary.homeImages).toEqual({ created: 1, skipped: 2 });
    expect(await mediaKeys()).toEqual(
      expect.arrayContaining([
        previewHero,
        homeImageObjectKey("washi", "preview"),
      ])
    );
  });

  test("is idempotent across repeated full runs", async () => {
    stubFetch();
    await seedPreviewCatalog();
    const keysBefore = await mediaKeys();
    // A sale after the first seed must not be topped up again.
    // oxlint-disable-next-line react-doctor/server-sequential-independent-await -- the sale needs the seeded movement to exist.
    const variantRow = await env.DB.prepare(
      "SELECT m.variant_id AS id, m.quantity AS quantity FROM stock_movement m JOIN variant v ON v.id = m.variant_id ORDER BY v.sku LIMIT 1"
    ).first<{ id: string; quantity: number }>();
    if (!variantRow) {
      throw new Error("Expected at least one seeded stock movement");
    }
    await env.DB.prepare(
      "INSERT INTO stock_movement (id, variant_id, quantity, reason) VALUES ('sale-1', ?, ?, 'sold')"
    )
      .bind(variantRow.id, -variantRow.quantity)
      .run();
    const counts = {
      media: await count("product_media"),
      movements: await count("stock_movement"),
      products: await count("product"),
      variants: await count("variant"),
    };

    const fetchMock = stubFetch();
    const summary = await seedPreviewCatalog();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(summary.categories.created).toBe(0);
    expect(summary.homeImages).toEqual({ created: 0, skipped: 3 });
    expect(summary.products.created).toBe(0);
    expect(summary.variants.created).toBe(0);
    expect(summary.media.created).toBe(0);
    expect(summary.stockMovements.created).toBe(0);
    expect(await count("product_media")).toBe(counts.media);
    expect(await count("stock_movement")).toBe(counts.movements);
    expect(await count("product")).toBe(counts.products);
    expect(await count("variant")).toBe(counts.variants);
    expect(await mediaKeys()).toEqual(keysBefore);
  });

  test("is idempotent across chunked runs", async () => {
    stubFetch();
    const limit = 5;
    let offset: number | null = 0;
    let calls = 0;
    while (offset !== null) {
      // oxlint-disable-next-line no-await-in-loop -- each chunk depends on the previous nextOffset.
      const summary = await seedPreviewCatalog({ limit, offset });
      offset = summary.nextOffset;
      calls += 1;
    }
    expect(calls).toBe(Math.ceil(demoProducts.length / limit));
    const keysBefore = await mediaKeys();
    expect(await count("product")).toBe(demoProducts.length);
    expect(await count("stock_movement")).toBe(stockedVariantCount);

    const fetchMock = stubFetch();
    offset = 0;
    while (offset !== null) {
      // oxlint-disable-next-line no-await-in-loop -- each chunk depends on the previous nextOffset.
      const summary = await seedPreviewCatalog({ limit, offset });
      expect(summary.products.created).toBe(0);
      expect(summary.media.created).toBe(0);
      offset = summary.nextOffset;
    }

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await count("product")).toBe(demoProducts.length);
    expect(await count("variant")).toBe(totalVariants);
    expect(await count("stock_movement")).toBe(stockedVariantCount);
    expect(await mediaKeys()).toEqual(keysBefore);
  });

  test("resumes a product that kept only some of its images", async () => {
    stubFetch();
    const [item] = demoProducts;
    if (!item) {
      throw new Error("The demo catalog is empty");
    }
    const slug = slugifyDemoProduct(item.name);
    const keptKey = "products/partial/kept";
    await env.DB.prepare(
      "INSERT INTO product (id, name, slug, status) VALUES ('partial', ?, ?, 'active')"
    )
      .bind(item.name, slug)
      .run();
    const [firstVariant] = item.variants;
    if (!firstVariant) {
      throw new Error("The first demo product has no variants");
    }
    await env.DB.prepare(
      "INSERT INTO variant (id, product_id, name, sku, kind, price_amount) VALUES ('legacy-v0', 'partial', ?, 'DEMO-legacy-random', ?, ?)"
    )
      .bind(firstVariant.name, firstVariant.kind, firstVariant.price)
      .run();
    await env.DB.prepare(
      "INSERT INTO product_media (id, product_id, r2_key, alt, sort) VALUES ('m0', 'partial', ?, ?, 0)"
    )
      .bind(keptKey, item.name)
      .run();
    await env.MEDIA_BUCKET.put(keptKey, jpegBytes);

    const summary = await seedPreviewCatalog({ limit: 1 });

    expect(summary.products).toMatchObject({ created: 0, existing: 1 });
    expect(summary.media.created).toBe(item.images.length - 1);
    const rows = await env.DB.prepare(
      "SELECT sort, r2_key FROM product_media WHERE product_id = 'partial' ORDER BY sort"
    ).all<{ r2_key: string; sort: number }>();
    expect(rows.results.map(({ sort }) => sort)).toEqual(
      item.images.map((_image, index) => index)
    );
    expect(rows.results[0]?.r2_key).toBe(keptKey);
    expect(await count("product")).toBe(1);
    expect(await count("variant")).toBe(item.variants.length);
    const legacyStock = await env.DB.prepare(
      "SELECT COALESCE(SUM(quantity), 0) AS stock FROM stock_movement WHERE variant_id = 'legacy-v0'"
    ).first<{ stock: number }>();
    expect(legacyStock?.stock).toBe(firstVariant.stock ?? 0);
  });

  test("does not seed stock when a stocked fixture matches a persisted Digital Variant", async () => {
    stubFetch();
    const offset = 1;
    const item = demoProducts[offset];
    const firstVariant = item?.variants[0];
    if (!(item && firstVariant)) {
      throw new Error("The demo product has no variants");
    }
    const slug = slugifyDemoProduct(item.name);
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO product (id, name, slug, status) VALUES ('custom-product', ?, ?, 'active')"
      ).bind(item.name, slug),
      env.DB.prepare(
        "INSERT INTO variant (id, product_id, name, sku, kind, price_amount) VALUES ('custom-digital', 'custom-product', 'Digital edition', ?, 'digital', ?)"
      ).bind(demoVariantSku(slug, 0), firstVariant.price),
    ]);

    const summary = await seedPreviewCatalog({ limit: 1, offset });

    expect(
      await env.DB.prepare(
        "SELECT id FROM stock_movement WHERE variant_id = 'custom-digital'"
      ).first()
    ).toBeNull();
    expect(summary.stockMovements.created).toBe(1);
  });

  test("stays idempotent when two runs overlap concurrently", async () => {
    stubFetch();
    const chunk = demoProducts.slice(0, 2);
    const expectedVariants = chunk.reduce(
      (sum, item) => sum + item.variants.length,
      0
    );
    let expectedMovements = 0;
    for (const item of chunk) {
      for (const variant of item.variants) {
        if (variant.kind === "physical" && (variant.stock ?? 0) > 0) {
          expectedMovements += 1;
        }
      }
    }
    const expectedMedia = chunk.reduce(
      (sum, item) => sum + item.images.length,
      0
    );

    await Promise.all([
      seedPreviewCatalog({ limit: 2, offset: 0 }),
      seedPreviewCatalog({ limit: 2, offset: 0 }),
    ]);

    expect(await count("product")).toBe(chunk.length);
    expect(await count("variant")).toBe(expectedVariants);
    expect(await count("stock_movement")).toBe(expectedMovements);
    expect(await count("product_media")).toBe(expectedMedia);
    expect(await mediaKeys()).toHaveLength(homeSlots.length + expectedMedia);
  });
});
