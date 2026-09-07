import { createDb } from "@patche/db";
import { category } from "@patche/db/schema/catalog";
import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { adminMiddleware } from "@/middleware/admin";

const idSchema = z.string().min(1).max(32);
const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
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
    const created = await createDb()
      .insert(category)
      .values(data)
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
      .set({ name: data.name, slug: data.slug })
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
