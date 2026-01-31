# Fase 25: Post-compra (Confirmación, Descargas, Emails)

> **Prerrequisitos:** Fase 24 completada
> **Resultado:** Página de confirmación, sistema de descargas y emails transaccionales

---

## Tarea 25.1: Crear funciones de enlaces de descarga

**Archivo:** `convex/downloads.ts`

```typescript
import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'

// Generar enlaces de descarga para una orden
export const generateDownloadLinks = internalMutation({
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order) return

    const now = Date.now()
    const expiresAt = now + 24 * 60 * 60 * 1000 // 24 horas

    for (const item of order.items) {
      if (item.type === 'digital') {
        // Obtener archivos del producto
        const files = await ctx.db
          .query('digitalFiles')
          .withIndex('by_product', (q) => q.eq('productId', item.productId))
          .collect()

        for (const file of files) {
          // Generar token único
          const token = crypto.randomUUID()

          await ctx.db.insert('downloadLinks', {
            orderId: args.orderId,
            fileId: file._id,
            token,
            expiresAt,
            downloadsRemaining: 3, // 3 intentos
            createdAt: now,
          })
        }
      }
    }
  },
})

// Obtener enlaces de descarga de una orden
export const getByOrder = query({
  args: { orderId: v.id('orders') },
  returns: v.array(
    v.object({
      _id: v.id('downloadLinks'),
      token: v.string(),
      fileName: v.string(),
      expiresAt: v.number(),
      downloadsRemaining: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query('downloadLinks')
      .withIndex('by_order', (q) => q.eq('orderId', args.orderId))
      .collect()

    const result = await Promise.all(
      links.map(async (link) => {
        const file = await ctx.db.get(link.fileId)
        return {
          _id: link._id,
          token: link.token,
          fileName: file?.name ?? 'Archivo',
          expiresAt: link.expiresAt,
          downloadsRemaining: link.downloadsRemaining,
        }
      })
    )

    return result
  },
})

// Validar y usar enlace de descarga
export const useDownloadLink = mutation({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      success: v.literal(true),
      downloadUrl: v.string(),
      fileName: v.string(),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query('downloadLinks')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique()

    if (!link) {
      return { success: false as const, error: 'Enlace no válido' }
    }

    if (link.expiresAt < Date.now()) {
      return { success: false as const, error: 'El enlace ha expirado' }
    }

    if (link.downloadsRemaining <= 0) {
      return { success: false as const, error: 'Se agotaron los intentos de descarga' }
    }

    // Decrementar intentos
    await ctx.db.patch(link._id, {
      downloadsRemaining: link.downloadsRemaining - 1,
    })

    // Obtener URL del archivo
    const file = await ctx.db.get(link.fileId)
    if (!file) {
      return { success: false as const, error: 'Archivo no encontrado' }
    }

    const downloadUrl = await ctx.storage.getUrl(file.storageId)
    if (!downloadUrl) {
      return { success: false as const, error: 'Error al obtener archivo' }
    }

    return {
      success: true as const,
      downloadUrl,
      fileName: file.name,
    }
  },
})
```

**Commit:**

```bash
git add convex/downloads.ts
git commit -m "feat(convex): add download links functions"
```

---

## Tarea 25.2: Crear página de confirmación de orden

**Archivo:** `src/routes/orden.$id.confirmacion.tsx`

```typescript
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { StoreLayout } from '~/components/store/StoreLayout'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { CheckCircle, Download, Package } from 'lucide-react'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/orden/$id/confirmacion')({
  component: ConfirmacionPage,
})

function ConfirmacionPage() {
  const { id } = Route.useParams()

  const { data: order } = useQuery(
    convexQuery(api.orders.getById, { id: id as Id<'orders'> })
  )
  const { data: downloadLinks } = useQuery(
    convexQuery(api.downloads.getByOrder, { orderId: id as Id<'orders'> }),
    { enabled: !!order }
  )

  if (!order) {
    return (
      <StoreLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p>Cargando...</p>
        </div>
      </StoreLayout>
    )
  }

  const hasDigitals = order.items.some((item) => item.type === 'digital')
  const hasPhysicals = order.items.some((item) => item.type === 'physical')

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">¡Gracias por tu compra!</h1>
          <p className="text-muted-foreground">
            Orden {order.orderNumber}
          </p>
        </div>

        {/* Descargas digitales */}
        {hasDigitals && downloadLinks && downloadLinks.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Tus descargas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {downloadLinks.map((link) => (
                <div key={link._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{link.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {link.downloadsRemaining} descarga(s) restante(s)
                    </p>
                  </div>
                  <Link to={`/descarga/${link.token}`}>
                    <Button>Descargar</Button>
                  </Link>
                </div>
              ))}
              <p className="text-sm text-muted-foreground">
                Los enlaces expiran en 24 horas. También recibirás un email con los enlaces.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info de envío */}
        {hasPhysicals && order.shippingAddress && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Información de envío
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Tu pedido será preparado y enviado a:</p>
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <p className="font-medium">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.street}</p>
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  {order.shippingAddress.zipCode}
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Recibirás un email cuando tu pedido sea enviado con el número de guía.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Resumen */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen del pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <div>
                    <span>{item.name}</span>
                    {item.variantName && (
                      <span className="text-muted-foreground"> - {item.variantName}</span>
                    )}
                    <span className="text-muted-foreground"> x{item.quantity}</span>
                  </div>
                  <span>${item.price * item.quantity}</span>
                </div>
              ))}
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${order.subtotal}</span>
                </div>
                {order.shippingCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Envío</span>
                    <span>${order.shippingCost}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${order.total}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Link to="/">
            <Button variant="outline">Volver a la tienda</Button>
          </Link>
        </div>
      </div>
    </StoreLayout>
  )
}
```

