import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Listar todas las colecciones
export const list = query({
  args: { activeOnly: v.optional(v.boolean()) },
  returns: v.array(
    v.object({
      _id: v.id("collections"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      description: v.optional(v.union(v.string(), v.null())),
      image: v.optional(v.union(v.string(), v.null())),
      isActive: v.optional(v.boolean()),
      createdAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      return await ctx.db
        .query("collections")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    }
    return await ctx.db.query("collections").collect();
  },
});

// Obtener colección por slug
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("collections"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      description: v.optional(v.union(v.string(), v.null())),
      image: v.optional(v.union(v.string(), v.null())),
      isActive: v.optional(v.boolean()),
      createdAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("collections")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

// Obtener colección por ID
export const getById = query({
  args: { id: v.id("collections") },
  returns: v.union(
    v.object({
      _id: v.id("collections"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      description: v.optional(v.union(v.string(), v.null())),
      image: v.optional(v.union(v.string(), v.null())),
      isActive: v.optional(v.boolean()),
      createdAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Crear colección
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    image: v.optional(v.union(v.string(), v.null())),
    isActive: v.optional(v.boolean()),
  },
  returns: v.id("collections"),
  handler: async (ctx, args) => {
    // Verificar que el slug no exista
    const existing = await ctx.db
      .query("collections")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error(`Collection with slug "${args.slug}" already exists`);
    }

    return await ctx.db.insert("collections", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Actualizar colección
export const update = mutation({
  args: {
    id: v.id("collections"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    image: v.optional(v.union(v.string(), v.null())),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const collection = await ctx.db.get(id);
    if (!collection) {
      throw new Error("Collection not found");
    }

    // Si se actualiza el slug, verificar que no exista
    const newSlug = updates.slug;
    if (newSlug && newSlug !== collection.slug) {
      const existing = await ctx.db
        .query("collections")
        .withIndex("by_slug", (q) => q.eq("slug", newSlug))
        .unique();

      if (existing) {
        throw new Error(`Collection with slug "${newSlug}" already exists`);
      }
    }

    await ctx.db.patch(id, updates);
    return null;
  },
});

// Eliminar colección
export const remove = mutation({
  args: { id: v.id("collections") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

// Toggle estado activo
export const toggleActive = mutation({
  args: { id: v.id("collections") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const collection = await ctx.db.get(args.id);
    if (!collection) {
      throw new Error("Collection not found");
    }

    await ctx.db.patch(args.id, { isActive: !collection.isActive });
    return null;
  },
});
