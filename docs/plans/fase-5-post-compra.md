# Fase 5: Post-compra - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar el sistema de descargas digitales con enlaces temporales y emails transaccionales con Resend.

**Architecture:** Enlaces de descarga con tokens únicos y expiración de 24 horas. Resend para envío de emails con plantillas React Email. Actions en Convex para generar enlaces y enviar emails.

**Tech Stack:** Resend, React Email, Convex actions, jose (tokens)

**Branch:** `feat/fase-5-post-compra`

**Prerequisito:** Fase 4 completada y mergeada a main

---

## Pre-requisitos

- [ ] Fase 4 completada y mergeada a main
- [ ] Cuenta de Resend configurada
- [ ] API key de Resend disponible
- [ ] Dominio verificado en Resend (o usar dominio de prueba)
- [ ] `pnpm run dev` funciona correctamente

---

## Instrucciones Generales para el Agente

### Antes de cada tarea:
1. Asegúrate de estar en el branch correcto: `git checkout feat/fase-5-post-compra`
2. Pull cambios recientes: `git pull origin feat/fase-5-post-compra`

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
- Modify: `convex/.env.local`

### Step 1: Crear branch desde main

```bash
git checkout main
git pull origin main
git checkout -b feat/fase-5-post-compra
```

### Step 2: Actualizar ejemplo de variables de entorno

Agregar a `.env.local.example`:

```bash
# Resend (Email)
RESEND_API_KEY=re_...

# Store info for emails
STORE_NAME=Patche
STORE_URL=https://patche.mx
STORE_EMAIL=hola@patche.mx
```

### Step 3: Actualizar variables de Convex

Agregar a `convex/.env.local`:

```bash
RESEND_API_KEY=re_tu_api_key_aqui
STORE_NAME=Patche
STORE_URL=http://localhost:3000
STORE_EMAIL=hola@patche.mx
```

### Step 4: Commit

```bash
git add .env.local.example
git commit -m "chore: add Resend environment variables example"
```

- [ ] **Task 1 completada**

---

## Task 2: Crear funciones de enlaces de descarga

**Files:**
- Create: `convex/downloads.ts`

### Step 1: Crear funciones para enlaces de descarga

