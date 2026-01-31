# Fase 08: CRUD Colecciones

> **Prerrequisitos:** Fase 07 completada
> **Resultado:** Functions Convex para gestionar colecciones

---

## Tarea 8.1: Crear archivo de funciones de colecciones

**Archivo:** `convex/collections.ts`

**Paso 1: Crear archivo con imports**

```typescript
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
```

**Paso 2: Commit**

```bash
git add convex/collections.ts
git commit -m "feat(convex): create collections functions file"
```

---

## Tarea 8.2: Query para listar colecciones

**Archivo:** `convex/collections.ts`

**Paso 1: Agregar query list**

```typescript
export const list = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id('collections'),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      description: v.union(v.string(), v.null()),
      image: v.union(v.string(), v.null()),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      return await ctx.db
        .query('collections')
        .withIndex('by_active', (q) => q.eq('isActive', true))
        .collect()
    }
    return await ctx.db.query('collections').collect()
  },
})
```

**Paso 2: Commit**

```bash
git add convex/collections.ts
git commit -m "feat(convex): add collections.list query"
```

---

## Tarea 8.3: Query para obtener colección por slug

**Archivo:** `convex/collections.ts`

**Paso 1: Agregar query getBySlug**

```typescript
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('collections'),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      description: v.union(v.string(), v.null()),
      image: v.union(v.string(), v.null()),
      isActive: v.boolean(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const collection = await ctx.db
      .query('collections')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    return collection
  },
})
```

**Paso 2: Commit**

```bash
git add convex/collections.ts
git commit -m "feat(convex): add collections.getBySlug query"
```

---

## Tarea 8.4: Mutation para crear colección

**Archivo:** `convex/collections.ts`

**Paso 1: Agregar mutation create**

```typescript
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.union(v.string(), v.null()),
    image: v.union(v.string(), v.null()),
    isActive: v.boolean(),
  },
  returns: v.id('collections'),
  handler: async (ctx, args) => {
    // Verificar que el slug no exista
    const existing = await ctx.db
      .query('collections')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (existing) {
      throw new Error(`Collection with slug "${args.slug}" already exists`)
    }

    const collectionId = await ctx.db.insert('collections', {
      name: args.name,
      slug: args.slug,
      description: args.description,
      image: args.image,
      isActive: args.isActive,
      createdAt: Date.now(),
    })

    return collectionId
  },
})
```

**Paso 2: Commit**

```bash
git add convex/collections.ts
git commit -m "feat(convex): add collections.create mutation"
```

---

## Tarea 8.5: Mutation para actualizar colección

**Archivo:** `convex/collections.ts`

**Paso 1: Agregar mutation update**

```typescript
export const update = mutation({
  args: {
    id: v.id('collections'),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    image: v.optional(v.union(v.string(), v.null())),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args

    const collection = await ctx.db.get(id)
    if (!collection) {
      throw new Error('Collection not found')
    }

    // Si se actualiza el slug, verificar que no exista
    if (updates.slug && updates.slug !== collection.slug) {
      const existing = await ctx.db
        .query('collections')
        .withIndex('by_slug', (q) => q.eq('slug', updates.slug))
        .unique()

      if (existing) {
        throw new Error(`Collection with slug "${updates.slug}" already exists`)
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
git add convex/collections.ts
git commit -m "feat(convex): add collections.update mutation"
```

---

## Tarea 8.6: Mutation para eliminar colección

**Archivo:** `convex/collections.ts`

**Paso 1: Agregar mutation remove**

```typescript
export const remove = mutation({
  args: { id: v.id('collections') },
  returns: v.null(),
  handler: async (ctx, args) => {
    // No necesitamos verificar productos porque collectionIds es un array
    // y los productos pueden existir sin colecciones
    await ctx.db.delete(args.id)
    return null
  },
})
```

**Paso 2: Commit**

```bash
git add convex/collections.ts
git commit -m "feat(convex): add collections.remove mutation"
```

---

## Tarea 8.7: Mutation para toggle estado activo

**Archivo:** `convex/collections.ts`

**Paso 1: Agregar mutation toggleActive**

```typescript
export const toggleActive = mutation({
  args: { id: v.id('collections') },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const collection = await ctx.db.get(args.id)
    if (!collection) {
      throw new Error('Collection not found')
    }

    const newStatus = !collection.isActive
    await ctx.db.patch(args.id, { isActive: newStatus })
    return newStatus
  },
})
```

**Paso 2: Commit**

```bash
git add convex/collections.ts
git commit -m "feat(convex): add collections.toggleActive mutation"
```

---

## Verificación Final de Fase 08

```bash
pnpm run dev:convex
```

Esperado: Functions disponibles en `api.collections.*`

---

**Siguiente fase:** `fase-09-crud-products-basic.md`