**Commit:**

```bash
git add src/routes/orden.\$id.confirmacion.tsx
git commit -m "feat: add order confirmation page"
```

---

## Tarea 25.3: Crear página de descarga

**Archivo:** `src/routes/descarga.$token.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { StoreLayout } from '~/components/store/StoreLayout'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { useState, useEffect } from 'react'
import { Download, AlertCircle, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/descarga/$token')({
  component: DescargaPage,
})

function DescargaPage() {
  const { token } = Route.useParams()
  const useDownloadLink = useMutation(api.downloads.useDownloadLink)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadInfo, setDownloadInfo] = useState<{ url: string; name: string } | null>(null)

  async function handleDownload() {
    setIsLoading(true)
    setError(null)

    try {
      const result = await useDownloadLink({ token })

      if (!result.success) {
        setError(result.error)
        return
      }

      setDownloadInfo({ url: result.downloadUrl, name: result.fileName })

      // Iniciar descarga automática
      const a = document.createElement('a')
      a.href = result.downloadUrl
      a.download = result.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      setError('Error al procesar la descarga')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <Download className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle>Descarga de archivo</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {error ? (
              <div className="p-4 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-destructive">{error}</p>
              </div>
            ) : downloadInfo ? (
              <div>
                <p className="mb-4">Tu descarga debe comenzar automáticamente.</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Si no comienza, haz clic en el botón:
                </p>
                <a href={downloadInfo.url} download={downloadInfo.name}>
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar {downloadInfo.name}
                  </Button>
                </a>
              </div>
            ) : (
              <div>
                <p className="mb-4">
                  Haz clic en el botón para iniciar la descarga de tu archivo.
                </p>
                <Button onClick={handleDownload} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Descargar archivo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StoreLayout>
  )
}
```

**Commit:**

```bash
git add src/routes/descarga.\$token.tsx
git commit -m "feat: add download page"
```

---

## Tarea 25.4: Configurar emails con Resend

**Archivo:** `convex/emails.ts`

```typescript
'use node'

import { Resend } from 'resend'
import { internalAction } from './_generated/server'
import { v } from 'convex/values'

const resend = new Resend(process.env.RESEND_API_KEY)

export const sendOrderConfirmation = internalAction({
  args: {
    email: v.string(),
    orderNumber: v.string(),
    items: v.array(v.any()),
    total: v.number(),
    downloadLinks: v.optional(v.array(v.object({
      fileName: v.string(),
      url: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const itemsList = args.items
      .map((item: any) => `${item.name} x${item.quantity} - $${item.price * item.quantity}`)
      .join('\n')

    let downloadsSection = ''
    if (args.downloadLinks?.length) {
      downloadsSection = `

Tus descargas:
${args.downloadLinks.map((link) => `- ${link.fileName}: ${link.url}`).join('\n')}

Los enlaces expiran en 24 horas.`
    }

    await resend.emails.send({
      from: 'Patche <noreply@patche.mx>',
      to: args.email,
      subject: `Pedido ${args.orderNumber} confirmado`,
      text: `
¡Gracias por tu compra!

Pedido: ${args.orderNumber}

Productos:
${itemsList}

Total: $${args.total}
${downloadsSection}

Si tienes alguna pregunta, responde a este email.

- Equipo Patche
      `.trim(),
    })
  },
})

export const sendShippingUpdate = internalAction({
  args: {
    email: v.string(),
    orderNumber: v.string(),
    trackingNumber: v.string(),
  },
  handler: async (ctx, args) => {
    await resend.emails.send({
      from: 'Patche <noreply@patche.mx>',
      to: args.email,
      subject: `Tu pedido ${args.orderNumber} ha sido enviado`,
      text: `
¡Buenas noticias! Tu pedido ha sido enviado.

Pedido: ${args.orderNumber}
Número de guía: ${args.trackingNumber}

Puedes rastrear tu paquete con el número de guía.

- Equipo Patche
      `.trim(),
    })
  },
})
```

**Commit:**

```bash
git add convex/emails.ts
git commit -m "feat(convex): add email functions with Resend"
```

---

## Tarea 25.5: Integrar emails en el flujo de pago

**Archivo:** `convex/stripe.ts` (actualizar handlePaymentSuccess)

Agregar llamadas a:
- `internal.downloads.generateDownloadLinks`
- `internal.emails.sendOrderConfirmation`

**Commit:**

```bash
git add convex/stripe.ts
git commit -m "feat(convex): integrate emails and download links in payment flow"
```

---

## Verificación Final de Fase 25

```bash
pnpm run build
```

**Probar flujo completo:**
1. Agregar productos al carrito
2. Completar checkout
3. Verificar página de confirmación
4. Verificar descargas (para digitales)
5. Verificar email recibido

---

## ¡Plan Completado!

Con estas 25 fases tienes una tienda en línea funcional con:
- ✅ Backend Convex con schema completo
- ✅ CRUD para categorías, colecciones, productos, variantes
- ✅ Sistema de autenticación admin con JWT
- ✅ Panel de administración completo
- ✅ Storefront con catálogo, filtros, carrito
- ✅ Checkout con Stripe (tarjeta y OXXO)
- ✅ Descargas de archivos digitales
- ✅ Emails transaccionales con Resend
