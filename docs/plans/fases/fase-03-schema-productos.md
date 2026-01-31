# Fase 03: Schema Convex - Productos y Variantes

> **Prerrequisitos:** Fase 02 completada
> **Resultado:** Tablas `products` y `variants` definidas en Convex

---

## Tarea 3.1: Definir tabla products

**Archivo:** `convex/schema.ts`

**Paso 1: Leer schema actual**

Lee el archivo para ver la estructura existente.

**Paso 2: Reemplazar contenido completo**

```typescript
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Tabla de productos
  products: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    basePrice: v.number(),
    type: v.union(v.literal('physical'), v.literal('digital')),
    preparationDays: v.union(v.number(), v.null()),
    images: v.array(v.string()), // storage IDs
    categoryId: v.id('categories'),
    collectionIds: v.array(v.id('collections')),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_category', ['categoryId'])
    .index('by_active', ['isActive'])
    .index('by_type', ['type']),
})
```

**Paso 3: Verificar que Convex acepta el schema**

```bash
pnpm run dev:convex
```

Esperado: "Schema updated" sin errores (presiona Ctrl+C para detener)

**Paso 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(convex): add products table schema"
```

---

## Tarea 3.2: Agregar tabla variants

**Archivo:** `convex/schema.ts`

**Paso 1: Agregar tabla variants al schema**

Después de la definición de `products`, agregar:

```typescript
  // Variantes de productos (tamaño, color, etc.)
  variants: defineTable({
    productId: v.id('products'),
    name: v.string(), // ej: "A5 Azul"
    attributes: v.object({
      size: v.optional(v.string()),
      color: v.optional(v.string()),
    }),
    price: v.union(v.number(), v.null()), // null = usar precio base
    stock: v.number(),
    sku: v.string(),
  })
    .index('by_product', ['productId'])
    .index('by_sku', ['sku']),
```

**Paso 2: Schema completo hasta ahora**

El archivo debe verse así:

```typescript
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Tabla de productos
  products: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    basePrice: v.number(),
    type: v.union(v.literal('physical'), v.literal('digital')),
    preparationDays: v.union(v.number(), v.null()),
    images: v.array(v.string()),
    categoryId: v.id('categories'),
    collectionIds: v.array(v.id('collections')),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_category', ['categoryId'])
    .index('by_active', ['isActive'])
    .index('by_type', ['type']),

  // Variantes de productos (tamaño, color, etc.)
  variants: defineTable({
    productId: v.id('products'),
    name: v.string(),
    attributes: v.object({
      size: v.optional(v.string()),
      color: v.optional(v.string()),
    }),
    price: v.union(v.number(), v.null()),
    stock: v.number(),
    sku: v.string(),
  })
    .index('by_product', ['productId'])
    .index('by_sku', ['sku']),
})
```

**Paso 3: Verificar schema**

```bash
pnpm run dev:convex
```

**Paso 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(convex): add variants table schema"
```

---

## Verificación Final de Fase 03

**Verificar que el dev server inicia sin errores:**

```bash
pnpm run dev
```

Presiona Ctrl+C después de verificar que no hay errores.

**Verificar tipos generados:**

```bash
cat convex/_generated/dataModel.d.ts | head -50
```

Esperado: Ver tipos `Doc<"products">` y `Doc<"variants">` disponibles

---

**Siguiente fase:** `fase-04-schema-catalogo.md`
