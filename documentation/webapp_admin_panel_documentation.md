# Panel de Administración - Documentación Canónica

**Versión:** 1.0.0
**Fecha:** 2026-02-03
**Estado:** Aprobado para implementación

---

## 1. Overview

**En una oración:** Panel de administración para que el dueño de la tienda gestione productos, pedidos y códigos de descuento.

**Problema que resuelve:** El dueño de la tienda necesita una interfaz centralizada para las operaciones diarias: gestionar catálogo, procesar pedidos, y configurar promociones.

**Usuario:** Solo el dueño de la tienda (usuario único con acceso total).

**Éxito significa:**
- Gestionar el día a día de la tienda eficientemente
- Ver el estado del negocio (métricas básicas con tendencias)
- Tener control total sobre productos, pedidos y descuentos

---

## 2. Scope

### Incluido (v1)
- Dashboard con métricas y tendencias
- CRUD completo de productos con categorías y stock
- Gestión de pedidos con ciclo de vida completo
- Códigos de descuento con condiciones
- Autenticación por email/contraseña
- UI con shadcn/ui

### Excluido (v1)
- Gestión de cuentas de clientes
- Reportes avanzados / analytics complejos
- Soporte multi-idioma
- Múltiples usuarios/roles
- Tiempo real en dashboard

---

## 3. Arquitectura

### Ubicación
- **Panel admin:** Subdominio `admin.[dominio].com`
- **Storefront:** `[dominio].com` (aplicación separada o rutas diferentes)

### Stack Técnico
- **Frontend:** React + TanStack Router + shadcn/ui
- **Backend:** Convex (funciones + base de datos)
- **Almacenamiento:** Convex Storage (imágenes)
- **Autenticación:** Email/contraseña (implementar con Convex Auth o similar)

### Moneda
- **Fija:** MXN (pesos mexicanos)
- Todos los precios se almacenan en centavos (enteros) para evitar errores de punto flotante

---

## 4. Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    LOGIN (Email/Password)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      DASHBOARD                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Ventas hoy  │  │  Pedidos    │  │ Productos bajo stock│  │
│  │ vs ayer     │  │  pendientes │  │ (lista)             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────┬────────────────┬───────────────────┬───────────────┘
         │                │                   │
         ▼                ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PRODUCTOS     │  │    PEDIDOS      │  │   DESCUENTOS    │
