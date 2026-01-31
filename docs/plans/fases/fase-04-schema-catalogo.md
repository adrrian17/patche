# Fase 04: Schema Convex - Categorías y Colecciones

> **Prerrequisitos:** Fase 03 completada
> **Resultado:** Tablas `categories` y `collections` definidas

---

## Tarea 4.1: Agregar tabla categories

**Archivo:** `convex/schema.ts`

**Paso 1: Agregar tabla categories**

Después de `variants`, agregar:

```typescript
  // Categorías de productos
  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    order: v.number(),
    image: v.union(v.string(), v.null()), // storage ID
  })
    .index('by_slug', ['slug'])
    .index('by_order', ['order']),
```

**Paso 2: Verificar schema**

```bash
pnpm run dev:convex
```

**Paso 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(convex): add categories table schema"
```

---

## Tarea 4.2: Agregar tabla collections

**Archivo:** `convex/schema.ts`

**Paso 1: Agregar tabla collections**

Después de `categories`, agregar:

```typescript
  // Colecciones (promociones, temporadas, etc.)
  collections: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.union(v.string(), v.null()),
    image: v.union(v.string(), v.null()), // storage ID
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_active', ['isActive']),
```

**Paso 2: Verificar schema**

```bash
pnpm run dev:convex
```

**Paso 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(convex): add collections table schema"
```

---

## Tarea 4.3: Agregar tabla digitalFiles

**Archivo:** `convex/schema.ts`

**Paso 1: Agregar tabla digitalFiles**

Después de `collections`, agregar:

```typescript
  // Archivos digitales para productos digitales
  digitalFiles: defineTable({
    productId: v.id('products'),
    name: v.string(), // ej: "Agenda 2026.pdf"
    storageId: v.string(), // Convex storage ID
    fileSize: v.number(), // bytes
  }).index('by_product', ['productId']),
```

**Paso 2: Verificar schema**

```bash
pnpm run dev:convex
```

**Paso 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(convex): add digitalFiles table schema"
```

---

## Schema Completo Hasta Ahora

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

  // Variantes de productos
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

  // Categorías de productos
  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    order: v.number(),
    image: v.union(v.string(), v.null()),
  })
    .index('by_slug', ['slug'])
    .index('by_order', ['order']),

  // Colecciones
  collections: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.union(v.string(), v.null()),
    image: v.union(v.string(), v.null()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_active', ['isActive']),

  // Archivos digitales
  digitalFiles: defineTable({
    productId: v.id('products'),
    name: v.string(),
    storageId: v.string(),
    fileSize: v.number(),
  }).index('by_product', ['productId']),
})
```

---

## Verificación Final de Fase 04

```bash
pnpm run dev:convex
```

Esperado: Schema actualizado sin errores

---

**Siguiente fase:** `fase-05-schema-ordenes.md`
