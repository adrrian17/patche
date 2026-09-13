import { createDb } from "@patche/db";
import { product, variant } from "@patche/db/schema/catalog";
import { stockMovement } from "@patche/db/schema/inventory";
import { order } from "@patche/db/schema/orders";
import { createServerFn } from "@tanstack/react-start";
import { and, count, eq, gte, isNull, sql } from "drizzle-orm";

import { adminMiddleware } from "@/middleware/admin";

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const db = createDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, pendingOrders, lowStockVariants] = await Promise.all([
      db
        .select({ value: count() })
        .from(order)
        .where(gte(order.createdAt, today))
        .get(),
      db
        .select({ value: count() })
        .from(order)
        .where(eq(order.fulfillmentStatus, "unfulfilled"))
        .get(),
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
        .having(
          sql`coalesce(sum(${stockMovement.quantity}), 0) <= ${variant.lowStockThreshold}`
        ),
    ]);

    return {
      lowStockVariants,
      pendingOrders: pendingOrders?.value ?? 0,
      todayOrders: todayOrders?.value ?? 0,
    };
  });
