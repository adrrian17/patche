import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Listar todas las categorías ordenadas
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("categories"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      order: v.optional(v.number()),
      image: v.optional(v.union(v.string(), v.null())),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("categories").withIndex("by_order").collect();
  },
});

// Obtener categoría por slug
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("categories"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      order: v.optional(v.number()),
      image: v.optional(v.union(v.string(), v.null())),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

// Obtener categoría por ID
export const getById = query({
  args: { id: v.id("categories") },
  returns: v.union(
    v.object({
      _id: v.id("categories"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      order: v.optional(v.number()),
      image: v.optional(v.union(v.string(), v.null())),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Crear categoría
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    order: v.number(),
    image: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    // Verificar que el slug no exista
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error(`Category with slug "${args.slug}" already exists`);
    }

    return await ctx.db.insert("categories", args);
  },
});

// Actualizar categoría
export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    order: v.optional(v.number()),
    image: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const category = await ctx.db.get(id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Si se actualiza el slug, verificar que no exista
    const newSlug = updates.slug;
    if (newSlug && newSlug !== category.slug) {
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", newSlug))
        .unique();

      if (existing) {
        throw new Error(`Category with slug "${newSlug}" already exists`);
      }
    }

    await ctx.db.patch(id, updates);
    return null;
  },
});

// Eliminar categoría
export const remove = mutation({
  args: { id: v.id("categories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verificar que no haya productos en esta categoría
    const productsInCategory = await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .first();

    if (productsInCategory) {
      throw new Error("Cannot delete category with associated products");
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

// Reordenar categorías
export const reorder = mutation({
  args: {
    orderedIds: v.array(v.id("categories")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], { order: i });
    }
    return null;
  },
});
