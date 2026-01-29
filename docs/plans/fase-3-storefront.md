# Fase 3: Storefront - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar la tienda pública con catálogo de productos, búsqueda, filtros, páginas de detalle y carrito de compras.

**Architecture:** SSR con TanStack Start para SEO. Carrito en localStorage. Componentes reutilizables para cards de productos. Navegación por categorías y colecciones.

**Tech Stack:** TanStack Router, TanStack Query + Convex, Tailwind CSS, shadcn/ui, localStorage

**Branch:** `feat/fase-3-storefront`

**Prerequisito:** Fase 2 completada y mergeada a main

---

## Pre-requisitos

- [ ] Fase 2 completada y mergeada a main
- [ ] Al menos 1 categoría creada en admin
- [ ] Al menos 2-3 productos creados en admin
- [ ] `pnpm run dev` funciona correctamente

---

## Instrucciones Generales para el Agente

### Antes de cada tarea:
1. Asegúrate de estar en el branch correcto: `git checkout feat/fase-3-storefront`
2. Pull cambios recientes: `git pull origin feat/fase-3-storefront`

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

## Task 1: Crear branch y estructura base

**Files:**
- Create: `src/components/store/Header.tsx`
- Create: `src/components/store/Footer.tsx`
- Modify: `src/routes/__root.tsx` (si necesario)

### Step 1: Crear branch desde main

```bash
git checkout main
git pull origin main
git checkout -b feat/fase-3-storefront
```

### Step 2: Crear componente Header

Contenido de `src/components/store/Header.tsx`:

```typescript
import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { ShoppingCart, Menu, Search, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useState } from 'react'
import { cn } from '~/lib/utils'
import { useCart } from '~/hooks/useCart'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const categories = useQuery(api.categories.list)
  const { itemCount } = useCart()

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold">
            Patche
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/productos"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Todos los productos
            </Link>
            {categories?.map((category) => (
              <Link
                key={category._id}
                to={`/categoria/${category.slug}`}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/productos">
                <Search className="h-5 w-5" />
              </Link>
            </Button>

            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link to="/carrito">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-black text-white text-xs flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-200',
            mobileMenuOpen ? 'max-h-96 pb-4' : 'max-h-0'
          )}
        >
          <nav className="flex flex-col gap-2">
            <Link
              to="/productos"
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              Todos los productos
            </Link>
            {categories?.map((category) => (
              <Link
                key={category._id}
                to={`/categoria/${category.slug}`}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
```

### Step 3: Crear componente Footer

Contenido de `src/components/store/Footer.tsx`:

```typescript
import { Link } from '@tanstack/react-router'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Patche</h3>
            <p className="text-sm text-gray-400">
              Productos de oficina únicos y plantillas digitales para organizar
              tu vida.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="font-medium">Tienda</h4>
            <nav className="flex flex-col gap-2 text-sm text-gray-400">
              <Link to="/productos" className="hover:text-white transition-colors">
                Todos los productos
              </Link>
              <Link to="/categoria/agendas" className="hover:text-white transition-colors">
                Agendas
              </Link>
              <Link to="/categoria/libretas" className="hover:text-white transition-colors">
                Libretas
              </Link>
            </nav>
          </div>

          {/* Help */}
          <div className="space-y-4">
            <h4 className="font-medium">Ayuda</h4>
            <nav className="flex flex-col gap-2 text-sm text-gray-400">
              <span className="hover:text-white transition-colors cursor-pointer">
                Envíos
              </span>
              <span className="hover:text-white transition-colors cursor-pointer">
                Devoluciones
              </span>
              <span className="hover:text-white transition-colors cursor-pointer">
                Contacto
              </span>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-medium">Contacto</h4>
            <div className="text-sm text-gray-400 space-y-2">
              <p>contacto@patche.mx</p>
              <p>Ciudad de México, México</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Patche. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
```

### Step 4: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 5: Commit

```bash
git add src/components/store/Header.tsx src/components/store/Footer.tsx
git commit -m "feat: add store header and footer components"
```

- [ ] **Task 1 completada**

---

## Task 2: Crear hook de carrito con localStorage

**Files:**
- Create: `src/hooks/useCart.ts`
- Create: `src/lib/cart.ts`

### Step 1: Crear tipos y utilidades del carrito

Contenido de `src/lib/cart.ts`:

