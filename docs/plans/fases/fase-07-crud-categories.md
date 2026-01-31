# Fase 07: CRUD Categorías

> **Prerrequisitos:** Fase 06 completada (schema completo)
> **Resultado:** Functions Convex para gestionar categorías

---

## Tarea 7.1: Crear archivo de funciones de categorías

**Archivo:** `convex/categories.ts`

**Paso 1: Crear archivo con imports**

```typescript
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
```

**Paso 2: Commit**

```bash
git add convex/categories.ts
git commit -m "feat(convex): create categories functions file"
```

---

## Tarea 7.2: Query para listar categorías

**Archivo:** `convex/categories.ts`

**Paso 1: Agregar query list**

```typescript
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('categories'),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      order: v.number(),
      image: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx) => {
    const categories = await ctx.db
      .query('categories')
      .withIndex('by_order')
      .collect()
    return categories
  },
})
```

**Paso 2: Verificar que compila**

```bash
pnpm run dev:convex
```

**Paso 3: Commit**

```bash
git add convex/categories.ts
git commit -m "feat(convex): add categories.list query"
```

---

## Tarea 7.3: Query para obtener categoría por slug

**Archivo:** `convex/categories.ts`

**Paso 1: Agregar query getBySlug**

```typescript
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('categories'),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      order: v.number(),
      image: v.union(v.string(), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query('categories')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    return category
  },
})
```

**Paso 2: Commit**

```bash
git add convex/categories.ts
git commit -m "feat(convex): add categories.getBySlug query"
```

---

## Tarea 7.4: Mutation para crear categoría

**Archivo:** `convex/categories.ts`

**Paso 1: Agregar mutation create**

```typescript
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    order: v.number(),
    image: v.union(v.string(), v.null()),
  },
  returns: v.id('categories'),
  handler: async (ctx, args) => {
    // Verificar que el slug no exista
    const existing = await ctx.db
      .query('categories')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (existing) {
      throw new Error(`Category with slug "${args.slug}" already exists`)
    }

    const categoryId = await ctx.db.insert('categories', {
      name: args.name,
      slug: args.slug,
      order: args.order,
      image: args.image,
    })

    return categoryId
  },
})
```

**Paso 2: Commit**

```bash
git add convex/categories.ts
git commit -m "feat(convex): add categories.create mutation"
```

---

## Tarea 7.5: Mutation para actualizar categoría

**Archivo:** `convex/categories.ts`

**Paso 1: Agregar mutation update**

```typescript
export const update = mutation({
  args: {
    id: v.id('categories'),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    order: v.optional(v.number()),
    image: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args

    // Verificar que la categoría existe
    const category = await ctx.db.get(id)
    if (!category) {
      throw new Error('Category not found')
    }

    // Si se actualiza el slug, verificar que no exista
    if (updates.slug && updates.slug !== category.slug) {
      const existing = await ctx.db
        .query('categories')
        .withIndex('by_slug', (q) => q.eq('slug', updates.slug))
        .unique()

      if (existing) {
        throw new Error(`Category with slug "${updates.slug}" already exists`)
      }
    }

    // Filtrar campos undefined
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
git add convex/categories.ts
git commit -m "feat(convex): add categories.update mutation"
```

---

## Tarea 7.6: Mutation para eliminar categoría

**Archivo:** `convex/categories.ts`

**Paso 1: Agregar mutation remove**

```typescript
export const remove = mutation({
  args: { id: v.id('categories') },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verificar que no haya productos en esta categoría
    const productsInCategory = await ctx.db
      .query('products')
      .withIndex('by_category', (q) => q.eq('categoryId', args.id))
      .first()

    if (productsInCategory) {
      throw new Error('Cannot delete category with existing products')
    }

    await ctx.db.delete(args.id)
    return null
  },
})
```

**Paso 2: Commit**

```bash
git add convex/categories.ts
git commit -m "feat(convex): add categories.remove mutation"
```

---

## Tarea 7.7: Mutation para reordenar categorías

**Archivo:** `convex/categories.ts`

**Paso 1: Agregar mutation reorder**

```typescript
export const reorder = mutation({
  args: {
    orderedIds: v.array(v.id('categories')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Actualizar el orden de cada categoría
    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], { order: i })
    }
    return null
  },
})
```

**Paso 2: Commit**

```bash
git add convex/categories.ts
git commit -m "feat(convex): add categories.reorder mutation"
```

---

## Archivo Completo: `convex/categories.ts`

```typescript
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('categories'),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      order: v.number(),
      image: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx) => {
    const categories = await ctx.db
      .query('categories')
      .withIndex('by_order')
      .collect()
    return categories
  },
})

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('categories'),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      order: v.number(),
      image: v.union(v.string(), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query('categories')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    return category
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    order: v.number(),
    image: v.union(v.string(), v.null()),
  },
  returns: v.id('categories'),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('categories')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (existing) {
      throw new Error(`Category with slug "${args.slug}" already exists`)
    }

    const categoryId = await ctx.db.insert('categories', {
      name: args.name,
      slug: args.slug,
      order: args.order,
      image: args.image,
    })

    return categoryId
  },
})

export const update = mutation({
  args: {
    id: v.id('categories'),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    order: v.optional(v.number()),
    image: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args

    const category = await ctx.db.get(id)
    if (!category) {
      throw new Error('Category not found')
    }

    if (updates.slug && updates.slug !== category.slug) {
      const existing = await ctx.db
        .query('categories')
        .withIndex('by_slug', (q) => q.eq('slug', updates.slug))
        .unique()

      if (existing) {
        throw new Error(`Category with slug "${updates.slug}" already exists`)
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

export const remove = mutation({
  args: { id: v.id('categories') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const productsInCategory = await ctx.db
      .query('products')
      .withIndex('by_category', (q) => q.eq('categoryId', args.id))
      .first()

    if (productsInCategory) {
      throw new Error('Cannot delete category with existing products')
    }

    await ctx.db.delete(args.id)
    return null
  },
})

export const reorder = mutation({
  args: {
    orderedIds: v.array(v.id('categories')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], { order: i })
    }
    return null
  },
})
```

---

## Verificación Final de Fase 07

```bash
pnpm run dev:convex
```

Esperado: Functions disponibles en `api.categories.*`

---

**Siguiente fase:** `fase-08-crud-collections.md`
