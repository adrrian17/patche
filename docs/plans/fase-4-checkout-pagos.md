# Fase 4: Checkout y Pagos - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar el flujo completo de checkout con integración de Stripe para pagos con tarjeta y OXXO, incluyendo webhooks para confirmar pagos.

**Architecture:** Checkout en dos pasos: información del cliente → método de pago. Stripe Elements para captura segura de tarjeta. Webhooks en Convex actions para confirmar pagos.

**Tech Stack:** Stripe (stripe-js, stripe), Convex actions, React Hook Form, Zod

**Branch:** `feat/fase-4-checkout-pagos`

**Prerequisito:** Fase 3 completada y mergeada a main

---

## Pre-requisitos

- [ ] Fase 3 completada y mergeada a main
- [ ] Cuenta de Stripe configurada (modo test)
- [ ] Claves de Stripe disponibles (pk_test_*, sk_test_*)
- [ ] OXXO habilitado en Stripe Dashboard
- [ ] `pnpm run dev` funciona correctamente

---

## Instrucciones Generales para el Agente

### Antes de cada tarea:
1. Asegúrate de estar en el branch correcto: `git checkout feat/fase-4-checkout-pagos`
2. Pull cambios recientes: `git pull origin feat/fase-4-checkout-pagos`

### Después de cada tarea completada:
1. Ejecutar `pnpm run lint:fix` para formatear código
2. Ejecutar `pnpm run dev` y verificar que no hay errores de tipos
3. Verificar la funcionalidad en el navegador
4. Hacer commit con mensaje descriptivo
5. Marcar el checkbox de la tarea como completado

### Al finalizar la fase:
1. Verificar TODOS los checkboxes marcados
2. Ejecutar `pnpm run build` para validar build completo
3. Solicitar aprobación del usuario antes de merge a main

---

## Task 1: Crear branch y configurar variables de entorno

**Files:**
- Modify: `.env.local.example`
- Create: `convex/.env.local` (NO commitear)

### Step 1: Crear branch desde main

```bash
git checkout main
git pull origin main
git checkout -b feat/fase-4-checkout-pagos
```

### Step 2: Actualizar ejemplo de variables de entorno

Agregar a `.env.local.example`:

```
# Stripe (Test Mode)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Convex (auto-generado)
CONVEX_DEPLOYMENT=...
```

### Step 3: Crear archivo de variables para Convex

Crear `convex/.env.local` (este archivo NO debe commitearse):

```
STRIPE_SECRET_KEY=sk_test_tu_clave_aqui
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui
```

### Step 4: Verificar .gitignore incluye convex/.env.local

```bash
grep "convex/.env.local" .gitignore
```

Si no existe, agregarlo.

### Step 5: Commit (solo el ejemplo)

```bash
git add .env.local.example .gitignore
git commit -m "chore: add Stripe environment variables example"
```

- [ ] **Task 1 completada**

---

## Task 2: Crear funciones de Stripe en Convex

**Files:**
- Create: `convex/stripe.ts`

### Step 1: Crear archivo de funciones de Stripe

