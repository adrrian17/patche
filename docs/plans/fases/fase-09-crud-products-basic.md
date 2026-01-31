# Fase 09: CRUD Productos (Básico)

> **Prerrequisitos:** Fase 08 completada
> **Resultado:** Functions Convex para gestionar productos

---

## Tarea 9.1: Crear archivo de funciones de productos

**Archivo:** `convex/products.ts`

**Paso 1: Crear archivo con imports y helpers**

```typescript
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'

// Helper para generar slug desde nombre
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
```

**Paso 2: Commit**

```bash
git add convex/products.ts
git commit -m "feat(convex): create products functions file"
```

---

## Tarea 9.2: Definir validators para retorno

**Archivo:** `convex/products.ts`

**Paso 1: Agregar validators para tipos de retorno**

```typescript
// Validator para producto completo
const productValidator = v.object({
  _id: v.id('products'),
  _creationTime: v.number(),
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

// Validator para producto con categoría
const productWithCategoryValidator = v.object({
  _id: v.id('products'),
  _creationTime: v.number(),
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
  category: v.object({
    _id: v.id('categories'),
    name: v.string(),
    slug: v.string(),
  }),
})
```

**Paso 2: Commit**

```bash
git add convex/products.ts
git commit -m "feat(convex): add product validators"
```

---

## Tarea 9.3: Query para listar productos

**Archivo:** `convex/products.ts`

**Paso 1: Agregar query list**

```typescript
export const list = query({
  args: {
    activeOnly: v.optional(v.boolean()),
    categoryId: v.optional(v.id('categories')),
    type: v.optional(v.union(v.literal('physical'), v.literal('digital'))),
    limit: v.optional(v.number()),
  },
  returns: v.array(productWithCategoryValidator),
  handler: async (ctx, args) => {
    let productsQuery = ctx.db.query('products')

    // Filtrar por categoría si se especifica
    if (args.categoryId) {
      productsQuery = ctx.db
        .query('products')
        .withIndex('by_category', (q) => q.eq('categoryId', args.categoryId!))
    }

    let products = await productsQuery.collect()

    // Filtros adicionales en memoria
    if (args.activeOnly) {
      products = products.filter((p) => p.isActive)
    }
    if (args.type) {
      products = products.filter((p) => p.type === args.type)
    }

    // Limitar resultados
    if (args.limit) {
      products = products.slice(0, args.limit)
    }

    // Agregar categoría a cada producto
    const productsWithCategory = await Promise.all(
      products.map(async (product) => {
        const category = await ctx.db.get(product.categoryId)
        return {
          ...product,
          category: category
            ? { _id: category._id, name: category.name, slug: category.slug }
            : { _id: product.categoryId, name: 'Sin categoría', slug: '' },
        }
      })
    )

    return productsWithCategory
  },
})
```

**Paso 2: Commit**

```bash
git add convex/products.ts
git commit -m "feat(convex): add products.list query"
```

---

## Tarea 9.4: Query para obtener producto por slug

**Archivo:** `convex/products.ts`

**Paso 1: Agregar query getBySlug**

```typescript
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(productWithCategoryValidator, v.null()),
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query('products')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!product) return null

    const category = await ctx.db.get(product.categoryId)
    return {
      ...product,
      category: category
        ? { _id: category._id, name: category.name, slug: category.slug }
        : { _id: product.categoryId, name: 'Sin categoría', slug: '' },
    }
  },
})
```

**Paso 2: Commit**

```bash
git add convex/products.ts
git commit -m "feat(convex): add products.getBySlug query"
```

---

## Tarea 9.5: Query para obtener producto por ID

**Archivo:** `convex/products.ts`

**Paso 1: Agregar query getById**

```typescript
export const getById = query({
  args: { id: v.id('products') },
  returns: v.union(productValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})
```

**Paso 2: Commit**

```bash
git add convex/products.ts
git commit -m "feat(convex): add products.getById query"
```

---

## Tarea 9.6: Mutation para crear producto

**Archivo:** `convex/products.ts`

**Paso 1: Agregar mutation create**

