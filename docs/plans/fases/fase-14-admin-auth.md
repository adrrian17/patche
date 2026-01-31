# Fase 14: Autenticación Admin con JWT

> **Prerrequisitos:** Fase 13 completada
> **Resultado:** Sistema de autenticación para el panel de administración

---

## Tarea 14.1: Crear archivo de funciones de admin

**Archivo:** `convex/admin.ts`

**Paso 1: Crear archivo con imports**

```typescript
'use node'

import { v } from 'convex/values'
import { action, internalMutation, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
```

**Paso 2: Commit**

```bash
git add convex/admin.ts
git commit -m "feat(convex): create admin auth functions file"
```

---

## Tarea 14.2: Agregar función para hash de contraseña

**Archivo:** `convex/admin.ts`

**Paso 1: Agregar función de hashing**

```typescript
// Función simple de hash (para producción usar bcrypt)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}
```

**Paso 2: Commit**

```bash
git add convex/admin.ts
git commit -m "feat(convex): add password hashing utilities"
```

---

## Tarea 14.3: Agregar queries internas

**Archivo:** `convex/admin.ts`

**Paso 1: Agregar query para obtener admin por username**

```typescript
export const getAdminByUsername = internalQuery({
  args: { username: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('adminUser'),
      _creationTime: v.number(),
      username: v.string(),
      passwordHash: v.string(),
      lastLoginAt: v.union(v.number(), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('adminUser')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .unique()
  },
})
```

**Paso 2: Commit**

```bash
git add convex/admin.ts
git commit -m "feat(convex): add admin.getAdminByUsername internal query"
```

---

## Tarea 14.4: Agregar mutation para actualizar último login

**Archivo:** `convex/admin.ts`

**Paso 1: Agregar mutation updateLastLogin**

```typescript
export const updateLastLogin = internalMutation({
  args: { id: v.id('adminUser') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { lastLoginAt: Date.now() })
    return null
  },
})
```

**Paso 2: Commit**

```bash
git add convex/admin.ts
git commit -m "feat(convex): add admin.updateLastLogin internal mutation"
```

---

## Tarea 14.5: Agregar action de login

**Archivo:** `convex/admin.ts`

**Paso 1: Agregar action login**

```typescript
export const login = action({
  args: {
    username: v.string(),
    password: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      adminId: v.string(),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const admin = await ctx.runQuery(internal.admin.getAdminByUsername, {
      username: args.username,
    })

    if (!admin) {
      return { success: false as const, error: 'Invalid credentials' }
    }

    const isValid = await verifyPassword(args.password, admin.passwordHash)
    if (!isValid) {
      return { success: false as const, error: 'Invalid credentials' }
    }

    // Actualizar último login
    await ctx.runMutation(internal.admin.updateLastLogin, { id: admin._id })

    return { success: true as const, adminId: admin._id }
  },
})
```

**Paso 2: Commit**

```bash
git add convex/admin.ts
git commit -m "feat(convex): add admin.login action"
```

---

## Tarea 14.6: Agregar mutation para crear admin inicial

**Archivo:** `convex/admin.ts`

**Paso 1: Agregar mutation createInitialAdmin**

```typescript
export const createInitialAdmin = action({
  args: {
    username: v.string(),
    password: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      adminId: v.string(),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    // Verificar que no existan admins
    const existingAdmin = await ctx.runQuery(internal.admin.getAdminByUsername, {
      username: args.username,
    })

    if (existingAdmin) {
      return { success: false as const, error: 'Admin already exists' }
    }

    const passwordHash = await hashPassword(args.password)

    const adminId = await ctx.runMutation(internal.admin.insertAdmin, {
      username: args.username,
      passwordHash,
    })

    return { success: true as const, adminId }
  },
})

export const insertAdmin = internalMutation({
  args: {
    username: v.string(),
    passwordHash: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('adminUser', {
      username: args.username,
      passwordHash: args.passwordHash,
      lastLoginAt: null,
    })
    return id
  },
})
```

**Paso 2: Commit**

```bash
git add convex/admin.ts
git commit -m "feat(convex): add admin.createInitialAdmin action"
```

---

## Tarea 14.7: Crear utilidades JWT en el frontend

**Archivo:** `src/lib/auth.ts`

**Paso 1: Crear archivo de utilidades de auth**

```typescript
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-change-in-production'
)

export interface AdminPayload {
  adminId: string
  username: string
}

export async function createAdminToken(payload: AdminPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function verifyAdminToken(
  token: string
): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as AdminPayload
  } catch {
    return null
  }
}

// Cookie helpers
export const ADMIN_TOKEN_COOKIE = 'admin_token'

export function getAdminTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(^| )${ADMIN_TOKEN_COOKIE}=([^;]+)`)
  )
  return match ? match[2] : null
}

export function setAdminTokenCookie(token: string): void {
  const expires = new Date()
  expires.setDate(expires.getDate() + 7)
  document.cookie = `${ADMIN_TOKEN_COOKIE}=${token}; expires=${expires.toUTCString()}; path=/admin; SameSite=Strict`
}

export function removeAdminTokenCookie(): void {
  document.cookie = `${ADMIN_TOKEN_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/admin`
}
```

**Paso 2: Crear directorio si no existe**

```bash
mkdir -p src/lib
```

**Paso 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: add JWT auth utilities for admin"
```

---

## Tarea 14.8: Crear hook useAdmin

**Archivo:** `src/hooks/useAdmin.ts`

**Paso 1: Crear el hook**

```typescript
import { useState, useEffect, useCallback } from 'react'
import {
  verifyAdminToken,
  getAdminTokenFromCookie,
  removeAdminTokenCookie,
  type AdminPayload,
} from '~/lib/auth'

interface UseAdminResult {
  admin: AdminPayload | null
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => void
}

export function useAdmin(): UseAdminResult {
  const [admin, setAdmin] = useState<AdminPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const token = getAdminTokenFromCookie()
      if (!token) {
        setIsLoading(false)
        return
      }

      const payload = await verifyAdminToken(token)
      setAdmin(payload)
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const logout = useCallback(() => {
    removeAdminTokenCookie()
    setAdmin(null)
  }, [])

  return {
    admin,
    isLoading,
    isAuthenticated: !!admin,
    logout,
  }
}
```

**Paso 2: Commit**

```bash
git add src/hooks/useAdmin.ts
git commit -m "feat: add useAdmin hook for admin authentication state"
```

---

## Verificación Final de Fase 14

```bash
pnpm run build
```

Esperado: Build exitoso sin errores

---

**Siguiente fase:** `fase-15-admin-layout.md`
