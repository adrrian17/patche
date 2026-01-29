# Diseño: Tienda en Línea de Productos de Oficina

**Fecha:** 2026-01-28
**Estado:** Aprobado

## Resumen

Tienda en línea para vender productos de oficina (agendas, calendarios, libretas, notas) y plantillas digitales descargables. Los clientes pueden comprar sin crear cuenta, pagar con tarjeta o OXXO vía Stripe, y recibir sus productos físicos por envío o descargar archivos digitales inmediatamente.

## Requerimientos

### Productos
- **Dos tipos separados:** productos físicos y plantillas digitales (se venden independientemente)
- **Variantes:** productos físicos pueden tener variantes (tamaño, color, etc.) con stock individual
- **Organización:** categorías permanentes + colecciones flexibles (promociones, temporadas)
- **Tiempo de preparación:** algunos productos son hechos a mano, mostrar días estimados

### Checkout y Pagos
- **Guest checkout:** sin necesidad de crear cuenta
- **Métodos de pago:** Stripe con tarjeta de crédito/débito y OXXO
- **Envío:** tarifa fija con envío gratis al superar un monto configurable

### Entrega de Digitales
- **Tarjeta:** enlace de descarga inmediato en página de confirmación
- **OXXO:** enlace enviado por email al confirmar el pago
- **Expiración:** enlaces válidos por 24 horas

### Pedidos
- **Número de orden:** secuencial con formato `#PTCH1001`, `#PTCH1002`, etc.
- **Estados:** Pendiente → En preparación → Enviado → Entregado
- **Notificaciones:** email al cliente en cada cambio de estado
- **Guía de envío:** campo para ingresar número de rastreo

### Admin Dashboard
- **Acceso:** usuario único con contraseña
- **Funciones:** gestión de productos, variantes, inventario, categorías, colecciones, pedidos y configuración

### Búsqueda
- Barra de búsqueda por nombre de producto
- Filtros por categoría, precio, color, etc.

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                      STOREFRONT                             │
│  (Catálogo, Carrito, Checkout, Confirmación, Descargas)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CONVEX BACKEND                           │
│  (Funciones, Base de datos, Storage, Webhooks)              │
└─────────────────────────────────────────────────────────────┘
          │                   │                    │
          ▼                   ▼                    ▼
    ┌──────────┐       ┌──────────┐        ┌──────────┐
    │  Stripe  │       │  Resend  │        │  Convex  │
    │ Payments │       │  Emails  │        │ Storage  │
    └──────────┘       └──────────┘        └──────────┘

┌─────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                          │
│  (Login, Productos, Pedidos, Categorías, Configuración)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Modelo de Datos (Convex Schema)

### Productos y Catálogo

```typescript
// products
{
  name: string
  slug: string
  description: string
  basePrice: number
  type: "physical" | "digital"
  preparationDays: number | null    // días para productos hechos a mano
  images: string[]                   // storage IDs
  categoryId: Id<"categories">
  collectionIds: Id<"collections">[]
  isActive: boolean
  createdAt: number
  updatedAt: number
}

// variants
{
  productId: Id<"products">
  name: string                       // ej: "A5 Azul"
  attributes: {                      // flexible
    size?: string
    color?: string
    [key: string]: string
  }
  price: number | null               // null = usar precio base
  stock: number
  sku: string
}

// categories
{
  name: string
  slug: string
  order: number
  image: string | null               // storage ID
}

// collections
{
  name: string
  slug: string
  description: string | null
  image: string | null
  isActive: boolean
  createdAt: number
}
```

### Archivos Digitales

```typescript
// digitalFiles
{
  productId: Id<"products">
  name: string                       // ej: "Agenda 2026.pdf"
  storageId: string                  // Convex storage ID
  fileSize: number                   // bytes
}

// downloadLinks
{
  orderId: Id<"orders">
  fileId: Id<"digitalFiles">
  token: string                      // UUID único
  expiresAt: number                  // timestamp
  downloadsRemaining: number         // intentos restantes
  createdAt: number
}
```

### Pedidos

```typescript
// orders
{
  orderNumber: string                // "#PTCH1001"
  email: string
  items: Array<{
    productId: Id<"products">
    variantId: Id<"variants"> | null
    name: string
    variantName: string | null
    price: number
    quantity: number
    type: "physical" | "digital"
  }>
  subtotal: number
  shippingCost: number
  total: number
  paymentMethod: "card" | "oxxo"
  stripePaymentIntentId: string
  status: "pending_payment" | "pending" | "preparing" | "shipped" | "delivered"
  shippingAddress: {
    name: string
    street: string
    city: string
    state: string
    zipCode: string
    phone: string
  } | null
  trackingNumber: string | null
  createdAt: number
  updatedAt: number
}
```