```typescript
import type { Id } from '../../convex/_generated/dataModel'

export interface CartItem {
  productId: Id<'products'>
  variantId: Id<'variants'> | null
  name: string
  variantName: string | null
  price: number
  quantity: number
  type: 'physical' | 'digital'
  image: string | null
}

export interface Cart {
  items: CartItem[]
  updatedAt: number
}

const CART_KEY = 'patche_cart'

export function getCart(): Cart {
  if (typeof window === 'undefined') {
    return { items: [], updatedAt: Date.now() }
  }

  try {
    const stored = localStorage.getItem(CART_KEY)
    if (!stored) {
      return { items: [], updatedAt: Date.now() }
    }
    return JSON.parse(stored)
  } catch {
    return { items: [], updatedAt: Date.now() }
  }
}

export function saveCart(cart: Cart): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
}

export function clearCart(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CART_KEY)
}

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity: number = 1): Cart {
  const cart = getCart()

  // Buscar si ya existe el item (mismo producto y variante)
  const existingIndex = cart.items.findIndex(
    (i) => i.productId === item.productId && i.variantId === item.variantId
  )

  if (existingIndex >= 0) {
    // Incrementar cantidad
    cart.items[existingIndex].quantity += quantity
  } else {
    // Agregar nuevo item
    cart.items.push({ ...item, quantity })
  }

  cart.updatedAt = Date.now()
  saveCart(cart)
  return cart
}

export function updateCartItemQuantity(
  productId: Id<'products'>,
  variantId: Id<'variants'> | null,
  quantity: number
): Cart {
  const cart = getCart()

  const index = cart.items.findIndex(
    (i) => i.productId === productId && i.variantId === variantId
  )

  if (index >= 0) {
    if (quantity <= 0) {
      // Eliminar item
      cart.items.splice(index, 1)
    } else {
      // Actualizar cantidad
      cart.items[index].quantity = quantity
    }
  }

  cart.updatedAt = Date.now()
  saveCart(cart)
  return cart
}

export function removeFromCart(
  productId: Id<'products'>,
  variantId: Id<'variants'> | null
): Cart {
  return updateCartItemQuantity(productId, variantId, 0)
}

export function getCartTotals(cart: Cart) {
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  const hasPhysical = cart.items.some((item) => item.type === 'physical')
  const hasDigital = cart.items.some((item) => item.type === 'digital')

  return {
    subtotal,
    itemCount,
    hasPhysical,
    hasDigital,
  }
}
```

### Step 2: Crear hook useCart

Contenido de `src/hooks/useCart.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import {
  getCart,
  addToCart as addToCartUtil,
  updateCartItemQuantity as updateQuantityUtil,
  removeFromCart as removeFromCartUtil,
  clearCart as clearCartUtil,
  getCartTotals,
  type Cart,
  type CartItem,
} from '~/lib/cart'

export function useCart() {
  const [cart, setCart] = useState<Cart>({ items: [], updatedAt: 0 })

  // Cargar carrito del localStorage al montar
  useEffect(() => {
    setCart(getCart())
  }, [])

  // Escuchar cambios en otras pestañas
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'patche_cart') {
        setCart(getCart())
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const addToCart = useCallback(
    (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
      const newCart = addToCartUtil(item, quantity)
      setCart(newCart)
    },
    []
  )

  const updateQuantity = useCallback(
    (
      productId: Id<'products'>,
      variantId: Id<'variants'> | null,
      quantity: number
    ) => {
      const newCart = updateQuantityUtil(productId, variantId, quantity)
      setCart(newCart)
    },
    []
  )

  const removeItem = useCallback(
    (productId: Id<'products'>, variantId: Id<'variants'> | null) => {
      const newCart = removeFromCartUtil(productId, variantId)
      setCart(newCart)
    },
    []
  )

  const clearCart = useCallback(() => {
    clearCartUtil()
    setCart({ items: [], updatedAt: Date.now() })
  }, [])

  const totals = getCartTotals(cart)

  return {
    items: cart.items,
    itemCount: totals.itemCount,
    subtotal: totals.subtotal,
    hasPhysical: totals.hasPhysical,
    hasDigital: totals.hasDigital,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
  }
}
```

### Step 3: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 4: Commit

```bash
git add src/lib/cart.ts src/hooks/useCart.ts
git commit -m "feat: add cart hook with localStorage persistence"
```

- [ ] **Task 2 completada**

---

## Task 3: Crear componente ProductCard

