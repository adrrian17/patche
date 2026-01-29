# Fase 6: Gestión de Pedidos - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Completar el módulo de gestión de pedidos con detalle completo, cambio de estados, envío de notificaciones y número de guía.

**Architecture:** Página de detalle de pedido con timeline de estados. Mutaciones para cambios de estado que disparan emails automáticos. Campo para número de guía al marcar como enviado.

**Tech Stack:** TanStack Router, Convex, Resend (emails), shadcn/ui

**Branch:** `feat/fase-6-gestion-pedidos`

**Prerequisito:** Fase 5 completada y mergeada a main

---

## Pre-requisitos

- [ ] Fase 5 completada y mergeada a main
- [ ] Al menos 1-2 pedidos de prueba creados
- [ ] Emails funcionando correctamente
- [ ] `pnpm run dev` funciona correctamente

---

## Instrucciones Generales para el Agente

### Antes de cada tarea:
1. Asegúrate de estar en el branch correcto: `git checkout feat/fase-6-gestion-pedidos`
2. Pull cambios recientes: `git pull origin feat/fase-6-gestion-pedidos`

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

## Task 1: Crear branch

**Files:**
- Ninguno (solo git)

### Step 1: Crear branch desde main

```bash
git checkout main
git pull origin main
git checkout -b feat/fase-6-gestion-pedidos
```

### Step 2: Push branch inicial

```bash
git push -u origin feat/fase-6-gestion-pedidos
```

- [ ] **Task 1 completada**

---

## Task 2: Crear plantillas de email faltantes

**Files:**
- Create: `convex/emails/OrderPreparing.tsx`
- Create: `convex/emails/OrderDelivered.tsx`

### Step 1: Crear plantilla de "en preparación"

Contenido de `convex/emails/OrderPreparing.tsx`:

```typescript
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface OrderPreparingEmailProps {
  orderNumber: string
  customerName: string
  storeUrl: string
  storeName: string
}

export function OrderPreparingEmail({
  orderNumber,
  customerName,
  storeUrl,
  storeName,
}: OrderPreparingEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu pedido {orderNumber} está siendo preparado</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>{storeName}</Heading>

          <Section style={iconSection}>
            <Text style={icon}>🎁</Text>
          </Section>

          <Text style={paragraph}>
            ¡Hola {customerName}!
          </Text>

          <Text style={paragraph}>
            Queríamos avisarte que tu pedido <strong>{orderNumber}</strong> está
            siendo preparado con mucho cuidado.
          </Text>

          <Section style={statusSection}>
            <Text style={statusText}>
              Estado actual: <strong>En preparación</strong>
            </Text>
          </Section>

          <Text style={paragraph}>
            Te enviaremos otro email cuando tu pedido sea enviado con la
            información de rastreo.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Si tienes alguna pregunta, responde a este email o contáctanos
            mencionando tu número de pedido: {orderNumber}
          </Text>

          <Text style={footer}>
            <Link href={storeUrl} style={link}>
              {storeName}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '580px',
}

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '0 0 30px',
}

const paragraph = {
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 15px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
}

const iconSection = {
  textAlign: 'center' as const,
  margin: '20px 0',
}

const icon = {
  fontSize: '48px',
  margin: 0,
}

const statusSection = {
  backgroundColor: '#e8f4fd',
  padding: '15px',
  borderRadius: '8px',
  textAlign: 'center' as const,
  margin: '20px 0',
}

const statusText = {
  fontSize: '14px',
  margin: 0,
  color: '#0366d6',
}

const link = {
  color: '#666',
  textDecoration: 'underline',
}

const footer = {
  fontSize: '12px',
  color: '#666',
  textAlign: 'center' as const,
  margin: '20px 0 0',
}

export default OrderPreparingEmail
```

### Step 2: Crear plantilla de "entregado"

Contenido de `convex/emails/OrderDelivered.tsx`:

```typescript
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface OrderDeliveredEmailProps {
  orderNumber: string
  customerName: string
  storeUrl: string
  storeName: string
}

export function OrderDeliveredEmail({
  orderNumber,
  customerName,
  storeUrl,
  storeName,
}: OrderDeliveredEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu pedido {orderNumber} ha sido entregado</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>{storeName}</Heading>

          <Section style={iconSection}>
            <Text style={icon}>✅</Text>
          </Section>

          <Text style={paragraph}>
            ¡Hola {customerName}!
          </Text>

          <Text style={paragraph}>
            Tu pedido <strong>{orderNumber}</strong> ha sido marcado como
            entregado. ¡Esperamos que disfrutes tus productos!
          </Text>

          <Section style={thankYouSection}>
            <Text style={thankYouText}>
              ¡Gracias por tu compra!
            </Text>
            <Text style={thankYouSubtext}>
              Esperamos verte pronto de nuevo
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={paragraph}>
            Si tienes algún problema con tu pedido o si el paquete no llegó
            correctamente, por favor contáctanos lo antes posible.
          </Text>

          <Text style={footer}>
            <Link href={storeUrl} style={link}>
              Visitar {storeName}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '580px',
}

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '0 0 30px',
}

const paragraph = {
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 15px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
}

const iconSection = {
  textAlign: 'center' as const,
  margin: '20px 0',
}

const icon = {
  fontSize: '48px',
  margin: 0,
}

const thankYouSection = {
  backgroundColor: '#d4edda',
  padding: '20px',
  borderRadius: '8px',
  textAlign: 'center' as const,
  margin: '20px 0',
}

const thankYouText = {
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 5px',
  color: '#155724',
}

const thankYouSubtext = {
  fontSize: '14px',
  margin: 0,
  color: '#155724',
}

const link = {
  textDecoration: 'none',
  padding: '10px 20px',
  backgroundColor: '#000',
  color: '#fff',
  borderRadius: '5px',
  display: 'inline-block',
}

const footer = {
  fontSize: '12px',
  color: '#666',
  textAlign: 'center' as const,
  margin: '20px 0 0',
}

export default OrderDeliveredEmail
```

### Step 3: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 4: Commit

```bash
git add convex/emails/
git commit -m "feat: add preparing and delivered email templates"
```

- [ ] **Task 2 completada**

---

## Task 3: Agregar funciones de email para nuevos estados

**Files:**
- Modify: `convex/emails.ts`

### Step 1: Agregar funciones para los nuevos emails

Agregar a `convex/emails.ts`:

```typescript
import { OrderPreparingEmail } from './emails/OrderPreparing'
import { OrderDeliveredEmail } from './emails/OrderDelivered'

// Enviar email de pedido en preparación
export const sendOrderPreparing = internalAction({
  args: {
    orderId: v.id('orders'),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const order = await ctx.runQuery(internal.orders.getByIdInternal, {
      id: args.orderId,
    })

    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    const html = await render(
      OrderPreparingEmail({
        orderNumber: order.orderNumber,
        customerName: order.shippingAddress?.name || order.email.split('@')[0],
        storeUrl: STORE_URL,
        storeName: STORE_NAME,
      })
    )

    try {
      await resend.emails.send({
        from: `${STORE_NAME} <${STORE_EMAIL}>`,
        to: order.email,
        subject: `Tu pedido ${order.orderNumber} está siendo preparado - ${STORE_NAME}`,
        html,
      })

      return { success: true }
    } catch (error) {
      console.error('Error sending email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})

// Enviar email de pedido entregado
export const sendOrderDelivered = internalAction({
  args: {
    orderId: v.id('orders'),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const order = await ctx.runQuery(internal.orders.getByIdInternal, {
      id: args.orderId,
    })

    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    const html = await render(
      OrderDeliveredEmail({
        orderNumber: order.orderNumber,
        customerName: order.shippingAddress?.name || order.email.split('@')[0],
        storeUrl: STORE_URL,
        storeName: STORE_NAME,
      })
    )

    try {
      await resend.emails.send({
        from: `${STORE_NAME} <${STORE_EMAIL}>`,
        to: order.email,
        subject: `Tu pedido ${order.orderNumber} ha sido entregado - ${STORE_NAME}`,
        html,
      })

      return { success: true }
    } catch (error) {
      console.error('Error sending email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})
```

### Step 2: Ejecutar dev para verificar

```bash
pnpm run dev:convex
```

### Step 3: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 4: Commit

```bash
git add convex/emails.ts
git commit -m "feat: add email functions for preparing and delivered states"
```

- [ ] **Task 3 completada**

---

