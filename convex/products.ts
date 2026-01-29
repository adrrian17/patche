import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const productValidator = v.object({
  _id: v.id("products"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  description: v.string(),
  basePrice: v.number(),
  type: v.union(v.literal("physical"), v.literal("digital")),
  preparationDays: v.union(v.number(), v.null()),
  images: v.array(v.string()),
  categoryId: v.id("categories"),
  collectionIds: v.array(v.id("collections")),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

interface Product {
  _id: string;
  _creationTime: number;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  type: "physical" | "digital";
  preparationDays: number | null;
  images: string[];
  categoryId: string;
  collectionIds: string[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// Listar productos con filtros
export const list = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    type: v.optional(v.union(v.literal("physical"), v.literal("digital"))),
    activeOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(productValidator),
  handler: async (ctx, args) => {
    const products: Product[] = [];

    if (args.activeOnly && args.type) {
      const typeValue = args.type;
      const filtered = await ctx.db
        .query("products")
        .withIndex("by_active_type", (q) =>
          q.eq("isActive", true).eq("type", typeValue)
        )
        .collect();
      products.push(...filtered);
    } else if (args.activeOnly) {
      const filtered = await ctx.db
        .query("products")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
      products.push(...filtered);
    } else if (args.type) {
      const typeValue = args.type;
      const filtered = await ctx.db
        .query("products")
        .withIndex("by_type", (q) => q.eq("type", typeValue))
        .collect();
      products.push(...filtered);
    } else if (args.categoryId) {
      const categoryIdValue = args.categoryId;
      const filtered = await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("categoryId", categoryIdValue))
        .collect();
      products.push(...filtered);
    } else {
      const all = await ctx.db.query("products").collect();
      products.push(...all);
    }

    // Filtros adicionales que no pueden usar índices
    let filtered = products;
    if (args.categoryId && (args.activeOnly || args.type)) {
      filtered = filtered.filter((p) => p.categoryId === args.categoryId);
    }

    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    return filtered;
  },
});

// Obtener producto por slug
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(productValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

// Obtener producto por ID
export const getById = query({
  args: { id: v.id("products") },
  returns: v.union(productValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Obtener productos por colección
export const getByCollection = query({
  args: {
    collectionId: v.id("collections"),
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.array(productValidator),
  handler: async (ctx, args) => {
    let products: Product[];

    if (args.activeOnly) {
      products = await ctx.db
        .query("products")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    } else {
      products = await ctx.db.query("products").collect();
    }

    return products.filter((p) => p.collectionIds.includes(args.collectionId));
  },
});

// Buscar productos por nombre
export const search = query({
  args: {
    searchTerm: v.string(),
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.array(productValidator),
  handler: async (ctx, args) => {
    let products: Product[];

    if (args.activeOnly) {
      products = await ctx.db
        .query("products")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    } else {
      products = await ctx.db.query("products").collect();
    }

    const term = args.searchTerm.toLowerCase();

    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
    );
  },
});

// Crear producto
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    basePrice: v.number(),
    type: v.union(v.literal("physical"), v.literal("digital")),
    preparationDays: v.union(v.number(), v.null()),
    images: v.array(v.string()),
    categoryId: v.id("categories"),
    collectionIds: v.array(v.id("collections")),
    isActive: v.boolean(),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    // Verificar que el slug no exista
    const existing = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error(`Product with slug "${args.slug}" already exists`);
    }

    // Verificar que la categoría exista
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    const now = Date.now();
    return await ctx.db.insert("products", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Actualizar producto
export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    basePrice: v.optional(v.number()),
    type: v.optional(v.union(v.literal("physical"), v.literal("digital"))),
    preparationDays: v.optional(v.union(v.number(), v.null())),
    images: v.optional(v.array(v.string())),
    categoryId: v.optional(v.id("categories")),
    collectionIds: v.optional(v.array(v.id("collections"))),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const product = await ctx.db.get(id);
    if (!product) {
      throw new Error("Product not found");
    }

    // Si se actualiza el slug, verificar que no exista
    const newSlug = updates.slug;
    if (newSlug && newSlug !== product.slug) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", newSlug))
        .unique();

      if (existing) {
        throw new Error(`Product with slug "${newSlug}" already exists`);
      }
    }

    // Si se actualiza la categoría, verificar que exista
    if (updates.categoryId) {
      const category = await ctx.db.get(updates.categoryId);
      if (!category) {
        throw new Error("Category not found");
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Eliminar producto
export const remove = mutation({
  args: { id: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verificar que no haya variantes asociadas
    const variants = await ctx.db
      .query("variants")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .first();

    if (variants) {
      throw new Error("Cannot delete product with associated variants");
    }

    // Verificar que no haya archivos digitales asociados
    const files = await ctx.db
      .query("digitalFiles")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .first();

    if (files) {
      throw new Error("Cannot delete product with associated digital files");
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

// Toggle estado activo
export const toggleActive = mutation({
  args: { id: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }

    await ctx.db.patch(args.id, {
      isActive: !product.isActive,
      updatedAt: Date.now(),
    });
    return null;
  },
});