```typescript
import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'

const downloadLinkValidator = v.object({
  _id: v.id('downloadLinks'),
  _creationTime: v.number(),
  orderId: v.id('orders'),
  fileId: v.id('digitalFiles'),
  token: v.string(),
  expiresAt: v.number(),
  downloadsRemaining: v.number(),
  createdAt: v.number(),
})

// Generar token único
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

// Crear enlaces de descarga para una orden (interno)
export const createForOrder = internalMutation({
  args: {
    orderId: v.id('orders'),
  },
  returns: v.array(
    v.object({
      fileId: v.id('digitalFiles'),
      fileName: v.string(),
      token: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    // Obtener la orden
    const order = await ctx.db.get(args.orderId)
    if (!order) {
      throw new Error('Order not found')
    }

    // Obtener productos digitales de la orden
    const digitalItems = order.items.filter((item) => item.type === 'digital')

    if (digitalItems.length === 0) {
      return []
    }

    const createdLinks: Array<{
      fileId: Id<'digitalFiles'>
      fileName: string
      token: string
    }> = []

    const now = Date.now()
    const expiresAt = now + 24 * 60 * 60 * 1000 // 24 horas

    for (const item of digitalItems) {
      // Obtener archivos digitales del producto
      const files = await ctx.db
        .query('digitalFiles')
        .withIndex('by_product', (q) => q.eq('productId', item.productId))
        .collect()

      for (const file of files) {
        // Verificar si ya existe un enlace para este archivo y orden
        const existingLink = await ctx.db
          .query('downloadLinks')
          .withIndex('by_order', (q) => q.eq('orderId', args.orderId))
          .filter((q) => q.eq(q.field('fileId'), file._id))
          .first()

        if (existingLink) {
          // Actualizar expiración si existe
          await ctx.db.patch(existingLink._id, {
            expiresAt,
            downloadsRemaining: 5,
          })
          createdLinks.push({
            fileId: file._id,
            fileName: file.name,
            token: existingLink.token,
          })
        } else {
          // Crear nuevo enlace
          const token = generateToken()
          await ctx.db.insert('downloadLinks', {
            orderId: args.orderId,
            fileId: file._id,
            token,
            expiresAt,
            downloadsRemaining: 5,
            createdAt: now,
          })
          createdLinks.push({
            fileId: file._id,
            fileName: file.name,
            token,
          })
        }
      }
    }

    return createdLinks
  },
})

// Obtener enlaces de descarga por orden
export const getByOrder = query({
  args: { orderId: v.id('orders') },
  returns: v.array(
    v.object({
      _id: v.id('downloadLinks'),
      fileId: v.id('digitalFiles'),
      fileName: v.string(),
      token: v.string(),
      expiresAt: v.number(),
      downloadsRemaining: v.number(),
      isExpired: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query('downloadLinks')
      .withIndex('by_order', (q) => q.eq('orderId', args.orderId))
      .collect()

    const now = Date.now()

    const result = await Promise.all(
      links.map(async (link) => {
        const file = await ctx.db.get(link.fileId)
        return {
          _id: link._id,
          fileId: link.fileId,
          fileName: file?.name || 'Archivo',
          token: link.token,
          expiresAt: link.expiresAt,
          downloadsRemaining: link.downloadsRemaining,
          isExpired: link.expiresAt < now || link.downloadsRemaining <= 0,
        }
      })
    )

    return result
  },
})

// Validar y obtener enlace por token
export const getByToken = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      valid: v.literal(true),
      link: downloadLinkValidator,
      file: v.object({
        _id: v.id('digitalFiles'),
        name: v.string(),
        storageId: v.string(),
        fileSize: v.number(),
      }),
    }),
    v.object({
      valid: v.literal(false),
      reason: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query('downloadLinks')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique()

    if (!link) {
      return { valid: false as const, reason: 'Enlace no encontrado' }
    }

    const now = Date.now()

    if (link.expiresAt < now) {
      return { valid: false as const, reason: 'El enlace ha expirado' }
    }

    if (link.downloadsRemaining <= 0) {
      return {
        valid: false as const,
        reason: 'Se ha alcanzado el límite de descargas',
      }
    }

    const file = await ctx.db.get(link.fileId)
    if (!file) {
      return { valid: false as const, reason: 'Archivo no encontrado' }
    }

    return {
      valid: true as const,
      link,
      file: {
        _id: file._id,
        name: file.name,
        storageId: file.storageId,
        fileSize: file.fileSize,
      },
    }
  },
})

// Registrar descarga (decrementar contador)
export const registerDownload = mutation({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      success: v.literal(true),
      storageId: v.string(),
      fileName: v.string(),
    }),
    v.object({
      success: v.literal(false),
      reason: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query('downloadLinks')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique()

    if (!link) {
      return { success: false as const, reason: 'Enlace no encontrado' }
    }

    const now = Date.now()

    if (link.expiresAt < now) {
      return { success: false as const, reason: 'El enlace ha expirado' }
    }

    if (link.downloadsRemaining <= 0) {
      return {
        success: false as const,
        reason: 'Se ha alcanzado el límite de descargas',
      }
    }

    const file = await ctx.db.get(link.fileId)
    if (!file) {
      return { success: false as const, reason: 'Archivo no encontrado' }
    }

    // Decrementar contador
    await ctx.db.patch(link._id, {
      downloadsRemaining: link.downloadsRemaining - 1,
    })

    return {
      success: true as const,
      storageId: file.storageId,
      fileName: file.name,
    }
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
git add convex/downloads.ts
git commit -m "feat: add download links functions with expiration"
```

- [ ] **Task 2 completada**

---

