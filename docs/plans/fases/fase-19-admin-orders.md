# Fase 19: Admin - Gestión de Pedidos

> **Prerrequisitos:** Fase 18 completada
> **Resultado:** UI para ver y gestionar pedidos

---

## Tarea 19.1: Crear página de listado de pedidos

**Archivo:** `src/routes/admin.pedidos.tsx`

**Contenido:**
- Tabla de pedidos con filtros por estado
- Columnas: número de orden, email, total, estado, fecha
- Badges de color por estado
- Link a detalle de cada pedido

```typescript
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { Badge } from '~/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { useState } from 'react'
import { Eye } from 'lucide-react'

export const Route = createFileRoute('/admin/pedidos')({
  component: AdminPedidosPage,
})

const statusLabels = {
  pending_payment: { label: 'Pago pendiente', variant: 'outline' },
  pending: { label: 'Pendiente', variant: 'default' },
  preparing: { label: 'En preparación', variant: 'secondary' },
  shipped: { label: 'Enviado', variant: 'default' },
  delivered: { label: 'Entregado', variant: 'default' },
} as const

function AdminPedidosPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: orders } = useQuery(
    convexQuery(api.orders.list, {
      status: statusFilter === 'all' ? undefined : statusFilter as any,
    })
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pedidos</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending_payment">Pago pendiente</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="preparing">En preparación</SelectItem>
            <SelectItem value="shipped">Enviado</SelectItem>
            <SelectItem value="delivered">Entregado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{orders?.length ?? 0} pedido(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order) => (
                <TableRow key={order._id}>
                  <TableCell className="font-mono">{order.orderNumber}</TableCell>
                  <TableCell>{order.email}</TableCell>
                  <TableCell>${order.total}</TableCell>
                  <TableCell>
                    <Badge variant={statusLabels[order.status].variant as any}>
                      {statusLabels[order.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Link to={`/admin/pedidos/${order._id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Commit:**

```bash
git add src/routes/admin.pedidos.tsx
git commit -m "feat: add admin orders list page"
```

---

## Tarea 19.2: Crear página de detalle de pedido

**Archivo:** `src/routes/admin.pedidos.$id.tsx`

**Contenido:**
- Información del pedido (número, email, fecha)
- Lista de items con cantidades y precios
- Dirección de envío (si aplica)
- Selector de estado con confirmación
- Campo para número de guía (cuando estado = shipped)
- Timeline de cambios de estado

```typescript
// Página con:
// - Query del pedido por ID
// - Cards para: Resumen, Items, Dirección, Timeline
// - Formulario para cambiar estado
// - Input para tracking number cuando se marca como enviado
```

**Commit:**

```bash
git add src/routes/admin.pedidos.\$id.tsx
git commit -m "feat: add admin order detail page"
```

---

## Verificación Final de Fase 19

```bash
pnpm run build
```

---

**Siguiente fase:** `fase-20-admin-settings.md`
