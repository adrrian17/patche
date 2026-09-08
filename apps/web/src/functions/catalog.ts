import { createDb } from "@patche/db";
import {
  product,
  productStatuses,
  variant,
  variantKinds,
} from "@patche/db/schema/catalog";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getStripeClient } from "@/lib/payments.server";
import { adminMiddleware } from "@/middleware/admin";

const idSchema = z.string().min(1).max(32);
const nameSchema = z.string().trim().min(1).max(160);
const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
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
      slug: slugSchema,
      status: z.enum(productStatuses).default("draft"),
    })
  )
  .handler(async ({ data }) => {
    const db = createDb();
    const stripe = getStripeClient();
    const stripeProduct = await stripe.products.create(
      {
        active: data.status === "active",
        description: data.description || undefined,
        name: data.name,
      },
      { idempotencyKey: `product:create:${crypto.randomUUID()}` }
    );

    try {
      const products = await db
        .insert(product)
        .values({ ...data, stripeProductId: stripeProduct.id })
        .returning();
      const [createdProduct] = products;
      if (!createdProduct) {
        throw new Error("No se pudo crear el Product");
      }
      return createdProduct;
    } catch (error) {
      await stripe.products.update(stripeProduct.id, { active: false });
      throw error;
    }
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      categoryId: idSchema.nullable(),
      description: z.string().trim().max(10_000),
      id: idSchema,
      name: nameSchema,
      slug: slugSchema,
      status: z.enum(["draft", "active"]),
    })
  )
  .handler(async ({ data }) => {
    const db = createDb();
    const stripe = getStripeClient();
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
      slug: data.slug,
      status: data.status,
    };
    await db.update(product).set(next).where(eq(product.id, data.id));
    try {
      await stripe.products.update(current.stripeProductId, {
        active: data.status === "active",
        description: data.description || "",
        name: data.name,
      });
      return { ...current, ...next };
    } catch (error) {
      await db
        .update(product)
        .set({
          categoryId: current.categoryId,
          description: current.description,
          name: current.name,
          slug: current.slug,
          status: current.status,
        })
        .where(eq(product.id, current.id));
      throw error;
    }
  });

export const archiveProduct = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const db = createDb();
    const current = await db
      .select({
        status: product.status,
        stripeProductId: product.stripeProductId,
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
    try {
      await getStripeClient().products.update(current.stripeProductId, {
        active: false,
      });
      return { status: "archived" as const };
    } catch (error) {
      await db
        .update(product)
        .set({ status: current.status })
        .where(eq(product.id, data.id));
      throw error;
    }
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
      .select({ stripeProductId: product.stripeProductId })
      .from(product)
      .where(eq(product.id, data.productId))
      .get();
    if (!matchingProduct) {
      throw new Error(productNotFoundMessage);
    }

    const stripe = getStripeClient();
    const stripePrice = await stripe.prices.create(
      {
        currency: "mxn",
        nickname: data.name,
        product: matchingProduct.stripeProductId,
        unit_amount: data.priceAmount,
      },
      { idempotencyKey: `variant:create:${crypto.randomUUID()}` }
    );
    try {
      const variants = await db
        .insert(variant)
        .values({ ...data, currency: "mxn", stripePriceId: stripePrice.id })
        .returning();
      const [createdVariant] = variants;
      if (!createdVariant) {
        throw new Error("No se pudo crear la Variant");
      }
      return createdVariant;
    } catch (error) {
      await stripe.prices.update(stripePrice.id, { active: false });
      throw error;
    }
  });

export const changeVariantPrice = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ id: idSchema, priceAmount: priceSchema }))
  .handler(async ({ data }) => {
    const db = createDb();
    const current = await db
      .select({
        name: variant.name,
        priceAmount: variant.priceAmount,
        stripePriceId: variant.stripePriceId,
        stripeProductId: product.stripeProductId,
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

    const stripe = getStripeClient();
    const nextPrice = await stripe.prices.create(
      {
        currency: "mxn",
        nickname: current.name,
        product: current.stripeProductId,
        unit_amount: data.priceAmount,
      },
      { idempotencyKey: `variant:price:${data.id}:${crypto.randomUUID()}` }
    );
    try {
      await stripe.prices.update(current.stripePriceId, { active: false });
    } catch (error) {
      await stripe.prices.update(nextPrice.id, { active: false });
      throw error;
    }

    try {
      await db
        .update(variant)
        .set({ priceAmount: data.priceAmount, stripePriceId: nextPrice.id })
        .where(eq(variant.id, data.id));
      return { priceAmount: data.priceAmount };
    } catch (error) {
      await stripe.prices.update(current.stripePriceId, { active: true });
      await stripe.prices.update(nextPrice.id, { active: false });
      throw error;
    }
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
    try {
      await getStripeClient().prices.update(current.stripePriceId, {
        nickname: data.name,
      });
      return { ...current, ...next };
    } catch (error) {
      await db
        .update(variant)
        .set({
          lowStockThreshold: current.lowStockThreshold,
          name: current.name,
          sku: current.sku,
        })
        .where(eq(variant.id, data.id));
      throw error;
    }
  });

export const archiveVariant = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const db = createDb();
    const current = await db
      .select({
        archivedAt: variant.archivedAt,
        stripePriceId: variant.stripePriceId,
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
    try {
      await getStripeClient().prices.update(current.stripePriceId, {
        active: false,
      });
      return { archivedAt };
    } catch (error) {
      await db
        .update(variant)
        .set({ archivedAt: null })
        .where(eq(variant.id, data.id));
      throw error;
    }
  });
