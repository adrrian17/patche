import { createDb } from "@patche/db";
import {
  category,
  product,
  productMedia,
  variant,
  variantKinds,
} from "@patche/db/schema/catalog";
import { stockMovement } from "@patche/db/schema/inventory";
import { storeSetting } from "@patche/db/schema/settings";
import { mediaPublicUrl } from "@patche/storage";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, inArray, isNull, like, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { z } from "zod";

import { catalogSorts } from "@/lib/catalog";
import type { CatalogSort, VariantKind } from "@/lib/catalog";
import { getMediaPublicBaseUrl } from "@/lib/storage.server";

export interface StoreImage {
  alt: string;
  url: string;
}

export interface StoreVariant {
  id: string;
  kind: VariantKind;
  // Zero means sold out. Digital Variants cap at one copy because the file is the same.
  maxQuantity: number;
  name: string;
  priceAmount: number;
}

export interface StoreProductCard {
  category: string | null;
  fromPrice: number;
  hasPriceRange: boolean;
  image: StoreImage | null;
  kinds: VariantKind[];
  name: string;
  // Set when the Product sells a single Variant, so a card can add it to the cart directly.
  onlyVariant: StoreVariant | null;
  slug: string;
  summary: string;
}

const maxCartQuantity = 99;
const shippingRateKey = "shipping_rate_amount";

function toMaxQuantity(kind: VariantKind, stock: number) {
  return kind === "digital" ? 1 : Math.max(0, Math.min(stock, maxCartQuantity));
}

function summarize(description: string) {
  return (
    description
      .split("\n")
      .find((line) => line.trim())
      ?.trim() ?? ""
  );
}

const stockSum = sql<number>`coalesce(sum(${stockMovement.quantity}), 0)`;

function selectStoreVariants(db: ReturnType<typeof createDb>, where: SQL[]) {
  return db
    .select({
      id: variant.id,
      kind: variant.kind,
      name: variant.name,
      priceAmount: variant.priceAmount,
      productId: variant.productId,
      stock: stockSum,
    })
    .from(variant)
    .innerJoin(product, eq(variant.productId, product.id))
    .leftJoin(stockMovement, eq(stockMovement.variantId, variant.id))
    .where(
      and(eq(product.status, "active"), isNull(variant.archivedAt), ...where)
    )
    .groupBy(variant.id)
    .orderBy(asc(variant.priceAmount), asc(variant.name));
}

function toStoreVariant(row: {
  id: string;
  kind: VariantKind;
  name: string;
  priceAmount: number;
  stock: number;
}): StoreVariant {
  return {
    id: row.id,
    kind: row.kind,
    maxQuantity: toMaxQuantity(row.kind, row.stock),
    name: row.name,
    priceAmount: row.priceAmount,
  };
}

const listSchema = z.object({
  category: z.string().max(160).optional(),
  excludeSlug: z.string().max(200).optional(),
  kind: z.enum(variantKinds).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  q: z.string().trim().max(160).optional(),
  sort: z.enum(catalogSorts).default("newest"),
});

export const listStoreProducts = createServerFn({ method: "GET" })
  .validator(listSchema)
  .handler(async ({ data }): Promise<StoreProductCard[]> => {
    const db = createDb();
    const productFilters: SQL[] = [eq(product.status, "active")];
    if (data.category) {
      productFilters.push(eq(category.slug, data.category));
    }
    if (data.q) {
      productFilters.push(like(product.name, `%${data.q}%`));
    }
    // ponytail: loads the whole active catalog per request; paginate in SQL when it outgrows one page.
    const [products, variants, media] = await Promise.all([
      db
        .select({
          category: category.name,
          createdAt: product.createdAt,
          description: product.description,
          id: product.id,
          name: product.name,
          slug: product.slug,
        })
        .from(product)
        .leftJoin(category, eq(product.categoryId, category.id))
        .where(and(...productFilters)),
      selectStoreVariants(db, []),
      db
        .select({
          alt: productMedia.alt,
          productId: productMedia.productId,
          r2Key: productMedia.r2Key,
        })
        .from(productMedia)
        .innerJoin(product, eq(productMedia.productId, product.id))
        .where(eq(product.status, "active"))
        .orderBy(asc(productMedia.sort), asc(productMedia.id)),
    ]);

    const mediaBaseUrl = getMediaPublicBaseUrl();
    const images = new Map<string, StoreImage>();
    for (const item of media) {
      if (!images.has(item.productId)) {
        images.set(item.productId, {
          alt: item.alt,
          url: mediaPublicUrl(mediaBaseUrl, item.r2Key),
        });
      }
    }
    const variantsByProduct = new Map<string, typeof variants>();
    for (const row of variants) {
      const group = variantsByProduct.get(row.productId);
      if (group) {
        group.push(row);
      } else {
        variantsByProduct.set(row.productId, [row]);
      }
    }

    const cards = products.flatMap((row) => {
      const productVariants = variantsByProduct.get(row.id) ?? [];
      const [cheapest] = productVariants;
      if (!cheapest || row.slug === data.excludeSlug) {
        return [];
      }
      const kinds = [...new Set(productVariants.map(({ kind }) => kind))];
      if (data.kind && !kinds.includes(data.kind)) {
        return [];
      }
      return [
        {
          card: {
            category: row.category,
            fromPrice: cheapest.priceAmount,
            hasPriceRange: productVariants.some(
              ({ priceAmount }) => priceAmount !== cheapest.priceAmount
            ),
            image: images.get(row.id) ?? null,
            kinds,
            name: row.name,
            onlyVariant:
              productVariants.length === 1 ? toStoreVariant(cheapest) : null,
            slug: row.slug,
            summary: summarize(row.description),
          },
          createdAt: row.createdAt.getTime(),
        },
      ];
    });

    const comparators = {
      newest: (a, b) => b.createdAt - a.createdAt,
      "price-asc": (a, b) => a.card.fromPrice - b.card.fromPrice,
      "price-desc": (a, b) => b.card.fromPrice - a.card.fromPrice,
    } satisfies Record<
      CatalogSort,
      (a: (typeof cards)[number], b: (typeof cards)[number]) => number
    >;
    // oxlint-disable-next-line unicorn/no-array-sort -- cards is a local array and the lib target predates toSorted.
    cards.sort(comparators[data.sort]);
    return cards.slice(0, data.limit).map(({ card }) => card);
  });

