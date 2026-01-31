# Fase 15: Admin Layout y Login

> **Prerrequisitos:** Fase 14 completada
> **Resultado:** Layout del admin con sidebar y página de login funcional

---

## Tarea 15.1: Crear página de login

**Archivo:** `src/routes/admin.login.tsx`

**Paso 1: Crear la página de login**

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAction } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
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
import { createAdminToken, setAdminTokenCookie } from '~/lib/auth'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/admin/login')({
  component: AdminLoginPage,
})

function AdminLoginPage() {
  const navigate = useNavigate()
  const login = useAction(api.admin.login)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await login({ username, password })

      if (!result.success) {
        setError(result.error)
        return
      }

      // Crear y guardar token JWT
      const token = await createAdminToken({
        adminId: result.adminId,
        username,
      })
      setAdminTokenCookie(token)

      // Redirigir al dashboard
      navigate({ to: '/admin' })
    } catch (err) {
      setError('Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Admin</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Iniciar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Paso 2: Commit**

```bash
git add src/routes/admin.login.tsx
git commit -m "feat: add admin login page"
```

---

## Tarea 15.2: Crear componente de sidebar del admin

**Archivo:** `src/components/admin/AdminSidebar.tsx`

**Paso 1: Crear carpeta admin**

```bash
mkdir -p src/components/admin
```

**Paso 2: Crear el componente**

```typescript
import { Link, useLocation } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Sparkles,
  ShoppingCart,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { useAdmin } from '~/hooks/useAdmin'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/productos', label: 'Productos', icon: Package },
  { to: '/admin/categorias', label: 'Categorías', icon: FolderTree },
  { to: '/admin/colecciones', label: 'Colecciones', icon: Sparkles },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { to: '/admin/configuracion', label: 'Configuración', icon: Settings },
]

export function AdminSidebar() {
  const location = useLocation()
  const { logout } = useAdmin()

  return (
    <aside className="w-64 border-r bg-card min-h-screen flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold">Patche Admin</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  )
}
```

**Paso 3: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx
git commit -m "feat: add AdminSidebar component"
```

---

## Tarea 15.3: Crear layout del admin

**Archivo:** `src/routes/admin.tsx`

**Paso 1: Crear el layout**

```typescript
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAdmin } from '~/hooks/useAdmin'
import { AdminSidebar } from '~/components/admin/AdminSidebar'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})

function AdminLayout() {
  const navigate = useNavigate()
  const { isLoading, isAuthenticated } = useAdmin()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/admin/login' })
    }
  }, [isLoading, isAuthenticated, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-8 bg-muted/30">
        <Outlet />
      </main>
    </div>
  )
}
```

**Paso 2: Commit**

```bash
git add src/routes/admin.tsx
git commit -m "feat: add admin layout with auth guard"
```

---

## Tarea 15.4: Crear página de dashboard

**Archivo:** `src/routes/admin.index.tsx`

**Paso 1: Crear la página**

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  Package,
  ShoppingCart,
  DollarSign,
  Clock,
  Truck,
  CheckCircle,
} from 'lucide-react'
import { Skeleton } from '~/components/ui/skeleton'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboardPage,
})

function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery(
    convexQuery(api.orders.getStats, {})
  )

  if (isLoading) {
    return <DashboardSkeleton />
  }

  const cards = [
    {
      title: 'Ingresos Totales',
      value: `$${(stats?.revenue ?? 0).toLocaleString('es-MX')}`,
      description: 'Total de ventas confirmadas',
      icon: DollarSign,
    },
    {
      title: 'Pedidos Totales',
      value: stats?.total ?? 0,
      description: 'Todos los pedidos',
      icon: ShoppingCart,
    },
    {
      title: 'Pendientes',
      value: stats?.pending ?? 0,
      description: 'Esperando preparación',
      icon: Clock,
    },
    {
      title: 'En Preparación',
      value: stats?.preparing ?? 0,
      description: 'Siendo preparados',
      icon: Package,
    },
    {
      title: 'Enviados',
      value: stats?.shipped ?? 0,
      description: 'En camino',
      icon: Truck,
    },
    {
      title: 'Entregados',
      value: stats?.delivered ?? 0,
      description: 'Completados',
      icon: CheckCircle,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen de tu tienda
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <CardDescription>{card.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

**Paso 2: Commit**

```bash
git add src/routes/admin.index.tsx
git commit -m "feat: add admin dashboard page with stats"
```

---

## Verificación Final de Fase 15

```bash
pnpm run build
```

**Probar manualmente:**

1. Iniciar el servidor: `pnpm run dev`
2. Ir a `/admin/login`
3. Verificar que el formulario se muestra correctamente

---

**Siguiente fase:** `fase-16-admin-categories.md`
