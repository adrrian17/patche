# Fase 01: Instalar Dependencias

> **Prerrequisitos:** Ninguno
> **Resultado:** Todas las librerías necesarias instaladas

---

## Tarea 1.1: Instalar dependencias de pagos (Stripe)

**Paso 1: Instalar paquetes de Stripe**

```bash
pnpm add stripe @stripe/stripe-js
```

**Paso 2: Verificar instalación**

```bash
pnpm list stripe @stripe/stripe-js
```

Esperado: Ambos paquetes listados con versiones

**Paso 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add stripe dependencies"
```

---

## Tarea 1.2: Instalar dependencias de emails (Resend)

**Paso 1: Instalar Resend**

```bash
pnpm add resend
```

**Paso 2: Verificar instalación**

```bash
pnpm list resend
```

**Paso 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add resend for transactional emails"
```

---

## Tarea 1.3: Instalar dependencias de formularios

**Paso 1: Instalar react-hook-form y zod**

```bash
pnpm add react-hook-form zod @hookform/resolvers
```

**Paso 2: Verificar instalación**

```bash
pnpm list react-hook-form zod @hookform/resolvers
```

**Paso 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add form validation dependencies"
```

---

## Tarea 1.4: Instalar jose para JWT

**Paso 1: Instalar jose**

```bash
pnpm add jose
```

**Paso 2: Verificar instalación**

```bash
pnpm list jose
```

**Paso 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add jose for JWT handling"
```

---

## Tarea 1.5: Instalar lucide-react para iconos

**Paso 1: Instalar lucide-react**

```bash
pnpm add lucide-react
```

**Paso 2: Verificar instalación**

```bash
pnpm list lucide-react
```

**Paso 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add lucide-react icons"
```

---

## Tarea 1.6: Crear archivo de variables de entorno

**Paso 1: Crear archivo .env.example**

Crear: `/.env.example`

```env
# Convex
CONVEX_DEPLOYMENT=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Resend
RESEND_API_KEY=

# Admin JWT
JWT_SECRET=
```

**Paso 2: Actualizar .env.local con placeholders**

Editar: `/.env.local` - Agregar al final:

```env
# Stripe (obtener de https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Resend (obtener de https://resend.com/api-keys)
RESEND_API_KEY=re_xxx

# Admin JWT (generar con: openssl rand -base64 32)
JWT_SECRET=tu-secreto-jwt-aqui
```

**Paso 3: Commit solo .env.example**

```bash
git add .env.example
git commit -m "chore: add environment variables template"
```

---

## Verificación Final de Fase 01

**Ejecutar para verificar todas las dependencias:**

```bash
pnpm list stripe @stripe/stripe-js resend react-hook-form zod @hookform/resolvers jose lucide-react
```

**Verificar que el proyecto compila:**

```bash
pnpm run build
```

Esperado: Build exitoso sin errores

---

**Siguiente fase:** `fase-02-shadcn-setup.md`