**Files:**
- Create: `src/components/store/ProductCard.tsx`

### Step 1: Crear componente de tarjeta de producto

```typescript
import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Badge } from '~/components/ui/badge'
import { Package } from 'lucide-react'

interface ProductCardProps {
  product: {
    _id: Id<'products'>
    name: string
    slug: string
    basePrice: number
    type: 'physical' | 'digital'
    images: string[]
    preparationDays: number | null
  }
}

export function ProductCard({ product }: ProductCardProps) {
  // Obtener URL de la primera imagen
  const imageUrl = useQuery(
    api.storage.getUrl,
    product.images[0] ? { storageId: product.images[0] } : 'skip'
  )

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price)
  }

  return (
    <Link
      to={`/producto/${product.slug}`}
      className="group block"
    >
      <div className="overflow-hidden rounded-lg bg-gray-100 aspect-square">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Package className="h-12 w-12 text-gray-300" />
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-gray-900 group-hover:underline">
            {product.name}
          </h3>
          {product.type === 'digital' && (
            <Badge variant="secondary" className="text-xs">
              Digital
            </Badge>
          )}
        </div>

        <p className="text-lg font-semibold">{formatPrice(product.basePrice)}</p>

        {product.preparationDays && product.preparationDays > 0 && (
          <p className="text-sm text-gray-500">
            Preparación: {product.preparationDays} días
          </p>
        )}
      </div>
    </Link>
  )
}
```

### Step 2: Ejecutar lint

```bash
pnpm run lint:fix
```

### Step 3: Commit

```bash
git add src/components/store/ProductCard.tsx
git commit -m "feat: add ProductCard component"
```

- [ ] **Task 3 completada**

---

## Task 4: Crear página de inicio (Home)

**Files:**
- Modify: `src/routes/index.tsx`

### Step 1: Actualizar página de inicio

```typescript
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Header } from '~/components/store/Header'
import { Footer } from '~/components/store/Footer'
import { ProductCard } from '~/components/store/ProductCard'
import { Button } from '~/components/ui/button'
import { ArrowRight, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const categories = useQuery(api.categories.list)
  const featuredProducts = useQuery(api.products.list, {
    activeOnly: true,
    limit: 8,
  })
  const activeCollections = useQuery(api.collections.list, { activeOnly: true })

  const featuredCollection = activeCollections?.[0]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gray-50 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Organiza tu vida con estilo
              </h1>
              <p className="mt-4 text-lg text-gray-600">
                Descubre nuestra colección de productos de oficina únicos y
                plantillas digitales diseñadas para inspirarte.
              </p>
              <div className="mt-8 flex gap-4">
                <Button size="lg" asChild>
                  <Link to="/productos">Ver productos</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/productos?type=digital">Plantillas digitales</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Collection */}
        {featuredCollection && (
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold">{featuredCollection.name}</h2>
                  {featuredCollection.description && (
                    <p className="mt-1 text-gray-600">
                      {featuredCollection.description}
                    </p>
                  )}
                </div>
                <Button variant="ghost" asChild>
                  <Link to={`/coleccion/${featuredCollection.slug}`}>
                    Ver todo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Categories */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-8">Categorías</h2>

            {!categories ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {categories.map((category) => (
                  <Link
                    key={category._id}
                    to={`/categoria/${category.slug}`}
                    className="group relative overflow-hidden rounded-lg bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <h3 className="text-lg font-semibold group-hover:underline">
                      {category.name}
                    </h3>
                    <ArrowRight className="mt-2 h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Productos destacados</h2>
              <Button variant="ghost" asChild>
                <Link to="/productos">
                  Ver todo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {!featuredProducts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : featuredProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No hay productos disponibles aún
              </p>
            ) : (
              <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {featuredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-black text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold">¿Buscas algo específico?</h2>
            <p className="mt-4 text-gray-300 max-w-xl mx-auto">
              Explora nuestro catálogo completo con filtros de búsqueda para
              encontrar exactamente lo que necesitas.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-8"
              asChild
            >
              <Link to="/productos">Explorar catálogo</Link>
            </Button>
          </div>
        </section>
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

### Step 3: Probar en navegador

Verificar que la página de inicio carga correctamente con categorías y productos.

### Step 4: Commit

```bash
git add src/routes/index.tsx
git commit -m "feat: update home page with hero, categories, and products"
```

- [ ] **Task 4 completada**

---

## Task 5: Crear página de catálogo de productos

**Files:**
- Create: `src/routes/productos.tsx`

### Step 1: Crear página de catálogo

```typescript
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Header } from '~/components/store/Header'
import { Footer } from '~/components/store/Footer'
import { ProductCard } from '~/components/store/ProductCard'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Badge } from '~/components/ui/badge'
import { Search, X, Loader2, SlidersHorizontal } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet'

