import { describe, expect, test } from "bun:test";

import {
  demoCategories,
  demoHomeImages,
  demoImageSources,
  demoProducts,
  demoVariantSku,
  slugifyDemoProduct,
} from "./demo-catalog";
import {
  isAuthorizedPreviewSeedRequest,
  previewSeedRequestSchema,
} from "./preview-seed";

const validToken = "preview-token-0123456789abcdef";
const maxSlugLength = 160;

describe("isAuthorizedPreviewSeedRequest", () => {
  test("accepts requests only in preview with a matching token", () => {
    expect(
      isAuthorizedPreviewSeedRequest({
        appEnv: "preview",
        expectedToken: validToken,
        providedToken: validToken,
      })
    ).toBe(true);
  });

  test("refuses every non-preview environment even with a matching token", () => {
    for (const appEnv of ["production", "e2e", "development", undefined, ""]) {
      expect(
        isAuthorizedPreviewSeedRequest({
          appEnv,
          expectedToken: validToken,
          providedToken: validToken,
        })
      ).toBe(false);
    }
  });

  test("refuses missing, short, mismatched, and different-length tokens", () => {
    const base = { appEnv: "preview", expectedToken: validToken };
    expect(
      // oxlint-disable-next-line sonarjs/no-undefined-assignment -- the contract accepts a missing header.
      isAuthorizedPreviewSeedRequest({ ...base, providedToken: undefined })
    ).toBe(false);
    expect(
      isAuthorizedPreviewSeedRequest({ ...base, providedToken: null })
    ).toBe(false);
    expect(isAuthorizedPreviewSeedRequest({ ...base, providedToken: "" })).toBe(
      false
    );
    expect(
      isAuthorizedPreviewSeedRequest({
        ...base,
        providedToken: "preview-token-0123456789abcdeX",
      })
    ).toBe(false);
    expect(
      isAuthorizedPreviewSeedRequest({
        ...base,
        providedToken: `${validToken}-longer`,
      })
    ).toBe(false);
    expect(
      isAuthorizedPreviewSeedRequest({
        appEnv: "preview",
        // oxlint-disable-next-line sonarjs/no-undefined-assignment -- the contract accepts a missing token.
        expectedToken: undefined,
        providedToken: validToken,
      })
    ).toBe(false);
    expect(
      isAuthorizedPreviewSeedRequest({
        appEnv: "preview",
        expectedToken: "short",
        providedToken: "short",
      })
    ).toBe(false);
  });
});

describe("previewSeedRequestSchema", () => {
  test("defaults to the first two-product page", () => {
    expect(previewSeedRequestSchema.parse({})).toEqual({ limit: 2, offset: 0 });
  });

  test("accepts the maximum page size with a nonzero offset", () => {
    expect(previewSeedRequestSchema.parse({ limit: 2, offset: 10 })).toEqual({
      limit: 2,
      offset: 10,
    });
  });

  test("rejects negative offsets and out-of-range limits", () => {
    expect(previewSeedRequestSchema.safeParse({ offset: -1 }).success).toBe(
      false
    );
    expect(previewSeedRequestSchema.safeParse({ limit: 0 }).success).toBe(
      false
    );
    expect(previewSeedRequestSchema.safeParse({ limit: 3 }).success).toBe(
      false
    );
    expect(previewSeedRequestSchema.safeParse({ limit: 1.5 }).success).toBe(
      false
    );
  });
});

describe("demo catalog", () => {
  test("every image key resolves to a primary and a picsum fallback URL", () => {
    const keys = new Set([
      ...Object.values(demoHomeImages),
      ...demoProducts.flatMap((item) => item.images),
    ]);
    for (const key of keys) {
      const source = demoImageSources[key];
      expect(source.primaryUrl).toStartWith("https://images.unsplash.com/");
      expect(source.fallbackUrl).toStartWith(
        `https://picsum.photos/seed/${key}/`
      );
    }
  });

  test("every product points at an existing category", () => {
    const slugs = new Set(demoCategories.map(({ slug }) => slug));
    for (const item of demoProducts) {
      expect(slugs.has(item.category)).toBe(true);
    }
  });

  test("product slugs and variant SKUs are unique and within limits", () => {
    const slugs = demoProducts.map((item) => slugifyDemoProduct(item.name));
    expect(new Set(slugs).size).toBe(slugs.length);
    const skus = demoProducts.flatMap((item) =>
      item.variants.map((_variant, index) =>
        demoVariantSku(slugifyDemoProduct(item.name), index)
      )
    );
    expect(new Set(skus).size).toBe(skus.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^demo-[a-z0-9]+(?:-[a-z0-9]+)*$/u);
      expect(slug.length).toBeLessThanOrEqual(maxSlugLength);
    }
  });

  test("builds deterministic demo SKUs", () => {
    expect(demoVariantSku("demo-agenda-diaria-premium", 1)).toBe(
      "DEMO-AGENDA-DIARIA-PREMIUM-2"
    );
  });
});
