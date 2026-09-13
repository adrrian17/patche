import { createDb } from "@patche/db";
import { category } from "@patche/db/schema/catalog";
import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { uniqueSlug } from "@/lib/slug";
import { adminMiddleware } from "@/middleware/admin";

const idSchema = z.string().min(1).max(32);
const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const listCategories = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(
    async () =>
      await createDb().select().from(category).orderBy(asc(category.name))
  );

export const createCategory = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(categorySchema)
  .handler(async ({ data }) => {
    const db = createDb();
    const slug = await uniqueSlug(data.name, async (candidate) => {
      const matchingCategory = await db
        .select({ id: category.id })
        .from(category)
        .where(eq(category.slug, candidate))
        .get();
      return Boolean(matchingCategory);
    });
    const created = await db
      .insert(category)
      .values({ ...data, slug })
      .returning()
      .get();
    if (!created) {
      throw new Error("No se pudo crear la categoría");
    }
    return created;
  });

export const updateCategory = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(categorySchema.extend({ id: idSchema }))
  .handler(async ({ data }) => {
    const updated = await createDb()
      .update(category)
      .set({ name: data.name })
      .where(eq(category.id, data.id))
      .returning()
      .get();
    if (!updated) {
      throw new Error("Categoría no encontrada");
    }
    return updated;
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const deleted = await createDb()
      .delete(category)
      .where(eq(category.id, data.id))
      .returning({ id: category.id })
      .get();
    if (!deleted) {
      throw new Error("Categoría no encontrada");
    }
    return deleted;
  });
