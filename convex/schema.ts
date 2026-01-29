import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Categorías de productos
  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    order: v.number(),
    image: v.union(v.string(), v.null()),
  })
    .index("by_slug", ["slug"])
    .index("by_order", ["order"]),

  // Colecciones (promociones, temporadas)
  collections: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.union(v.string(), v.null()),
    image: v.union(v.string(), v.null()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_active", ["isActive"]),

  // Productos
  products: defineTable({
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
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["categoryId"])
    .index("by_type", ["type"])
    .index("by_active", ["isActive"])
    .index("by_active_type", ["isActive", "type"]),

  // Variantes de productos
  variants: defineTable({
    productId: v.id("products"),
    name: v.string(),
    attributes: v.object({
      size: v.optional(v.string()),
      color: v.optional(v.string()),
    }),
    price: v.union(v.number(), v.null()),
    stock: v.number(),
    sku: v.string(),
  })
    .index("by_product", ["productId"])
    .index("by_sku", ["sku"]),

  // Archivos digitales
  digitalFiles: defineTable({
    productId: v.id("products"),
    name: v.string(),
    storageId: v.string(),
    fileSize: v.number(),
  }).index("by_product", ["productId"]),

  // Enlaces de descarga
  downloadLinks: defineTable({
    orderId: v.id("orders"),
    fileId: v.id("digitalFiles"),
    token: v.string(),
    expiresAt: v.number(),
    downloadsRemaining: v.number(),
    createdAt: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_token", ["token"]),

  // Pedidos
  orders: defineTable({
    orderNumber: v.string(),
    email: v.string(),
    items: v.array(
      v.object({
        productId: v.id("products"),
        variantId: v.union(v.id("variants"), v.null()),
        name: v.string(),
        variantName: v.union(v.string(), v.null()),
        price: v.number(),
        quantity: v.number(),
        type: v.union(v.literal("physical"), v.literal("digital")),
      })
    ),
    subtotal: v.number(),
    shippingCost: v.number(),
    total: v.number(),
    paymentMethod: v.union(v.literal("card"), v.literal("oxxo")),
    stripePaymentIntentId: v.string(),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("pending"),
      v.literal("preparing"),
      v.literal("shipped"),
      v.literal("delivered")
    ),
    shippingAddress: v.union(
      v.object({
        name: v.string(),
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zipCode: v.string(),
        phone: v.string(),
      }),
      v.null()
    ),
    trackingNumber: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orderNumber", ["orderNumber"])
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  // Usuario admin
  adminUsers: defineTable({
    username: v.string(),
    passwordHash: v.string(),
    lastLoginAt: v.union(v.number(), v.null()),
  }).index("by_username", ["username"]),

  // Configuración de la tienda
  storeSettings: defineTable({
    shippingRate: v.number(),
    freeShippingThreshold: v.number(),
    contactEmail: v.string(),
    lastOrderNumber: v.number(),
  }),
});
