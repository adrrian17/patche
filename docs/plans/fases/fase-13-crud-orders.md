# Fase 13: CRUD Órdenes

> **Prerrequisitos:** Fase 12 completada
> **Resultado:** Functions Convex para gestionar pedidos

---

## Tarea 13.1: Crear archivo de funciones de órdenes

**Archivo:** `convex/orders.ts`

**Paso 1: Crear archivo con imports y validators**

```typescript
import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { internalMutation, mutation, query } from './_generated/server'

// Validator para item de orden
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

// Validator para orden completa
const orderValidator = v.object({
  _id: v.id('orders'),
  _creationTime: v.number(),
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

type OrderStatus = Doc<'orders'>['status']
```

**Paso 2: Commit**

```bash
git add convex/orders.ts
git commit -m "feat(convex): create orders functions file"
```

---

## Tarea 13.2: Helper para generar número de orden

**Archivo:** `convex/orders.ts`

**Paso 1: Agregar función interna para generar número de orden**

```typescript
export const generateOrderNumber = internalMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // Obtener o crear configuración de tienda
    let settings = await ctx.db.query('storeSettings').first()

    if (!settings) {
      // Crear configuración inicial
      await ctx.db.insert('storeSettings', {
        shippingRate: 99,
        freeShippingThreshold: 999,
        contactEmail: 'tienda@patche.mx',
        lastOrderNumber: 1000,
      })
      settings = await ctx.db.query('storeSettings').first()
    }

    const nextNumber = (settings?.lastOrderNumber ?? 1000) + 1
    await ctx.db.patch(settings!._id, { lastOrderNumber: nextNumber })

    return `#PTCH${nextNumber}`
  },
})
```

**Paso 2: Commit**

```bash
git add convex/orders.ts
git commit -m "feat(convex): add orders.generateOrderNumber internal mutation"
```

---

## Tarea 13.3: Query para listar órdenes (admin)

**Archivo:** `convex/orders.ts`

**Paso 1: Agregar query list**

```typescript
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal('pending_payment'),
        v.literal('pending'),
        v.literal('preparing'),
        v.literal('shipped'),
        v.literal('delivered')
      )
    ),
    limit: v.optional(v.number()),
  },
  returns: v.array(orderValidator),
  handler: async (ctx, args) => {
    let ordersQuery

    if (args.status) {
      ordersQuery = ctx.db
        .query('orders')
        .withIndex('by_status', (q) => q.eq('status', args.status!))
    } else {
      ordersQuery = ctx.db.query('orders')
    }

    let orders = await ordersQuery.order('desc').collect()

    if (args.limit) {
      orders = orders.slice(0, args.limit)
    }

    return orders
  },
})
```

**Paso 2: Commit**

```bash
git add convex/orders.ts
git commit -m "feat(convex): add orders.list query"
```

---

## Tarea 13.4: Query para obtener orden por ID

**Archivo:** `convex/orders.ts`

**Paso 1: Agregar query getById**

```typescript
export const getById = query({
  args: { id: v.id('orders') },
  returns: v.union(orderValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})
```

**Paso 2: Commit**

```bash
git add convex/orders.ts
git commit -m "feat(convex): add orders.getById query"
```

---

## Tarea 13.5: Query para obtener orden por número

**Archivo:** `convex/orders.ts`

**Paso 1: Agregar query getByOrderNumber**

```typescript
export const getByOrderNumber = query({
  args: { orderNumber: v.string() },
  returns: v.union(orderValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('orders')
      .withIndex('by_orderNumber', (q) => q.eq('orderNumber', args.orderNumber))
      .unique()
  },
})
```

**Paso 2: Commit**

```bash
git add convex/orders.ts
git commit -m "feat(convex): add orders.getByOrderNumber query"
```

---

## Tarea 13.6: Query para obtener orden por PaymentIntent

**Archivo:** `convex/orders.ts`

**Paso 1: Agregar query getByPaymentIntent**

```typescript
export const getByPaymentIntent = query({
  args: { paymentIntentId: v.string() },
  returns: v.union(orderValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('orders')
      .withIndex('by_stripePaymentIntentId', (q) =>
        q.eq('stripePaymentIntentId', args.paymentIntentId)
      )
      .unique()
  },
})
```

**Paso 2: Commit**

```bash
git add convex/orders.ts
git commit -m "feat(convex): add orders.getByPaymentIntent query"
```

---

## Tarea 13.7: Mutation para actualizar estado

**Archivo:** `convex/orders.ts`

**Paso 1: Agregar mutation updateStatus**

```typescript
export const updateStatus = mutation({
  args: {
    id: v.id('orders'),
    status: v.union(
      v.literal('pending_payment'),
      v.literal('pending'),
      v.literal('preparing'),
      v.literal('shipped'),
      v.literal('delivered')
    ),
    trackingNumber: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id)
    if (!order) {
      throw new Error('Order not found')
    }

    const updates: Partial<Doc<'orders'>> = {
      status: args.status,
      updatedAt: Date.now(),
    }

    // Si el estado es "shipped", requerir número de guía
    if (args.status === 'shipped') {
      if (!args.trackingNumber && !order.trackingNumber) {
        throw new Error('Tracking number required for shipped status')
      }
      if (args.trackingNumber) {
        updates.trackingNumber = args.trackingNumber
      }
    }

    await ctx.db.patch(args.id, updates)
    return null
  },
})
```

**Paso 2: Commit**

```bash
git add convex/orders.ts
git commit -m "feat(convex): add orders.updateStatus mutation"
```

---

## Tarea 13.8: Query para buscar órdenes por email

**Archivo:** `convex/orders.ts`

**Paso 1: Agregar query getByEmail**

```typescript
export const getByEmail = query({
  args: { email: v.string() },
  returns: v.array(orderValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('orders')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .order('desc')
      .collect()
  },
})
```

**Paso 2: Commit**

```bash
git add convex/orders.ts
git commit -m "feat(convex): add orders.getByEmail query"
```

---

## Tarea 13.9: Query para estadísticas de órdenes

**Archivo:** `convex/orders.ts`

**Paso 1: Agregar query getStats**

```typescript
export const getStats = query({
  args: {},
  returns: v.object({
    total: v.number(),
    pendingPayment: v.number(),
    pending: v.number(),
    preparing: v.number(),
    shipped: v.number(),
    delivered: v.number(),
    revenue: v.number(),
  }),
  handler: async (ctx) => {
    const orders = await ctx.db.query('orders').collect()

    const stats = {
      total: orders.length,
      pendingPayment: 0,
      pending: 0,
      preparing: 0,
      shipped: 0,
      delivered: 0,
      revenue: 0,
    }

    for (const order of orders) {
      switch (order.status) {
        case 'pending_payment':
          stats.pendingPayment++
          break
        case 'pending':
          stats.pending++
          stats.revenue += order.total
          break
        case 'preparing':
          stats.preparing++
          stats.revenue += order.total
          break
        case 'shipped':
          stats.shipped++
          stats.revenue += order.total
          break
        case 'delivered':
          stats.delivered++
          stats.revenue += order.total
          break
      }
    }

    return stats
  },
})
```

**Paso 2: Commit**

```bash
git add convex/orders.ts
git commit -m "feat(convex): add orders.getStats query"
```

---

## Verificación Final de Fase 13

```bash
pnpm run dev:convex
```

Esperado: Functions disponibles en `api.orders.*`

---

**Siguiente fase:** `fase-14-admin-auth.md`