```typescript
'use node'

import { action } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

// Tipo de item del carrito para validación
const cartItemValidator = v.object({
  productId: v.id('products'),
  variantId: v.union(v.id('variants'), v.null()),
  name: v.string(),
  variantName: v.union(v.string(), v.null()),
  price: v.number(),
  quantity: v.number(),
  type: v.union(v.literal('physical'), v.literal('digital')),
})

// Crear PaymentIntent
export const createPaymentIntent = action({
  args: {
    items: v.array(cartItemValidator),
    email: v.string(),
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
    paymentMethod: v.union(v.literal('card'), v.literal('oxxo')),
  },
  returns: v.object({
    clientSecret: v.string(),
    paymentIntentId: v.string(),
    oxxoVoucher: v.union(
      v.object({
        number: v.string(),
        expiresAt: v.number(),
      }),
      v.null()
    ),
  }),
  handler: async (ctx, args) => {
    // Validar items y calcular total
    const { items, email, shippingAddress, paymentMethod } = args

    if (items.length === 0) {
      throw new Error('El carrito está vacío')
    }

    // Calcular subtotal
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )

    // Obtener configuración de envío
    const settings = await ctx.runQuery(internal.storeSettings.getInternal)
    if (!settings) {
      throw new Error('Configuración de tienda no encontrada')
    }

    // Calcular costo de envío
    const hasPhysical = items.some((item) => item.type === 'physical')
    let shippingCost = 0

    if (hasPhysical) {
      if (subtotal < settings.freeShippingThreshold) {
        shippingCost = settings.shippingRate
      }
    }

    const total = subtotal + shippingCost

    // Convertir a centavos (Stripe usa centavos)
    const amountInCents = Math.round(total * 100)

    // Crear PaymentIntent
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountInCents,
      currency: 'mxn',
      receipt_email: email,
      metadata: {
        email,
        itemsJson: JSON.stringify(items),
        shippingAddressJson: shippingAddress ? JSON.stringify(shippingAddress) : '',
        subtotal: subtotal.toString(),
        shippingCost: shippingCost.toString(),
        total: total.toString(),
      },
    }

    if (paymentMethod === 'oxxo') {
      paymentIntentParams.payment_method_types = ['oxxo']
      paymentIntentParams.payment_method_options = {
        oxxo: {
          expires_after_days: 3, // Vence en 3 días
        },
      }
    } else {
      paymentIntentParams.payment_method_types = ['card']
      paymentIntentParams.automatic_payment_methods = {
        enabled: false,
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    // Para OXXO, confirmar inmediatamente para obtener el voucher
    let oxxoVoucher = null
    if (paymentMethod === 'oxxo') {
      const confirmedIntent = await stripe.paymentIntents.confirm(
        paymentIntent.id,
        {
          payment_method_data: {
            type: 'oxxo',
            billing_details: {
              email,
              name: shippingAddress?.name || email,
            },
          },
        }
      )

      // Obtener detalles del voucher OXXO
      const nextAction = confirmedIntent.next_action
      if (nextAction?.type === 'oxxo_display_details') {
        const oxxoDetails = nextAction.oxxo_display_details
        oxxoVoucher = {
          number: oxxoDetails?.number || '',
          expiresAt: oxxoDetails?.expires_after || Date.now() + 3 * 24 * 60 * 60 * 1000,
        }
      }
    }

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      oxxoVoucher,
    }
  },
})

// Webhook handler para confirmar pagos
export const handleWebhook = action({
  args: {
    payload: v.string(),
    signature: v.string(),
  },
  returns: v.object({ received: v.boolean() }),
  handler: async (ctx, args) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        args.payload,
        args.signature,
        webhookSecret
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      throw new Error('Invalid webhook signature')
    }

    // Manejar eventos
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await ctx.runMutation(internal.orders.createFromPayment, {
          paymentIntentId: paymentIntent.id,
          email: paymentIntent.metadata.email,
          items: JSON.parse(paymentIntent.metadata.itemsJson),
          shippingAddress: paymentIntent.metadata.shippingAddressJson
            ? JSON.parse(paymentIntent.metadata.shippingAddressJson)
            : null,
          subtotal: parseFloat(paymentIntent.metadata.subtotal),
          shippingCost: parseFloat(paymentIntent.metadata.shippingCost),
          total: parseFloat(paymentIntent.metadata.total),
          paymentMethod:
            paymentIntent.payment_method_types[0] === 'oxxo' ? 'oxxo' : 'card',
        })
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.error('Payment failed:', paymentIntent.id)
        // Aquí podrías enviar un email al cliente
        break
      }
    }

    return { received: true }
  },
})
```

### Step 2: Crear query interna para settings

Agregar a `convex/storeSettings.ts`:

```typescript
import { internalQuery } from './_generated/server'
import { v } from 'convex/values'

// Query interna para acceder desde actions
export const getInternal = internalQuery({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id('storeSettings'),
      _creationTime: v.number(),
      shippingRate: v.number(),
      freeShippingThreshold: v.number(),
      contactEmail: v.string(),
      lastOrderNumber: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    return await ctx.db.query('storeSettings').first()
  },
})
```

### Step 3: Ejecutar dev para verificar tipos

```bash
pnpm run dev:convex
```
Expected: Sin errores de tipos

### Step 4: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 5: Commit

```bash
git add convex/stripe.ts convex/storeSettings.ts
git commit -m "feat: add Stripe integration with PaymentIntent and webhook"
```

- [ ] **Task 2 completada**

---

## Task 3: Crear funciones de pedidos en Convex

**Files:**
- Create: `convex/orders.ts`

### Step 1: Crear archivo de funciones de pedidos