## Task 4: Actualizar updateStatus para enviar todos los emails

**Files:**
- Modify: `convex/orders.ts`

### Step 1: Actualizar la función updateStatus

```typescript
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

    // Validar transición de estados
    const validTransitions: Record<string, string[]> = {
      pending_payment: ['pending'],
      pending: ['preparing'],
      preparing: ['shipped'],
      shipped: ['delivered'],
      delivered: [],
    }

    if (!validTransitions[order.status]?.includes(args.status)) {
      throw new Error(
        `Invalid status transition from ${order.status} to ${args.status}`
      )
    }

    const updates: {
      status: typeof args.status
      updatedAt: number
      trackingNumber?: string
    } = {
      status: args.status,
      updatedAt: Date.now(),
    }

    // Si se marca como enviado, requerir número de guía
    if (args.status === 'shipped') {
      if (!args.trackingNumber) {
        throw new Error('Tracking number is required when marking as shipped')
      }
      updates.trackingNumber = args.trackingNumber
    }

    await ctx.db.patch(args.id, updates)

    // Enviar email según el nuevo estado
    switch (args.status) {
      case 'preparing':
        await ctx.scheduler.runAfter(0, internal.emails.sendOrderPreparing, {
          orderId: args.id,
        })
        break
      case 'shipped':
        await ctx.scheduler.runAfter(0, internal.emails.sendOrderShipped, {
          orderId: args.id,
          trackingNumber: args.trackingNumber!,
        })
        break
      case 'delivered':
        await ctx.scheduler.runAfter(0, internal.emails.sendOrderDelivered, {
          orderId: args.id,
        })
        break
    }

    return null
  },
})
```

### Step 2: Ejecutar dev para verificar

```bash
pnpm run dev:convex
```

### Step 3: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 4: Commit

```bash
git add convex/orders.ts
git commit -m "feat: add email notifications for all status changes"
```

- [ ] **Task 4 completada**

---

## Task 5: Crear página de detalle de pedido en admin

**Files:**
- Create: `src/routes/admin.pedidos.$id.tsx`

### Step 1: Crear página de detalle de pedido

