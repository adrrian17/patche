# Fase 05: Schema Convex - Órdenes y Downloads

> **Prerrequisitos:** Fase 04 completada
> **Resultado:** Tablas `orders` y `downloadLinks` definidas

---

## Tarea 5.1: Agregar tabla orders

**Archivo:** `convex/schema.ts`

**Paso 1: Definir el validator para items de orden**

Antes del `defineSchema`, agregar:

```typescript
// Validator para items de orden
const orderItemValidator = v.object({
  productId: v.id('products'),
  variantId: v.union(v.id('variants'), v.null()),
  name: v.string(),
  variantName: v.union(v.string(), v.null()),
  price: v.number(),
  quantity: v.number(),
  type: v.union(v.literal('physical'), v.literal('digital')),
})

// Validator para dirección de envío
const shippingAddressValidator = v.object({
  name: v.string(),
  street: v.string(),
  city: v.string(),
  state: v.string(),
  zipCode: v.string(),
  phone: v.string(),
})
```

**Paso 2: Agregar tabla orders**

Después de `digitalFiles`, agregar:

```typescript
  // Pedidos
  orders: defineTable({
    orderNumber: v.string(), // "#PTCH1001"
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
```

**Paso 3: Verificar schema**

```bash
pnpm run dev:convex
```

**Paso 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(convex): add orders table schema"
```

---

## Tarea 5.2: Agregar tabla downloadLinks

**Archivo:** `convex/schema.ts`

**Paso 1: Agregar tabla downloadLinks**

Después de `orders`, agregar:

```typescript
  // Enlaces de descarga para archivos digitales
  downloadLinks: defineTable({
    orderId: v.id('orders'),
    fileId: v.id('digitalFiles'),
    token: v.string(), // UUID único
    expiresAt: v.number(), // timestamp
    downloadsRemaining: v.number(), // intentos restantes
    createdAt: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_order', ['orderId']),
```

**Paso 2: Verificar schema**

```bash
pnpm run dev:convex
```

**Paso 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(convex): add downloadLinks table schema"
```

---

## Schema Parcial - Sección de Órdenes

```typescript
// Validators (antes de defineSchema)
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

// Dentro de defineSchema:

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
```

---

## Verificación Final de Fase 05

```bash
pnpm run dev:convex
```

Esperado: Schema actualizado con todas las tablas de órdenes

---

**Siguiente fase:** `fase-06-schema-admin.md`