interface SearchParams {
  q?: string
  type?: 'physical' | 'digital'
  category?: string
}

export const Route = createFileRoute('/productos')({
  component: ProductosPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      q: typeof search.q === 'string' ? search.q : undefined,
      type:
        search.type === 'physical' || search.type === 'digital'
          ? search.type
          : undefined,
      category: typeof search.category === 'string' ? search.category : undefined,
    }
  },
})

function ProductosPage() {
  const searchParams = useSearch({ from: '/productos' })
  const [searchTerm, setSearchTerm] = useState(searchParams.q || '')
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.type || 'all')
  const [categoryFilter, setCategoryFilter] = useState<string>(
    searchParams.category || 'all'
  )

  const categories = useQuery(api.categories.list)

  // Usar búsqueda si hay término, sino listar
  const searchResults = useQuery(
    api.products.search,
    searchTerm ? { searchTerm, activeOnly: true } : 'skip'
  )

  const listResults = useQuery(
    api.products.list,
    !searchTerm
      ? {
          activeOnly: true,
          type: typeFilter !== 'all' ? (typeFilter as 'physical' | 'digital') : undefined,
          categoryId:
            categoryFilter !== 'all'
              ? (categoryFilter as Id<'categories'>)
              : undefined,
        }
      : 'skip'
  )

  const products = searchTerm ? searchResults : listResults

  // Filtrar resultados de búsqueda por tipo y categoría
  const filteredProducts = products?.filter((p) => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false
    if (categoryFilter !== 'all' && p.categoryId !== categoryFilter) return false
    return true
  })

  const activeFiltersCount = [
    typeFilter !== 'all',
    categoryFilter !== 'all',
  ].filter(Boolean).length

  const clearFilters = () => {
    setTypeFilter('all')
    setCategoryFilter('all')
  }

  const FilterControls = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Tipo de producto</label>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="physical">Físicos</SelectItem>
            <SelectItem value="digital">Digitales</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Categoría</label>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat._id} value={cat._id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
          <X className="mr-2 h-4 w-4" />
          Limpiar filtros
        </Button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Productos</h1>
            <p className="mt-1 text-gray-600">
              Explora nuestra colección de productos de oficina y plantillas
            </p>
          </div>

          {/* Search and filters bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Desktop filters */}
            <div className="hidden md:flex gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="physical">Físicos</SelectItem>
                  <SelectItem value="digital">Digitales</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mobile filters */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterControls />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active filters */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {typeFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {typeFilter === 'physical' ? 'Físicos' : 'Digitales'}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setTypeFilter('all')}
                  />
                </Badge>
              )}
              {categoryFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {categories?.find((c) => c._id === categoryFilter)?.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setCategoryFilter('all')}
                  />
                </Badge>
              )}
            </div>
          )}

          {/* Results */}
          {!products ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredProducts?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron productos</p>
              {(searchTerm || activeFiltersCount > 0) && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchTerm('')
                    clearFilters()
                  }}
                >
                  Limpiar búsqueda y filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                {filteredProducts?.length} producto
                {filteredProducts?.length !== 1 ? 's' : ''} encontrado
                {filteredProducts?.length !== 1 ? 's' : ''}
              </p>

              <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredProducts?.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            </>
          )}
        </div>
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

### Step 3: Probar en navegador

Verificar:
- Búsqueda funciona
- Filtros funcionan
- Productos se muestran correctamente

### Step 4: Commit

```bash
git add src/routes/productos.tsx
git commit -m "feat: add products catalog page with search and filters"
```

- [ ] **Task 5 completada**

---

## Task 6: Crear página de detalle de producto

**Files:**
- Create: `src/routes/producto.$slug.tsx`

### Step 1: Crear página de detalle

