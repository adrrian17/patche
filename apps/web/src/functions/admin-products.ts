import { createDb } from "@patche/db";
import { product, productMedia, variant } from "@patche/db/schema/catalog";
import { stockMovement } from "@patche/db/schema/inventory";
import { mediaPublicUrl } from "@patche/storage";
import { createServerFn } from "@tanstack/react-start";
import { asc, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { z } from "zod";

import { getMediaPublicBaseUrl } from "@/lib/storage.server";
import { adminMiddleware } from "@/middleware/admin";

const idSchema = z.string().min(1).max(32);

export const listAdminProducts = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const db = createDb();
    const candidateMedia = alias(productMedia, "candidate_media");
    // ponytail: loads every Variant and Media row at once; paginate the list when the catalog outgrows one page.
    const [products, variants, media] = await Promise.all([
      db
        .select({
          createdAt: product.createdAt,
          id: product.id,
          name: product.name,
          slug: product.slug,
          status: product.status,
        })
        .from(product)
        .orderBy(desc(product.createdAt)),
      db
        .select({
          archivedAt: variant.archivedAt,
          id: variant.id,
          kind: variant.kind,
          lowStockThreshold: variant.lowStockThreshold,
          name: variant.name,
          priceAmount: variant.priceAmount,
          productId: variant.productId,
          stock: sql<number>`coalesce(sum(${stockMovement.quantity}), 0)`,
        })
        .from(variant)
        .leftJoin(stockMovement, eq(stockMovement.variantId, variant.id))
        .groupBy(variant.id)
        .orderBy(asc(variant.name)),
      db
        .select({
          alt: productMedia.alt,
          productId: productMedia.productId,
          r2Key: productMedia.r2Key,
        })
        .from(productMedia)
        .where(
          eq(
            productMedia.id,
            db
              .select({ id: candidateMedia.id })
              .from(candidateMedia)
              .where(eq(candidateMedia.productId, productMedia.productId))
              .orderBy(asc(candidateMedia.sort), asc(candidateMedia.id))
              .limit(1)
          )
        )
        .orderBy(asc(productMedia.sort)),
    ]);
    const mediaBaseUrl = getMediaPublicBaseUrl();
    const mainImages = new Map<string, { alt: string; url: string }>();
    for (const item of media) {
      if (!mainImages.has(item.productId)) {
        mainImages.set(item.productId, {
          alt: item.alt,
          url: mediaPublicUrl(mediaBaseUrl, item.r2Key),
        });
      }
    }
    const variantsByProduct = new Map<string, typeof variants>();
    for (const item of variants) {
      const group = variantsByProduct.get(item.productId);
      if (group) {
        group.push(item);
      } else {
        variantsByProduct.set(item.productId, [item]);
      }
    }
    return products.map((item) => ({
      ...item,
      mainImage: mainImages.get(item.id) ?? null,
      variants: variantsByProduct.get(item.id) ?? [],
    }));
  });

export const getAdminProduct = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const db = createDb();
    const matchingProduct = await db
      .select()
      .from(product)
      .where(eq(product.id, data.id))
      .get();
    if (!matchingProduct) {
      throw new Error("Product no encontrado");
    }

    const [variants, media] = await Promise.all([
      db
        .select()
        .from(variant)
        .where(eq(variant.productId, data.id))
        .orderBy(asc(variant.name)),
      db
        .select()
        .from(productMedia)
        .where(eq(productMedia.productId, data.id))
        .orderBy(asc(productMedia.sort)),
    ]);
    const mediaBaseUrl = getMediaPublicBaseUrl();

    return {
      media: media.map((item) => ({
        ...item,
        url: mediaPublicUrl(mediaBaseUrl, item.r2Key),
      })),
      product: matchingProduct,
      variants,
    };
  });
