# Fase 1: Fundamentos - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establecer la base técnica del proyecto: dependencias, schema de Convex, funciones CRUD básicas y configuración de storage.

**Architecture:** Schema-first approach con Convex. Definir todas las tablas y tipos antes de implementar funciones. Usar validators estrictos en todas las funciones.

**Tech Stack:** Convex, shadcn/ui, Stripe, Resend, jose, zod, react-hook-form, lucide-react

**Branch:** `feat/fase-1-fundamentos`

---

## Pre-requisitos

- [ ] Leer `CLAUDE.md` para entender convenciones del proyecto
- [ ] Verificar que `pnpm run dev` funciona correctamente
- [ ] Tener acceso a las credenciales de Stripe (test mode)

---

## Instrucciones Generales para el Agente

### Antes de cada tarea:
1. Asegúrate de estar en el branch correcto: `git checkout feat/fase-1-fundamentos`
2. Pull cambios recientes: `git pull origin feat/fase-1-fundamentos`

### Después de cada tarea completada:
1. Ejecutar `pnpm run lint:fix` para formatear código
2. Ejecutar `pnpm run dev` y verificar que no hay errores de tipos en Convex
3. Verificar en la consola de Convex que el schema se sincroniza sin errores
4. Hacer commit con mensaje descriptivo
5. Marcar el checkbox de la tarea como completado

### Al finalizar la fase:
1. Verificar TODOS los checkboxes marcados
2. Ejecutar `pnpm run build` para validar build completo
3. Solicitar aprobación del usuario antes de merge a main

---

## Task 1: Crear branch y configurar entorno

**Files:**
- Ninguno (solo git)

### Step 1: Crear branch desde main

```bash
git checkout main
git pull origin main
git checkout -b feat/fase-1-fundamentos
```

### Step 2: Verificar estado limpio

```bash
git status
```
Expected: `On branch feat/fase-1-fundamentos`, working tree clean

### Step 3: Push branch inicial

```bash
git push -u origin feat/fase-1-fundamentos
```

### Commit: N/A (branch creation)

- [ ] **Task 1 completada**

---

## Task 2: Instalar dependencias de UI (shadcn/ui)

**Files:**
- Modify: `package.json`
- Create: `src/components/ui/` (directorio)
- Create: `src/lib/utils.ts`
- Create: `components.json`

### Step 1: Inicializar shadcn/ui

```bash
pnpm dlx shadcn@latest init
```

Responder a las preguntas:
- Style: Default
- Base color: Neutral
- CSS variables: Yes
- Tailwind CSS: Yes (detectado automáticamente)
- Components location: `src/components`
- Utils location: `src/lib/utils`
- React Server Components: No

### Step 2: Instalar componentes base necesarios

```bash
pnpm dlx shadcn@latest add button input label card dialog select textarea table badge tabs form toast sonner dropdown-menu separator scroll-area sheet skeleton switch radio-group alert-dialog
```

### Step 3: Verificar instalación

```bash
ls src/components/ui/
```
Expected: Archivos de componentes (.tsx) creados

### Step 4: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 5: Commit

```bash
git add .
git commit -m "feat: initialize shadcn/ui with base components"
```

- [ ] **Task 2 completada**

---

## Task 3: Instalar dependencias de pagos y emails

**Files:**
- Modify: `package.json`

### Step 1: Instalar Stripe

```bash
pnpm add @stripe/stripe-js stripe
```

### Step 2: Instalar Resend y React Email

```bash
pnpm add resend @react-email/components
```

### Step 3: Instalar jose para JWT

```bash
pnpm add jose
```

### Step 4: Instalar react-hook-form y zod

```bash
pnpm add react-hook-form zod @hookform/resolvers
```

### Step 5: Instalar lucide-react para iconos

```bash
pnpm add lucide-react
```

### Step 6: Verificar package.json

```bash
cat package.json | grep -E "(stripe|resend|jose|hook-form|zod|lucide)"
```
Expected: Todas las dependencias listadas

