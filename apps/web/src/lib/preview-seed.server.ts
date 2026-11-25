import { createDb } from "@patche/db";
import {
  category,
  product,
  productMedia,
  variant,
} from "@patche/db/schema/catalog";
import { stockMovement } from "@patche/db/schema/inventory";
import { storeSetting } from "@patche/db/schema/settings";
import {
  homeImageObjectKey,
  homeImageSlots,
  mediaObjectKey,
} from "@patche/storage";
import type { HomeImageSlot } from "@patche/storage";
import { eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import { homeImageSettingKey } from "@/functions/home-images";

import {
  demoCategories,
  demoHomeImages,
  demoProducts,
  demoImageSources,
  demoShippingRateAmount,
  demoVariantSku,
  slugifyDemoProduct,
} from "./demo-catalog";
import type { DemoImageKey, DemoProduct } from "./demo-catalog";
import type { PreviewSeedRequest, PreviewSeedSummary } from "./preview-seed";
import {
  deleteStorageObjectWithRetry,
  getMediaBucket,
  validateMediaFile,
} from "./storage.server";

const downloadTimeoutMs = 10_000;
const productStaggerMs = 60_000;
const shippingRateKey = "shipping_rate_amount";
const stockNote = "Preview";

interface DownloadedImage {
  bytes: ArrayBuffer;
  contentType: string;
}

type ImageCache = Map<DemoImageKey, DownloadedImage>;
type Db = ReturnType<typeof createDb>;

async function fetchImage(url: string): Promise<DownloadedImage> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(downloadTimeoutMs),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }
  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    ?.trim()
    .toLowerCase();
  const bytes = await response.arrayBuffer();
  // Reuses the admin upload rules: allowed image types and a non-empty body within the size limit.
  const invalid = validateMediaFile(
    new File([bytes], "demo-image", { type: contentType })
  );
  if (invalid) {
    throw new Error(
      `${url} is not a usable image (${contentType || "no content type"}, ${bytes.byteLength} bytes)`
    );
  }
  return { bytes, contentType: contentType ?? "" };
}

async function downloadImage(
  key: DemoImageKey,
  cache: ImageCache
): Promise<DownloadedImage> {
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }
  const { fallbackUrl, primaryUrl } = demoImageSources[key];
  let image: DownloadedImage;
  try {
    image = await fetchImage(primaryUrl);
  } catch (primaryError) {
    try {
      image = await fetchImage(fallbackUrl);
    } catch (fallbackError) {
      throw new Error(
        `Could not download demo image "${key}": ${String(primaryError)}; fallback: ${String(fallbackError)}`,
        { cause: fallbackError }
      );
    }
  }
  cache.set(key, image);
  return image;
}

// Downloads a photo, uploads it to its deterministic R2 key, then records it.
// A failed record leaves the key untouched so an overlapping run's committed row cannot lose its object.
async function storeDemoImage<T>(
  imageKey: DemoImageKey,
  objectKey: string,
  cache: ImageCache,
  record: () => Promise<T>
): Promise<T> {
  const bucket = getMediaBucket();
  const image = await downloadImage(imageKey, cache);
  await bucket.put(objectKey, image.bytes, {
    httpMetadata: { contentType: image.contentType },
  });
  return await record();
}

async function seedHomeImage(
  db: Db,
  slot: HomeImageSlot,
  cache: ImageCache
): Promise<"created" | "skipped"> {
  const settingKey = homeImageSettingKey(slot);
  const objectKey = homeImageObjectKey(slot, "preview");
  const inserted = await storeDemoImage(
    demoHomeImages[slot],
    objectKey,
    cache,
    () =>
      db
        .insert(storeSetting)
        .values({ key: settingKey, value: objectKey })
        .onConflictDoNothing({ target: storeSetting.key })
        .returning({ key: storeSetting.key })
  );
  if (inserted.length > 0) {
    return "created";
  }
  const current = await db
    .select({ value: storeSetting.value })
    .from(storeSetting)
    .where(eq(storeSetting.key, settingKey))
    .get();
  // Drop our upload only when another writer owns the slot under a different key.
  if (current?.value !== objectKey) {
    await deleteStorageObjectWithRetry(getMediaBucket(), objectKey);
  }
  return "skipped";
}

async function seedHomeImages(
  db: Db,
  cache: ImageCache
): Promise<PreviewSeedSummary["homeImages"]> {
  const existing = await db
    .select({ key: storeSetting.key, value: storeSetting.value })
    .from(storeSetting)
    .where(inArray(storeSetting.key, homeImageSlots.map(homeImageSettingKey)));
  const filled = new Set<string>();
  for (const { key, value } of existing) {
    if (value) {
      filled.add(key);
    }
  }
  const result = { created: 0, skipped: 0 };
  for (const slot of homeImageSlots) {
    if (filled.has(homeImageSettingKey(slot))) {
      result.skipped += 1;
      continue;
    }
    // oxlint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- one slot at a time keeps the subrequest count low.
    result[await seedHomeImage(db, slot, cache)] += 1;
  }
  return result;
}

