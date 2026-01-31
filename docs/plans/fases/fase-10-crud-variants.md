# Fase 10: CRUD Variantes

> **Prerrequisitos:** Fase 09 completada
> **Resultado:** Functions Convex para gestionar variantes de productos

---

## Tarea 10.1: Crear archivo de funciones de variantes

**Archivo:** `convex/variants.ts`

**Paso 1: Crear archivo con imports y validators**

```typescript
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Validator para variante
const variantValidator = v.object({
  _id: v.id('variants'),
  _creationTime: v.number(),
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
```

**Paso 2: Commit**

```bash
git add convex/variants.ts
git commit -m "feat(convex): create variants functions file"
```

---

## Tarea 10.2: Query para listar variantes de un producto

**Archivo:** `convex/variants.ts`

**Paso 1: Agregar query listByProduct**

```typescript
export const listByProduct = query({
  args: { productId: v.id('products') },
  returns: v.array(variantValidator),
  handler: async (ctx, args) => {
    const variants = await ctx.db
      .query('variants')
      .withIndex('by_product', (q) => q.eq('productId', args.productId))
      .collect()
    return variants
  },
})
```

**Paso 2: Commit**

```bash
git add convex/variants.ts
git commit -m "feat(convex): add variants.listByProduct query"
```

---

## Tarea 10.3: Query para obtener variante por ID

**Archivo:** `convex/variants.ts`

**Paso 1: Agregar query getById**

```typescript
export const getById = query({
  args: { id: v.id('variants') },
  returns: v.union(variantValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})
```

**Paso 2: Commit**

```bash
git add convex/variants.ts
git commit -m "feat(convex): add variants.getById query"
```

---

## Tarea 10.4: Query para obtener variante por SKU

**Archivo:** `convex/variants.ts`

**Paso 1: Agregar query getBySku**

```typescript
export const getBySku = query({
  args: { sku: v.string() },
  returns: v.union(variantValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('variants')
      .withIndex('by_sku', (q) => q.eq('sku', args.sku))
      .unique()
  },
})
```

**Paso 2: Commit**

```bash
git add convex/variants.ts
git commit -m "feat(convex): add variants.getBySku query"
```

---

## Tarea 10.5: Mutation para crear variante

**Archivo:** `convex/variants.ts`

**Paso 1: Agregar mutation create**

```typescript
export const create = mutation({
  args: {
    productId: v.id('products'),
    name: v.string(),
    attributes: v.object({
      size: v.optional(v.string()),
      color: v.optional(v.string()),
    }),
    price: v.union(v.number(), v.null()),
    stock: v.number(),
    sku: v.string(),
  },
  returns: v.id('variants'),
  handler: async (ctx, args) => {
    // Verificar que el producto existe
    const product = await ctx.db.get(args.productId)
    if (!product) {
      throw new Error('Product not found')
    }

    // Verificar que el SKU no exista
    const existingSku = await ctx.db
      .query('variants')
      .withIndex('by_sku', (q) => q.eq('sku', args.sku))
      .unique()

    if (existingSku) {
      throw new Error(`Variant with SKU "${args.sku}" already exists`)
    }

    const variantId = await ctx.db.insert('variants', {
      productId: args.productId,
      name: args.name,
      attributes: args.attributes,
      price: args.price,
      stock: args.stock,
      sku: args.sku,
    })

    return variantId
  },
})
```

**Paso 2: Commit**

```bash
git add convex/variants.ts
git commit -m "feat(convex): add variants.create mutation"
```

---

## Tarea 10.6: Mutation para actualizar variante

**Archivo:** `convex/variants.ts`

**Paso 1: Agregar mutation update**

```typescript
export const update = mutation({
  args: {
    id: v.id('variants'),
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
    const { id, ...updates } = args

    const variant = await ctx.db.get(id)
    if (!variant) {
      throw new Error('Variant not found')
    }

    // Si se actualiza el SKU, verificar que no exista
    if (updates.sku && updates.sku !== variant.sku) {
      const existingSku = await ctx.db
        .query('variants')
        .withIndex('by_sku', (q) => q.eq('sku', updates.sku))
        .unique()

      if (existingSku) {
        throw new Error(`Variant with SKU "${updates.sku}" already exists`)
      }
    }

    const fieldsToUpdate: Record<string, unknown> = {}
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
git add convex/variants.ts
git commit -m "feat(convex): add variants.update mutation"
```

---

## Tarea 10.7: Mutation para eliminar variante

**Archivo:** `convex/variants.ts`

**Paso 1: Agregar mutation remove**

```typescript
export const remove = mutation({
  args: { id: v.id('variants') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id)
    if (!variant) {
      throw new Error('Variant not found')
    }

    await ctx.db.delete(args.id)
    return null
  },
})
```

**Paso 2: Commit**

```bash
git add convex/variants.ts
git commit -m "feat(convex): add variants.remove mutation"
```

---

## Tarea 10.8: Mutation para actualizar stock

**Archivo:** `convex/variants.ts`

**Paso 1: Agregar mutation updateStock**

```typescript
export const updateStock = mutation({
  args: {
    id: v.id('variants'),
    quantity: v.number(), // positivo para agregar, negativo para restar
  },
  returns: v.number(), // nuevo stock
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id)
    if (!variant) {
      throw new Error('Variant not found')
    }

    const newStock = variant.stock + args.quantity
    if (newStock < 0) {
      throw new Error('Insufficient stock')
    }

    await ctx.db.patch(args.id, { stock: newStock })
    return newStock
  },
})
```

**Paso 2: Commit**

```bash
git add convex/variants.ts
git commit -m "feat(convex): add variants.updateStock mutation"
```

---

## Tarea 10.9: Query para verificar stock disponible

**Archivo:** `convex/variants.ts`

**Paso 1: Agregar query checkStock**

```typescript
export const checkStock = query({
  args: {
    items: v.array(
      v.object({
        variantId: v.id('variants'),
        quantity: v.number(),
      })
    ),
  },
  returns: v.object({
    available: v.boolean(),
    unavailableItems: v.array(
      v.object({
        variantId: v.id('variants'),
        requested: v.number(),
        available: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const unavailableItems: {
      variantId: (typeof args.items)[0]['variantId']
      requested: number
      available: number
    }[] = []

    for (const item of args.items) {
      const variant = await ctx.db.get(item.variantId)
      if (!variant || variant.stock < item.quantity) {
        unavailableItems.push({
          variantId: item.variantId,
          requested: item.quantity,
          available: variant?.stock ?? 0,
        })
      }
    }

    return {
      available: unavailableItems.length === 0,
      unavailableItems,
    }
  },
})
```

**Paso 2: Commit**

```bash
git add convex/variants.ts
git commit -m "feat(convex): add variants.checkStock query"
```

---

## Verificación Final de Fase 10

```bash
pnpm run dev:convex
```

Esperado: Functions disponibles en `api.variants.*`

---

**Siguiente fase:** `fase-11-crud-digital-files.md`