```typescript
import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'

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

// Crear orden desde webhook de pago
export const createFromPayment = internalMutation({
  args: {
    paymentIntentId: v.string(),
    email: v.string(),
    items: v.array(
      v.object({
        productId: v.string(),
        variantId: v.union(v.string(), v.null()),
        name: v.string(),
        variantName: v.union(v.string(), v.null()),
        price: v.number(),
        quantity: v.number(),
        type: v.union(v.literal('physical'), v.literal('digital')),
      })
    ),
    shippingAddress: v.union(shippingAddressValidator, v.null()),
    subtotal: v.number(),
    shippingCost: v.number(),
    total: v.number(),
    paymentMethod: v.union(v.literal('card'), v.literal('oxxo')),
  },
  returns: v.id('orders'),
  handler: async (ctx, args) => {
    // Verificar que no exista una orden con este PaymentIntent
    const existingOrder = await ctx.db
      .query('orders')
      .filter((q) =>
        q.eq(q.field('stripePaymentIntentId'), args.paymentIntentId)
      )
      .first()

    if (existingOrder) {
      // Ya existe, actualizar estado si estaba pendiente de pago
      if (existingOrder.status === 'pending_payment') {
        await ctx.db.patch(existingOrder._id, {
          status: 'pending',
          updatedAt: Date.now(),
        })
      }
      return existingOrder._id
    }

    // Obtener siguiente número de orden
    const settings = await ctx.db.query('storeSettings').first()
    if (!settings) {
      throw new Error('Store settings not found')
    }

    const nextNumber = settings.lastOrderNumber + 1
    await ctx.db.patch(settings._id, { lastOrderNumber: nextNumber })
    const orderNumber = `#PTCH${nextNumber}`

    // Convertir IDs de string a Id<>
    const itemsWithIds = args.items.map((item) => ({
      productId: item.productId as Id<'products'>,
      variantId: item.variantId as Id<'variants'> | null,
      name: item.name,
      variantName: item.variantName,
      price: item.price,
      quantity: item.quantity,
      type: item.type,
    }))

    // Decrementar stock de variantes
    for (const item of itemsWithIds) {
      if (item.variantId) {
        const variant = await ctx.db.get(item.variantId)
        if (variant && variant.stock >= item.quantity) {
          await ctx.db.patch(item.variantId, {
            stock: variant.stock - item.quantity,
          })
        }
      }
    }

    const now = Date.now()

    // Crear orden
    const orderId = await ctx.db.insert('orders', {
      orderNumber,
      email: args.email,
      items: itemsWithIds,
      subtotal: args.subtotal,
      shippingCost: args.shippingCost,
      total: args.total,
      paymentMethod: args.paymentMethod,
      stripePaymentIntentId: args.paymentIntentId,
      status: 'pending',
      shippingAddress: args.shippingAddress,
      trackingNumber: null,
      createdAt: now,
      updatedAt: now,
    })

    // TODO: Generar enlaces de descarga si hay productos digitales
    // TODO: Enviar email de confirmación

    return orderId
  },
})

// Obtener orden por ID
export const getById = query({
  args: { id: v.id('orders') },
  returns: v.union(orderValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// Obtener orden por número
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

// Obtener orden por PaymentIntent ID
export const getByPaymentIntent = query({
  args: { paymentIntentId: v.string() },
  returns: v.union(orderValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('orders')
      .filter((q) =>
        q.eq(q.field('stripePaymentIntentId'), args.paymentIntentId)
      )
      .first()
  },
})

// Listar órdenes (admin)
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
    let q = ctx.db.query('orders').withIndex('by_createdAt')

    if (args.status) {
      q = ctx.db
        .query('orders')
        .withIndex('by_status', (q) => q.eq('status', args.status!))
    }

    const orders = await q.order('desc').collect()

    if (args.limit) {
      return orders.slice(0, args.limit)
    }

    return orders
  },
})

