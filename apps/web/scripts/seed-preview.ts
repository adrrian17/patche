// Seeds the demo catalog into a deployed PR preview, one small chunk at a time.
// Each chunk is idempotent, so a failed chunk is simply retried.
import { previewSeedTokenHeader } from "../src/lib/preview-seed";
import type { PreviewSeedSummary } from "../src/lib/preview-seed";

// Two products per chunk keeps chunk 0 (which also seeds categories and home images) under Workers' 50-subrequest free limit.
const chunkSize = 2;
const maxAttempts = 3;
const retryBaseDelayMs = 1000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required to seed a preview`);
  }
  return value;
}

const baseUrl = requireEnv("PREVIEW_URL").replace(/\/$/u, "");
const token = requireEnv("PREVIEW_SEED_TOKEN");

async function seedChunk(offset: number): Promise<PreviewSeedSummary> {
  let lastError = new Error("No attempt was made");
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- retries are sequential by design.
      const response = await fetch(`${baseUrl}/api/preview/seed`, {
        body: JSON.stringify({ limit: chunkSize, offset }),
        headers: {
          "content-type": "application/json",
          [previewSeedTokenHeader]: token,
        },
        method: "POST",
      });
      if (response.ok) {
        // SAFETY: this script and the route it calls ship in the same commit and share PreviewSeedSummary.
        // oxlint-disable-next-line no-await-in-loop -- see above.
        return (await response.json()) as PreviewSeedSummary;
      }
      // oxlint-disable-next-line no-await-in-loop -- see above.
      const detail = await response.text();
      lastError = new Error(`HTTP ${response.status}: ${detail.slice(0, 300)}`);
      if (response.status < 500) {
        break;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    if (attempt < maxAttempts) {
      // oxlint-disable-next-line no-await-in-loop -- see above.
      await Bun.sleep(retryBaseDelayMs * attempt);
    }
  }
  throw new Error(`Seeding chunk at offset ${offset} failed`, {
    cause: lastError,
  });
}

const totals = {
  categories: 0,
  homeImagesCreated: 0,
  homeImagesSkipped: 0,
  mediaCreated: 0,
  productsCreated: 0,
  productsExisting: 0,
  stockMovements: 0,
  variants: 0,
};
let offset: number | null = 0;
while (offset !== null) {
  // oxlint-disable-next-line no-await-in-loop -- each chunk starts where the previous one ended.
  const summary: PreviewSeedSummary = await seedChunk(offset);
  totals.categories += summary.categories.created;
  totals.homeImagesCreated += summary.homeImages.created;
  totals.homeImagesSkipped += summary.homeImages.skipped;
  totals.mediaCreated += summary.media.created;
  totals.productsCreated += summary.products.created;
  totals.productsExisting += summary.products.existing;
  totals.stockMovements += summary.stockMovements.created;
  totals.variants += summary.variants.created;
  console.log(
    `chunk at offset ${offset}: ${summary.products.processed} products processed`
  );
  offset = summary.nextOffset;
}

console.log(`Preview seeded at ${baseUrl}`);
console.log(
  `Categories created: ${totals.categories}. Home images: ${totals.homeImagesCreated} created, ${totals.homeImagesSkipped} kept.`
);
console.log(
  `Products: ${totals.productsCreated} created, ${totals.productsExisting} already there. Variants created: ${totals.variants}. Stock movements: ${totals.stockMovements}. Photos uploaded: ${totals.mediaCreated}.`
);
