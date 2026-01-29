# Fase 2: Admin Dashboard - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar el panel de administración completo con autenticación JWT, CRUD de categorías, colecciones, productos con variantes, y subida de archivos.

**Architecture:** Autenticación basada en JWT con jose. Rutas protegidas bajo `/admin`. Layout compartido con sidebar de navegación. Formularios con react-hook-form + zod.

**Tech Stack:** TanStack Router, React Hook Form, Zod, jose (JWT), shadcn/ui, Convex

**Branch:** `feat/fase-2-admin-dashboard`

**Prerequisito:** Fase 1 completada y mergeada a main

---

## Pre-requisitos

- [ ] Fase 1 completada y mergeada a main
- [ ] `pnpm run dev` funciona correctamente
- [ ] Todos los archivos de Convex de Fase 1 están presentes

---

## Instrucciones Generales para el Agente

### Antes de cada tarea:
1. Asegúrate de estar en el branch correcto: `git checkout feat/fase-2-admin-dashboard`
2. Pull cambios recientes: `git pull origin feat/fase-2-admin-dashboard`

### Después de cada tarea completada:
1. Ejecutar `pnpm run lint:fix` para formatear código
2. Ejecutar `pnpm run dev` y verificar que no hay errores de tipos
3. Probar la funcionalidad en el navegador
4. Hacer commit con mensaje descriptivo
5. Marcar el checkbox de la tarea como completado

### Al finalizar la fase:
1. Verificar TODOS los checkboxes marcados
2. Ejecutar `pnpm run build` para validar build completo
3. Solicitar aprobación del usuario antes de merge a main

---

## Task 1: Crear branch y configurar variables de entorno

**Files:**
- Create: `.env.local.example`
- Modify: `.gitignore` (si necesario)

### Step 1: Crear branch desde main

```bash
git checkout main
git pull origin main
git checkout -b feat/fase-2-admin-dashboard
```

### Step 2: Crear archivo de ejemplo para variables de entorno

```bash
# Crear .env.local.example
```

Contenido de `.env.local.example`:

```
# JWT Secret (generar con: openssl rand -base64 32)
JWT_SECRET=your-jwt-secret-here

# Admin credentials (cambiar en producción)
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=hash-generado-con-bcrypt
```

### Step 3: Verificar que .env.local está en .gitignore

```bash
grep ".env.local" .gitignore
```

Si no existe, agregar a `.gitignore`:
```
.env.local
```

### Step 4: Commit

```bash
git add .env.local.example .gitignore
git commit -m "chore: add environment variables example"
```

- [ ] **Task 1 completada**

---

## Task 2: Implementar funciones de autenticación en Convex

**Files:**
- Create: `convex/auth.ts`

### Step 1: Crear funciones de autenticación