// Actualizar estado de orden
export const updateStatus = mutation({
  args: {
    id: v.id('orders'),
    status: v.union(
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

    const updates: {
      status: typeof args.status
      updatedAt: number
      trackingNumber?: string
    } = {
      status: args.status,
      updatedAt: Date.now(),
    }

    if (args.trackingNumber) {
      updates.trackingNumber = args.trackingNumber
    }

    await ctx.db.patch(args.id, updates)

    // TODO: Enviar email de notificación

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
git add convex/orders.ts
git commit -m "feat: add order functions for payment processing"
```

- [ ] **Task 3 completada**

---

## Task 4: Crear endpoint HTTP para webhook de Stripe

**Files:**
- Create: `convex/http.ts`

### Step 1: Crear endpoint HTTP

```typescript
import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api } from './_generated/api'

const http = httpRouter()

// Webhook de Stripe
http.route({
  path: '/stripe-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get('stripe-signature')
    if (!signature) {
      return new Response('Missing signature', { status: 400 })
    }

    const payload = await request.text()

    try {
      const result = await ctx.runAction(api.stripe.handleWebhook, {
        payload,
        signature,
      })

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Webhook error:', error)
      return new Response(
        JSON.stringify({ error: 'Webhook processing failed' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }),
})

export default http
```

### Step 2: Ejecutar dev para verificar

```bash
pnpm run dev:convex
```
Expected: HTTP endpoint disponible

### Step 3: Commit

```bash
git add convex/http.ts
git commit -m "feat: add HTTP endpoint for Stripe webhook"
```

- [ ] **Task 4 completada**

---

## Task 5: Crear página de checkout

**Files:**
- Create: `src/routes/checkout.tsx`
- Create: `src/components/checkout/CheckoutForm.tsx`
- Create: `src/components/checkout/ShippingForm.tsx`
- Create: `src/components/checkout/PaymentForm.tsx`

### Step 1: Crear componente de formulario de envío

Contenido de `src/components/checkout/ShippingForm.tsx`:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

const mexicoStates = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
]

const shippingSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nombre requerido'),
  street: z.string().min(5, 'Dirección requerida'),
  city: z.string().min(2, 'Ciudad requerida'),
  state: z.string().min(1, 'Estado requerido'),
  zipCode: z
    .string()
    .length(5, 'Código postal debe tener 5 dígitos')
    .regex(/^\d+$/, 'Solo números'),
  phone: z
    .string()
    .min(10, 'Teléfono debe tener al menos 10 dígitos')
    .regex(/^\d+$/, 'Solo números'),
})

export type ShippingFormData = z.infer<typeof shippingSchema>

interface ShippingFormProps {
  onSubmit: (data: ShippingFormData) => void
  requiresShipping: boolean
  defaultEmail?: string
}

export function ShippingForm({
  onSubmit,
  requiresShipping,
  defaultEmail,
}: ShippingFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ShippingFormData>({
    resolver: zodResolver(
      requiresShipping
        ? shippingSchema
        : shippingSchema.pick({ email: true })
    ),
    defaultValues: {
      email: defaultEmail || '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="tu@email.com"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
        <p className="text-xs text-gray-500">
          Recibirás la confirmación de tu pedido aquí
        </p>
      </div>

      {requiresShipping && (
        <>
          <div className="border-t pt-6">
            <h3 className="font-medium mb-4">Dirección de envío</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  placeholder="Juan Pérez"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="street">Dirección</Label>
                <Input
                  id="street"
                  placeholder="Calle, número, colonia"
                  {...register('street')}
                />
                {errors.street && (
                  <p className="text-sm text-red-500">{errors.street.message}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input id="city" placeholder="Ciudad" {...register('city')} />
                  {errors.city && (
                    <p className="text-sm text-red-500">{errors.city.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Select
                    value={watch('state')}
                    onValueChange={(v) => setValue('state', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {mexicoStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.state && (
                    <p className="text-sm text-red-500">{errors.state.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Código postal</Label>
                  <Input
                    id="zipCode"
                    placeholder="12345"
                    maxLength={5}
                    {...register('zipCode')}
                  />
                  {errors.zipCode && (
                    <p className="text-sm text-red-500">
                      {errors.zipCode.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    placeholder="5512345678"
                    {...register('phone')}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <Button type="submit" className="w-full">
        Continuar al pago
      </Button>
    </form>
  )
}
```

### Step 2: Crear componente de formulario de pago

Contenido de `src/components/checkout/PaymentForm.tsx`:

```typescript
import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '~/components/ui/button'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { Label } from '~/components/ui/label'
import { Card, CardContent } from '~/components/ui/card'
import { Loader2, CreditCard, Store } from 'lucide-react'

// Inicializar Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

interface PaymentFormProps {
  clientSecret: string
  onSuccess: () => void
  onError: (error: string) => void
}

function CardPaymentForm({ onSuccess, onError }: Omit<PaymentFormProps, 'clientSecret'>) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orden/confirmacion`,
      },
    })

    if (error) {
      onError(error.message || 'Error al procesar el pago')
      setIsProcessing(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      <Button type="submit" className="w-full" disabled={!stripe || isProcessing}>
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Procesando...
          </>
        ) : (
          'Pagar ahora'
        )}
      </Button>
    </form>
  )
}

interface PaymentMethodSelectorProps {
  clientSecret: string | null
  oxxoVoucher: { number: string; expiresAt: number } | null
  paymentMethod: 'card' | 'oxxo'
  onPaymentMethodChange: (method: 'card' | 'oxxo') => void
  onSuccess: () => void
  onError: (error: string) => void
  isLoading: boolean
}