│                 │  │                 │  │                 │
│ • Listar        │  │ • Listar        │  │ • Listar        │
│ • Crear         │  │   (filtro:estado│  │ • Crear         │
│ • Editar        │  │ • Ver detalle   │  │ • Editar        │
│ • Archivar      │  │ • Cambiar estado│  │ • Activar/Desact│
│ • Gestionar     │  │ • Cancelar      │  │ • Eliminar      │
│   categorías    │  │ • Reembolsar    │  │                 │
│                 │  │   (parcial OK)  │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Ciclo de Vida de Pedidos

```
                    ┌──────────┐
                    │ Pendiente│
                    └────┬─────┘
                         │
                         ▼
                ┌────────────────┐
                │ En preparación │
                └───────┬────────┘
                        │
                        ▼
                   ┌─────────┐
                   │ Enviado │
                   └────┬────┘
                        │
                        ▼
                  ┌──────────┐
                  │ Entregado│
                  └──────────┘

Estados terminales alternos (desde cualquier estado excepto Entregado):
  → Cancelado
  → Reembolsado (parcial o total)
```

---

## 5. Data Model

### 5.1 Tabla: `products`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | `Id<"products">` | Auto | ID único de Convex |
| `name` | `string` | Sí | Nombre del producto |
| `description` | `string` | Sí | Descripción larga |
| `price` | `number` | Sí | Precio en centavos MXN |
| `sku` | `string` | Sí | Código único (índice único) |
| `images` | `Id<"_storage">[]` | Sí | Referencias a Convex Storage (mín. 1) |
| `stock` | `number` | Sí | Cantidad disponible (>= 0) |
| `lowStockThreshold` | `number` | Sí | Umbral para alerta de bajo stock |
| `categoryIds` | `Id<"categories">[]` | No | Categorías asociadas |
| `isArchived` | `boolean` | Sí | Soft delete (default: false) |
| `createdAt` | `number` | Auto | Timestamp de creación |
| `updatedAt` | `number` | Auto | Timestamp de última actualización |

**Índices:**
- `by_sku` (único)
- `by_archived` (para filtrar productos activos)
- `by_stock` (para consultas de bajo stock)

### 5.2 Tabla: `categories`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | `Id<"categories">` | Auto | ID único |
| `name` | `string` | Sí | Nombre de la categoría |
| `slug` | `string` | Sí | URL-friendly (índice único) |

**Nota:** Categorías son lista plana (sin jerarquía). Un producto puede pertenecer a múltiples categorías.

### 5.3 Tabla: `orders`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | `Id<"orders">` | Auto | ID único |
| `orderNumber` | `string` | Sí | Número legible (ej: ORD-2024-0001) |
| `status` | `OrderStatus` | Sí | Estado actual del pedido |
| `items` | `OrderItem[]` | Sí | Productos con cantidades |
| `subtotal` | `number` | Sí | Subtotal en centavos |
| `discountAmount` | `number` | Sí | Descuento aplicado en centavos |
| `total` | `number` | Sí | Total final en centavos |
| `discountCodeId` | `Id<"discountCodes">` | No | Código de descuento usado |
| `customer` | `CustomerInfo` | Sí | Información del cliente |
| `shippingAddress` | `Address` | Sí | Dirección de envío |
| `internalNotes` | `string` | No | Notas del admin |
| `statusHistory` | `StatusChange[]` | Sí | Historial de cambios de estado |
| `refundedAmount` | `number` | No | Monto reembolsado (si aplica) |
| `createdAt` | `number` | Auto | Timestamp |

**Tipos auxiliares:**

```typescript
type OrderStatus =
  | "pending"      // Pendiente
  | "preparing"    // En preparación
  | "shipped"      // Enviado
  | "delivered"    // Entregado
  | "cancelled"    // Cancelado
  | "refunded"     // Reembolsado

type OrderItem = {
  productId: Id<"products">
  productName: string      // Snapshot del nombre
  productSku: string       // Snapshot del SKU
  price: number            // Precio al momento de compra
  quantity: number
}

type CustomerInfo = {
  name: string
  email: string
  phone?: string
}

type Address = {
  street: string
  city: string
  state: string
  postalCode: string
  country: string
}

type StatusChange = {
  from: OrderStatus | null
  to: OrderStatus
  timestamp: number
  note?: string
}
```

**Índices:**
- `by_status` (para filtrar por estado)
- `by_orderNumber` (para búsqueda)
- `by_createdAt` (para ordenar)

### 5.4 Tabla: `discountCodes`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | `Id<"discountCodes">` | Auto | ID único |
| `code` | `string` | Sí | Código (índice único, uppercase) |
| `type` | `"percentage" \| "fixed"` | Sí | Tipo de descuento |
| `value` | `number` | Sí | Porcentaje (1-100) o centavos |
| `minPurchase` | `number` | No | Mínimo de compra en centavos |
| `productIds` | `Id<"products">[]` | No | Productos específicos (vacío = todos) |
| `categoryIds` | `Id<"categories">[]` | No | Categorías específicas (vacío = todas) |
| `expiresAt` | `number` | No | Timestamp de expiración |
| `maxUses` | `number` | No | Límite total de usos |
| `currentUses` | `number` | Sí | Usos actuales (default: 0) |
| `isActive` | `boolean` | Sí | Activo/inactivo |
| `createdAt` | `number` | Auto | Timestamp |

**Índices:**
- `by_code` (único)
- `by_active` (para listar activos)

### 5.5 Tabla: `adminUsers`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | `Id<"adminUsers">` | Auto | ID único |
| `email` | `string` | Sí | Email (índice único) |
| `passwordHash` | `string` | Sí | Hash de contraseña (bcrypt) |
| `name` | `string` | Sí | Nombre para mostrar |
| `createdAt` | `number` | Auto | Timestamp |

**Nota:** Usuario creado por seed manual. No hay registro público.

---

## 6. Stage Details

### 6.1 Autenticación

**Flujo:**
1. Admin navega a `admin.[dominio].com`
2. Si no hay sesión, muestra form de login
3. Admin ingresa email + contraseña
4. Sistema valida credenciales contra `adminUsers`
5. Si válido, crea sesión (JWT o Convex session)
6. Redirige a Dashboard

**Validaciones:**
- Email: formato válido, existe en `adminUsers`
- Contraseña: mínimo 8 caracteres, coincide con hash

**Errores:**
- Credenciales inválidas: "Email o contraseña incorrectos" (mensaje genérico por seguridad)

### 6.2 Dashboard

**Métricas mostradas:**
1. **Ventas del día**
   - Total en MXN
   - Comparación con ayer (% cambio)
2. **Pedidos pendientes**
   - Contador de pedidos en status `pending`
   - Link directo a lista filtrada
3. **Productos bajo stock**
   - Lista de productos donde `stock <= lowStockThreshold`
   - Máximo 10 items, ordenados por stock ascendente
   - Link a producto para editar

**Cálculo de ventas:**
- Suma de `total` de pedidos con `status` en ["delivered", "shipped", "preparing"] creados hoy
- "Hoy" = desde medianoche hora local hasta ahora

### 6.3 Productos

**Listar:**
- Tabla paginada (20 por página)
- Columnas: Imagen, Nombre, SKU, Precio, Stock, Categorías, Estado
- Filtros: Por categoría, por estado (activo/archivado)
- Ordenar: Por nombre, precio, stock, fecha creación

**Crear:**
1. Form con todos los campos
2. Validar (ver sección Validaciones)
3. Subir imágenes a Convex Storage
4. Crear documento en `products`

**Editar:**
1. Cargar datos actuales
2. Permitir modificar cualquier campo
3. Para imágenes: agregar nuevas, eliminar existentes, reordenar
4. Actualizar `updatedAt`

**Archivar:**
1. Confirmar acción con modal
2. Cambiar `isArchived` a true
3. Producto sigue visible en pedidos históricos

**Restaurar:**
1. Desde vista de archivados
2. Cambiar `isArchived` a false

### 6.4 Categorías

**Listar:**
- Lista simple con nombre
- Contador de productos por categoría

**Crear:**
- Nombre único
- Slug auto-generado del nombre

**Editar:**
- Cambiar nombre
- Slug se regenera

**Eliminar:**
- Solo si no tiene productos asociados
- Si tiene productos: mostrar error con lista de productos

### 6.5 Pedidos

**Listar:**
- Tabla paginada (20 por página)
- Columnas: # Pedido, Cliente, Total, Estado, Fecha
- Filtro: Por estado (selector de estados)
- Ordenar: Por fecha (más recientes primero)

**Ver detalle:**
- Toda la información del pedido
- Lista de items con subtotales
- Historial de cambios de estado
- Formulario para agregar nota interna

**Cambiar estado:**
1. Botón de acción según estado actual
2. Opciones válidas según flujo:
   - Pendiente → En preparación, Cancelar
   - En preparación → Enviado, Cancelar
   - Enviado → Entregado, Cancelar
   - Entregado → Reembolsar
   - Cancelado/Reembolsado → (sin acciones)
3. Al cambiar, agregar entrada a `statusHistory`

**Cancelar:**
1. Modal de confirmación
2. Opción de agregar nota
3. Si pedido NO está en "shipped" o "delivered":
   - Restaurar stock de cada item
4. Cambiar status a "cancelled"

**Reembolsar:**
1. Seleccionar items y cantidades a reembolsar
2. Calcular monto de reembolso
3. Actualizar `refundedAmount`
4. Si reembolso total: cambiar status a "refunded"
5. Si reembolso parcial: mantener status, agregar nota

### 6.6 Códigos de Descuento

**Listar:**
- Tabla con: Código, Tipo, Valor, Condiciones, Usos, Estado
- Filtro: Activos / Todos

**Crear:**
1. Form con campos:
   - Código (texto, se convierte a uppercase)
   - Tipo (porcentaje / monto fijo)
   - Valor (número)
   - Mínimo de compra (opcional)
   - Productos específicos (selector múltiple, opcional)
   - Categorías específicas (selector múltiple, opcional)
   - Fecha expiración (opcional)
   - Límite de usos (opcional)
2. Validar unicidad del código
3. Crear documento

**Editar:**
- Todos los campos editables excepto el código
- Para cambiar código: crear nuevo y desactivar anterior

**Activar/Desactivar:**
- Toggle de `isActive`

**Eliminar:**
- Hard delete (no hay razón para mantener histórico de códigos eliminados)
- Pedidos que usaron el código mantienen referencia null-safe

---

## 7. Error Handling

### Errores de Validación
| Campo | Validación | Mensaje |
|-------|------------|---------|
| Product.name | Requerido | "El nombre es requerido" |
| Product.price | > 0 | "El precio debe ser mayor a 0" |
| Product.stock | >= 0 | "El stock no puede ser negativo" |
| Product.sku | Único | "Este SKU ya existe" |
| Product.images | >= 1 | "Se requiere al menos una imagen" |
| DiscountCode.code | Único | "Este código ya existe" |
| DiscountCode.value | > 0 | "El valor debe ser mayor a 0" |
| DiscountCode.value (%) | <= 100 | "El porcentaje no puede ser mayor a 100" |

### Errores de Sistema
- **Conexión perdida:** Mostrar banner "Sin conexión", deshabilitar acciones de escritura
- **Error de servidor:** Toast con mensaje "Error al procesar. Intenta de nuevo."
- **Timeout:** Reintentar automáticamente 1 vez, luego mostrar error

### Estados de Carga
- Tablas: Skeleton loader
- Formularios: Botón deshabilitado con spinner
- Acciones: Toast de "Procesando..." que cambia a éxito/error

---

## 8. Edge Cases

### Productos

| Caso | Comportamiento |
|------|----------------|
| Eliminar producto con pedidos | Archivar en lugar de eliminar |
| Stock llega a 0 | Producto visible como "Agotado" en tienda |
| Editar producto en pedido existente | Pedido mantiene snapshot del producto |
| SKU duplicado | Rechazar con error de validación |
| Imagen falla al subir | Mostrar error, permitir reintentar |

### Pedidos

| Caso | Comportamiento |
|------|----------------|
| Cancelar pedido no enviado | Restaurar stock automáticamente |
| Cancelar pedido enviado/entregado | NO restaurar stock (producto ya salió) |
| Reembolso parcial | Permitido, monto libre hasta el total |
| Producto archivado en pedido | Mostrar nombre/SKU del snapshot |

### Descuentos

| Caso | Comportamiento |
|------|----------------|
| Código expira en carrito | Mostrar aviso al checkout, permitir continuar sin descuento |
| Carrito mixto (productos que califican + no) | Aplicar descuento solo al subtotal de productos que califican |
| Múltiples códigos | No permitido, solo uno por pedido |
| Código alcanza límite de usos | Rechazar con mensaje "Código agotado" |
| Descuento > total | Limitar descuento al total (no generar crédito) |

---

## 9. Affected Systems

### Integraciones Necesarias
- **Storefront:** Debe consultar:
  - Productos (activos, con stock)
  - Categorías
  - Validación de códigos de descuento
  - Crear pedidos

### Funciones Convex Compartidas
Las siguientes funciones serán usadas tanto por admin como storefront:
- `products.list` (filtrada para storefront)
- `categories.list`
- `discountCodes.validate`
- `orders.create`

---

## 10. Decisions Log

| Decisión | Alternativas Consideradas | Razón |
|----------|---------------------------|-------|
| Subdominio para admin | Rutas /admin, App separada | Mejor separación sin complejidad de monorepo |
| Soft delete para productos | Hard delete | Preservar integridad de pedidos históricos |
| Stock en centavos (enteros) | Decimales | Evitar errores de punto flotante |
| Categorías planas | Jerárquicas | Simplicidad para v1, expandible después |
| Un código por pedido | Múltiples códigos | Simplicidad de cálculo y UX |
| Historial de estados | Solo estado actual | Necesario para auditoría y debugging |
| shadcn/ui | Tailwind puro, Material UI | Balance entre personalización y velocidad |
| Convex Storage | S3, Cloudinary | Integración nativa, sin costos adicionales |

---

## 11. Implementation Notes

### Orden Sugerido de Implementación
1. **Schema y seed:** Definir tablas, crear usuario admin
2. **Auth:** Login/logout funcional
3. **Layout:** Sidebar, header, estructura base
4. **Categorías:** CRUD simple para desbloquear productos
5. **Productos:** CRUD completo con imágenes
6. **Dashboard:** Métricas básicas
7. **Códigos de descuento:** CRUD con validación
8. **Pedidos:** Listado y gestión de estados
9. **Polish:** Loading states, errores, UX

### Consideraciones de Performance
- Paginar todas las listas (20 items default)
- Índices en campos de filtro frecuente
- Lazy load de imágenes en listas
- Debounce en búsquedas

---

**Documento generado por entrevista estructurada el 2026-02-03**
