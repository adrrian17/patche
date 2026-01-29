import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

const digitalFileValidator = v.object({
  _id: v.id("digitalFiles"),
  _creationTime: v.number(),
  productId: v.id("products"),
  name: v.string(),
  storageId: v.union(v.id("_storage"), v.null()),
  fileSize: v.number(),
});

// Listar archivos por producto
export const listByProduct = query({
  args: { productId: v.id("products") },
  returns: v.array(digitalFileValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("digitalFiles")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
  },
});

// Obtener archivo por ID
export const getById = query({
  args: { id: v.id("digitalFiles") },
  returns: v.union(digitalFileValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Crear archivo digital
export const create = internalMutation({
  args: {
    productId: v.id("products"),
    name: v.string(),
    storageId: v.union(v.id("_storage"), v.null()),
    fileSize: v.number(),
  },
  returns: v.id("digitalFiles"),
  handler: async (ctx, args) => {
    // Verificar que el producto exista y sea digital
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }
    if (product.type !== "digital") {
      throw new Error("Can only add digital files to digital products");
    }

    return await ctx.db.insert("digitalFiles", args);
  },
});

// Actualizar archivo digital
export const update = internalMutation({
  args: {
    id: v.id("digitalFiles"),
    name: v.optional(v.string()),
    storageId: v.optional(v.nullable(v.id("_storage"))),
    fileSize: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const file = await ctx.db.get(id);
    if (!file) {
      throw new Error("Digital file not found");
    }

    await ctx.db.patch(id, updates);
    return null;
  },
});

// Eliminar archivo digital
export const remove = internalMutation({
  args: { id: v.id("digitalFiles") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.id);
    if (!file) {
      throw new Error("Digital file not found");
    }

    // Eliminar archivo del storage (con guardia para placeholders null)
    if (file.storageId) {
      try {
        await ctx.storage.delete(file.storageId);
      } catch (error) {
        console.error("Error deleting file from storage:", error);
      }
    }

    // Eliminar registro
    await ctx.db.delete(args.id);
    return null;
  },
});
