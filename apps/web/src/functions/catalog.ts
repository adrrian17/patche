import { createDb } from "@patche/db";
import {
  product,
  productMedia,
  productStatuses,
  variant,
  variantKinds,
} from "@patche/db/schema/catalog";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { uniqueSlug } from "@/lib/slug";
import {
  deleteOrphanMedia,
  deleteStorageObjectWithRetry,
  getMediaBucket,
} from "@/lib/storage.server";
import { adminMiddleware } from "@/middleware/admin";

const idSchema = z.string().min(1).max(32);
const nameSchema = z.string().trim().min(1).max(160);
const priceSchema = z.number().int().min(0).max(100_000_000);
const productNotFoundMessage = "Product no encontrado";
const variantNotFoundMessage = "Variant no encontrada";

export const createProduct = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      categoryId: idSchema.nullable().default(null),
      description: z.string().trim().max(10_000).default(""),
      name: nameSchema,
      status: z.enum(productStatuses).default("draft"),
    })
  )
  .handler(async ({ data }) => {
    const db = createDb();
    const slug = await uniqueSlug(data.name, async (candidate) => {
      const matchingProduct = await db
        .select({ id: product.id })
        .from(product)
        .where(eq(product.slug, candidate))
        .get();
      return Boolean(matchingProduct);
    });
    const products = await db
      .insert(product)
      .values({ ...data, slug })
      .returning();
    const [createdProduct] = products;
    if (!createdProduct) {
      throw new Error("No se pudo crear el Product");
    }
    return createdProduct;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      categoryId: idSchema.nullable(),
      description: z.string().trim().max(10_000),
      id: idSchema,
      name: nameSchema,
      status: z.enum(["draft", "active"]),
    })
  )
  .handler(async ({ data }) => {
    const db = createDb();
    const current = await db
      .select()
      .from(product)
      .where(eq(product.id, data.id))
      .get();
    if (!current) {
      throw new Error(productNotFoundMessage);
    }

    const next = {
      categoryId: data.categoryId,
      description: data.description,
      name: data.name,
      slug: current.slug,
      status: data.status,
    };
    await db.update(product).set(next).where(eq(product.id, data.id));
    return { ...current, ...next };
  });

export const archiveProduct = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const db = createDb();
    const current = await db
      .select({
        status: product.status,
      })
      .from(product)
      .where(eq(product.id, data.id))
      .get();
    if (!current) {
      throw new Error(productNotFoundMessage);
    }
    if (current.status === "archived") {
      return { status: "archived" as const };
    }

    await db
      .update(product)
      .set({ status: "archived" })
      .where(eq(product.id, data.id));
    return { status: "archived" as const };
  });

export const createVariant = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      kind: z.enum(variantKinds),
      lowStockThreshold: z.number().int().min(0).max(1_000_000).default(5),
      name: nameSchema,
      priceAmount: priceSchema,
      productId: idSchema,
      sku: z.string().trim().min(1).max(100),
    })
  )
  .handler(async ({ data }) => {
    const db = createDb();
    const matchingProduct = await db
      .select({ id: product.id })
      .from(product)
      .where(eq(product.id, data.productId))
      .get();
    if (!matchingProduct) {
      throw new Error(productNotFoundMessage);
    }

    const variants = await db
      .insert(variant)
      .values({ ...data, currency: "mxn" })
      .returning();
    const [createdVariant] = variants;
    if (!createdVariant) {
      throw new Error("No se pudo crear la Variant");
    }
    return createdVariant;
  });

export const changeVariantPrice = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ id: idSchema, priceAmount: priceSchema }))
  .handler(async ({ data }) => {
    const db = createDb();
    const current = await db
      .select({
        priceAmount: variant.priceAmount,
      })
      .from(variant)
      .innerJoin(product, eq(variant.productId, product.id))
      .where(eq(variant.id, data.id))
      .get();
    if (!current) {
      throw new Error(variantNotFoundMessage);
    }
    if (current.priceAmount === data.priceAmount) {
      return { priceAmount: current.priceAmount };
    }

    await db
      .update(variant)
      .set({ priceAmount: data.priceAmount })
      .where(eq(variant.id, data.id));
    return { priceAmount: data.priceAmount };
  });

export const updateVariant = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      id: idSchema,
      lowStockThreshold: z.number().int().min(0).max(1_000_000),
      name: nameSchema,
      sku: z.string().trim().min(1).max(100),
    })
  )
  .handler(async ({ data }) => {
    const db = createDb();
    const current = await db
      .select()
      .from(variant)
      .where(eq(variant.id, data.id))
      .get();
    if (!current) {
      throw new Error(variantNotFoundMessage);
    }

    const next = {
      lowStockThreshold: data.lowStockThreshold,
      name: data.name,
      sku: data.sku,
    };
    await db.update(variant).set(next).where(eq(variant.id, data.id));
    return { ...current, ...next };
  });

export const archiveVariant = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const db = createDb();
    const current = await db
      .select({
        archivedAt: variant.archivedAt,
      })
      .from(variant)
      .where(eq(variant.id, data.id))
      .get();
    if (!current) {
      throw new Error(variantNotFoundMessage);
    }
    if (current.archivedAt) {
      return { archivedAt: current.archivedAt };
    }

    const archivedAt = new Date();
    await db.update(variant).set({ archivedAt }).where(eq(variant.id, data.id));
    return { archivedAt };
  });

export const reorderProductMedia = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      ids: z.array(idSchema).min(1).max(100),
      productId: idSchema,
    })
  )
  .handler(async ({ data }) => {
    const db = createDb();
    const current = await db
      .select({ id: productMedia.id })
      .from(productMedia)
      .where(eq(productMedia.productId, data.productId));
    const currentIds = new Set(current.map(({ id }) => id));
    const requestedIds = new Set(data.ids);
    if (
      requestedIds.size !== data.ids.length ||
      requestedIds.size !== currentIds.size ||
      !data.ids.every((id) => currentIds.has(id))
    ) {
      throw new Error("El orden no coincide con la Media del Product");
    }
    const [first, ...rest] = data.ids.map((id, sort) =>
      db.update(productMedia).set({ sort }).where(eq(productMedia.id, id))
    );
    if (first) {
      await db.batch([first, ...rest]);
    }
  });

export const updateProductMediaAlt = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      alt: z.string().trim().max(500),
      id: idSchema,
    })
  )
  .handler(async ({ data }) => {
    const updated = await createDb()
      .update(productMedia)
      .set({ alt: data.alt })
      .where(eq(productMedia.id, data.id))
      .returning({ id: productMedia.id });
    if (!updated.length) {
      throw new Error("Media no encontrada");
    }
  });

export const deleteProductMedia = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const db = createDb();
    const media = await db
      .select({ productId: productMedia.productId, r2Key: productMedia.r2Key })
      .from(productMedia)
      .where(eq(productMedia.id, data.id))
      .get();
    if (!media) {
      throw new Error("Media no encontrada");
    }
    // R2 goes first so a failure keeps the row and the admin can retry; an R2
    // delete is idempotent, so a retry after a failed D1 delete also finishes cleanly.
    await deleteStorageObjectWithRetry(getMediaBucket(), media.r2Key);
    await db.delete(productMedia).where(eq(productMedia.id, data.id));
    try {
      await deleteOrphanMedia(media.productId);
    } catch {
      // The delete already succeeded; leftovers wait for the next sweep.
    }
  });