### Admin y Configuración

```typescript
// adminUser
{
  username: string
  passwordHash: string
  lastLoginAt: number | null
}

// storeSettings (documento único)
{
  shippingRate: number               // tarifa fija de envío
  freeShippingThreshold: number      // monto mínimo para envío gratis
  contactEmail: string
  lastOrderNumber: number            // contador para generar #PTCH1001, etc.
}
```

---

## Flujo de Checkout y Pagos

### Carrito (Cliente)

1. Cliente agrega productos al carrito (guardado en localStorage)
2. Puede mezclar productos físicos y digitales en una misma compra
3. Al ir a checkout, ingresa email y dirección (solo si hay productos físicos)

### Checkout con Stripe

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Frontend │───▶│  Convex  │───▶│  Stripe  │───▶│ Frontend │
│  Items   │    │ Validate │    │ Payment  │    │ Confirm  │
│          │    │ + Create │    │  Intent  │    │   Form   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

1. Frontend envía items del carrito a Convex
2. Convex valida stock, calcula totales, crea PaymentIntent en Stripe
3. Frontend muestra Stripe Elements (tarjeta u OXXO)
4. Cliente completa el pago

### Post-pago con Tarjeta (Inmediato)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Stripe  │───▶│  Convex  │───▶│  Resend  │    │ Frontend │
│ Webhook  │    │  Create  │    │  Email   │    │ Download │
│          │    │  Order   │    │          │    │   Page   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

1. Stripe confirma pago → webhook a Convex
2. Convex crea orden con estado "pending", decrementa stock
3. Si hay digitales: genera downloadLinks con expiración 24hrs
4. Redirige a página de confirmación con enlaces de descarga
5. Envía email de confirmación

### Post-pago con OXXO (Asíncrono)

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Stripe  │───▶│ Voucher  │───▶│ Cliente  │
│  OXXO    │    │   Page   │    │  Paga    │
└──────────┘    └──────────┘    └──────────┘
                                     │
                                     ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Stripe  │───▶│  Convex  │───▶│  Resend  │
│ Webhook  │    │  Update  │    │  Email   │
│          │    │  Order   │    │ + Links  │
└──────────┘    └──────────┘    └──────────┘
```

1. Stripe genera voucher → cliente ve instrucciones para pagar en OXXO
2. Orden se crea como "pending_payment"
3. Cliente paga en tienda OXXO
4. Stripe confirma → webhook a Convex
5. Convex actualiza orden a "pending", decrementa stock, genera enlaces
6. Envía email con enlaces de descarga y confirmación

---

## Admin Dashboard

### Autenticación

- Página de login en `/admin/login`
- Al autenticar, Convex genera JWT con expiración de 7 días
- Token guardado en cookie httpOnly
- Layout `/admin.tsx` valida token antes de renderizar rutas hijas

### Módulos

**Productos (`/admin/productos`)**
- Lista con búsqueda y filtros por categoría/tipo
- Crear/editar: nombre, descripción, precio, categoría, colecciones, tiempo de preparación
- Subir imágenes (Convex Storage)
- Para digitales: subir archivos PDF/ZIP
- Gestión de variantes: nombre, atributos, precio, stock, SKU
- Activar/desactivar productos

**Categorías (`/admin/categorias`)**
- CRUD simple
- Reordenar con drag & drop
- Imagen opcional

**Colecciones (`/admin/colecciones`)**
- CRUD simple
- Activar/desactivar (para promociones temporales)
- Imagen y descripción opcionales

**Pedidos (`/admin/pedidos`)**
- Lista con filtros: estado, fecha, tipo de pago
- Búsqueda por número de orden o email
- Detalle: items, cliente, dirección, timeline de estados
- Cambiar estado → dispara email automático
- Campo para número de guía al marcar "Enviado"

**Configuración (`/admin/configuracion`)**
- Tarifa de envío
- Monto mínimo para envío gratis
- Email de contacto

---

## Storefront (Tienda Pública)

### Páginas

| Ruta | Descripción |
|------|-------------|
| `/` | Home: hero, colección destacada, categorías, productos nuevos |
| `/productos` | Catálogo completo con búsqueda y filtros |
| `/producto/[slug]` | Detalle: galería, variantes, tiempo de preparación, agregar al carrito |
| `/categoria/[slug]` | Productos filtrados por categoría |
| `/coleccion/[slug]` | Productos de una colección |
| `/carrito` | Items, cantidades, subtotal, envío, total |
| `/checkout` | Email, dirección, método de pago (Stripe Elements) |
| `/orden/[id]/confirmacion` | Resumen, enlaces de descarga (si aplica) |
| `/descarga/[token]` | Descarga de archivo digital (valida expiración) |

### Componentes Clave

- **Header:** logo, navegación por categorías, carrito con contador
- **SearchBar:** búsqueda con resultados en tiempo real
- **ProductCard:** imagen, nombre, precio, variantes disponibles
- **FilterSidebar:** categoría, rango de precio, colores, etc.
- **CartDrawer/Page:** lista de items editables
- **Footer:** contacto, políticas

---

## Emails Transaccionales

**Servicio:** Resend + React Email

| Evento | Asunto | Contenido |
|--------|--------|-----------|
| Voucher OXXO generado | "Instrucciones para pagar tu pedido" | Monto, referencia, código de barras, fecha límite |
| Pago confirmado | "Pedido #PTCH1001 confirmado" | Resumen, items, total, dirección, enlaces de descarga (si aplica) |
| En preparación | "Tu pedido #PTCH1001 está siendo preparado" | Mensaje informativo |
| Enviado | "Tu pedido #PTCH1001 ha sido enviado" | Número de guía, link de rastreo |
| Entregado | "Tu pedido #PTCH1001 fue entregado" | Agradecimiento |

---

## Stack Técnico

### Existente
- TanStack Start (routing, SSR)
- Convex (backend, base de datos, storage)
- Tailwind CSS v4
- React Query + Convex integration

### A Instalar

| Necesidad | Librería |
|-----------|----------|
| Pagos | `@stripe/stripe-js`, `stripe` |
| Emails | `resend`, `@react-email/components` |
| Formularios | `react-hook-form`, `zod` |
| UI Components | shadcn/ui |
| Auth | `jose` (JWT) |
| Iconos | `lucide-react` |

### Estructura de Archivos

```
src/routes/
  __root.tsx
  index.tsx                    # Home
  productos.tsx                # Catálogo
  producto.$slug.tsx           # Detalle producto
  categoria.$slug.tsx
  coleccion.$slug.tsx
  carrito.tsx
  checkout.tsx
  orden.$id.confirmacion.tsx
  descarga.$token.tsx
  admin.login.tsx
  admin.tsx                    # Layout con auth guard
  admin.index.tsx              # Dashboard home
  admin.productos.tsx
  admin.productos.nuevo.tsx
  admin.productos.$id.tsx
  admin.pedidos.tsx
  admin.pedidos.$id.tsx
  admin.categorias.tsx
  admin.colecciones.tsx
  admin.configuracion.tsx

