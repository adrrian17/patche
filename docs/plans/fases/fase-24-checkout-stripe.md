# Fase 24: Checkout con Stripe

> **Prerrequisitos:** Fase 23 completada
> **Resultado:** Proceso de checkout completo con Stripe (tarjeta y OXXO)

---

## Tarea 24.1: Crear funciones de Stripe en Convex

**Archivo:** `convex/stripe.ts`

```typescript
'use node'

import Stripe from 'stripe'
import { v } from 'convex/values'
import { action, internalMutation } from './_generated/server'
import { internal } from './_generated/api'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

// Crear PaymentIntent
export const createPaymentIntent = action({
  args: {
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
    orderId: v.string(),
  }),
  handler: async (ctx, args) => {
    // Calcular totales
    const subtotal = args.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )

    // Obtener settings para envío
    const settings = await ctx.runQuery(internal.stripe.getSettings, {})
    const hasPhysical = args.items.some((item) => item.type === 'physical')

    let shippingCost = 0
    if (hasPhysical && args.shippingAddress) {
      shippingCost =
        subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingRate
    }

    const total = subtotal + shippingCost

    // Generar número de orden
    const orderNumber = await ctx.runMutation(internal.orders.generateOrderNumber, {})

    // Crear PaymentIntent en Stripe
    const paymentMethodTypes =
      args.paymentMethod === 'oxxo' ? ['oxxo'] : ['card']

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Stripe usa centavos
      currency: 'mxn',
      payment_method_types: paymentMethodTypes,
      metadata: {
        orderNumber,
        email: args.email,
      },
    })

    // Crear orden en estado pending_payment
    const orderId = await ctx.runMutation(internal.stripe.createOrder, {
      orderNumber,
      email: args.email,
      items: args.items,
      subtotal,
      shippingCost,
      total,
      paymentMethod: args.paymentMethod,
      stripePaymentIntentId: paymentIntent.id,
      shippingAddress: args.shippingAddress,
    })

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      orderId,
    }
  },
})

// Internal: obtener settings
export const getSettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query('storeSettings').first()
    return settings ?? {
      shippingRate: 99,
      freeShippingThreshold: 999,
    }
  },
})

// Internal: crear orden
export const createOrder = internalMutation({
  args: {
    orderNumber: v.string(),
    email: v.string(),
    items: v.array(v.any()),
    subtotal: v.number(),
    shippingCost: v.number(),
    total: v.number(),
    paymentMethod: v.union(v.literal('card'), v.literal('oxxo')),
    stripePaymentIntentId: v.string(),
    shippingAddress: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const orderId = await ctx.db.insert('orders', {
      orderNumber: args.orderNumber,
      email: args.email,
      items: args.items,
      subtotal: args.subtotal,
      shippingCost: args.shippingCost,
      total: args.total,
      paymentMethod: args.paymentMethod,
      stripePaymentIntentId: args.stripePaymentIntentId,
      status: 'pending_payment',
      shippingAddress: args.shippingAddress,
      trackingNumber: null,
      createdAt: now,
      updatedAt: now,
    })
    return orderId
  },
})

// Agregar imports faltantes
import { internalQuery } from './_generated/server'
```

**Commit:**

```bash
git add convex/stripe.ts
git commit -m "feat(convex): add Stripe payment intent functions"
```

---

## Tarea 24.2: Crear HTTP endpoint para webhooks

**Archivo:** `convex/http.ts`

```typescript
import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'
import Stripe from 'stripe'

const http = httpRouter()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

http.route({
  path: '/stripe-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get('stripe-signature')
    const body = await request.text()

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature!,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err) {
      return new Response('Webhook signature verification failed', { status: 400 })
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      await ctx.runMutation(internal.stripe.handlePaymentSuccess, {
        paymentIntentId: paymentIntent.id,
      })
    }

    return new Response('OK', { status: 200 })
  }),
})

export default http
```

**Commit:**

```bash
git add convex/http.ts
git commit -m "feat(convex): add Stripe webhook HTTP endpoint"
```

---

## Tarea 24.3: Agregar handler de pago exitoso