### Step 7: Commit

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add Stripe, Resend, jose, react-hook-form, zod, lucide-react"
```

- [ ] **Task 3 completada**

---

## Task 4: Definir schema de Convex - Productos y Catálogo

**Files:**
- Modify: `convex/schema.ts`

### Step 1: Leer schema actual

Abrir `convex/schema.ts` para ver estructura existente.

### Step 2: Agregar tablas de productos, variantes, categorías y colecciones

```typescript
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Categorías de productos
  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    order: v.number(),
    image: v.union(v.string(), v.null()),
  })
    .index('by_slug', ['slug'])
    .index('by_order', ['order']),

  // Colecciones (promociones, temporadas)
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

  // Productos
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
    .index('by_type', ['type'])
    .index('by_active', ['isActive'])
    .index('by_active_type', ['isActive', 'type']),

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

  // Archivos digitales
  digitalFiles: defineTable({
    productId: v.id('products'),
    name: v.string(),
    storageId: v.string(),
    fileSize: v.number(),
  }).index('by_product', ['productId']),

  // Enlaces de descarga
  downloadLinks: defineTable({
    orderId: v.id('orders'),
    fileId: v.id('digitalFiles'),
    token: v.string(),
    expiresAt: v.number(),
    downloadsRemaining: v.number(),
    createdAt: v.number(),
  })
    .index('by_order', ['orderId'])
    .index('by_token', ['token']),

  // Pedidos
  orders: defineTable({
    orderNumber: v.string(),
    email: v.string(),
    items: v.array(
      v.object({
        productId: v.id('products'),
        variantId: v.union(v.id('variants'), v.null()),
        name: v.string(),
        variantName: v.union(v.string(), v.null()),
        price: v.number(),
        quantity: v.number(),
        type: v.union(v.literal('physical'), v.literal('digital')),
      })
    ),
    subtotal: v.number(),
    shippingCost: v.number(),
    total: v.number(),
    paymentMethod: v.union(v.literal('card'), v.literal('oxxo')),
    stripePaymentIntentId: v.string(),
    status: v.union(
      v.literal('pending_payment'),
      v.literal('pending'),
      v.literal('preparing'),
      v.literal('shipped'),
      v.literal('delivered')
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
    .index('by_orderNumber', ['orderNumber'])
    .index('by_email', ['email'])
    .index('by_status', ['status'])
    .index('by_createdAt', ['createdAt']),

  // Usuario admin
  adminUsers: defineTable({
    username: v.string(),
    passwordHash: v.string(),
    lastLoginAt: v.union(v.number(), v.null()),
  }).index('by_username', ['username']),

  // Configuración de la tienda
  storeSettings: defineTable({
    shippingRate: v.number(),
    freeShippingThreshold: v.number(),
    contactEmail: v.string(),
    lastOrderNumber: v.number(),
  }),
})
```

### Step 3: Ejecutar dev para sincronizar schema

```bash
pnpm run dev:convex
```
Expected: Schema sincronizado sin errores

### Step 4: Verificar en consola de Convex

Abrir la consola de Convex en el navegador y verificar que todas las tablas aparecen.

### Step 5: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 6: Commit

```bash
git add convex/schema.ts
git commit -m "feat: define complete Convex schema for store"
```

- [ ] **Task 4 completada**

---

## Task 5: Crear funciones CRUD para categorías

**Files:**
- Create: `convex/categories.ts`

### Step 1: Crear archivo de funciones para categorías

```typescript
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Listar todas las categorías ordenadas
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
    return await ctx.db.query('categories').withIndex('by_order').collect()
  },
})

// Obtener categoría por slug
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
    return await ctx.db
      .query('categories')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
  },
})

// Obtener categoría por ID
export const getById = query({
  args: { id: v.id('categories') },
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
    return await ctx.db.get(args.id)
  },
})

// Crear categoría
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

    return await ctx.db.insert('categories', args)
  },
})

// Actualizar categoría
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

    await ctx.db.patch(id, updates)
    return null
  },
})