export function PaymentMethodSelector({
  clientSecret,
  oxxoVoucher,
  paymentMethod,
  onPaymentMethodChange,
  onSuccess,
  onError,
  isLoading,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Payment method selection */}
      <div className="space-y-4">
        <Label>Método de pago</Label>
        <RadioGroup
          value={paymentMethod}
          onValueChange={(v) => onPaymentMethodChange(v as 'card' | 'oxxo')}
          className="grid gap-4 md:grid-cols-2"
        >
          <div>
            <RadioGroupItem value="card" id="card" className="peer sr-only" />
            <Label
              htmlFor="card"
              className="flex items-center gap-3 rounded-lg border-2 border-gray-200 p-4 cursor-pointer hover:bg-gray-50 peer-data-[state=checked]:border-black"
            >
              <CreditCard className="h-5 w-5" />
              <div>
                <div className="font-medium">Tarjeta</div>
                <div className="text-sm text-gray-500">
                  Crédito o débito
                </div>
              </div>
            </Label>
          </div>

          <div>
            <RadioGroupItem value="oxxo" id="oxxo" className="peer sr-only" />
            <Label
              htmlFor="oxxo"
              className="flex items-center gap-3 rounded-lg border-2 border-gray-200 p-4 cursor-pointer hover:bg-gray-50 peer-data-[state=checked]:border-black"
            >
              <Store className="h-5 w-5" />
              <div>
                <div className="font-medium">OXXO</div>
                <div className="text-sm text-gray-500">
                  Paga en efectivo
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {/* Card payment form */}
      {paymentMethod === 'card' && clientSecret && !isLoading && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#000000',
              },
            },
          }}
        >
          <CardPaymentForm onSuccess={onSuccess} onError={onError} />
        </Elements>
      )}

      {/* OXXO voucher */}
      {paymentMethod === 'oxxo' && oxxoVoucher && !isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Store className="h-12 w-12 mx-auto text-orange-500" />
              <h3 className="font-medium">Instrucciones para pagar en OXXO</h3>

              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">
                  Número de referencia:
                </p>
                <p className="text-2xl font-mono font-bold tracking-wider">
                  {oxxoVoucher.number}
                </p>
              </div>

              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  1. Acude a cualquier tienda OXXO
                </p>
                <p>
                  2. Indica que harás un pago de servicio
                </p>
                <p>
                  3. Proporciona este número de referencia
                </p>
                <p>
                  4. Paga el monto total en efectivo
                </p>
              </div>

              <p className="text-xs text-gray-500">
                Este voucher vence el{' '}
                {new Date(oxxoVoucher.expiresAt * 1000).toLocaleDateString('es-MX', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>

              <Button onClick={onSuccess} className="w-full">
                Entendido, ya tengo mi referencia
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

### Step 3: Crear página de checkout

Contenido de `src/routes/checkout.tsx`:

```typescript
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useAction } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import { Header } from '~/components/store/Header'
import { Footer } from '~/components/store/Footer'
import { useCart } from '~/hooks/useCart'
import { ShippingForm, type ShippingFormData } from '~/components/checkout/ShippingForm'
import { PaymentMethodSelector } from '~/components/checkout/PaymentForm'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { ArrowLeft, Package, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/checkout')({
  component: CheckoutPage,
})

function CheckoutPage() {
  const navigate = useNavigate()
  const { items, subtotal, hasPhysical, clearCart } = useCart()
  const settings = useQuery(api.storeSettings.get)
  const createPaymentIntent = useAction(api.stripe.createPaymentIntent)

  const [step, setStep] = useState<'shipping' | 'payment'>('shipping')
  const [shippingData, setShippingData] = useState<ShippingFormData | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'oxxo'>('card')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [oxxoVoucher, setOxxoVoucher] = useState<{
    number: string
    expiresAt: number
  } | null>(null)
  const [isCreatingPayment, setIsCreatingPayment] = useState(false)

  // Calcular costos
  const shippingCost =
    hasPhysical && settings
      ? subtotal >= settings.freeShippingThreshold
        ? 0
        : settings.shippingRate
      : 0

  const total = subtotal + shippingCost

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price)
  }

  const handleShippingSubmit = (data: ShippingFormData) => {
    setShippingData(data)
    setStep('payment')
  }

  const handlePaymentMethodChange = async (method: 'card' | 'oxxo') => {
    setPaymentMethod(method)
    setClientSecret(null)
    setOxxoVoucher(null)

    if (!shippingData) return

    setIsCreatingPayment(true)

    try {
      const result = await createPaymentIntent({
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          variantName: item.variantName,
          price: item.price,
          quantity: item.quantity,
          type: item.type,
        })),
        email: shippingData.email,
        shippingAddress: hasPhysical
          ? {
              name: shippingData.name!,
              street: shippingData.street!,
              city: shippingData.city!,
              state: shippingData.state!,
              zipCode: shippingData.zipCode!,
              phone: shippingData.phone!,
            }
          : null,
        paymentMethod: method,
      })

      setClientSecret(result.clientSecret)
      setOxxoVoucher(result.oxxoVoucher)
    } catch (error) {
      toast.error('Error al procesar el pago')
      console.error(error)
    } finally {
      setIsCreatingPayment(false)
    }
  }

  const handlePaymentSuccess = () => {
    clearCart()

    if (paymentMethod === 'oxxo') {
      toast.success('Referencia generada. Paga en OXXO para completar tu pedido.')
      navigate({ to: '/' })
    } else {
      // El redirect lo maneja Stripe
    }
  }

  const handlePaymentError = (error: string) => {
    toast.error(error)
  }

  // Cargar payment intent al entrar a paso de pago
  const initializePayment = async () => {
    if (step === 'payment' && shippingData && !clientSecret) {
      await handlePaymentMethodChange(paymentMethod)
    }
  }

  // Efecto para inicializar pago
  if (step === 'payment' && shippingData && !clientSecret && !isCreatingPayment) {
    initializePayment()
  }

  // Verificar carrito vacío
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Tu carrito está vacío</h1>
            <p className="text-gray-500 mb-4">
              Agrega productos antes de continuar
            </p>
            <Button asChild>
              <Link to="/productos">Ver productos</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Back button */}
            {step === 'payment' && (
              <Button
                variant="ghost"
                className="mb-4"
                onClick={() => setStep('shipping')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a datos de envío
              </Button>
            )}

            <div className="grid gap-8 lg:grid-cols-5">
              {/* Form */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h1 className="text-2xl font-bold mb-6">
                    {step === 'shipping'
                      ? 'Información de contacto'
                      : 'Método de pago'}
                  </h1>

                  {step === 'shipping' && (
                    <ShippingForm
                      onSubmit={handleShippingSubmit}
                      requiresShipping={hasPhysical}
                    />
                  )}

                  {step === 'payment' && (
                    <PaymentMethodSelector
                      clientSecret={clientSecret}
                      oxxoVoucher={oxxoVoucher}
                      paymentMethod={paymentMethod}
                      onPaymentMethodChange={handlePaymentMethodChange}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                      isLoading={isCreatingPayment}
                    />
                  )}
                </div>
              </div>

              {/* Order summary */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg p-6 shadow-sm sticky top-24">
                  <h2 className="font-semibold mb-4">Resumen del pedido</h2>

                  <div className="space-y-3 mb-4">
                    {items.map((item) => (
                      <div
                        key={`${item.productId}-${item.variantId}`}
                        className="flex gap-3"
                      >
                        <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {item.name}
                          </p>
                          {item.variantName && (
                            <p className="text-xs text-gray-500">
                              {item.variantName}
                            </p>
                          )}
                          <p className="text-sm text-gray-600">
                            {item.quantity} x {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>

                    {hasPhysical && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Envío</span>
                        <span>
                          {shippingCost === 0 ? (
                            <span className="text-green-600">Gratis</span>
                          ) : (
                            formatPrice(shippingCost)
                          )}
                        </span>
                      </div>
                    )}

                    <Separator className="my-2" />

                    <div className="flex justify-between font-semibold text-base">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
```

### Step 4: Agregar variable de entorno de Stripe al frontend

Crear/modificar `.env.local`:

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_aqui
```

### Step 5: Instalar dependencia de Stripe React

```bash
pnpm add @stripe/react-stripe-js
```

### Step 6: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 7: Commit

```bash
git add src/routes/checkout.tsx src/components/checkout/
git commit -m "feat: add checkout page with Stripe integration"
```

- [ ] **Task 5 completada**

---

## Task 6: Crear página de confirmación de orden

**Files:**
- Create: `src/routes/orden.confirmacion.tsx`

### Step 1: Crear página de confirmación

```typescript
import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Header } from '~/components/store/Header'
import { Footer } from '~/components/store/Footer'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import { CheckCircle, Package, Download, Loader2 } from 'lucide-react'

interface SearchParams {
  payment_intent?: string
  payment_intent_client_secret?: string
  redirect_status?: string
}

export const Route = createFileRoute('/orden/confirmacion')({
  component: OrdenConfirmacionPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      payment_intent:
        typeof search.payment_intent === 'string'
          ? search.payment_intent
          : undefined,
      payment_intent_client_secret:
        typeof search.payment_intent_client_secret === 'string'
          ? search.payment_intent_client_secret
          : undefined,
      redirect_status:
        typeof search.redirect_status === 'string'
          ? search.redirect_status
          : undefined,
    }
  },
})