```typescript
'use node'

import { action, mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import { SignJWT, jwtVerify } from 'jose'
import { randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

const JWT_SECRET = new TextEncoder().encode(
  (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    return secret || 'development-secret-change-in-production';
  })()
)
const JWT_EXPIRATION = '7d'

// Función para hash de contraseña usando scrypt (KDF seguro)
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

// Verificar contraseña usando scrypt con timingSafeEqual
async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [salt, key] = storedHash.split(':')
  if (!salt || !key) {
    return false
  }
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer
  const storedKey = Buffer.from(key, 'hex')
  if (derivedKey.length !== storedKey.length) {
    return false
  }
  return timingSafeEqual(derivedKey, storedKey)
}

// Inicializar usuario admin (solo si no existe)
export const initializeAdmin = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  returns: v.union(v.id('adminUsers'), v.null()),
  handler: async (ctx, args) => {
    // Verificar si ya existe un admin
    const existing = await ctx.db.query('adminUsers').first()
    if (existing) {
      return null // Ya existe, no crear
    }

    const passwordHash = await hashPassword(args.password)

    return await ctx.db.insert('adminUsers', {
      username: args.username,
      passwordHash,
      lastLoginAt: null,
    })
  },
})

// Login action (necesita Node.js para jose)
export const login = action({
  args: {
    username: v.string(),
    password: v.string(),
  },
  returns: v.union(
    v.object({
      token: v.string(),
      expiresAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Buscar usuario
    const user = await ctx.runQuery(internal.auth.getAdminByUsername, {
      username: args.username,
    })

    if (!user) {
      return null
    }

    // Verificar contraseña
    const isValid = await verifyPassword(args.password, user.passwordHash)
    if (!isValid) {
      return null
    }

    // Actualizar último login
    await ctx.runMutation(internal.auth.updateLastLogin, {
      userId: user._id,
    })

    // Generar JWT
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 días
    const token = await new SignJWT({
      sub: user._id,
      username: user.username,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(JWT_EXPIRATION)
      .setIssuedAt()
      .sign(JWT_SECRET)

    return { token, expiresAt }
  },
})

// Verificar token
export const verifyToken = action({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      valid: v.literal(true),
      userId: v.string(),
      username: v.string(),
    }),
    v.object({
      valid: v.literal(false),
    })
  ),
  handler: async (_ctx, args) => {
    try {
      const { payload } = await jwtVerify(args.token, JWT_SECRET)

      if (!payload.sub || !payload.username) {
        return { valid: false as const }
      }

      return {
        valid: true as const,
        userId: payload.sub,
        username: payload.username as string,
      }
    } catch {
      return { valid: false as const }
    }
  },
})

// Query interna para obtener admin por username
import { internalQuery, internalMutation } from './_generated/server'

export const getAdminByUsername = internalQuery({
  args: { username: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('adminUsers'),
      _creationTime: v.number(),
      username: v.string(),
      passwordHash: v.string(),
      lastLoginAt: v.union(v.number(), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('adminUsers')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .unique()
  },
})

// Mutation interna para actualizar último login
export const updateLastLogin = internalMutation({
  args: { userId: v.id('adminUsers') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { lastLoginAt: Date.now() })
    return null
  },
})

// Cambiar contraseña
export const changePassword = mutation({
  args: {
    userId: v.id('adminUsers'),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) {
      return false
    }

    const isValid = await verifyPassword(args.currentPassword, user.passwordHash)
    if (!isValid) {
      return false
    }

    const newHash = await hashPassword(args.newPassword)
    await ctx.db.patch(args.userId, { passwordHash: newHash })
    return true
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
git add convex/auth.ts
git commit -m "feat: add JWT authentication functions"
```

- [ ] **Task 2 completada**

---

## Task 3: Crear contexto de autenticación en React

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/hooks/useAuth.ts`

### Step 1: Crear utilidades de autenticación

Contenido de `src/lib/auth.ts`:

```typescript
const TOKEN_KEY = 'patche_admin_token'
const EXPIRY_KEY = 'patche_admin_expiry'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string, expiresAt: number): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(EXPIRY_KEY, expiresAt.toString())
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EXPIRY_KEY)
}