// Eliminar categoría
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
      throw new Error('Cannot delete category with associated products')
    }

    await ctx.db.delete(args.id)
    return null
  },
})

// Reordenar categorías
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

### Step 2: Ejecutar dev para verificar tipos

```bash
pnpm run dev:convex
```
Expected: Sin errores de tipos

### Step 3: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 4: Commit

```bash
git add convex/categories.ts
git commit -m "feat: add CRUD functions for categories"
```

- [ ] **Task 5 completada**

---

## Task 6: Crear funciones CRUD para colecciones

**Files:**
- Create: `convex/collections.ts`

### Step 1: Crear archivo de funciones para colecciones

```typescript
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Listar todas las colecciones
export const list = query({
  args: { activeOnly: v.optional(v.boolean()) },
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

// Obtener colección por slug
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
    return await ctx.db
      .query('collections')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
  },
})

// Obtener colección por ID
export const getById = query({
  args: { id: v.id('collections') },
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
    return await ctx.db.get(args.id)
  },
})

// Crear colección
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

    return await ctx.db.insert('collections', {
      ...args,
      createdAt: Date.now(),
    })
  },
})

// Actualizar colección
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

    await ctx.db.patch(id, updates)
    return null
  },
})

// Eliminar colección
export const remove = mutation({
  args: { id: v.id('collections') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  },
})

// Toggle estado activo
export const toggleActive = mutation({
  args: { id: v.id('collections') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const collection = await ctx.db.get(args.id)
    if (!collection) {
      throw new Error('Collection not found')
    }

    await ctx.db.patch(args.id, { isActive: !collection.isActive })
    return null
  },
})
```

### Step 2: Ejecutar dev para verificar tipos

```bash
pnpm run dev:convex
```
Expected: Sin errores de tipos

### Step 3: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 4: Commit

```bash
git add convex/collections.ts
git commit -m "feat: add CRUD functions for collections"
```

- [ ] **Task 6 completada**

---

## Task 7: Crear funciones CRUD para productos

**Files:**
- Create: `convex/products.ts`

### Step 1: Crear archivo de funciones para productos

