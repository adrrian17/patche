import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Datos de prueba completos para desarrollo
export const seedAll = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // 1. Inicializar configuración de tienda
    const existingSettings = await ctx.db.query("storeSettings").first();
    if (!existingSettings) {
      await ctx.db.insert("storeSettings", {
        shippingRate: 99,
        freeShippingThreshold: 999,
        contactEmail: "contacto@patche.mx",
        lastOrderNumber: 1000,
      });
      console.log("✓ Store settings initialized");
    }

    // 2. Crear categorías
    const categories = [
      { name: "Agendas", slug: "agendas", order: 0, image: null },
      { name: "Stickers", slug: "stickers", order: 1, image: null },
      { name: "Posters", slug: "posters", order: 2, image: null },
      { name: "Descargables", slug: "descargables", order: 3, image: null },
      { name: "Merchandising", slug: "merchandising", order: 4, image: null },
    ];

    const categoryIds: Record<string, string> = {};
    for (const cat of categories) {
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", cat.slug))
        .unique();

      if (existing) {
        categoryIds[cat.slug] = existing._id;
      } else {
        const id = await ctx.db.insert("categories", cat);
        categoryIds[cat.slug] = id;
        console.log(`✓ Category created: ${cat.name}`);
      }
    }

    // 3. Crear colecciones
    const collections = [
      {
        name: "Edición Verano 2025",
        slug: "verano-2025",
        description: "Colección especial de verano con diseños frescos",
        image: null,
        isActive: true,
      },
      {
        name: "Nuevos Lanzamientos",
        slug: "nuevos-lanzamientos",
        description: "Los productos más recientes",
        image: null,
        isActive: true,
      },
      {
        name: "Ofertas Especiales",
        slug: "ofertas",
        description: "Productos con descuento",
        image: null,
        isActive: false,
      },
    ];

    const collectionIds: Record<string, string> = {};
    for (const col of collections) {
      const existing = await ctx.db
        .query("collections")
        .withIndex("by_slug", (q) => q.eq("slug", col.slug))
        .unique();

      if (existing) {
        collectionIds[col.slug] = existing._id;
      } else {
        const id = await ctx.db.insert("collections", {
          ...col,
          createdAt: Date.now(),
        });
        collectionIds[col.slug] = id;
        console.log(`✓ Collection created: ${col.name}`);
      }
    }

    // 4. Crear productos físicos
    const physicalProducts = [
      {
        name: "Agenda Patche 2025",
        slug: "agenda-2025",
        description:
          "Agenda anual con diseño exclusivo de Patche. Incluye 200 páginas, marcadores y stickers.",
        basePrice: 299,
        type: "physical" as const,
        preparationDays: 2,
        images: [],
        categoryId: categoryIds["agendas"],
        collectionIds: [collectionIds["verano-2025"]],
        isActive: true,
      },
      {
        name: "Pack Stickers Patche",
        slug: "pack-stickers",
        description:
          "Set de 50 stickers surtidos con diseños originales. Perfectos para decorar tu agenda o laptop.",
        basePrice: 89,
        type: "physical" as const,
        preparationDays: 1,
        images: [],
        categoryId: categoryIds["stickers"],
        collectionIds: [collectionIds["nuevos-lanzamientos"]],
        isActive: true,
      },
      {
        name: "Poster Patche Original",
        slug: "poster-original",
        description:
          "Póster artístico tamaño 30x40cm en papel de alta calidad.",
        basePrice: 149,
        type: "physical" as const,
        preparationDays: 3,
        images: [],
        categoryId: categoryIds["posters"],
        collectionIds: [collectionIds["verano-2025"], collectionIds["ofertas"]],
        isActive: true,
      },
      {
        name: "Taza Patche",
        slug: "taza",
        description: "Taza de cerámica con diseño exclusivo. 350ml.",
        basePrice: 179,
        type: "physical" as const,
        preparationDays: 2,
        images: [],
        categoryId: categoryIds["merchandising"],
        collectionIds: [],
        isActive: true,
      },
    ];

    const productIds: Record<string, string> = {};
    for (const prod of physicalProducts) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", prod.slug))
        .unique();

      if (existing) {
        productIds[prod.slug] = existing._id;
      } else {
        const now = Date.now();
        const id = await ctx.db.insert("products", {
          ...prod,
          createdAt: now,
          updatedAt: now,
        });
        productIds[prod.slug] = id;
        console.log(`✓ Physical product created: ${prod.name}`);
      }
    }

    // 5. Crear productos digitales
    const digitalProducts = [
      {
        name: "Planner Digital 2025",
        slug: "planner-digital-2025",
        description:
          "Planner digital interactivo en formato PDF. Incluye 12 meses, trackers de hábitos y más.",
        basePrice: 149,
        type: "digital" as const,
        preparationDays: null,
        images: [],
        categoryId: categoryIds["descargables"],
        collectionIds: [collectionIds["nuevos-lanzamientos"]],
        isActive: true,
      },
      {
        name: "Pack de Wallpapers",
        slug: "wallpapers-pack",
        description:
          "10 wallpapers exclusivos para desktop y móvil en alta resolución.",
        basePrice: 49,
        type: "digital" as const,
        preparationDays: null,
        images: [],
        categoryId: categoryIds["descargables"],
        collectionIds: [],
        isActive: true,
      },
      {
        name: "Kit de Planificación",
        slug: "kit-planificacion",
        description:
          "Plantillas imprimibles para planificación: calendarios, listas, trackers.",
        basePrice: 99,
        type: "digital" as const,
        preparationDays: null,
        images: [],
        categoryId: categoryIds["descargables"],
        collectionIds: [collectionIds["ofertas"]],
        isActive: true,
      },
    ];

    for (const prod of digitalProducts) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", prod.slug))
        .unique();

      if (existing) {
        productIds[prod.slug] = existing._id;
      } else {
        const now = Date.now();
        const id = await ctx.db.insert("products", {
          ...prod,
          createdAt: now,
          updatedAt: now,
        });
        productIds[prod.slug] = id;
        console.log(`✓ Digital product created: ${prod.name}`);
      }
    }

    // 6. Crear variantes para productos físicos
    const variants = [
      // Variantes de Agenda
      {
        productId: productIds["agenda-2025"],
        name: "Agenda - Color Rosa",
        attributes: { color: "Rosa", size: "A5" },
        price: null,
        stock: 50,
        sku: "AGD-2025-RS",
      },
      {
        productId: productIds["agenda-2025"],
        name: "Agenda - Color Azul",
        attributes: { color: "Azul", size: "A5" },
        price: null,
        stock: 45,
        sku: "AGD-2025-AZ",
      },
      {
        productId: productIds["agenda-2025"],
        name: "Agenda - Color Negro",
        attributes: { color: "Negro", size: "A5" },
        price: null,
        stock: 30,
        sku: "AGD-2025-NG",
      },
      // Variantes de Taza
      {
        productId: productIds["taza"],
        name: "Taza - Diseño Logo",
        attributes: { color: "Blanca" },
        price: null,
        stock: 100,
        sku: "TZA-LOGO-01",
      },
      {
        productId: productIds["taza"],
        name: "Taza - Diseño Ilustrado",
        attributes: { color: "Negra" },
        price: 189,
        stock: 75,
        sku: "TZA-ILL-01",
      },
    ];

    for (const variant of variants) {
      if (!variant.productId) continue;

      const existing = await ctx.db
        .query("variants")
        .withIndex("by_sku", (q) => q.eq("sku", variant.sku))
        .unique();

      if (!existing) {
        await ctx.db.insert("variants", variant);
        console.log(`✓ Variant created: ${variant.name}`);
      }
    }

    // 7. Crear archivos digitales para productos digitales
    const digitalFiles = [
      {
        productId: productIds["planner-digital-2025"],
        name: "Planner_2025_Completo.pdf",
        storageId: "placeholder_planner_2025",
        fileSize: 15_240_000,
      },
      {
        productId: productIds["planner-digital-2025"],
        name: "Guia_de_Uso.pdf",
        storageId: "placeholder_guia_uso",
        fileSize: 2_100_000,
      },
      {
        productId: productIds["wallpapers-pack"],
        name: "Wallpapers_Patche_2025.zip",
        storageId: "placeholder_wallpapers",
        fileSize: 85_600_000,
      },
      {
        productId: productIds["kit-planificacion"],
        name: "Kit_Planificacion_Imprimible.pdf",
        storageId: "placeholder_kit_plan",
        fileSize: 45_100_000,
      },
    ];

    for (const file of digitalFiles) {
      if (!file.productId) continue;

      const existing = await ctx.db
        .query("digitalFiles")
        .withIndex("by_product", (q) => q.eq("productId", file.productId))
        .collect();

      const alreadyExists = existing.some((f) => f.name === file.name);
      if (!alreadyExists) {
        await ctx.db.insert("digitalFiles", file);
        console.log(`✓ Digital file created: ${file.name}`);
      }
    }

    console.log("\n✅ Seed completed successfully!");
    console.log("\nResumen:");
    console.log("- Configuración de tienda: inicializada");
    console.log("- Categorías: 5 creadas");
    console.log("- Colecciones: 3 creadas");
    console.log("- Productos físicos: 4 creados");
    console.log("- Productos digitales: 3 creados");
    console.log("- Variantes: 5 creadas");
    console.log("- Archivos digitales: 4 creados");

    return null;
  },
});