export function isTokenExpired(): boolean {
  const expiry = localStorage.getItem(EXPIRY_KEY)
  if (!expiry) return true
  return Date.now() > parseInt(expiry, 10)
}

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false
  return !isTokenExpired()
}
```

### Step 2: Crear hook de autenticación

Contenido de `src/hooks/useAuth.ts`:

```typescript
import { useCallback, useEffect, useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  getToken,
  setToken,
  clearToken,
  isAuthenticated as checkAuth,
} from '~/lib/auth'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  username: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    username: null,
  })

  const loginAction = useAction(api.auth.login)
  const verifyAction = useAction(api.auth.verifyToken)

  // Verificar token al cargar
  useEffect(() => {
    async function verify() {
      const token = getToken()
      if (!token || !checkAuth()) {
        clearToken()
        setState({ isAuthenticated: false, isLoading: false, username: null })
        return
      }

      try {
        const result = await verifyAction({ token })
        if (result.valid) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            username: result.username,
          })
        } else {
          clearToken()
          setState({ isAuthenticated: false, isLoading: false, username: null })
        }
      } catch {
        clearToken()
        setState({ isAuthenticated: false, isLoading: false, username: null })
      }
    }

    verify()
  }, [verifyAction])

  const login = useCallback(
    async (username: string, password: string) => {
      setState((prev) => ({ ...prev, isLoading: true }))

      try {
        const result = await loginAction({ username, password })

        if (result) {
          setToken(result.token, result.expiresAt)
          setState({
            isAuthenticated: true,
            isLoading: false,
            username,
          })
          return { success: true }
        }

        setState((prev) => ({ ...prev, isLoading: false }))
        return { success: false, error: 'Credenciales inválidas' }
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }))
        return { success: false, error: 'Error al iniciar sesión' }
      }
    },
    [loginAction]
  )

  const logout = useCallback(() => {
    clearToken()
    setState({ isAuthenticated: false, isLoading: false, username: null })
  }, [])

  return {
    ...state,
    login,
    logout,
  }
}
```

### Step 3: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 4: Commit

```bash
git add src/lib/auth.ts src/hooks/useAuth.ts
git commit -m "feat: add auth context and useAuth hook"
```

- [ ] **Task 3 completada**

---

## Task 4: Crear página de login

**Files:**
- Create: `src/routes/admin.login.tsx`

### Step 1: Crear página de login

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '~/hooks/useAuth'
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
import { Loader2 } from 'lucide-react'

const loginSchema = z.object({
  username: z.string().min(1, 'Usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
})

type LoginForm = z.infer<typeof loginSchema>

export const Route = createFileRoute('/admin/login')({
  component: AdminLogin,
})

function AdminLogin() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, login } = useAuth()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate({ to: '/admin' })
    }
  }, [isAuthenticated, isLoading, navigate])

  const onSubmit = async (data: LoginForm) => {
    const result = await login(data.username, data.password)

    if (!result.success) {
      setError('root', { message: result.error })
    } else {
      navigate({ to: '/admin' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Panel de Administración</CardTitle>
          <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                {...register('username')}
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-sm text-red-500 text-center">
                {errors.root.message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Step 2: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 3: Probar en navegador

```bash
pnpm run dev
```

Navegar a `http://localhost:3000/admin/login` y verificar que la página carga correctamente.

### Step 4: Commit

```bash
git add src/routes/admin.login.tsx
git commit -m "feat: add admin login page"
```

- [ ] **Task 4 completada**

---

## Task 5: Crear layout protegido de admin

**Files:**
- Create: `src/routes/admin.tsx`
- Create: `src/routes/admin.index.tsx`
- Create: `src/components/admin/AdminSidebar.tsx`

### Step 1: Crear componente de sidebar

Contenido de `src/components/admin/AdminSidebar.tsx`:

```typescript
import { Link, useLocation } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Layers,
  ShoppingCart,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAuth } from '~/hooks/useAuth'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Productos', href: '/admin/productos', icon: Package },
  { name: 'Categorías', href: '/admin/categorias', icon: FolderTree },
  { name: 'Colecciones', href: '/admin/colecciones', icon: Layers },
  { name: 'Pedidos', href: '/admin/pedidos', icon: ShoppingCart },
  { name: 'Configuración', href: '/admin/configuracion', icon: Settings },
]

export function AdminSidebar() {
  const location = useLocation()
  const { logout, username } = useAuth()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-xl font-bold">Patche Admin</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive =
            item.href === '/admin'
              ? location.pathname === '/admin'
              : location.pathname.startsWith(item.href)

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t p-4">
        <div className="mb-2 text-sm text-gray-500">
          Sesión: <span className="font-medium text-gray-700">{username}</span>
        </div>
        <Separator className="my-2" />
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}
```

### Step 2: Crear layout de admin

Contenido de `src/routes/admin.tsx`:

```typescript
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '~/hooks/useAuth'
import { AdminSidebar } from '~/components/admin/AdminSidebar'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})

function AdminLayout() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/admin/login' })
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
```

### Step 3: Crear página de dashboard