```typescript
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

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

// Listar productos con filtros
export const list = query({
  args: {
    categoryId: v.optional(v.id('categories')),
    type: v.optional(v.union(v.literal('physical'), v.literal('digital'))),
    activeOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(productValidator),
  handler: async (ctx, args) => {
    let q = ctx.db.query('products')

    if (args.activeOnly && args.type) {
      q = q.withIndex('by_active_type', (q) =>
        q.eq('isActive', true).eq('type', args.type!)
      )
    } else if (args.activeOnly) {
      q = q.withIndex('by_active', (q) => q.eq('isActive', true))
    } else if (args.type) {
      q = q.withIndex('by_type', (q) => q.eq('type', args.type!))
    } else if (args.categoryId) {
      q = q.withIndex('by_category', (q) => q.eq('categoryId', args.categoryId!))
    }

    const products = await q.collect()

    // Filtros adicionales que no pueden usar índices
    let filtered = products
    if (args.categoryId && !args.activeOnly && !args.type) {
      // Ya filtrado por índice
    } else if (args.categoryId) {
      filtered = filtered.filter((p) => p.categoryId === args.categoryId)
    }

    if (args.limit) {
      filtered = filtered.slice(0, args.limit)
    }

    return filtered
  },
})

// Obtener producto por slug
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(productValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('products')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
  },
})

// Obtener producto por ID
export const getById = query({
  args: { id: v.id('products') },
  returns: v.union(productValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// Obtener productos por colección
export const getByCollection = query({
  args: {
    collectionId: v.id('collections'),
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.array(productValidator),
  handler: async (ctx, args) => {
    let q = ctx.db.query('products')

    if (args.activeOnly) {
      q = q.withIndex('by_active', (q) => q.eq('isActive', true))
    }

    const products = await q.collect()

    return products.filter((p) => p.collectionIds.includes(args.collectionId))
  },
})

// Buscar productos por nombre
export const search = query({
  args: {
    searchTerm: v.string(),
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.array(productValidator),
  handler: async (ctx, args) => {
    let q = ctx.db.query('products')

    if (args.activeOnly) {
      q = q.withIndex('by_active', (q) => q.eq('isActive', true))
    }

    const products = await q.collect()
    const term = args.searchTerm.toLowerCase()

    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
    )
  },
})

// Crear producto
export const create = mutation({
  args: {
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
  },
  returns: v.id('products'),
  handler: async (ctx, args) => {
    // Verificar que el slug no exista
    const existing = await ctx.db
      .query('products')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (existing) {
      throw new Error(`Product with slug "${args.slug}" already exists`)
    }

    // Verificar que la categoría exista
    const category = await ctx.db.get(args.categoryId)
    if (!category) {
      throw new Error('Category not found')
    }

    const now = Date.now()
    return await ctx.db.insert('products', {
      ...args,
      createdAt: now,
      updatedAt: now,
    })
  },
})

// Actualizar producto
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

    // Si se actualiza la categoría, verificar que exista
    if (updates.categoryId) {
      const category = await ctx.db.get(updates.categoryId)
      if (!category) {
        throw new Error('Category not found')
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    })
    return null
  },
})

// Eliminar producto
export const remove = mutation({
  args: { id: v.id('products') },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verificar que no haya variantes asociadas
    const variants = await ctx.db
      .query('variants')
      .withIndex('by_product', (q) => q.eq('productId', args.id))
      .first()

    if (variants) {
      throw new Error('Cannot delete product with associated variants')
    }

    // Verificar que no haya archivos digitales asociados
    const files = await ctx.db
      .query('digitalFiles')
      .withIndex('by_product', (q) => q.eq('productId', args.id))
      .first()

    if (files) {
      throw new Error('Cannot delete product with associated digital files')
    }

    await ctx.db.delete(args.id)
    return null
  },
})

// Toggle estado activo
export const toggleActive = mutation({
  args: { id: v.id('products') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id)
    if (!product) {
      throw new Error('Product not found')
    }

    await ctx.db.patch(args.id, {
      isActive: !product.isActive,
      updatedAt: Date.now(),
    })
    return null
  },
})
```

### Step 2: Ejecutar dev para verificar tipos

```bash
pnpm run dev:convex
```
Expected: Sin errores de tipos

### Step 3: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 4: Commit

```bash
git add convex/products.ts
git commit -m "feat: add CRUD functions for products"
```

- [ ] **Task 7 completada**

---

## Task 8: Crear funciones CRUD para variantes

**Files:**
- Create: `convex/variants.ts`

### Step 1: Crear archivo de funciones para variantes

```typescript
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

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

// Listar variantes por producto
export const listByProduct = query({
  args: { productId: v.id('products') },
  returns: v.array(variantValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('variants')
      .withIndex('by_product', (q) => q.eq('productId', args.productId))
      .collect()
  },
})

// Obtener variante por ID
export const getById = query({
  args: { id: v.id('variants') },
  returns: v.union(variantValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// Obtener variante por SKU
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

// Crear variante
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
    // Verificar que el producto exista
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

    return await ctx.db.insert('variants', args)
  },
})

// Actualizar variante
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

    await ctx.db.patch(id, updates)
    return null
  },
})

// Actualizar stock
export const updateStock = mutation({
  args: {
    id: v.id('variants'),
    stock: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id)
    if (!variant) {
      throw new Error('Variant not found')
    }

    await ctx.db.patch(args.id, { stock: args.stock })
    return null
  },
})

// Decrementar stock (para pedidos)
export const decrementStock = mutation({
  args: {
    id: v.id('variants'),
    quantity: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id)
    if (!variant) {
      throw new Error('Variant not found')
    }

    if (variant.stock < args.quantity) {
      throw new Error('Insufficient stock')
    }

    await ctx.db.patch(args.id, { stock: variant.stock - args.quantity })
    return null
  },
})

// Eliminar variante
export const remove = mutation({
  args: { id: v.id('variants') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  },
})
```

