# Fase 11: CRUD Archivos Digitales

> **Prerrequisitos:** Fase 10 completada
> **Resultado:** Functions Convex para gestionar archivos digitales de productos

---

## Tarea 11.1: Crear archivo de funciones de archivos digitales

**Archivo:** `convex/digitalFiles.ts`

**Paso 1: Crear archivo con imports y validators**

```typescript
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

const digitalFileValidator = v.object({
  _id: v.id('digitalFiles'),
  _creationTime: v.number(),
  productId: v.id('products'),
  name: v.string(),
  storageId: v.string(),
  fileSize: v.number(),
})
```

**Paso 2: Commit**

```bash
git add convex/digitalFiles.ts
git commit -m "feat(convex): create digitalFiles functions file"
```

---

## Tarea 11.2: Query para listar archivos de un producto

**Archivo:** `convex/digitalFiles.ts`

**Paso 1: Agregar query listByProduct**

```typescript
export const listByProduct = query({
  args: { productId: v.id('products') },
  returns: v.array(digitalFileValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('digitalFiles')
      .withIndex('by_product', (q) => q.eq('productId', args.productId))
      .collect()
  },
})
```

**Paso 2: Commit**

```bash
git add convex/digitalFiles.ts
git commit -m "feat(convex): add digitalFiles.listByProduct query"
```

---

## Tarea 11.3: Mutation para agregar archivo digital

**Archivo:** `convex/digitalFiles.ts`

**Paso 1: Agregar mutation create**

```typescript
export const create = mutation({
  args: {
    productId: v.id('products'),
    name: v.string(),
    storageId: v.string(),
    fileSize: v.number(),
  },
  returns: v.id('digitalFiles'),
  handler: async (ctx, args) => {
    // Verificar que el producto existe y es digital
    const product = await ctx.db.get(args.productId)
    if (!product) {
      throw new Error('Product not found')
    }
    if (product.type !== 'digital') {
      throw new Error('Cannot add digital file to physical product')
    }

    const fileId = await ctx.db.insert('digitalFiles', {
      productId: args.productId,
      name: args.name,
      storageId: args.storageId,
      fileSize: args.fileSize,
    })

    return fileId
  },
})
```

**Paso 2: Commit**

```bash
git add convex/digitalFiles.ts
git commit -m "feat(convex): add digitalFiles.create mutation"
```

---

## Tarea 11.4: Mutation para eliminar archivo digital

**Archivo:** `convex/digitalFiles.ts`

**Paso 1: Agregar mutation remove**

```typescript
export const remove = mutation({
  args: { id: v.id('digitalFiles') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.id)
    if (!file) {
      throw new Error('Digital file not found')
    }

    // También eliminar el archivo del storage
    await ctx.storage.delete(file.storageId)
    await ctx.db.delete(args.id)
    return null
  },
})
```

**Paso 2: Commit**

```bash
git add convex/digitalFiles.ts
git commit -m "feat(convex): add digitalFiles.remove mutation"
```

---

## Tarea 11.5: Query para obtener URL de descarga

**Archivo:** `convex/digitalFiles.ts`

**Paso 1: Agregar query getDownloadUrl**

```typescript
export const getDownloadUrl = query({
  args: { id: v.id('digitalFiles') },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.id)
    if (!file) return null

    const url = await ctx.storage.getUrl(file.storageId)
    return url
  },
})
```

**Paso 2: Commit**

```bash
git add convex/digitalFiles.ts
git commit -m "feat(convex): add digitalFiles.getDownloadUrl query"
```

---

## Verificación Final de Fase 11

```bash
pnpm run dev:convex
```

Esperado: Functions disponibles en `api.digitalFiles.*`

---

**Siguiente fase:** `fase-12-storage-setup.md`
