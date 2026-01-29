import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const variantValidator = v.object({
  _id: v.id("variants"),
  _creationTime: v.number(),
  productId: v.id("products"),
  name: v.string(),
  attributes: v.object({
    size: v.optional(v.string()),
    color: v.optional(v.string()),
  }),
  price: v.union(v.number(), v.null()),
  stock: v.number(),
  sku: v.string(),
});

// Listar variantes por producto
export const listByProduct = query({
  args: { productId: v.id("products") },
  returns: v.array(variantValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("variants")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
  },
});

// Obtener variante por ID
export const getById = query({
  args: { id: v.id("variants") },
  returns: v.union(variantValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Obtener variante por SKU
export const getBySku = query({
  args: { sku: v.string() },
  returns: v.union(variantValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("variants")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .unique();
  },
});

// Crear variante
export const create = mutation({
  args: {
    productId: v.id("products"),
    name: v.string(),
    attributes: v.object({
      size: v.optional(v.string()),
      color: v.optional(v.string()),
    }),
    price: v.union(v.number(), v.null()),
    stock: v.number(),
    sku: v.string(),
  },
  returns: v.id("variants"),
  handler: async (ctx, args) => {
    // Verificar que el producto exista
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Verificar que el SKU no exista
    const existingSku = await ctx.db
      .query("variants")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .unique();

    if (existingSku) {
      throw new Error(`Variant with SKU "${args.sku}" already exists`);
    }

    return await ctx.db.insert("variants", args);
  },
});

// Actualizar variante
export const update = mutation({
  args: {
    id: v.id("variants"),
    name: v.optional(v.string()),
    attributes: v.optional(
      v.object({
        size: v.optional(v.string()),
        color: v.optional(v.string()),
      })
    ),
    price: v.optional(v.union(v.number(), v.null())),
    stock: v.optional(v.number()),
    sku: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const variant = await ctx.db.get(id);
    if (!variant) {
      throw new Error("Variant not found");
    }

    // Si se actualiza el SKU, verificar que no exista
    const newSku = updates.sku;
    if (newSku && newSku !== variant.sku) {
      const existingSku = await ctx.db
        .query("variants")
        .withIndex("by_sku", (q) => q.eq("sku", newSku))
        .unique();

      if (existingSku) {
        throw new Error(`Variant with SKU "${newSku}" already exists`);
      }
    }

    await ctx.db.patch(id, updates);
    return null;
  },
});

// Actualizar stock
export const updateStock = mutation({
  args: {
    id: v.id("variants"),
    stock: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id);
    if (!variant) {
      throw new Error("Variant not found");
    }

    await ctx.db.patch(args.id, { stock: args.stock });
    return null;
  },
});

// Decrementar stock (para pedidos)
export const decrementStock = mutation({
  args: {
    id: v.id("variants"),
    quantity: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Validar que quantity sea positivo
    if (
      typeof args.quantity !== "number" ||
      !Number.isFinite(args.quantity) ||
      args.quantity <= 0
    ) {
      throw new Error("Quantity must be a positive number");
    }

    const variant = await ctx.db.get(args.id);
    if (!variant) {
      throw new Error("Variant not found");
    }

    if (variant.stock < args.quantity) {
      throw new Error("Insufficient stock");
    }

    await ctx.db.patch(args.id, { stock: variant.stock - args.quantity });
    return null;
  },
});

// Eliminar variante
export const remove = mutation({
  args: { id: v.id("variants") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});