### Step 2: Ejecutar dev para verificar tipos

```bash
pnpm run dev:convex
```
Expected: Sin errores de tipos

### Step 3: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 4: Commit

```bash
git add convex/variants.ts
git commit -m "feat: add CRUD functions for variants"
```

- [ ] **Task 8 completada**

---

## Task 9: Configurar Convex Storage para archivos

**Files:**
- Create: `convex/storage.ts`

### Step 1: Crear funciones de storage

```typescript
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Generar URL de subida
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

// Obtener URL de archivo
export const getUrl = query({
  args: { storageId: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})

// Obtener múltiples URLs
export const getUrls = query({
  args: { storageIds: v.array(v.string()) },
  returns: v.array(v.union(v.string(), v.null())),
  handler: async (ctx, args) => {
    return await Promise.all(
      args.storageIds.map((id) => ctx.storage.getUrl(id))
    )
  },
})

// Eliminar archivo
export const deleteFile = mutation({
  args: { storageId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId)
    return null
  },
})
```

### Step 2: Ejecutar dev para verificar tipos

```bash
pnpm run dev:convex
```
Expected: Sin errores de tipos

### Step 3: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 4: Commit

```bash
git add convex/storage.ts
git commit -m "feat: add Convex storage functions"
```

- [ ] **Task 9 completada**

---

## Task 10: Crear funciones para archivos digitales

**Files:**
- Create: `convex/digitalFiles.ts`

### Step 1: Crear funciones para archivos digitales

```typescript
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

const digitalFileValidator = v.object({
  _id: v.id('digitalFiles'),
  _creationTime: v.number(),
  productId: v.id('products'),
  name: v.string(),
  storageId: v.string(),
  fileSize: v.number(),
})

// Listar archivos por producto
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

// Obtener archivo por ID
export const getById = query({
  args: { id: v.id('digitalFiles') },
  returns: v.union(digitalFileValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// Crear archivo digital
export const create = mutation({
  args: {
    productId: v.id('products'),
    name: v.string(),
    storageId: v.string(),
    fileSize: v.number(),
  },
  returns: v.id('digitalFiles'),
  handler: async (ctx, args) => {
    // Verificar que el producto exista y sea digital
    const product = await ctx.db.get(args.productId)
    if (!product) {
      throw new Error('Product not found')
    }
    if (product.type !== 'digital') {
      throw new Error('Can only add digital files to digital products')
    }

    return await ctx.db.insert('digitalFiles', args)
  },
})

// Actualizar archivo digital
export const update = mutation({
  args: {
    id: v.id('digitalFiles'),
    name: v.optional(v.string()),
    storageId: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args

    const file = await ctx.db.get(id)
    if (!file) {
      throw new Error('Digital file not found')
    }

    await ctx.db.patch(id, updates)
    return null
  },
})

// Eliminar archivo digital
export const remove = mutation({
  args: { id: v.id('digitalFiles') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.id)
    if (!file) {
      throw new Error('Digital file not found')
    }

    // Eliminar archivo del storage
    await ctx.storage.delete(file.storageId)

    // Eliminar registro
    await ctx.db.delete(args.id)
    return null
  },
})
```

### Step 2: Ejecutar dev para verificar tipos

```bash
pnpm run dev:convex
```
Expected: Sin errores de tipos

### Step 3: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 4: Commit

```bash
git add convex/digitalFiles.ts
git commit -m "feat: add CRUD functions for digital files"
```

- [ ] **Task 10 completada**

---

## Task 11: Crear función para configuración de tienda

**Files:**
- Create: `convex/storeSettings.ts`

### Step 1: Crear funciones de configuración