```typescript
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.string(),
    basePrice: v.number(),
    type: v.union(v.literal('physical'), v.literal('digital')),
    preparationDays: v.union(v.number(), v.null()),
    images: v.array(v.string()),
    categoryId: v.id('categories'),
    collectionIds: v.array(v.id('collections')),
    isActive: v.boolean(),
  },
  returns: v.id('products'),
  handler: async (ctx, args) => {
    const slug = args.slug || generateSlug(args.name)

    // Verificar que el slug no exista
    const existing = await ctx.db
      .query('products')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()

    if (existing) {
      throw new Error(`Product with slug "${slug}" already exists`)
    }

    // Verificar que la categoría existe
    const category = await ctx.db.get(args.categoryId)
    if (!category) {
      throw new Error('Category not found')
    }

    const now = Date.now()
    const productId = await ctx.db.insert('products', {
      name: args.name,
      slug,
      description: args.description,
      basePrice: args.basePrice,
      type: args.type,
      preparationDays: args.preparationDays,
      images: args.images,
      categoryId: args.categoryId,
      collectionIds: args.collectionIds,
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    })

    return productId
  },
})
```

**Paso 2: Commit**

```bash
git add convex/products.ts
git commit -m "feat(convex): add products.create mutation"
```

---

## Tarea 9.7: Mutation para actualizar producto

**Archivo:** `convex/products.ts`

**Paso 1: Agregar mutation update**

```typescript
export const update = mutation({
  args: {
    id: v.id('products'),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    basePrice: v.optional(v.number()),
    type: v.optional(v.union(v.literal('physical'), v.literal('digital'))),
    preparationDays: v.optional(v.union(v.number(), v.null())),
    images: v.optional(v.array(v.string())),
    categoryId: v.optional(v.id('categories')),
    collectionIds: v.optional(v.array(v.id('collections'))),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args

    const product = await ctx.db.get(id)
    if (!product) {
      throw new Error('Product not found')
    }

    // Si se actualiza el slug, verificar que no exista
    if (updates.slug && updates.slug !== product.slug) {
      const existing = await ctx.db
        .query('products')
        .withIndex('by_slug', (q) => q.eq('slug', updates.slug))
        .unique()

      if (existing) {
        throw new Error(`Product with slug "${updates.slug}" already exists`)
      }
    }

    // Si se actualiza la categoría, verificar que existe
    if (updates.categoryId) {
      const category = await ctx.db.get(updates.categoryId)
      if (!category) {
        throw new Error('Category not found')
      }
    }

    const fieldsToUpdate: Record<string, unknown> = { updatedAt: Date.now() }
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fieldsToUpdate[key] = value
      }
    }

    await ctx.db.patch(id, fieldsToUpdate)
    return null
  },
})
```

**Paso 2: Commit**

```bash
git add convex/products.ts
git commit -m "feat(convex): add products.update mutation"
```

---

## Tarea 9.8: Mutation para eliminar producto

**Archivo:** `convex/products.ts`

**Paso 1: Agregar mutation remove**

```typescript
export const remove = mutation({
  args: { id: v.id('products') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id)
    if (!product) {
      throw new Error('Product not found')
    }

    // Eliminar variantes asociadas
    const variants = await ctx.db
      .query('variants')
      .withIndex('by_product', (q) => q.eq('productId', args.id))
      .collect()

    for (const variant of variants) {
      await ctx.db.delete(variant._id)
    }

    // Eliminar archivos digitales asociados
    const digitalFiles = await ctx.db
      .query('digitalFiles')
      .withIndex('by_product', (q) => q.eq('productId', args.id))
      .collect()

    for (const file of digitalFiles) {
      await ctx.db.delete(file._id)
    }

    // Eliminar el producto
    await ctx.db.delete(args.id)
    return null
  },
})
```

**Paso 2: Commit**

```bash
git add convex/products.ts
git commit -m "feat(convex): add products.remove mutation"
```

---

## Tarea 9.9: Mutation para toggle estado activo

**Archivo:** `convex/products.ts`

**Paso 1: Agregar mutation toggleActive**

```typescript
export const toggleActive = mutation({
  args: { id: v.id('products') },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id)
    if (!product) {
      throw new Error('Product not found')
    }

    const newStatus = !product.isActive
    await ctx.db.patch(args.id, {
      isActive: newStatus,
      updatedAt: Date.now(),
    })
    return newStatus
  },
})
```

**Paso 2: Commit**

```bash
git add convex/products.ts
git commit -m "feat(convex): add products.toggleActive mutation"
```

---

## Verificación Final de Fase 09

```bash
pnpm run dev:convex
```

Esperado: Functions disponibles en `api.products.*`

---

**Siguiente fase:** `fase-10-crud-variants.md`