Contenido de `src/routes/admin.index.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Package, FolderTree, Layers, ShoppingCart } from 'lucide-react'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const products = useQuery(api.products.list, {})
  const categories = useQuery(api.categories.list)
  const collections = useQuery(api.collections.list, {})

  const stats = [
    {
      name: 'Productos',
      value: products?.length ?? 0,
      icon: Package,
      description: 'Total de productos',
    },
    {
      name: 'Categorías',
      value: categories?.length ?? 0,
      icon: FolderTree,
      description: 'Categorías activas',
    },
    {
      name: 'Colecciones',
      value: collections?.length ?? 0,
      icon: Layers,
      description: 'Colecciones creadas',
    },
    {
      name: 'Pedidos',
      value: 0,
      icon: ShoppingCart,
      description: 'Pedidos pendientes',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Resumen de tu tienda</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <CardDescription>{stat.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

### Step 4: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 5: Probar en navegador

Verificar que:
1. `/admin` redirige a `/admin/login` si no está autenticado
2. El sidebar muestra la navegación correctamente
3. El dashboard muestra las estadísticas

### Step 6: Commit

```bash
git add src/routes/admin.tsx src/routes/admin.index.tsx src/components/admin/AdminSidebar.tsx
git commit -m "feat: add admin layout with sidebar and dashboard"
```

- [ ] **Task 5 completada**

---

## Task 6: Crear CRUD de categorías en admin

**Files:**
- Create: `src/routes/admin.categorias.tsx`

### Step 1: Crear página de categorías

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const categorySchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  slug: z.string().min(1, 'Slug requerido').regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
})

type CategoryForm = z.infer<typeof categorySchema>

export const Route = createFileRoute('/admin/categorias')({
  component: AdminCategorias,
})

function AdminCategorias() {
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<'categories'> | null>(null)

  const categories = useQuery(api.categories.list)
  const createCategory = useMutation(api.categories.create)
  const updateCategory = useMutation(api.categories.update)
  const deleteCategory = useMutation(api.categories.remove)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
  })

  const onSubmit = async (data: CategoryForm) => {
    try {
      if (editingId) {
        await updateCategory({
          id: editingId,
          name: data.name,
          slug: data.slug,
        })
        toast.success('Categoría actualizada')
      } else {
        await createCategory({
          name: data.name,
          slug: data.slug,
          order: categories?.length ?? 0,
          image: null,
        })
        toast.success('Categoría creada')
      }

      setIsOpen(false)
      setEditingId(null)
      reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    }
  }

  const handleEdit = (category: NonNullable<typeof categories>[number]) => {
    setEditingId(category._id)
    setValue('name', category.name)
    setValue('slug', category.slug)
    setIsOpen(true)
  }

  const handleDelete = async (id: Id<'categories'>) => {
    if (!confirm('¿Eliminar esta categoría?')) return

    try {
      await deleteCategory({ id })
      toast.success('Categoría eliminada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setEditingId(null)
      reset()
    }
  }

  // Auto-generar slug desde nombre
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    if (!editingId) {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setValue('slug', slug)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorías</h1>
          <p className="text-gray-500">Administra las categorías de productos</p>
        </div>

        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar categoría' : 'Nueva categoría'}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Modifica los datos de la categoría'
                  : 'Crea una nueva categoría para organizar tus productos'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  placeholder="Agendas"
                  {...register('name', { onChange: handleNameChange })}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input id="slug" placeholder="agendas" {...register('slug')} />
                {errors.slug && (
                  <p className="text-sm text-red-500">{errors.slug.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : editingId ? (
                    'Guardar cambios'
                  ) : (
                    'Crear categoría'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de categorías</CardTitle>
          <CardDescription>
            {categories?.length ?? 0} categorías en total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!categories ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No hay categorías. Crea la primera.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category._id}>
                    <TableCell>{category.order}</TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-gray-500">{category.slug}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(category._id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### Step 2: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 3: Probar en navegador

Verificar que:
1. La lista de categorías carga correctamente
2. Se puede crear una nueva categoría
3. Se puede editar una categoría existente
4. Se puede eliminar una categoría (si no tiene productos)
5. El slug se auto-genera desde el nombre

### Step 4: Commit

```bash
git add src/routes/admin.categorias.tsx
git commit -m "feat: add categories CRUD page in admin"
```

- [ ] **Task 6 completada**

---

## Task 7: Crear CRUD de colecciones en admin

**Files:**
- Create: `src/routes/admin.colecciones.tsx`

### Step 1: Crear página de colecciones

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Switch } from '~/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { Badge } from '~/components/ui/badge'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const collectionSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  slug: z.string().min(1, 'Slug requerido').regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  description: z.string().optional(),
  isActive: z.boolean(),
})

type CollectionForm = z.infer<typeof collectionSchema>

export const Route = createFileRoute('/admin/colecciones')({
  component: AdminColecciones,
})

function AdminColecciones() {
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<'collections'> | null>(null)

  const collections = useQuery(api.collections.list, {})
  const createCollection = useMutation(api.collections.create)
  const updateCollection = useMutation(api.collections.update)
  const deleteCollection = useMutation(api.collections.remove)
  const toggleActive = useMutation(api.collections.toggleActive)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CollectionForm>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      isActive: true,
    },
  })

  const isActive = watch('isActive')

  const onSubmit = async (data: CollectionForm) => {
    try {
      if (editingId) {
        await updateCollection({
          id: editingId,
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          isActive: data.isActive,
        })
        toast.success('Colección actualizada')
      } else {
        await createCollection({
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          image: null,
          isActive: data.isActive,
        })
        toast.success('Colección creada')
      }

      setIsOpen(false)
      setEditingId(null)
      reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    }
  }

  const handleEdit = (collection: NonNullable<typeof collections>[number]) => {
    setEditingId(collection._id)
    setValue('name', collection.name)
    setValue('slug', collection.slug)
    setValue('description', collection.description ?? '')
    setValue('isActive', collection.isActive)
    setIsOpen(true)
  }

  const handleDelete = async (id: Id<'collections'>) => {
    if (!confirm('¿Eliminar esta colección?')) return

    try {
      await deleteCollection({ id })
      toast.success('Colección eliminada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  const handleToggleActive = async (id: Id<'collections'>) => {
    try {
      await toggleActive({ id })
      toast.success('Estado actualizado')
    } catch (error) {
      toast.error('Error al cambiar estado')
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setEditingId(null)
      reset()
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    if (!editingId) {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setValue('slug', slug)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Colecciones</h1>
          <p className="text-gray-500">
            Agrupa productos para promociones y temporadas
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva colección
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar colección' : 'Nueva colección'}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Modifica los datos de la colección'
                  : 'Crea una nueva colección para agrupar productos'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  placeholder="Ofertas de Verano"
                  {...register('name', { onChange: handleNameChange })}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  placeholder="ofertas-verano"
                  {...register('slug')}
                />
                {errors.slug && (
                  <p className="text-sm text-red-500">{errors.slug.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Productos con descuento para la temporada..."
                  {...register('description')}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setValue('isActive', checked)}
                />
                <Label htmlFor="isActive">Colección activa</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : editingId ? (
                    'Guardar cambios'
                  ) : (
                    'Crear colección'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de colecciones</CardTitle>
          <CardDescription>
            {collections?.length ?? 0} colecciones en total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!collections ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : collections.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No hay colecciones. Crea la primera.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((collection) => (
                  <TableRow key={collection._id}>
                    <TableCell className="font-medium">
                      {collection.name}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {collection.slug}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={collection.isActive ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleToggleActive(collection._id)}
                      >
                        {collection.isActive ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(collection)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(collection._id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### Step 2: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 3: Probar en navegador

Verificar que:
1. La lista de colecciones carga correctamente
2. Se puede crear una nueva colección
3. Se puede editar una colección existente
4. Se puede eliminar una colección
5. Se puede cambiar el estado activo/inactivo

### Step 4: Commit

```bash
git add src/routes/admin.colecciones.tsx
git commit -m "feat: add collections CRUD page in admin"
```

- [ ] **Task 7 completada**

---

## Task 8: Crear lista de productos en admin

**Files:**
- Create: `src/routes/admin.productos.tsx`

### Step 1: Crear página de lista de productos

```typescript
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
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
import { Badge } from '~/components/ui/badge'
import { Plus, Pencil, Trash2, Loader2, Search, Package } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