// Limpiar todos los datos (para reiniciar)
export const clearAll = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Eliminar en orden correcto para evitar conflictos

    // 1. Tablas dependientes primero
    const downloadLinks = await ctx.db.query("downloadLinks").collect();
    for (const doc of downloadLinks) {
      await ctx.db.delete(doc._id);
    }

    const digitalFiles = await ctx.db.query("digitalFiles").collect();
    for (const doc of digitalFiles) {
      await ctx.db.delete(doc._id);
    }

    const variants = await ctx.db.query("variants").collect();
    for (const doc of variants) {
      await ctx.db.delete(doc._id);
    }

    const orders = await ctx.db.query("orders").collect();
    for (const doc of orders) {
      await ctx.db.delete(doc._id);
    }

    const products = await ctx.db.query("products").collect();
    for (const doc of products) {
      await ctx.db.delete(doc._id);
    }

    // 2. Tablas independientes
    const categories = await ctx.db.query("categories").collect();
    for (const doc of categories) {
      await ctx.db.delete(doc._id);
    }

    const collections = await ctx.db.query("collections").collect();
    for (const doc of collections) {
      await ctx.db.delete(doc._id);
    }

    const adminUsers = await ctx.db.query("adminUsers").collect();
    for (const doc of adminUsers) {
      await ctx.db.delete(doc._id);
    }

    const storeSettings = await ctx.db.query("storeSettings").collect();
    for (const doc of storeSettings) {
      await ctx.db.delete(doc._id);
    }

    console.log("✅ All data cleared successfully!");
    return null;
  },
});