```typescript
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Separator } from '~/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  CreditCard,
  MapPin,
  Mail,
  Phone,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

const statusConfig: Record<
  string,
  {
    label: string
    color: 'default' | 'secondary' | 'destructive' | 'outline'
    icon: typeof Clock
  }
> = {
  pending_payment: {
    label: 'Pendiente de pago',
    color: 'outline',
    icon: Clock,
  },
  pending: {
    label: 'Pendiente',
    color: 'secondary',
    icon: Clock,
  },
  preparing: {
    label: 'En preparación',
    color: 'default',
    icon: Package,
  },
  shipped: {
    label: 'Enviado',
    color: 'default',
    icon: Truck,
  },
  delivered: {
    label: 'Entregado',
    color: 'default',
    icon: CheckCircle,
  },
}

export const Route = createFileRoute('/admin/pedidos/$id')({
  component: AdminPedidoDetalle,
})

function AdminPedidoDetalle() {
  const { id } = Route.useParams()
  const [trackingNumber, setTrackingNumber] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const order = useQuery(api.orders.getById, { id: id as Id<'orders'> })
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleStatusUpdate = async (
    newStatus: 'pending' | 'preparing' | 'shipped' | 'delivered'
  ) => {
    if (!order) return

    setIsUpdating(true)
    try {
      await updateStatus({
        id: order._id,
        status: newStatus,
        trackingNumber: newStatus === 'shipped' ? trackingNumber : undefined,
      })
      toast.success(`Pedido actualizado a "${statusConfig[newStatus].label}"`)
      setTrackingNumber('')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al actualizar'
      )
    } finally {
      setIsUpdating(false)
    }
  }

  if (order === undefined) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (order === null) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Pedido no encontrado</p>
        <Button asChild>
          <Link to="/admin/pedidos">Volver a pedidos</Link>
        </Button>
      </div>
    )
  }

  const currentStatus = statusConfig[order.status]
  const StatusIcon = currentStatus.icon

  // Determinar siguiente acción disponible
  const nextActions: Record<string, { status: string; label: string }> = {
    pending: { status: 'preparing', label: 'Marcar en preparación' },
    preparing: { status: 'shipped', label: 'Marcar como enviado' },
    shipped: { status: 'delivered', label: 'Marcar como entregado' },
  }

  const nextAction = nextActions[order.status]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/pedidos">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
            <Badge variant={currentStatus.color}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {currentStatus.label}
            </Badge>
          </div>
          <p className="text-gray-500">Creado el {formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Estado del pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline */}
                <div className="flex justify-between">
                  {['pending', 'preparing', 'shipped', 'delivered'].map(
                    (status, index) => {
                      const config = statusConfig[status]
                      const Icon = config.icon
                      const isActive =
                        ['pending', 'preparing', 'shipped', 'delivered'].indexOf(
                          order.status
                        ) >= index
                      const isCurrent = order.status === status

                      return (
                        <div
                          key={status}
                          className="flex flex-col items-center flex-1"
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isActive
                                ? 'bg-black text-white'
                                : 'bg-gray-200 text-gray-400'
                            } ${isCurrent ? 'ring-2 ring-offset-2 ring-black' : ''}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <span
                            className={`mt-2 text-xs text-center ${
                              isActive ? 'text-black' : 'text-gray-400'
                            }`}
                          >
                            {config.label}
                          </span>
                        </div>
                      )
                    }
                  )}
                </div>

                {/* Connector lines */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10">
                  <div
                    className="h-full bg-black transition-all"
                    style={{
                      width: `${
                        (['pending', 'preparing', 'shipped', 'delivered'].indexOf(
                          order.status
                        ) /
                          3) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              {nextAction && (
                <div className="mt-6 pt-6 border-t">
                  {nextAction.status === 'shipped' ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="tracking">Número de guía</Label>
                        <Input
                          id="tracking"
                          placeholder="Ej: 1234567890"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                        />
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            className="w-full"
                            disabled={!trackingNumber || isUpdating}
                          >
                            {isUpdating ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Truck className="mr-2 h-4 w-4" />
                            )}
                            {nextAction.label}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar envío</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se marcará el pedido como enviado y se notificará al
                              cliente por email con el número de guía:{' '}
                              <strong>{trackingNumber}</strong>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleStatusUpdate('shipped')}
                            >
                              Confirmar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="w-full" disabled={isUpdating}>
                          {isUpdating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            (() => {
                              const NextIcon = statusConfig[nextAction.status].icon
                              return <NextIcon className="mr-2 h-4 w-4" />
                            })()
                          )}
                          {nextAction.label}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar cambio</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se cambiará el estado del pedido a "
                            {statusConfig[nextAction.status].label}" y se
                            notificará al cliente por email.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              handleStatusUpdate(
                                nextAction.status as 'preparing' | 'delivered'
                              )
                            }
                          >
                            Confirmar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}

              {/* Tracking number if shipped */}
              {order.trackingNumber && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Número de guía</p>
                  <p className="font-mono font-medium">{order.trackingNumber}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order items */}
          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
              <CardDescription>
                {order.items.length} producto
                {order.items.length !== 1 ? 's' : ''} en este pedido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      {item.variantName && (
                        <p className="text-sm text-gray-500">{item.variantName}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        {item.quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {item.type === 'physical' ? 'Físico' : 'Digital'}
                      </Badge>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Envío</span>
                    <span>
                      {order.shippingCost === 0
                        ? 'Gratis'
                        : formatPrice(order.shippingCost)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer info */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{order.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Método de pago</p>
                  <p className="font-medium">
                    {order.paymentMethod === 'card' ? 'Tarjeta' : 'OXXO'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping address */}
          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Dirección de envío
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{order.shippingAddress.name}</p>
                <p className="text-gray-600">{order.shippingAddress.street}</p>
                <p className="text-gray-600">
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  {order.shippingAddress.zipCode}
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{order.shippingAddress.phone}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Fechas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Creado</p>
                <p>{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Última actualización</p>
                <p>{formatDate(order.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

### Step 2: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 3: Probar en navegador

Verificar:
- Detalle de pedido carga correctamente
- Timeline muestra estado actual
- Botones de cambio de estado funcionan
- Campo de número de guía aparece al marcar como enviado

### Step 4: Commit

```bash
git add src/routes/admin.pedidos.\$id.tsx
git commit -m "feat: add order detail page with status timeline"
```

- [ ] **Task 5 completada**

---

## Task 6: Actualizar lista de pedidos para vincular al detalle

**Files:**
- Modify: `src/routes/admin.pedidos.tsx`

### Step 1: Actualizar botón de ver para navegar al detalle

Cambiar el botón de "Eye" para navegar a la página de detalle en lugar de abrir un dialog:

```typescript
// Cambiar el botón de ver:
<Button variant="ghost" size="icon" asChild>
  <Link to={`/admin/pedidos/${order._id}`}>
    <Eye className="h-4 w-4" />
  </Link>
</Button>
```

### Step 2: Remover el dialog de detalle (ya no es necesario)

Eliminar el Dialog y su estado asociado del componente.

### Step 3: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 4: Commit

```bash
git add src/routes/admin.pedidos.tsx
git commit -m "feat: link orders list to detail page"
```

- [ ] **Task 6 completada**

---

## Task 7: Validación final y preparación para merge

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
- [ ] Lista de pedidos muestra todos los pedidos
- [ ] Filtro por estado funciona
- [ ] Click en pedido navega al detalle
- [ ] Detalle muestra toda la información
- [ ] Timeline muestra estado correctamente
- [ ] Cambiar estado a "En preparación" funciona
- [ ] Email de "En preparación" se envía
- [ ] Cambiar estado a "Enviado" requiere número de guía
- [ ] Email de "Enviado" se envía con número de guía
- [ ] Cambiar estado a "Entregado" funciona
- [ ] Email de "Entregado" se envía

### Step 4: Push final

```bash
git push origin feat/fase-6-gestion-pedidos
```

- [ ] **Task 7 completada**

---

## Checklist Final de Fase 6

- [ ] Branch `feat/fase-6-gestion-pedidos` creado
- [ ] Plantilla de email "En preparación"
- [ ] Plantilla de email "Entregado"
- [ ] Funciones de email para nuevos estados
- [ ] Validación de transiciones de estado
- [ ] Página de detalle de pedido
- [ ] Timeline visual de estados
- [ ] Campo de número de guía
- [ ] Confirmaciones antes de cambiar estado
- [ ] Emails se envían automáticamente
- [ ] Build pasa sin errores
- [ ] Lint pasa sin errores

---

## APROBACIÓN REQUERIDA

**Antes de hacer merge a main:**

1. Verificar que todos los checkboxes están marcados
2. Probar el flujo completo:
   - Crear un pedido de prueba
   - Cambiar estado a "En preparación"
   - Verificar email recibido
   - Cambiar estado a "Enviado" con número de guía
   - Verificar email recibido con número de guía
   - Cambiar estado a "Entregado"
   - Verificar email recibido
3. Ejecutar `pnpm run build` una última vez
4. Solicitar aprobación explícita del usuario

**Comando para merge (solo después de aprobación):**

```bash
git checkout main
git merge feat/fase-6-gestion-pedidos
git push origin main
```

---

## Resumen Final del Proyecto

Después de completar las 6 fases, la tienda tendrá:

### Funcionalidades de Admin
- [ ] Login con JWT
- [ ] Dashboard con estadísticas
- [ ] CRUD de categorías
- [ ] CRUD de colecciones
- [ ] CRUD de productos con variantes
- [ ] Subida de imágenes y archivos digitales
- [ ] Gestión completa de pedidos
- [ ] Configuración de tienda

### Funcionalidades de Storefront
- [ ] Página de inicio con hero y productos destacados
- [ ] Catálogo con búsqueda y filtros
- [ ] Páginas de categoría y colección
- [ ] Detalle de producto con variantes
- [ ] Carrito de compras (localStorage)
- [ ] Checkout con Stripe (tarjeta y OXXO)
- [ ] Página de confirmación de orden
- [ ] Descargas digitales con enlaces temporales

### Emails Transaccionales
- [ ] Confirmación de pedido
- [ ] Voucher OXXO
- [ ] Pedido en preparación
- [ ] Pedido enviado (con número de guía)
- [ ] Pedido entregado

### Integraciones
- [ ] Stripe (pagos con tarjeta y OXXO)
- [ ] Resend (emails transaccionales)
- [ ] Convex Storage (imágenes y archivos)

¡El proyecto está completo y listo para producción!