convex/
  schema.ts
  products.ts
  variants.ts
  categories.ts
  collections.ts
  orders.ts
  downloads.ts
  admin.ts
  stripe.ts                    # Webhooks y PaymentIntent
  emails.ts                    # Envío con Resend
```

---

## Fases de Implementación

### Fase 1: Fundamentos
- [ ] Instalar dependencias (shadcn/ui, Stripe, Resend, jose, etc.)
- [ ] Definir schema completo en Convex
- [ ] Crear funciones CRUD básicas para productos, categorías, colecciones
- [ ] Configurar Convex Storage para imágenes y archivos

### Fase 2: Admin Dashboard
- [ ] Login y autenticación con JWT
- [ ] CRUD de categorías y colecciones
- [ ] CRUD de productos con variantes
- [ ] Subida de imágenes y archivos digitales
- [ ] Página de configuración (envío, email)

### Fase 3: Storefront
- [ ] Home con productos destacados
- [ ] Catálogo con búsqueda y filtros
- [ ] Páginas de categoría y colección
- [ ] Detalle de producto con selector de variantes
- [ ] Carrito (localStorage + UI)

### Fase 4: Checkout y Pagos
- [ ] Integración Stripe (PaymentIntent)
- [ ] Formulario de checkout con Stripe Elements
- [ ] Soporte para tarjeta y OXXO
- [ ] Webhooks para confirmar pagos
- [ ] Decrementar stock al confirmar

### Fase 5: Post-compra
- [ ] Generación de enlaces de descarga con expiración
- [ ] Página de confirmación con descargas
- [ ] Integración Resend + plantillas de email
- [ ] Emails de confirmación y voucher OXXO

### Fase 6: Gestión de Pedidos
- [ ] Lista de pedidos en admin con filtros
- [ ] Detalle y cambio de estado
- [ ] Envío de emails en cada cambio de estado
- [ ] Campo para número de guía

---

## Decisiones Técnicas

1. **Carrito en localStorage:** Evita complejidad de sincronización con backend para usuarios anónimos
2. **JWT simple para admin:** Un solo usuario no requiere sistema complejo de sesiones
3. **Convex Storage:** Archivos cerca de la base de datos, sin configurar S3
4. **Resend:** API simple, buen free tier, compatible con React Email
5. **shadcn/ui:** Componentes copiables, sin dependencia de librería externa
6. **Stripe Elements:** Cumple PCI compliance, soporta OXXO nativamente