async function seedVariants(
  db: Db,
  productId: string,
  slug: string,
  item: DemoProduct,
  isNew: boolean
) {
  const existing = isNew
    ? []
    : await db
        .select({ id: variant.id, name: variant.name, sku: variant.sku })
        .from(variant)
        .where(eq(variant.productId, productId));
  const knownSkus = new Set(existing.map(({ sku }) => sku));
  const knownNames = new Set(existing.map(({ name }) => name));
  const missing = item.variants.flatMap((demoVariant, index) => {
    const sku = demoVariantSku(slug, index);
    if (knownSkus.has(sku) || knownNames.has(demoVariant.name)) {
      return [];
    }
    return [
      {
        kind: demoVariant.kind,
        name: demoVariant.name,
        priceAmount: demoVariant.price,
        productId,
        sku,
      },
    ];
  });
  const inserted =
    missing.length === 0
      ? []
      : await db
          .insert(variant)
          .values(missing)
          .onConflictDoNothing({ target: variant.sku })
          .returning({ id: variant.id, sku: variant.sku });
  if (inserted.length === missing.length) {
    return { existing, inserted, isNew };
  }
  const persisted = await db
    .select({ id: variant.id, name: variant.name, sku: variant.sku })
    .from(variant)
    .where(eq(variant.productId, productId));
  return { existing: persisted, inserted, isNew: false };
}

async function findVariantsWithMovements(
  db: Db,
  variantIds: string[]
): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ variantId: stockMovement.variantId })
    .from(stockMovement)
    .where(inArray(stockMovement.variantId, variantIds));
  return new Set(rows.map(({ variantId }) => variantId));
}

async function seedStock(
  db: Db,
  item: DemoProduct,
  slug: string,
  variants: Awaited<ReturnType<typeof seedVariants>>
): Promise<number> {
  const idBySku = new Map(
    [...variants.existing, ...variants.inserted].map(({ id, sku }) => [sku, id])
  );
  const idByName = new Map(variants.existing.map(({ id, name }) => [name, id]));
  const candidates = item.variants.flatMap((demoVariant, index) => {
    const id =
      idBySku.get(demoVariantSku(slug, index)) ??
      idByName.get(demoVariant.name);
    const stock = demoVariant.stock ?? 0;
    return id && demoVariant.kind === "physical" && stock > 0
      ? [{ quantity: stock, variantId: id }]
      : [];
  });
  if (candidates.length === 0) {
    return 0;
  }
  // A variant that has any movement, even a sale, is never topped up again.
  const withMovements = variants.isNew
    ? new Set<string>()
    : await findVariantsWithMovements(
        db,
        candidates.map(({ variantId }) => variantId)
      );
  let created = 0;
  for (const candidate of candidates) {
    if (withMovements.has(candidate.variantId)) {
      continue;
    }
    // Atomic check-and-insert so overlapping runs cannot double-seed initial Stock.
    // oxlint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- at most 3 physical variants per product.
    const result = await db.run(
      sql`INSERT INTO stock_movement (id, variant_id, quantity, reason, note)
        SELECT ${nanoid()}, ${candidate.variantId}, ${candidate.quantity}, 'received', ${stockNote}
        WHERE NOT EXISTS (
          SELECT 1 FROM stock_movement WHERE variant_id = ${candidate.variantId}
        )`
    );
    created += result.meta.changes ?? 0;
  }
  return created;
}

async function findExistingSorts(
  db: Db,
  productId: string
): Promise<Set<number>> {
  const rows = await db
    .select({ sort: productMedia.sort })
    .from(productMedia)
    .where(eq(productMedia.productId, productId));
  return new Set(rows.map(({ sort }) => sort));
}

async function seedMedia(
  db: Db,
  productId: string,
  item: DemoProduct,
  isNew: boolean,
  cache: ImageCache
): Promise<{ created: number; skipped: number }> {
  const existingSorts = isNew
    ? new Set<number>()
    : await findExistingSorts(db, productId);
  const result = { created: 0, skipped: 0 };
  for (const [sort, imageKey] of item.images.entries()) {
    if (existingSorts.has(sort)) {
      result.skipped += 1;
      continue;
    }
    const objectKey = mediaObjectKey(productId, `preview-${sort}`);
    // oxlint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- uploads keep their order so the first image is the main one.
    const inserted = await storeDemoImage(imageKey, objectKey, cache, () =>
      db
        .insert(productMedia)
        .values({ alt: item.name, productId, r2Key: objectKey, sort })
        .onConflictDoNothing({ target: productMedia.r2Key })
        .returning({ id: productMedia.id })
    );
    result[inserted.length > 0 ? "created" : "skipped"] += 1;
  }
  return result;
}

