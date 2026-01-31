# Fase 06: Schema Convex - Admin y Configuración

> **Prerrequisitos:** Fase 05 completada
> **Resultado:** Tablas `adminUser` y `storeSettings` definidas. Schema completo.

---

## Tarea 6.1: Agregar tabla adminUser

**Archivo:** `convex/schema.ts`

**Paso 1: Agregar tabla adminUser**

Después de `downloadLinks`, agregar:

```typescript
  // Usuario administrador
  adminUser: defineTable({
    username: v.string(),
    passwordHash: v.string(),
    lastLoginAt: v.union(v.number(), v.null()),
  }).index('by_username', ['username']),
```

**Paso 2: Verificar schema**

```bash
pnpm run dev:convex
```

**Paso 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(convex): add adminUser table schema"
```

---

## Tarea 6.2: Agregar tabla storeSettings

**Archivo:** `convex/schema.ts`

**Paso 1: Agregar tabla storeSettings**

Después de `adminUser`, agregar:

```typescript
  // Configuración de la tienda (documento único)
  storeSettings: defineTable({
    shippingRate: v.number(), // tarifa fija de envío
    freeShippingThreshold: v.number(), // monto mínimo para envío gratis
    contactEmail: v.string(),
    lastOrderNumber: v.number(), // contador para generar #PTCH1001, etc.
  }),
```

**Paso 2: Verificar schema**

```bash
pnpm run dev:convex
```

**Paso 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(convex): add storeSettings table schema"
```

---

## Tarea 6.3: Eliminar tabla de ejemplo

**Archivo:** `convex/schema.ts`

**Paso 1: Eliminar tabla `numbers`**

Si existe la tabla `numbers` del ejemplo inicial, elimínala del schema.

**Paso 2: Verificar schema**

```bash
pnpm run dev:convex
```

**Paso 3: Commit**

```bash
git add convex/schema.ts
git commit -m "chore(convex): remove example numbers table"
```

---

## Schema Completo Final

**Archivo:** `convex/schema.ts`

```typescript
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// Validators reutilizables
const orderItemValidator = v.object({
  productId: v.id('products'),
  variantId: v.union(v.id('variants'), v.null()),
  name: v.string(),
  variantName: v.union(v.string(), v.null()),
  price: v.number(),
  quantity: v.number(),
  type: v.union(v.literal('physical'), v.literal('digital')),
})

const shippingAddressValidator = v.object({
  name: v.string(),
  street: v.string(),
  city: v.string(),
  state: v.string(),
  zipCode: v.string(),
  phone: v.string(),
})

export default defineSchema({
  // ============ CATÁLOGO ============

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

  // Categorías
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

  // ============ ÓRDENES ============

  // Pedidos
  orders: defineTable({
    orderNumber: v.string(),
    email: v.string(),
    items: v.array(orderItemValidator),
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
    shippingAddress: v.union(shippingAddressValidator, v.null()),
    trackingNumber: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_orderNumber', ['orderNumber'])
    .index('by_email', ['email'])
    .index('by_status', ['status'])
    .index('by_stripePaymentIntentId', ['stripePaymentIntentId']),

  // Enlaces de descarga
  downloadLinks: defineTable({
    orderId: v.id('orders'),
    fileId: v.id('digitalFiles'),
    token: v.string(),
    expiresAt: v.number(),
    downloadsRemaining: v.number(),
    createdAt: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_order', ['orderId']),

  // ============ ADMIN ============

  // Usuario administrador
  adminUser: defineTable({
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

---

## Verificación Final de Fase 06

**Verificar schema completo:**

```bash
pnpm run dev:convex
```

Esperado: "Schema updated" con todas las tablas:
- products
- variants
- categories
- collections
- digitalFiles
- orders
- downloadLinks
- adminUser
- storeSettings

**Verificar que el proyecto compila:**

```bash
pnpm run build
```

---

**Siguiente fase:** `fase-07-crud-categories.md`
