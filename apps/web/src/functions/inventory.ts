import { createDb } from "@patche/db";
import { product, variant } from "@patche/db/schema/catalog";
import {
  stockMovement,
  stockMovementReasons,
} from "@patche/db/schema/inventory";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { adminMiddleware } from "@/middleware/admin";

const idSchema = z.string().min(1).max(32);

export const listInventory = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const db = createDb();
    const [variants, movements] = await Promise.all([
      db
        .select({
          id: variant.id,
          lowStockThreshold: variant.lowStockThreshold,
          productName: product.name,
          sku: variant.sku,
          stock: sql<number>`coalesce(sum(${stockMovement.quantity}), 0)`,
          variantName: variant.name,
        })
        .from(variant)
        .innerJoin(product, eq(variant.productId, product.id))
        .leftJoin(stockMovement, eq(stockMovement.variantId, variant.id))
        .where(and(eq(variant.kind, "physical"), isNull(variant.archivedAt)))
        .groupBy(variant.id, product.name)
        .orderBy(asc(product.name), asc(variant.name)),
      db
        .select({
          createdAt: stockMovement.createdAt,
          id: stockMovement.id,
          note: stockMovement.note,
          productName: product.name,
          quantity: stockMovement.quantity,
          reason: stockMovement.reason,
          sku: variant.sku,
          variantName: variant.name,
        })
        .from(stockMovement)
        .innerJoin(variant, eq(stockMovement.variantId, variant.id))
        .innerJoin(product, eq(variant.productId, product.id))
        .orderBy(desc(stockMovement.createdAt))
        .limit(50),
    ]);

    return { movements, variants };
  });

export const createStockMovement = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      note: z.string().trim().max(500).default(""),
      quantity: z.number().int().min(-1_000_000).max(1_000_000),
      reason: z.enum(stockMovementReasons).refine((value) => value !== "sold"),
      variantId: idSchema,
    })
  )
  .handler(async ({ data }) => {
    if (data.quantity === 0) {
      throw new Error("La cantidad no puede ser 0");
    }
    if (data.reason !== "adjusted" && data.quantity < 0) {
      throw new Error("Received y Returned requieren una cantidad positiva");
    }

    const db = createDb();
    const physicalVariant = await db
      .select({ id: variant.id })
      .from(variant)
      .where(
        and(
          eq(variant.id, data.variantId),
          eq(variant.kind, "physical"),
          isNull(variant.archivedAt)
        )
      )
      .get();
    if (!physicalVariant) {
      throw new Error("Variant física no encontrada");
    }

    const movement = await db
      .insert(stockMovement)
      .values({
        note: data.note || null,
        quantity: data.quantity,
        reason: data.reason,
        variantId: data.variantId,
      })
      .returning()
      .get();
    if (!movement) {
      throw new Error("No se pudo registrar el movimiento");
    }
    return movement;
  });