function OrdenConfirmacionPage() {
  const { payment_intent, redirect_status } = useSearch({
    from: '/orden/confirmacion',
  })

  const order = useQuery(
    api.orders.getByPaymentIntent,
    payment_intent ? { paymentIntentId: payment_intent } : 'skip'
  )

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price)
  }

  // Estado de carga
  if (order === undefined) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Procesando tu pedido...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Error - no se encontró la orden
  if (redirect_status === 'failed' || !order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">
              Error en el pago
            </h1>
            <p className="text-gray-500 mb-4">
              Hubo un problema al procesar tu pago. Por favor intenta de nuevo.
            </p>
            <Button asChild>
              <Link to="/carrito">Volver al carrito</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const hasDigital = order.items.some((item) => item.type === 'digital')

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            {/* Success header */}
            <div className="text-center mb-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">¡Gracias por tu compra!</h1>
              <p className="text-gray-600">
                Tu pedido <span className="font-medium">{order.orderNumber}</span>{' '}
                ha sido confirmado
              </p>
            </div>

            {/* Order details */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Detalles del pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.variantName && (
                          <p className="text-sm text-gray-500">
                            {item.variantName}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          Cantidad: {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  {order.shippingCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Envío</span>
                      <span>{formatPrice(order.shippingCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping address */}
            {order.shippingAddress && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Dirección de envío
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{order.shippingAddress.name}</p>
                  <p className="text-gray-600">{order.shippingAddress.street}</p>
                  <p className="text-gray-600">
                    {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                    {order.shippingAddress.zipCode}
                  </p>
                  <p className="text-gray-600">Tel: {order.shippingAddress.phone}</p>
                </CardContent>
              </Card>
            )}

            {/* Digital downloads */}
            {hasDigital && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Descargas digitales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Tus archivos digitales estarán disponibles aquí. Los enlaces
                    de descarga también fueron enviados a tu email.
                  </p>
                  {/* TODO: Mostrar enlaces de descarga */}
                  <p className="text-sm text-gray-500">
                    Los enlaces expiran en 24 horas.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Next steps */}
            <Card>
              <CardHeader>
                <CardTitle>¿Qué sigue?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-600">
                <p>
                  1. Recibirás un email de confirmación en{' '}
                  <span className="font-medium">{order.email}</span>
                </p>
                {order.shippingAddress && (
                  <p>
                    2. Te notificaremos cuando tu pedido sea enviado con el
                    número de rastreo
                  </p>
                )}
                <p>
                  {order.shippingAddress ? '3' : '2'}. Si tienes dudas, contáctanos
                  y menciona tu número de pedido: {order.orderNumber}
                </p>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex gap-4 mt-8 justify-center">
              <Button asChild>
                <Link to="/">Volver a la tienda</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
```

### Step 2: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 3: Commit

```bash
git add src/routes/orden.confirmacion.tsx
git commit -m "feat: add order confirmation page"
```

- [ ] **Task 6 completada**

---

## Task 7: Actualizar página de pedidos en admin

**Files:**
- Modify: `src/routes/admin.pedidos.tsx`

### Step 1: Actualizar página de pedidos

```typescript
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Badge } from '~/components/ui/badge'
import { Separator } from '~/components/ui/separator'
import { Loader2, Eye, Package, Truck } from 'lucide-react'
import { toast } from 'sonner'

const statusLabels: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  pending: 'Pendiente',
  preparing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending_payment: 'outline',
  pending: 'secondary',
  preparing: 'default',
  shipped: 'default',
  delivered: 'default',
}

export const Route = createFileRoute('/admin/pedidos')({
  component: AdminPedidos,
})

function AdminPedidos() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrderId, setSelectedOrderId] = useState<Id<'orders'> | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')

  const orders = useQuery(api.orders.list, {
    status: statusFilter === 'all' ? undefined : statusFilter as 'pending' | 'preparing' | 'shipped' | 'delivered',
  })
  const selectedOrder = useQuery(
    api.orders.getById,
    selectedOrderId ? { id: selectedOrderId } : 'skip'
  )
  const updateStatus = useMutation(api.orders.updateStatus)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleUpdateStatus = async (
    orderId: Id<'orders'>,
    newStatus: 'pending' | 'preparing' | 'shipped' | 'delivered'
  ) => {
    try {
      await updateStatus({
        id: orderId,
        status: newStatus,
        trackingNumber: newStatus === 'shipped' ? trackingNumber : undefined,
      })
      toast.success('Estado actualizado')
      setTrackingNumber('')
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-gray-500">Gestiona los pedidos de tu tienda</p>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending_payment">Pendiente de pago</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="preparing">En preparación</SelectItem>
            <SelectItem value="shipped">Enviado</SelectItem>
            <SelectItem value="delivered">Entregado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de pedidos</CardTitle>
          <CardDescription>{orders?.length ?? 0} pedidos</CardDescription>
        </CardHeader>
        <CardContent>
          {!orders ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Package className="h-12 w-12 mb-4" />
              <p>No hay pedidos</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>{order.email}</TableCell>
                    <TableCell>{formatPrice(order.total)}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedOrderId(order._id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Order detail dialog */}
      <Dialog
        open={!!selectedOrderId}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedido {selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription>
              Creado el{' '}
              {selectedOrder && formatDate(selectedOrder.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Estado actual</p>
                  <Badge variant={statusColors[selectedOrder.status]} className="mt-1">
                    {statusLabels[selectedOrder.status]}
                  </Badge>
                </div>

                {selectedOrder.status !== 'delivered' &&
                  selectedOrder.status !== 'pending_payment' && (
                    <div className="flex items-center gap-2">
                      {selectedOrder.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleUpdateStatus(selectedOrder._id, 'preparing')
                          }
                        >
                          Marcar en preparación
                        </Button>
                      )}
                      {selectedOrder.status === 'preparing' && (
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Número de guía"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            className="w-40"
                          />
                          <Button
                            size="sm"
                            onClick={() =>
                              handleUpdateStatus(selectedOrder._id, 'shipped')
                            }
                          >
                            <Truck className="mr-2 h-4 w-4" />
                            Marcar enviado
                          </Button>
                        </div>
                      )}
                      {selectedOrder.status === 'shipped' && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleUpdateStatus(selectedOrder._id, 'delivered')
                          }
                        >
                          Marcar entregado
                        </Button>
                      )}
                    </div>
                  )}
              </div>

              {/* Tracking */}
              {selectedOrder.trackingNumber && (
                <div>
                  <p className="text-sm text-gray-500">Número de guía</p>
                  <p className="font-mono">{selectedOrder.trackingNumber}</p>
                </div>
              )}

              <Separator />

              {/* Items */}
              <div>
                <h3 className="font-medium mb-3">Productos</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between text-sm"
                    >
                      <div>
                        <span>{item.name}</span>
                        {item.variantName && (
                          <span className="text-gray-500">
                            {' '}
                            - {item.variantName}
                          </span>
                        )}
                        <span className="text-gray-500"> x{item.quantity}</span>
                      </div>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <Separator className="my-3" />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Envío</span>
                    <span>{formatPrice(selectedOrder.shippingCost)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formatPrice(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Customer info */}
              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-medium mb-2">Cliente</h3>
                  <p className="text-sm">{selectedOrder.email}</p>
                  <p className="text-sm text-gray-500">
                    Pago: {selectedOrder.paymentMethod === 'card' ? 'Tarjeta' : 'OXXO'}
                  </p>
                </div>

                {selectedOrder.shippingAddress && (
                  <div>
                    <h3 className="font-medium mb-2">Dirección de envío</h3>
                    <div className="text-sm">
                      <p>{selectedOrder.shippingAddress.name}</p>
                      <p className="text-gray-500">
                        {selectedOrder.shippingAddress.street}
                      </p>
                      <p className="text-gray-500">
                        {selectedOrder.shippingAddress.city},{' '}
                        {selectedOrder.shippingAddress.state}{' '}
                        {selectedOrder.shippingAddress.zipCode}
                      </p>
                      <p className="text-gray-500">
                        Tel: {selectedOrder.shippingAddress.phone}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

### Step 2: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 3: Commit

```bash
git add src/routes/admin.pedidos.tsx
git commit -m "feat: update admin orders page with full functionality"
```

- [ ] **Task 7 completada**

---

## Task 8: Validación final y preparación para merge

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

### Step 3: Verificar que dev funciona

```bash
pnpm run dev
```

Verificar en navegador:
- [ ] Checkout carga correctamente
- [ ] Formulario de envío valida datos
- [ ] Selector de método de pago funciona
- [ ] PaymentIntent se crea correctamente (revisar consola de Stripe)
- [ ] OXXO genera voucher
- [ ] Página de confirmación muestra detalles
- [ ] Admin de pedidos lista y permite cambiar estado

### Step 4: Configurar webhook en Stripe Dashboard

1. Ir a Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://tu-convex-url.convex.site/stripe-webhook`
3. Seleccionar eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copiar webhook secret a `convex/.env.local`

### Step 5: Push final

```bash
git push origin feat/fase-4-checkout-pagos
```

- [ ] **Task 8 completada**

---

## Checklist Final de Fase 4

- [ ] Branch `feat/fase-4-checkout-pagos` creado
- [ ] Variables de entorno de Stripe configuradas
- [ ] Funciones de Stripe en Convex
- [ ] Funciones de órdenes en Convex
- [ ] Endpoint HTTP para webhook
- [ ] Formulario de envío
- [ ] Integración de Stripe Elements
- [ ] Soporte para pago con tarjeta
- [ ] Soporte para pago con OXXO
- [ ] Página de confirmación de orden
- [ ] Admin de pedidos actualizado
- [ ] Webhook configurado en Stripe Dashboard
- [ ] Build pasa sin errores
- [ ] Lint pasa sin errores

---

## APROBACIÓN REQUERIDA

**Antes de hacer merge a main:**

1. Verificar que todos los checkboxes están marcados
2. Probar el flujo completo:
   - Agregar al carrito
   - Ir a checkout
   - Completar formulario
   - Pagar con tarjeta de prueba (4242424242424242)
   - Verificar página de confirmación
   - Verificar pedido en admin
3. Probar flujo OXXO:
   - Generar voucher
   - Verificar que se muestra la referencia
4. Ejecutar `pnpm run build` una última vez
5. Solicitar aprobación explícita del usuario

**Comando para merge (solo después de aprobación):**

```bash
git checkout main
git merge feat/fase-4-checkout-pagos
git push origin main
```