**Archivo:** `convex/stripe.ts` (agregar)

```typescript
// Internal: manejar pago exitoso
export const handlePaymentSuccess = internalMutation({
  args: { paymentIntentId: v.string() },
  handler: async (ctx, args) => {
    // Buscar orden
    const order = await ctx.db
      .query('orders')
      .withIndex('by_stripePaymentIntentId', (q) =>
        q.eq('stripePaymentIntentId', args.paymentIntentId)
      )
      .unique()

    if (!order || order.status !== 'pending_payment') return

    // Actualizar estado
    await ctx.db.patch(order._id, {
      status: 'pending',
      updatedAt: Date.now(),
    })

    // Decrementar stock de variantes
    for (const item of order.items) {
      if (item.variantId) {
        const variant = await ctx.db.get(item.variantId)
        if (variant) {
          await ctx.db.patch(item.variantId, {
            stock: Math.max(0, variant.stock - item.quantity),
          })
        }
      }
    }

    // TODO: Generar enlaces de descarga para digitales
    // TODO: Enviar email de confirmación
  },
})
```

**Commit:**

```bash
git add convex/stripe.ts
git commit -m "feat(convex): add payment success handler"
```

---

## Tarea 24.4: Crear página de checkout

**Archivo:** `src/routes/checkout.tsx`

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { StoreLayout } from '~/components/store/StoreLayout'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { useCart } from '~/hooks/useCart'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export const Route = createFileRoute('/checkout')({
  component: CheckoutPage,
})

function CheckoutPage() {
  const { items, subtotal, hasPhysicalItems, clearCart } = useCart()
  const navigate = useNavigate()
  const createPaymentIntent = useAction(api.stripe.createPaymentIntent)

  const [email, setEmail] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'oxxo'>('card')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Shipping address state
  const [name, setName] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [phone, setPhone] = useState('')

  if (items.length === 0) {
    navigate({ to: '/carrito' })
    return null
  }

  async function handleCreatePayment() {
    setIsLoading(true)
    try {
      const result = await createPaymentIntent({
        items,
        email,
        shippingAddress: hasPhysicalItems
          ? { name, street, city, state, zipCode, phone }
          : null,
        paymentMethod,
      })
      setClientSecret(result.clientSecret)
      setOrderId(result.orderId)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        {!clientSecret ? (
          <div className="space-y-6">
            {/* Email */}
            <Card>
              <CardHeader><CardTitle>Contacto</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </CardContent>
            </Card>

            {/* Dirección (solo físicos) */}
            {hasPhysicalItems && (
              <Card>
                <CardHeader><CardTitle>Dirección de envío</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nombre completo</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Calle y número</Label>
                    <Input value={street} onChange={(e) => setStreet(e.target.value)} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ciudad</Label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Input value={state} onChange={(e) => setState(e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Código postal</Label>
                      <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Método de pago */}
            <Card>
              <CardHeader><CardTitle>Método de pago</CardTitle></CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card">Tarjeta de crédito/débito</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="oxxo" id="oxxo" />
                    <Label htmlFor="oxxo">OXXO (pago en efectivo)</Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <Button onClick={handleCreatePayment} disabled={isLoading || !email} className="w-full" size="lg">
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Continuar al pago
            </Button>
          </div>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              orderId={orderId!}
              onSuccess={() => {
                clearCart()
                navigate({ to: `/orden/${orderId}/confirmacion` })
              }}
            />
          </Elements>
        )}
      </div>
    </StoreLayout>
  )
}

function PaymentForm({ orderId, onSuccess }: { orderId: string; onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsProcessing(true)
    setError(null)

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orden/${orderId}/confirmacion`,
      },
    })

    if (submitError) {
      setError(submitError.message ?? 'Error al procesar el pago')
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={!stripe || isProcessing} className="w-full" size="lg">
        {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Pagar
      </Button>
    </form>
  )
}
```

**Commit:**

```bash
git add src/routes/checkout.tsx
git commit -m "feat: add checkout page with Stripe integration"
```

---

## Verificación Final de Fase 24

```bash
pnpm run build
```

---

**Siguiente fase:** `fase-25-post-purchase.md`