## Task 3: Crear plantillas de email con React Email

**Files:**
- Create: `convex/emails/OrderConfirmation.tsx`
- Create: `convex/emails/OrderShipped.tsx`
- Create: `convex/emails/OxxoVoucher.tsx`

### Step 1: Crear plantilla de confirmación de orden

Contenido de `convex/emails/OrderConfirmation.tsx`:

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

interface OrderItem {
  name: string
  variantName: string | null
  quantity: number
  price: number
  type: 'physical' | 'digital'
}

interface DownloadLink {
  fileName: string
  url: string
}

interface OrderConfirmationEmailProps {
  orderNumber: string
  customerName: string
  items: OrderItem[]
  subtotal: number
  shippingCost: number
  total: number
  shippingAddress?: {
    name: string
    street: string
    city: string
    state: string
    zipCode: string
  } | null
  downloadLinks?: DownloadLink[]
  storeUrl: string
  storeName: string
}

export function OrderConfirmationEmail({
  orderNumber,
  customerName,
  items,
  subtotal,
  shippingCost,
  total,
  shippingAddress,
  downloadLinks,
  storeUrl,
  storeName,
}: OrderConfirmationEmailProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price)
  }

  return (
    <Html>
      <Head />
      <Preview>Confirmación de pedido {orderNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>{storeName}</Heading>

          <Text style={paragraph}>
            ¡Hola {customerName}!
          </Text>

          <Text style={paragraph}>
            Gracias por tu compra. Tu pedido <strong>{orderNumber}</strong> ha
            sido confirmado.
          </Text>

          <Hr style={hr} />

          <Heading as="h2" style={subheading}>
            Productos
          </Heading>

          {items.map((item, index) => (
            <Section key={index} style={itemSection}>
              <Text style={itemName}>
                {item.name}
                {item.variantName && ` - ${item.variantName}`}
              </Text>
              <Text style={itemDetails}>
                Cantidad: {item.quantity} × {formatPrice(item.price)} ={' '}
                {formatPrice(item.price * item.quantity)}
              </Text>
            </Section>
          ))}

          <Hr style={hr} />

          <Section style={totalsSection}>
            <Text style={totalLine}>
              Subtotal: {formatPrice(subtotal)}
            </Text>
            {shippingCost > 0 && (
              <Text style={totalLine}>
                Envío: {formatPrice(shippingCost)}
              </Text>
            )}
            <Text style={totalAmount}>
              Total: {formatPrice(total)}
            </Text>
          </Section>

          {shippingAddress && (
            <>
              <Hr style={hr} />
              <Heading as="h2" style={subheading}>
                Dirección de envío
              </Heading>
              <Text style={paragraph}>
                {shippingAddress.name}
                <br />
                {shippingAddress.street}
                <br />
                {shippingAddress.city}, {shippingAddress.state}{' '}
                {shippingAddress.zipCode}
              </Text>
            </>
          )}

          {downloadLinks && downloadLinks.length > 0 && (
            <>
              <Hr style={hr} />
              <Heading as="h2" style={subheading}>
                Descargas digitales
              </Heading>
              <Text style={paragraph}>
                Tus archivos están listos para descargar. Los enlaces expiran en
                24 horas.
              </Text>
              {downloadLinks.map((link, index) => (
                <Section key={index} style={downloadSection}>
                  <Link href={link.url} style={downloadLink}>
                    📥 {link.fileName}
                  </Link>
                </Section>
              ))}
            </>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            Si tienes alguna pregunta sobre tu pedido, responde a este email o
            contáctanos mencionando tu número de pedido: {orderNumber}
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

const subheading = {
  fontSize: '18px',
  fontWeight: '600',
  margin: '20px 0 10px',
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

const itemSection = {
  marginBottom: '10px',
}

const itemName = {
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 5px',
}

const itemDetails = {
  fontSize: '13px',
  color: '#666',
  margin: 0,
}

const totalsSection = {
  textAlign: 'right' as const,
}

const totalLine = {
  fontSize: '14px',
  margin: '5px 0',
}

const totalAmount = {
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '10px 0 0',
}

const downloadSection = {
  margin: '10px 0',
}

const downloadLink = {
  color: '#000',
  textDecoration: 'none',
  padding: '10px 15px',
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  display: 'inline-block',
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

export default OrderConfirmationEmail
```

### Step 2: Crear plantilla de pedido enviado

Contenido de `convex/emails/OrderShipped.tsx`:

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

interface OrderShippedEmailProps {
  orderNumber: string
  customerName: string
  trackingNumber: string
  trackingUrl?: string
  shippingAddress: {
    name: string
    street: string
    city: string
    state: string
    zipCode: string
  }
  storeUrl: string
  storeName: string
}

export function OrderShippedEmail({
  orderNumber,
  customerName,
  trackingNumber,
  trackingUrl,
  shippingAddress,
  storeUrl,
  storeName,
}: OrderShippedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu pedido {orderNumber} ha sido enviado</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>{storeName}</Heading>

          <Section style={iconSection}>
            <Text style={icon}>📦</Text>
          </Section>

          <Text style={paragraph}>
            ¡Hola {customerName}!
          </Text>

          <Text style={paragraph}>
            Tu pedido <strong>{orderNumber}</strong> ha sido enviado y está en
            camino.
          </Text>

          <Hr style={hr} />

          <Heading as="h2" style={subheading}>
            Información de rastreo
          </Heading>

          <Section style={trackingSection}>
            <Text style={trackingLabel}>Número de guía:</Text>
            <Text style={trackingValue}>{trackingNumber}</Text>
            {trackingUrl && (
              <Link href={trackingUrl} style={trackingLink}>
                Rastrear mi pedido →
              </Link>
            )}
          </Section>

          <Hr style={hr} />

          <Heading as="h2" style={subheading}>
            Dirección de entrega
          </Heading>

          <Text style={paragraph}>
            {shippingAddress.name}
            <br />
            {shippingAddress.street}
            <br />
            {shippingAddress.city}, {shippingAddress.state}{' '}
            {shippingAddress.zipCode}
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Si tienes alguna pregunta sobre tu envío, responde a este email o
            contáctanos mencionando tu número de pedido: {orderNumber}
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

const subheading = {
  fontSize: '18px',
  fontWeight: '600',
  margin: '20px 0 10px',
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

const trackingSection = {
  backgroundColor: '#f4f4f4',
  padding: '20px',
  borderRadius: '8px',
  textAlign: 'center' as const,
}

const trackingLabel = {
  fontSize: '12px',
  color: '#666',
  margin: '0 0 5px',
  textTransform: 'uppercase' as const,
}

const trackingValue = {
  fontSize: '20px',
  fontWeight: 'bold',
  fontFamily: 'monospace',
  margin: '0 0 15px',
}

const trackingLink = {
  textDecoration: 'none',
  padding: '10px 20px',
  backgroundColor: '#000',
  color: '#fff',
  borderRadius: '5px',
  display: 'inline-block',
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

export default OrderShippedEmail
```

### Step 3: Crear plantilla de voucher OXXO

Contenido de `convex/emails/OxxoVoucher.tsx`:

```typescript
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface OxxoVoucherEmailProps {
  orderNumber: string
  customerName: string
  voucherNumber: string
  amount: number
  expiresAt: Date
  storeName: string
}

export function OxxoVoucherEmail({
  orderNumber,
  customerName,
  voucherNumber,
  amount,
  expiresAt,
  storeName,
}: OxxoVoucherEmailProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Html>
      <Head />
      <Preview>Instrucciones para pagar tu pedido {orderNumber} en OXXO</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>{storeName}</Heading>

          <Section style={iconSection}>
            <Text style={icon}>🏪</Text>
          </Section>

          <Text style={paragraph}>
            ¡Hola {customerName}!
          </Text>

          <Text style={paragraph}>
            Tu pedido <strong>{orderNumber}</strong> está listo para ser pagado
            en cualquier tienda OXXO.
          </Text>

          <Hr style={hr} />

          <Section style={voucherSection}>
            <Text style={voucherLabel}>NÚMERO DE REFERENCIA</Text>
            <Text style={voucherNumber}>{voucherNumber}</Text>

            <Text style={amountLabel}>MONTO A PAGAR</Text>
            <Text style={amountValue}>{formatPrice(amount)}</Text>
          </Section>

          <Hr style={hr} />

          <Heading as="h2" style={subheading}>
            Instrucciones
          </Heading>

          <ol style={instructionsList}>
            <li style={instructionItem}>
              Acude a cualquier tienda OXXO
            </li>
            <li style={instructionItem}>
              Indica en caja que realizarás un pago de servicios
            </li>
            <li style={instructionItem}>
              Proporciona el número de referencia de arriba
            </li>
            <li style={instructionItem}>
              Paga el monto total en efectivo
            </li>
            <li style={instructionItem}>
              Guarda tu ticket como comprobante
            </li>
          </ol>

          <Section style={warningSection}>
            <Text style={warningText}>
              ⚠️ <strong>Importante:</strong> Este voucher vence el{' '}
              {formatDate(expiresAt)}. Después de esa fecha, tu pedido será
              cancelado automáticamente.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Una vez que realices el pago, recibirás un email de confirmación con
            los detalles de tu pedido.
          </Text>

          <Text style={footer}>
            Si tienes dudas, contáctanos mencionando tu número de pedido:{' '}
            {orderNumber}
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

const subheading = {
  fontSize: '18px',
  fontWeight: '600',
  margin: '20px 0 10px',
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

const voucherSection = {
  backgroundColor: '#fff7e6',
  padding: '30px',
  borderRadius: '8px',
  textAlign: 'center' as const,
  border: '2px solid #ffb800',
}

const voucherLabel = {
  fontSize: '12px',
  color: '#666',
  margin: '0 0 5px',
  letterSpacing: '1px',
}

const voucherNumber = {
  fontSize: '28px',
  fontWeight: 'bold',
  fontFamily: 'monospace',
  margin: '0 0 20px',
  letterSpacing: '3px',
}

const amountLabel = {
  fontSize: '12px',
  color: '#666',
  margin: '0 0 5px',
  letterSpacing: '1px',
}

const amountValue = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: 0,
}

const instructionsList = {
  paddingLeft: '20px',
  margin: '15px 0',
}

const instructionItem = {
  fontSize: '14px',
  lineHeight: '1.8',
}

const warningSection = {
  backgroundColor: '#fff3cd',
  padding: '15px',
  borderRadius: '8px',
  margin: '20px 0',
}

const warningText = {
  fontSize: '13px',
  margin: 0,
  color: '#856404',
}

const footer = {
  fontSize: '12px',
  color: '#666',
  textAlign: 'center' as const,
  margin: '20px 0 0',
}

export default OxxoVoucherEmail
```

### Step 4: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 5: Commit

```bash
git add convex/emails/
git commit -m "feat: add React Email templates for orders"
```

- [ ] **Task 3 completada**

---

## Task 4: Crear funciones de envío de emails

**Files:**
- Create: `convex/emails.ts`

### Step 1: Crear funciones para envío de emails

```typescript
'use node'

import { action, internalAction } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { OrderConfirmationEmail } from './emails/OrderConfirmation'
import { OrderShippedEmail } from './emails/OrderShipped'
import { OxxoVoucherEmail } from './emails/OxxoVoucher'

const resend = new Resend(process.env.RESEND_API_KEY)

const STORE_NAME = process.env.STORE_NAME || 'Patche'
const STORE_URL = process.env.STORE_URL || 'http://localhost:3000'
const STORE_EMAIL = process.env.STORE_EMAIL || 'noreply@patche.mx'

// Enviar email de confirmación de orden
export const sendOrderConfirmation = internalAction({
  args: {
    orderId: v.id('orders'),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Obtener orden
    const order = await ctx.runQuery(internal.orders.getByIdInternal, {
      id: args.orderId,
    })

    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    // Generar enlaces de descarga si hay productos digitales
    let downloadLinks: Array<{ fileName: string; url: string }> = []
    const hasDigital = order.items.some((item) => item.type === 'digital')

    if (hasDigital) {
      const links = await ctx.runMutation(internal.downloads.createForOrder, {
        orderId: args.orderId,
      })

      downloadLinks = links.map((link) => ({
        fileName: link.fileName,
        url: `${STORE_URL}/descarga/${link.token}`,
      }))
    }

    // Renderizar email
    const html = await render(
      OrderConfirmationEmail({
        orderNumber: order.orderNumber,
        customerName: order.shippingAddress?.name || order.email.split('@')[0],
        items: order.items.map((item) => ({
          name: item.name,
          variantName: item.variantName,
          quantity: item.quantity,
          price: item.price,
          type: item.type,
        })),
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        total: order.total,
        shippingAddress: order.shippingAddress,
        downloadLinks: downloadLinks.length > 0 ? downloadLinks : undefined,
        storeUrl: STORE_URL,
        storeName: STORE_NAME,
      })
    )

    try {
      await resend.emails.send({
        from: `${STORE_NAME} <${STORE_EMAIL}>`,
        to: order.email,
        subject: `Pedido ${order.orderNumber} confirmado - ${STORE_NAME}`,
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

// Enviar email de pedido enviado
export const sendOrderShipped = internalAction({
  args: {
    orderId: v.id('orders'),
    trackingNumber: v.string(),
    trackingUrl: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const order = await ctx.runQuery(internal.orders.getByIdInternal, {
      id: args.orderId,
    })

    if (!order || !order.shippingAddress) {
      return { success: false, error: 'Order not found or no shipping address' }
    }

    const html = await render(
      OrderShippedEmail({
        orderNumber: order.orderNumber,
        customerName: order.shippingAddress.name,
        trackingNumber: args.trackingNumber,
        trackingUrl: args.trackingUrl,
        shippingAddress: order.shippingAddress,
        storeUrl: STORE_URL,
        storeName: STORE_NAME,
      })
    )

    try {
      await resend.emails.send({
        from: `${STORE_NAME} <${STORE_EMAIL}>`,
        to: order.email,
        subject: `Tu pedido ${order.orderNumber} ha sido enviado - ${STORE_NAME}`,
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

// Enviar voucher OXXO
export const sendOxxoVoucher = internalAction({
  args: {
    email: v.string(),
    orderNumber: v.string(),
    customerName: v.string(),
    voucherNumber: v.string(),
    amount: v.number(),
    expiresAt: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const html = await render(
      OxxoVoucherEmail({
        orderNumber: args.orderNumber,
        customerName: args.customerName,
        voucherNumber: args.voucherNumber,
        amount: args.amount,
        expiresAt: new Date(args.expiresAt * 1000),
        storeName: STORE_NAME,
      })
    )

    try {
      await resend.emails.send({
        from: `${STORE_NAME} <${STORE_EMAIL}>`,
        to: args.email,
        subject: `Instrucciones para pagar tu pedido ${args.orderNumber} en OXXO`,
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

### Step 2: Agregar query interna de orders

Agregar a `convex/orders.ts`:

```typescript
import { internalQuery } from './_generated/server'

// Query interna para acceder desde actions
export const getByIdInternal = internalQuery({
  args: { id: v.id('orders') },
  returns: v.union(orderValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
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
git add convex/emails.ts convex/orders.ts
git commit -m "feat: add email sending functions with Resend"
```

- [ ] **Task 4 completada**

---

## Task 5: Integrar emails en flujo de pagos

**Files:**
- Modify: `convex/orders.ts`
- Modify: `convex/stripe.ts`

### Step 1: Actualizar createFromPayment para enviar email

En `convex/orders.ts`, al final de `createFromPayment`:

```typescript
// Al final del handler, después de crear la orden:

// Enviar email de confirmación
await ctx.scheduler.runAfter(0, internal.emails.sendOrderConfirmation, {
  orderId,
})

return orderId
```

### Step 2: Actualizar updateStatus para enviar email de envío

En `convex/orders.ts`, modificar `updateStatus`:

```typescript
// En updateStatus, después de actualizar el estado:

// Enviar email si se marcó como enviado
if (args.status === 'shipped' && args.trackingNumber) {
  await ctx.scheduler.runAfter(0, internal.emails.sendOrderShipped, {
    orderId: args.id,
    trackingNumber: args.trackingNumber,
  })
}
```

### Step 3: Enviar voucher OXXO al generar

En `convex/stripe.ts`, después de generar el voucher OXXO en `createPaymentIntent`:

```typescript
// Después de obtener oxxoVoucher, enviar email
if (oxxoVoucher) {
  await ctx.scheduler.runAfter(0, internal.emails.sendOxxoVoucher, {
    email,
    orderNumber: 'Pendiente', // Se asignará cuando se confirme el pago
    customerName: shippingAddress?.name || email.split('@')[0],
    voucherNumber: oxxoVoucher.number,
    amount: total,
    expiresAt: oxxoVoucher.expiresAt,
  })
}
```

### Step 4: Ejecutar dev para verificar

```bash
pnpm run dev:convex
```

### Step 5: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 6: Commit

```bash
git add convex/orders.ts convex/stripe.ts
git commit -m "feat: integrate email sending in payment flow"
```

- [ ] **Task 5 completada**

---

## Task 6: Crear página de descarga

**Files:**
- Create: `src/routes/descarga.$token.tsx`

### Step 1: Crear página de descarga

```typescript
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import { Header } from '~/components/store/Header'
import { Footer } from '~/components/store/Footer'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Download, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/descarga/$token')({
  component: DescargaPage,
})

function DescargaPage() {
  const { token } = Route.useParams()
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadComplete, setDownloadComplete] = useState(false)

  const linkData = useQuery(api.downloads.getByToken, { token })
  const registerDownload = useMutation(api.downloads.registerDownload)
  const getFileUrl = useQuery(
    api.storage.getUrl,
    linkData?.valid ? { storageId: linkData.file.storageId } : 'skip'
  )

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleDownload = async () => {
    if (!linkData?.valid || !getFileUrl) return

    setIsDownloading(true)

    try {
      // Registrar la descarga
      const result = await registerDownload({ token })

      if (!result.success) {
        alert(result.reason)
        setIsDownloading(false)
        return
      }

      // Descargar el archivo
      const response = await fetch(getFileUrl)
      const blob = await response.blob()

      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = linkData.file.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setDownloadComplete(true)
    } catch (error) {
      console.error('Download error:', error)
      alert('Error al descargar el archivo')
    } finally {
      setIsDownloading(false)
    }
  }

  // Loading
  if (linkData === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Invalid or expired link
  if (!linkData.valid) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold mb-2">Enlace no válido</h1>
              <p className="text-gray-600">{linkData.reason}</p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Descarga disponible</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File info */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <FileText className="h-10 w-10 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{linkData.file.name}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(linkData.file.fileSize)}
                </p>
              </div>
            </div>

            {/* Download status */}
            {downloadComplete ? (
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-green-600 font-medium">
                  ¡Descarga completada!
                </p>
                <p className="text-sm text-gray-500">
                  El archivo se ha descargado a tu dispositivo.
                </p>
              </div>
            ) : (
              <>
                {/* Download button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Descargando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      Descargar archivo
                    </>
                  )}
                </Button>

                {/* Expiration info */}
                <div className="text-center text-sm text-gray-500 space-y-1">
                  <p>
                    Este enlace expira el{' '}
                    {new Date(linkData.link.expiresAt).toLocaleDateString('es-MX', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p>
                    Descargas restantes: {linkData.link.downloadsRemaining}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
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
git add src/routes/descarga.\$token.tsx
git commit -m "feat: add download page with expiration"
```

- [ ] **Task 6 completada**

---

## Task 7: Actualizar página de confirmación para mostrar descargas

**Files:**
- Modify: `src/routes/orden.confirmacion.tsx`

### Step 1: Actualizar página para mostrar enlaces de descarga

Modificar la sección de descargas digitales:

```typescript
// Agregar query para obtener enlaces de descarga
const downloadLinks = useQuery(
  api.downloads.getByOrder,
  order?._id ? { orderId: order._id } : 'skip'
)

// Actualizar la sección de descargas digitales:
{hasDigital && (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Download className="h-5 w-5" />
        Descargas digitales
      </CardTitle>
    </CardHeader>
    <CardContent>
      {!downloadLinks ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : downloadLinks.length === 0 ? (
        <p className="text-gray-600">
          Los enlaces de descarga están siendo generados...
        </p>
      ) : (
        <div className="space-y-3">
          {downloadLinks.map((link) => (
            <div
              key={link._id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <span className="font-medium">{link.fileName}</span>
              </div>
              {link.isExpired ? (
                <span className="text-sm text-red-500">Expirado</span>
              ) : (
                <Button size="sm" asChild>
                  <Link to={`/descarga/${link.token}`}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar
                  </Link>
                </Button>
              )}
            </div>
          ))}
          <p className="text-sm text-gray-500 mt-4">
            Los enlaces expiran 24 horas después de la compra.
          </p>
        </div>
      )}
    </CardContent>
  </Card>
)}
```

### Step 2: Agregar imports necesarios

```typescript
import { FileText } from 'lucide-react'
```

### Step 3: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 4: Commit

```bash
git add src/routes/orden.confirmacion.tsx
git commit -m "feat: show download links on order confirmation page"
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
- [ ] Crear producto digital en admin
- [ ] Subir archivo digital al producto
- [ ] Comprar producto digital (con tarjeta de prueba)
- [ ] Verificar página de confirmación muestra descargas
- [ ] Verificar enlace de descarga funciona
- [ ] Verificar email de confirmación se recibe
- [ ] Verificar enlace en email funciona
- [ ] Verificar contador de descargas decrementa
- [ ] Probar expiración (modificar fecha en DB)

### Step 4: Push final

```bash
git push origin feat/fase-5-post-compra
```

- [ ] **Task 8 completada**

---

## Checklist Final de Fase 5

- [ ] Branch `feat/fase-5-post-compra` creado
- [ ] Variables de entorno de Resend configuradas
- [ ] Funciones de enlaces de descarga
- [ ] Plantilla de email de confirmación
- [ ] Plantilla de email de envío
- [ ] Plantilla de voucher OXXO
- [ ] Funciones de envío de email con Resend
- [ ] Integración de emails en flujo de pagos
- [ ] Página de descarga con validación
- [ ] Página de confirmación con descargas
- [ ] Expiración de enlaces funciona
- [ ] Límite de descargas funciona
- [ ] Build pasa sin errores
- [ ] Lint pasa sin errores

---

## APROBACIÓN REQUERIDA

**Antes de hacer merge a main:**

1. Verificar que todos los checkboxes están marcados
2. Probar el flujo completo de productos digitales:
   - Crear producto digital
   - Subir archivo
   - Comprar
   - Recibir email
   - Descargar archivo
3. Probar emails de estado de pedido
4. Ejecutar `pnpm run build` una última vez
5. Solicitar aprobación explícita del usuario

**Comando para merge (solo después de aprobación):**

```bash
git checkout main
git merge feat/fase-5-post-compra
git push origin main
```