async function findProductId(db: Db, slug: string): Promise<string> {
  const [row] = await db
    .select({ id: product.id })
    .from(product)
    .where(eq(product.slug, slug));
  if (!row) {
    throw new Error(`Demo product ${slug} disappeared during seeding`);
  }
  return row.id;
}

interface ProductPlan {
  categoryId: string | null;
  createdAt: Date;
  existingId: string | undefined;
  slug: string;
}

async function seedProduct(
  db: Db,
  item: DemoProduct,
  plan: ProductPlan,
  cache: ImageCache
) {
  const { slug } = plan;
  let productId = plan.existingId;
  let isNew = false;
  if (!productId) {
    const [inserted] = await db
      .insert(product)
      .values({
        categoryId: plan.categoryId,
        createdAt: plan.createdAt,
        description: item.description,
        name: item.name,
        slug,
        status: "active",
        updatedAt: plan.createdAt,
      })
      .onConflictDoNothing({ target: product.slug })
      .returning({ id: product.id });
    isNew = inserted !== undefined;
    productId = inserted?.id ?? (await findProductId(db, slug));
  }
  const variants = await seedVariants(db, productId, slug, item, isNew);
  const stockMovements = await seedStock(db, item, slug, variants);
  // oxlint-disable-next-line react-doctor/server-sequential-independent-await -- one product at a time keeps the subrequest count bounded.
  const media = await seedMedia(db, productId, item, isNew, cache);
  return { isNew, media, stockMovements, variants: variants.inserted.length };
}

export async function seedPreviewCatalog(
  input: Partial<PreviewSeedRequest> = {}
): Promise<PreviewSeedSummary> {
  const db = createDb();
  const offset = input.offset ?? 0;
  const cache: ImageCache = new Map();
  const summary: PreviewSeedSummary = {
    categories: { created: 0, total: demoCategories.length },
    homeImages: { created: 0, skipped: 0 },
    media: { created: 0, skipped: 0 },
    nextOffset: null,
    products: { created: 0, existing: 0, processed: 0 },
    stockMovements: { created: 0 },
    variants: { created: 0 },
  };

  if (offset === 0) {
    const createdCategories = await db
      .insert(category)
      .values([...demoCategories])
      .onConflictDoNothing({ target: category.slug })
      .returning({ slug: category.slug });
    summary.categories.created = createdCategories.length;
    await db
      .insert(storeSetting)
      .values({ key: shippingRateKey, value: demoShippingRateAmount })
      .onConflictDoNothing({ target: storeSetting.key });
    summary.homeImages = await seedHomeImages(db, cache);
  }

  const slice = demoProducts.slice(
    offset,
    input.limit === undefined ? undefined : offset + input.limit
  );
  const categoryRows = await db
    .select({ id: category.id, slug: category.slug })
    .from(category);
  const categoryIdBySlug = new Map(
    categoryRows.map((row) => [row.slug, row.id])
  );
  const slugs = slice.map((item) => slugifyDemoProduct(item.name));
  const existingProducts =
    slugs.length === 0
      ? []
      : await db
          .select({ id: product.id, slug: product.slug })
          .from(product)
          .where(inArray(product.slug, slugs));
  const productIdBySlug = new Map(
    existingProducts.map((row) => [row.slug, row.id])
  );
  const now = Date.now();

  for (const [index, item] of slice.entries()) {
    const slug = slugifyDemoProduct(item.name);
    const createdAt = new Date(
      now - (demoProducts.length - (offset + index)) * productStaggerMs
    );
    // oxlint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- products are seeded one at a time to stay under the subrequest limit.
    const result = await seedProduct(
      db,
      item,
      {
        categoryId: categoryIdBySlug.get(item.category) ?? null,
        createdAt,
        existingId: productIdBySlug.get(slug),
        slug,
      },
      cache
    );
    summary.products.processed += 1;
    summary.products[result.isNew ? "created" : "existing"] += 1;
    summary.variants.created += result.variants;
    summary.stockMovements.created += result.stockMovements;
    summary.media.created += result.media.created;
    summary.media.skipped += result.media.skipped;
  }

  const processedUpTo = offset + slice.length;
  summary.nextOffset =
    processedUpTo < demoProducts.length ? processedUpTo : null;
  return summary;
}