export const Route = createFileRoute('/admin/productos')({
  component: AdminProductos,
})

function AdminProductos() {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'physical' | 'digital'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const products = useQuery(api.products.list, {
    type: typeFilter === 'all' ? undefined : typeFilter,
    categoryId: categoryFilter === 'all' ? undefined : categoryFilter as Id<'categories'>,
  })
  const categories = useQuery(api.categories.list)
  const deleteProduct = useMutation(api.products.remove)
  const toggleActive = useMutation(api.products.toggleActive)

  const filteredProducts = products?.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (id: Id<'products'>) => {
    if (!confirm('¿Eliminar este producto?')) return

    try {
      await deleteProduct({ id })
      toast.success('Producto eliminado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  const handleToggleActive = async (id: Id<'products'>) => {
    try {
      await toggleActive({ id })
      toast.success('Estado actualizado')
    } catch (error) {
      toast.error('Error al cambiar estado')
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-gray-500">Administra tu catálogo de productos</p>
        </div>

        <Button asChild>
          <Link to="/admin/productos/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo producto
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="physical">Físicos</SelectItem>
                <SelectItem value="digital">Digitales</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat._id} value={cat._id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de productos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de productos</CardTitle>
          <CardDescription>
            {filteredProducts?.length ?? 0} productos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!products ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredProducts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Package className="h-12 w-12 mb-4" />
              <p>No hay productos.</p>
              <Button asChild className="mt-4">
                <Link to="/admin/productos/nuevo">Crear el primero</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts?.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            {product.slug}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {product.type === 'physical' ? 'Físico' : 'Digital'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatPrice(product.basePrice)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={product.isActive ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleToggleActive(product._id)}
                      >
                        {product.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/admin/productos/${product._id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product._id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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
git add src/routes/admin.productos.tsx
git commit -m "feat: add products list page in admin"
```

- [ ] **Task 8 completada**

---

## Task 9: Crear formulario de nuevo/editar producto

**Files:**
- Create: `src/routes/admin.productos.nuevo.tsx`
- Create: `src/routes/admin.productos.$id.tsx`
- Create: `src/components/admin/ProductForm.tsx`

### Step 1: Crear componente de formulario de producto

Contenido de `src/components/admin/ProductForm.tsx`:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Switch } from '~/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'

const productSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  slug: z.string().min(1, 'Slug requerido').regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  description: z.string().min(1, 'Descripción requerida'),
  basePrice: z.number().min(0, 'Precio debe ser positivo'),
  type: z.enum(['physical', 'digital']),
  preparationDays: z.number().nullable(),
  categoryId: z.string().min(1, 'Categoría requerida'),
  isActive: z.boolean(),
})

type ProductForm = z.infer<typeof productSchema>

interface ProductFormProps {
  productId?: Id<'products'>
}

export function ProductForm({ productId }: ProductFormProps) {
  const navigate = useNavigate()
  const categories = useQuery(api.categories.list)
  const collections = useQuery(api.collections.list, {})
  const existingProduct = useQuery(
    api.products.getById,
    productId ? { id: productId } : 'skip'
  )

  const createProduct = useMutation(api.products.create)
  const updateProduct = useMutation(api.products.update)

  const isEditing = !!productId

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      type: 'physical',
      isActive: true,
      preparationDays: null,
    },
    values: existingProduct
      ? {
          name: existingProduct.name,
          slug: existingProduct.slug,
          description: existingProduct.description,
          basePrice: existingProduct.basePrice,
          type: existingProduct.type,
          preparationDays: existingProduct.preparationDays,
          categoryId: existingProduct.categoryId,
          isActive: existingProduct.isActive,
        }
      : undefined,
  })

  const productType = watch('type')
  const isActive = watch('isActive')

  const onSubmit = async (data: ProductForm) => {
    try {
      if (isEditing && productId) {
        await updateProduct({
          id: productId,
          name: data.name,
          slug: data.slug,
          description: data.description,
          basePrice: data.basePrice,
          type: data.type,
          preparationDays: data.preparationDays,
          categoryId: data.categoryId as Id<'categories'>,
          isActive: data.isActive,
        })
        toast.success('Producto actualizado')
      } else {
        await createProduct({
          name: data.name,
          slug: data.slug,
          description: data.description,
          basePrice: data.basePrice,
          type: data.type,
          preparationDays: data.preparationDays,
          categoryId: data.categoryId as Id<'categories'>,
          collectionIds: [],
          images: [],
          isActive: data.isActive,
        })
        toast.success('Producto creado')
      }

      navigate({ to: '/admin/productos' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    if (!isEditing) {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setValue('slug', slug)
    }
  }

  if (isEditing && !existingProduct) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información básica</CardTitle>
          <CardDescription>Datos principales del producto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="Agenda 2026"
                {...register('name', { onChange: handleNameChange })}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input id="slug" placeholder="agenda-2026" {...register('slug')} />
              {errors.slug && (
                <p className="text-sm text-red-500">{errors.slug.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Describe tu producto..."
              rows={4}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="basePrice">Precio (MXN)</Label>
              <Input
                id="basePrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="299.00"
                {...register('basePrice', { valueAsNumber: true })}
              />
              {errors.basePrice && (
                <p className="text-sm text-red-500">{errors.basePrice.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de producto</Label>
              <Select
                value={productType}
                onValueChange={(v) => setValue('type', v as 'physical' | 'digital')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Físico</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoría</Label>
              <Select
                value={watch('categoryId')}
                onValueChange={(v) => setValue('categoryId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <p className="text-sm text-red-500">{errors.categoryId.message}</p>
              )}
            </div>
          </div>

          {productType === 'physical' && (
            <div className="space-y-2">
              <Label htmlFor="preparationDays">
                Días de preparación (opcional)
              </Label>
              <Input
                id="preparationDays"
                type="number"
                min="0"
                placeholder="3"
                {...register('preparationDays', {
                  setValueAs: (v) => (v === '' ? null : Number(v)),
                })}
              />
              <p className="text-sm text-gray-500">
                Para productos hechos a mano
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
            <Label htmlFor="isActive">Producto activo (visible en tienda)</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate({ to: '/admin/productos' })}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : isEditing ? (
            'Guardar cambios'
          ) : (
            'Crear producto'
          )}
        </Button>
      </div>
    </form>
  )
}
```

### Step 2: Crear página de nuevo producto

Contenido de `src/routes/admin.productos.nuevo.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { ProductForm } from '~/components/admin/ProductForm'

export const Route = createFileRoute('/admin/productos/nuevo')({
  component: AdminProductoNuevo,
})

function AdminProductoNuevo() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nuevo producto</h1>
        <p className="text-gray-500">Crea un nuevo producto para tu tienda</p>
      </div>

      <ProductForm />
    </div>
  )
}
```

### Step 3: Crear página de editar producto

Contenido de `src/routes/admin.productos.$id.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { ProductForm } from '~/components/admin/ProductForm'
import type { Id } from '../../../convex/_generated/dataModel'

export const Route = createFileRoute('/admin/productos/$id')({
  component: AdminProductoEditar,
})

function AdminProductoEditar() {
  const { id } = Route.useParams()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Editar producto</h1>
        <p className="text-gray-500">Modifica los datos del producto</p>
      </div>

      <ProductForm productId={id as Id<'products'>} />
    </div>
  )
}
```

### Step 4: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 5: Commit

```bash
git add src/routes/admin.productos.nuevo.tsx src/routes/admin.productos.\$id.tsx src/components/admin/ProductForm.tsx
git commit -m "feat: add product create/edit pages with form"
```

- [ ] **Task 9 completada**

---

## Task 10: Crear página de configuración

**Files:**
- Create: `src/routes/admin.configuracion.tsx`

### Step 1: Crear página de configuración

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
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
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

const settingsSchema = z.object({
  shippingRate: z.number().min(0, 'Debe ser positivo'),
  freeShippingThreshold: z.number().min(0, 'Debe ser positivo'),
  contactEmail: z.string().email('Email inválido'),
})

type SettingsForm = z.infer<typeof settingsSchema>

export const Route = createFileRoute('/admin/configuracion')({
  component: AdminConfiguracion,
})

function AdminConfiguracion() {
  const settings = useQuery(api.storeSettings.get)
  const initializeSettings = useMutation(api.storeSettings.initialize)
  const updateSettings = useMutation(api.storeSettings.update)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
  })

  // Inicializar si no existen
  useEffect(() => {
    if (settings === null) {
      initializeSettings()
    }
  }, [settings, initializeSettings])

  // Cargar valores cuando estén disponibles
  useEffect(() => {
    if (settings) {
      reset({
        shippingRate: settings.shippingRate,
        freeShippingThreshold: settings.freeShippingThreshold,
        contactEmail: settings.contactEmail,
      })
    }
  }, [settings, reset])

  const onSubmit = async (data: SettingsForm) => {
    try {
      await updateSettings(data)
      toast.success('Configuración guardada')
    } catch (error) {
      toast.error('Error al guardar')
    }
  }

  if (settings === undefined) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-gray-500">Ajustes generales de la tienda</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Envío</CardTitle>
            <CardDescription>Configura las tarifas de envío</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shippingRate">Tarifa de envío (MXN)</Label>
                <Input
                  id="shippingRate"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('shippingRate', { valueAsNumber: true })}
                />
                {errors.shippingRate && (
                  <p className="text-sm text-red-500">
                    {errors.shippingRate.message}
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  Costo fijo de envío para productos físicos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="freeShippingThreshold">
                  Envío gratis desde (MXN)
                </Label>
                <Input
                  id="freeShippingThreshold"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('freeShippingThreshold', { valueAsNumber: true })}
                />
                {errors.freeShippingThreshold && (
                  <p className="text-sm text-red-500">
                    {errors.freeShippingThreshold.message}
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  Monto mínimo de compra para envío gratis
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
            <CardDescription>Información de contacto de la tienda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email de contacto</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="contacto@patche.mx"
                {...register('contactEmail')}
              />
              {errors.contactEmail && (
                <p className="text-sm text-red-500">
                  {errors.contactEmail.message}
                </p>
              )}
              <p className="text-sm text-gray-500">
                Email para notificaciones y soporte
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar configuración
              </>
            )}
          </Button>
        </div>
      </form>
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
git add src/routes/admin.configuracion.tsx
git commit -m "feat: add store settings page in admin"
```

- [ ] **Task 10 completada**

---

## Task 11: Crear placeholder para pedidos

**Files:**
- Create: `src/routes/admin.pedidos.tsx`

### Step 1: Crear página placeholder de pedidos

```typescript
import { createFileRoute } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { ShoppingCart } from 'lucide-react'

export const Route = createFileRoute('/admin/pedidos')({
  component: AdminPedidos,
})

function AdminPedidos() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Pedidos</h1>
        <p className="text-gray-500">Gestiona los pedidos de tu tienda</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de pedidos</CardTitle>
          <CardDescription>
            Esta sección se habilitará cuando se implemente el checkout
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <ShoppingCart className="h-12 w-12 mb-4" />
            <p>No hay pedidos aún</p>
            <p className="text-sm mt-2">
              Los pedidos aparecerán aquí cuando los clientes compren en tu tienda
            </p>
          </div>
        </CardContent>
      </Card>
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
git commit -m "feat: add orders placeholder page in admin"
```

- [ ] **Task 11 completada**

---

## Task 12: Validación final y preparación para merge

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
- [ ] Login funciona (`/admin/login`)
- [ ] Dashboard muestra estadísticas
- [ ] CRUD de categorías funciona
- [ ] CRUD de colecciones funciona
- [ ] Lista de productos funciona
- [ ] Crear/editar producto funciona
- [ ] Configuración se guarda correctamente
- [ ] Logout funciona

### Step 4: Push final

```bash
git push origin feat/fase-2-admin-dashboard
```

- [ ] **Task 12 completada**

---

## Checklist Final de Fase 2

- [ ] Branch `feat/fase-2-admin-dashboard` creado
- [ ] Variables de entorno configuradas
- [ ] Autenticación JWT implementada
- [ ] Hook `useAuth` funcionando
- [ ] Página de login implementada
- [ ] Layout de admin con sidebar
- [ ] Dashboard con estadísticas
- [ ] CRUD de categorías completo
- [ ] CRUD de colecciones completo
- [ ] Lista de productos con filtros
- [ ] Formulario de crear/editar producto
- [ ] Página de configuración
- [ ] Placeholder de pedidos
- [ ] Build pasa sin errores
- [ ] Lint pasa sin errores

---

## APROBACIÓN REQUERIDA

**Antes de hacer merge a main:**

1. Verificar que todos los checkboxes están marcados
2. Probar manualmente todas las funcionalidades
3. Ejecutar `pnpm run build` una última vez
4. Solicitar aprobación explícita del usuario

**Comando para merge (solo después de aprobación):**

```bash
git checkout main
git merge feat/fase-2-admin-dashboard
git push origin main
```
