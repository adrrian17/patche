import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const settingsValidator = v.object({
  _id: v.id("storeSettings"),
  _creationTime: v.number(),
  shippingRate: v.number(),
  freeShippingThreshold: v.number(),
  contactEmail: v.string(),
  lastOrderNumber: v.number(),
});

// Obtener configuración (crear si no existe)
export const get = query({
  args: {},
  returns: v.union(settingsValidator, v.null()),
  handler: async (ctx) => {
    const settings = await ctx.db.query("storeSettings").first();
    return settings;
  },
});

// Inicializar configuración (solo si no existe)
export const initialize = mutation({
  args: {},
  returns: v.id("storeSettings"),
  handler: async (ctx) => {
    const existing = await ctx.db.query("storeSettings").first();
    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("storeSettings", {
      shippingRate: 99, // $99 MXN
      freeShippingThreshold: 999, // Envío gratis a partir de $999
      contactEmail: "contacto@patche.mx",
      lastOrderNumber: 1000, // Empezar en PTCH1001
    });
  },
});

// Actualizar configuración
export const update = mutation({
  args: {
    shippingRate: v.optional(v.number()),
    freeShippingThreshold: v.optional(v.number()),
    contactEmail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("storeSettings").first();
    if (!settings) {
      throw new Error("Store settings not initialized");
    }

    await ctx.db.patch(settings._id, args);
    return null;
  },
});

// Obtener y incrementar número de orden
export const getNextOrderNumber = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const settings = await ctx.db.query("storeSettings").first();
    if (!settings) {
      throw new Error("Store settings not initialized");
    }

    const nextNumber = settings.lastOrderNumber + 1;
    await ctx.db.patch(settings._id, { lastOrderNumber: nextNumber });

    return `#PTCH${nextNumber}`;
  },
});