```typescript
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Header } from '~/components/store/Header'
import { Footer } from '~/components/store/Footer'
import { useCart } from '~/hooks/useCart'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Loader2, Minus, Plus, ShoppingCart, Package, Clock, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '~/lib/utils'

export const Route = createFileRoute('/producto/$slug')({
  component: ProductoDetailPage,
})

function ProductoDetailPage() {
  const { slug } = Route.useParams()
  const [quantity, setQuantity] = useState(1)
  const [selectedVariantId, setSelectedVariantId] = useState<Id<'variants'> | null>(
    null
  )

  const { addToCart } = useCart()

  const product = useQuery(api.products.getBySlug, { slug })
  const variants = useQuery(
    api.variants.listByProduct,
    product ? { productId: product._id } : 'skip'
  )
  const imageUrls = useQuery(
    api.storage.getUrls,
    product?.images.length ? { storageIds: product.images } : 'skip'
  )

  // Auto-seleccionar primera variante si hay
  const selectedVariant = variants?.find((v) => v._id === selectedVariantId)
  const hasVariants = variants && variants.length > 0

  // Si tiene variantes pero no hay seleccionada, seleccionar la primera
  if (hasVariants && !selectedVariantId && variants[0]) {
    setSelectedVariantId(variants[0]._id)
  }

  const currentPrice = selectedVariant?.price ?? product?.basePrice ?? 0
  const currentStock = selectedVariant?.stock ?? 999
  const isInStock = currentStock > 0

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price)
  }

  const handleAddToCart = () => {
    if (!product) return

    if (hasVariants && !selectedVariantId) {
      toast.error('Selecciona una variante')
      return
    }

    addToCart(
      {
        productId: product._id,
        variantId: selectedVariantId,
        name: product.name,
        variantName: selectedVariant?.name ?? null,
        price: currentPrice,
        type: product.type,
        image: product.images[0] ?? null,
      },
      quantity
    )

    toast.success('Agregado al carrito')
    setQuantity(1)
  }

  if (product === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (product === null) {
    throw notFound()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 mb-6">
            <Link to="/" className="hover:text-gray-900">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <Link to="/productos" className="hover:text-gray-900">
              Productos
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{product.name}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Images */}
            <div className="space-y-4">
              <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                {imageUrls?.[0] ? (
                  <img
                    src={imageUrls[0]}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="h-24 w-24 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {imageUrls && imageUrls.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {imageUrls.slice(1, 5).map(
                    (url, i) =>
                      url && (
                        <div
                          key={i}
                          className="aspect-square overflow-hidden rounded-lg bg-gray-100"
                        >
                          <img
                            src={url}
                            alt={`${product.name} ${i + 2}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )
                  )}
                </div>
              )}
            </div>

            {/* Product info */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {product.type === 'digital' && (
                    <Badge variant="secondary">Digital</Badge>
                  )}
                  {!isInStock && <Badge variant="destructive">Agotado</Badge>}
                </div>

                <h1 className="text-3xl font-bold">{product.name}</h1>
                <p className="mt-2 text-2xl font-semibold">
                  {formatPrice(currentPrice)}
                </p>
              </div>

              {/* Preparation time */}
              {product.preparationDays && product.preparationDays > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    Tiempo de preparación: {product.preparationDays} días
                  </span>
                </div>
              )}

              {/* Description */}
              <div className="prose prose-sm">
                <p className="text-gray-600">{product.description}</p>
              </div>

              {/* Variants */}
              {hasVariants && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Variante</label>
                  <Select
                    value={selectedVariantId ?? undefined}
                    onValueChange={(v) => setSelectedVariantId(v as Id<'variants'>)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((variant) => (
                        <SelectItem
                          key={variant._id}
                          value={variant._id}
                          disabled={variant.stock === 0}
                        >
                          <span className="flex items-center gap-2">
                            {variant.name}
                            {variant.price && variant.price !== product.basePrice && (
                              <span className="text-gray-500">
                                ({formatPrice(variant.price)})
                              </span>
                            )}
                            {variant.stock === 0 && (
                              <span className="text-red-500">(Agotado)</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock < 5 && (
                    <p className="text-sm text-orange-600">
                      Solo quedan {selectedVariant.stock} unidades
                    </p>
                  )}
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Cantidad</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setQuantity(Math.min(currentStock, quantity + 1))
                    }
                    disabled={quantity >= currentStock}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Add to cart */}
              <Button
                size="lg"
                className="w-full"
                onClick={handleAddToCart}
                disabled={!isInStock || (hasVariants && !selectedVariantId)}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {isInStock ? 'Agregar al carrito' : 'Agotado'}
              </Button>

              {/* Features */}
              <div className="border-t pt-6 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500" />
                  {product.type === 'digital'
                    ? 'Descarga inmediata después del pago'
                    : 'Envío a todo México'}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500" />
                  Pago seguro con tarjeta o en OXXO
                </div>
              </div>
            </div>
          </div>
        </div>
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

### Step 3: Probar en navegador

Verificar:
- Detalle del producto se muestra
- Selector de variantes funciona
- Agregar al carrito funciona

### Step 4: Commit

```bash
git add src/routes/producto.\$slug.tsx
git commit -m "feat: add product detail page with variants and add to cart"
```

- [ ] **Task 6 completada**

---

## Task 7: Crear página de categoría

**Files:**
- Create: `src/routes/categoria.$slug.tsx`

### Step 1: Crear página de categoría

```typescript
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Header } from '~/components/store/Header'
import { Footer } from '~/components/store/Footer'
import { ProductCard } from '~/components/store/ProductCard'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/categoria/$slug')({
  component: CategoriaPage,
})

function CategoriaPage() {
  const { slug } = Route.useParams()

  const category = useQuery(api.categories.getBySlug, { slug })
  const products = useQuery(
    api.products.list,
    category ? { categoryId: category._id, activeOnly: true } : 'skip'
  )

  if (category === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (category === null) {
    throw notFound()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{category.name}</h1>
            <p className="mt-1 text-gray-600">
              {products?.length ?? 0} producto
              {products?.length !== 1 ? 's' : ''} en esta categoría
            </p>
          </div>

          {/* Products */}
          {!products ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-gray-500 py-12">
              No hay productos en esta categoría aún
            </p>
          ) : (
            <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
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
git add src/routes/categoria.\$slug.tsx
git commit -m "feat: add category page"
```

- [ ] **Task 7 completada**

---

## Task 8: Crear página de colección

**Files:**
- Create: `src/routes/coleccion.$slug.tsx`

### Step 1: Crear página de colección

```typescript
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Header } from '~/components/store/Header'
import { Footer } from '~/components/store/Footer'
import { ProductCard } from '~/components/store/ProductCard'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/coleccion/$slug')({
  component: ColeccionPage,
})

function ColeccionPage() {
  const { slug } = Route.useParams()

  const collection = useQuery(api.collections.getBySlug, { slug })
  const products = useQuery(
    api.products.getByCollection,
    collection ? { collectionId: collection._id, activeOnly: true } : 'skip'
  )

  if (collection === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (collection === null || !collection.isActive) {
    throw notFound()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{collection.name}</h1>
            {collection.description && (
              <p className="mt-2 text-gray-600">{collection.description}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {products?.length ?? 0} producto
              {products?.length !== 1 ? 's' : ''} en esta colección
            </p>
          </div>

          {/* Products */}
          {!products ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-gray-500 py-12">
              No hay productos en esta colección aún
            </p>
          ) : (
            <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
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
git add src/routes/coleccion.\$slug.tsx
git commit -m "feat: add collection page"
```

- [ ] **Task 8 completada**

---

## Task 9: Crear página de carrito

**Files:**
- Create: `src/routes/carrito.tsx`

### Step 1: Crear página de carrito

```typescript
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Header } from '~/components/store/Header'
import { Footer } from '~/components/store/Footer'
import { useCart } from '~/hooks/useCart'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Separator } from '~/components/ui/separator'
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, Package } from 'lucide-react'

export const Route = createFileRoute('/carrito')({
  component: CarritoPage,
})

function CarritoPage() {
  const { items, subtotal, hasPhysical, updateQuantity, removeItem, clearCart } =
    useCart()

  const settings = useQuery(api.storeSettings.get)

  const shippingCost =
    hasPhysical && settings
      ? subtotal >= settings.freeShippingThreshold
        ? 0
        : settings.shippingRate
      : 0

  const total = subtotal + shippingCost

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Carrito de compras</h1>

          {items.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-medium mb-2">Tu carrito está vacío</h2>
              <p className="text-gray-500 mb-6">
                Agrega productos para comenzar tu compra
              </p>
              <Button asChild>
                <Link to="/productos">Ver productos</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Cart items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <CartItem
                    key={`${item.productId}-${item.variantId}`}
                    item={item}
                    onUpdateQuantity={(qty) =>
                      updateQuantity(item.productId, item.variantId, qty)
                    }
                    onRemove={() => removeItem(item.productId, item.variantId)}
                  />
                ))}

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Vaciar carrito
                  </Button>
                </div>
              </div>

              {/* Order summary */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 rounded-lg p-6 sticky top-24">
                  <h2 className="text-lg font-semibold mb-4">Resumen del pedido</h2>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>

                    {hasPhysical && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Envío</span>
                        <span>
                          {shippingCost === 0 ? (
                            <span className="text-green-600">Gratis</span>
                          ) : (
                            formatPrice(shippingCost)
                          )}
                        </span>
                      </div>
                    )}

                    {hasPhysical &&
                      settings &&
                      subtotal < settings.freeShippingThreshold && (
                        <p className="text-xs text-gray-500">
                          Agrega {formatPrice(settings.freeShippingThreshold - subtotal)}{' '}
                          más para envío gratis
                        </p>
                      )}

                    <Separator />

                    <div className="flex justify-between font-semibold text-base">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>

                  <Button className="w-full mt-6" size="lg" asChild>
                    <Link to="/checkout">
                      Continuar al checkout
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    Pago seguro con tarjeta o en OXXO
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

// Cart item component
interface CartItemProps {
  item: {
    productId: string
    variantId: string | null
    name: string
    variantName: string | null
    price: number
    quantity: number
    type: 'physical' | 'digital'
    image: string | null
  }
  onUpdateQuantity: (quantity: number) => void
  onRemove: () => void
}

function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const imageUrl = useQuery(
    api.storage.getUrl,
    item.image ? { storageId: item.image } : 'skip'
  )

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price)
  }

  return (
    <div className="flex gap-4 p-4 bg-white border rounded-lg">
      {/* Image */}
      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Package className="h-8 w-8 text-gray-300" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between">
          <div>
            <h3 className="font-medium">{item.name}</h3>
            {item.variantName && (
              <p className="text-sm text-gray-500">{item.variantName}</p>
            )}
            {item.type === 'digital' && (
              <span className="text-xs text-gray-500">Producto digital</span>
            )}
          </div>
          <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>
        </div>

        <div className="mt-3 flex items-center justify-between">
          {/* Quantity controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onUpdateQuantity(item.quantity - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center text-sm">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onUpdateQuantity(item.quantity + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* Remove button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
- Items se muestran correctamente
- Cambiar cantidad funciona
- Eliminar items funciona
- Totales se calculan correctamente
- Envío gratis se aplica al superar umbral

### Step 4: Commit

```bash
git add src/routes/carrito.tsx
git commit -m "feat: add shopping cart page"
```

- [ ] **Task 9 completada**

---

## Task 10: Validación final y preparación para merge

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
- [ ] Página de inicio carga correctamente
- [ ] Header muestra categorías y carrito
- [ ] Catálogo de productos con búsqueda y filtros
- [ ] Página de detalle de producto
- [ ] Selector de variantes funciona
- [ ] Agregar al carrito funciona
- [ ] Página de categoría funciona
- [ ] Página de colección funciona
- [ ] Carrito muestra items correctamente
- [ ] Totales se calculan correctamente
- [ ] Footer se muestra correctamente

### Step 4: Push final

```bash
git push origin feat/fase-3-storefront
```

- [ ] **Task 10 completada**

---

## Checklist Final de Fase 3

- [ ] Branch `feat/fase-3-storefront` creado
- [ ] Header con navegación por categorías
- [ ] Footer con información de contacto
- [ ] Hook useCart con localStorage
- [ ] Componente ProductCard
- [ ] Página de inicio con hero, categorías y productos
- [ ] Catálogo de productos con búsqueda y filtros
- [ ] Página de detalle de producto con variantes
- [ ] Página de categoría
- [ ] Página de colección
- [ ] Página de carrito completa
- [ ] Build pasa sin errores
- [ ] Lint pasa sin errores

---

## APROBACIÓN REQUERIDA

**Antes de hacer merge a main:**

1. Verificar que todos los checkboxes están marcados
2. Probar manualmente el flujo completo:
   - Navegar productos
   - Agregar al carrito
   - Ver carrito
3. Ejecutar `pnpm run build` una última vez
4. Solicitar aprobación explícita del usuario

**Comando para merge (solo después de aprobación):**

```bash
git checkout main
git merge feat/fase-3-storefront
git push origin main
```