export const listStoreCategories = createServerFn({ method: "GET" }).handler(
  () =>
    createDb()
      .select({ name: category.name, slug: category.slug })
      .from(category)
      .orderBy(asc(category.name))
);

export const getStoreProduct = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    const db = createDb();
    const found = await db
      .select({
        categoryName: category.name,
        categorySlug: category.slug,
        description: product.description,
        id: product.id,
        name: product.name,
        slug: product.slug,
      })
      .from(product)
      .leftJoin(category, eq(product.categoryId, category.id))
      .where(and(eq(product.slug, data.slug), eq(product.status, "active")))
      .get();
    if (!found) {
      return null;
    }

    const [variants, media] = await Promise.all([
      selectStoreVariants(db, [eq(variant.productId, found.id)]),
      db
        .select({ alt: productMedia.alt, r2Key: productMedia.r2Key })
        .from(productMedia)
        .where(eq(productMedia.productId, found.id))
        .orderBy(asc(productMedia.sort), asc(productMedia.id)),
    ]);
    const [firstVariant, ...otherVariants] = variants.map(toStoreVariant);
    if (!firstVariant) {
      return null;
    }
    const storeVariants: [StoreVariant, ...StoreVariant[]] = [
      firstVariant,
      ...otherVariants,
    ];

    const mediaBaseUrl = getMediaPublicBaseUrl();
    return {
      category:
        found.categoryName && found.categorySlug
          ? { name: found.categoryName, slug: found.categorySlug }
          : null,
      description: found.description,
      images: media.map((item) => ({
        alt: item.alt,
        url: mediaPublicUrl(mediaBaseUrl, item.r2Key),
      })),
      name: found.name,
      slug: found.slug,
      variants: storeVariants,
    };
  });

export type StoreProduct = NonNullable<
  Awaited<ReturnType<typeof getStoreProduct>>
>;

export interface CartLineDetail {
  image: StoreImage | null;
  productName: string;
  productSlug: string;
  variant: StoreVariant;
}

export const getCartDetails = createServerFn({ method: "POST" })
  .validator(
    z.object({ variantIds: z.array(z.string().min(1).max(32)).max(10) })
  )
  .handler(async ({ data }) => {
    const db = createDb();
    if (data.variantIds.length === 0) {
      return { lines: [], shippingRateAmount: 0 };
    }

    const [variants, setting] = await Promise.all([
      db
        .select({
          id: variant.id,
          kind: variant.kind,
          name: variant.name,
          priceAmount: variant.priceAmount,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          stock: stockSum,
        })
        .from(variant)
        .innerJoin(product, eq(variant.productId, product.id))
        .leftJoin(stockMovement, eq(stockMovement.variantId, variant.id))
        .where(
          and(
            inArray(variant.id, data.variantIds),
            eq(product.status, "active"),
            isNull(variant.archivedAt)
          )
        )
        .groupBy(variant.id),
      db
        .select({ value: storeSetting.value })
        .from(storeSetting)
        .where(eq(storeSetting.key, shippingRateKey))
        .get(),
    ]);

    const productIds = [...new Set(variants.map((row) => row.productId))];
    const media =
      productIds.length === 0
        ? []
        : await db
            .select({
              alt: productMedia.alt,
              productId: productMedia.productId,
              r2Key: productMedia.r2Key,
            })
            .from(productMedia)
            .where(inArray(productMedia.productId, productIds))
            .orderBy(asc(productMedia.sort), asc(productMedia.id));
    const mediaBaseUrl = getMediaPublicBaseUrl();
    const images = new Map<string, StoreImage>();
    for (const item of media) {
      if (!images.has(item.productId)) {
        images.set(item.productId, {
          alt: item.alt,
          url: mediaPublicUrl(mediaBaseUrl, item.r2Key),
        });
      }
    }

    return {
      lines: variants.map((row): CartLineDetail => ({
        image: images.get(row.productId) ?? null,
        productName: row.productName,
        productSlug: row.productSlug,
        variant: toStoreVariant(row),
      })),
      shippingRateAmount: Number(setting?.value ?? 0),
    };
  });