```typescript
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

const settingsValidator = v.object({
  _id: v.id('storeSettings'),
  _creationTime: v.number(),
  shippingRate: v.number(),
  freeShippingThreshold: v.number(),
  contactEmail: v.string(),
  lastOrderNumber: v.number(),
})

// Obtener configuración (crear si no existe)
export const get = query({
  args: {},
  returns: v.union(settingsValidator, v.null()),
  handler: async (ctx) => {
    const settings = await ctx.db.query('storeSettings').first()
    return settings
  },
})

// Inicializar configuración (solo si no existe)
export const initialize = mutation({
  args: {},
  returns: v.id('storeSettings'),
  handler: async (ctx) => {
    const existing = await ctx.db.query('storeSettings').first()
    if (existing) {
      return existing._id
    }

    return await ctx.db.insert('storeSettings', {
      shippingRate: 99, // $99 MXN
      freeShippingThreshold: 999, // Envío gratis a partir de $999
      contactEmail: 'contacto@patche.mx',
      lastOrderNumber: 1000, // Empezar en PTCH1001
    })
  },
})

// Actualizar configuración
export const update = mutation({
  args: {
    shippingRate: v.optional(v.number()),
    freeShippingThreshold: v.optional(v.number()),
    contactEmail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const settings = await ctx.db.query('storeSettings').first()
    if (!settings) {
      throw new Error('Store settings not initialized')
    }

    await ctx.db.patch(settings._id, args)
    return null
  },
})

// Obtener y incrementar número de orden
export const getNextOrderNumber = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const settings = await ctx.db.query('storeSettings').first()
    if (!settings) {
      throw new Error('Store settings not initialized')
    }

    const nextNumber = settings.lastOrderNumber + 1
    await ctx.db.patch(settings._id, { lastOrderNumber: nextNumber })

    return `#PTCH${nextNumber}`
  },
})
```

### Step 2: Ejecutar dev para verificar tipos

```bash
pnpm run dev:convex
```
Expected: Sin errores de tipos

### Step 3: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 4: Commit

```bash
git add convex/storeSettings.ts
git commit -m "feat: add store settings functions"
```

- [ ] **Task 11 completada**

---

## Task 12: Validación final y preparación para merge

**Files:**
- Ninguno (solo validación)

### Step 1: Ejecutar build completo

```bash
pnpm run build
```
Expected: Build exitoso sin errores

### Step 2: Ejecutar lint final

```bash
pnpm run lint:fix
```

### Step 3: Verificar que Convex sincroniza correctamente

```bash
pnpm run dev:convex
```
Expected: Sin errores, schema sincronizado

### Step 4: Verificar estructura de archivos creados

```bash
ls -la convex/*.ts
```

Expected:
- `convex/schema.ts`
- `convex/categories.ts`
- `convex/collections.ts`
- `convex/products.ts`
- `convex/variants.ts`
- `convex/storage.ts`
- `convex/digitalFiles.ts`
- `convex/storeSettings.ts`

### Step 5: Push final

```bash
git push origin feat/fase-1-fundamentos
```

- [ ] **Task 12 completada**

---

## Checklist Final de Fase 1

- [ ] Branch `feat/fase-1-fundamentos` creado
- [ ] shadcn/ui inicializado con componentes base
- [ ] Dependencias instaladas (Stripe, Resend, jose, etc.)
- [ ] Schema de Convex completo y sincronizado
- [ ] CRUD de categorías implementado
- [ ] CRUD de colecciones implementado
- [ ] CRUD de productos implementado
- [ ] CRUD de variantes implementado
- [ ] Funciones de storage implementadas
- [ ] CRUD de archivos digitales implementado
- [ ] Funciones de configuración de tienda implementadas
- [ ] Build pasa sin errores
- [ ] Lint pasa sin errores

---

## APROBACIÓN REQUERIDA

**Antes de hacer merge a main:**

1. Verificar que todos los checkboxes están marcados
2. Ejecutar `pnpm run build` una última vez
3. Solicitar aprobación explícita del usuario

**Comando para merge (solo después de aprobación):**

```bash
git checkout main
git merge feat/fase-1-fundamentos
git push origin main
```
