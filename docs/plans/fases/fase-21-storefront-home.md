# Fase 21: Storefront - Home, Header, Footer

> **Prerrequisitos:** Fase 20 completada
> **Resultado:** Página principal y componentes de navegación

---

## Tarea 21.1: Crear componente Header

**Archivo:** `src/components/store/Header.tsx`

```typescript
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import { ShoppingCart, Menu, Search } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '~/components/ui/sheet'
import { useCart } from '~/hooks/useCart'

export function Header() {
  const { data: categories } = useQuery(convexQuery(api.categories.list, {}))
  const { itemCount } = useCart()

  return (
    <header className="border-b sticky top-0 bg-background z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold">
          Patche
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/productos" className="text-sm hover:text-primary">
            Todos los productos
          </Link>
          {categories?.slice(0, 4).map((cat) => (
            <Link
              key={cat._id}
              to={`/categoria/${cat.slug}`}
              className="text-sm hover:text-primary"
            >
              {cat.name}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>

          <Link to="/carrito">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <nav className="flex flex-col gap-4 mt-8">
                <Link to="/productos" className="text-lg">Todos los productos</Link>
                {categories?.map((cat) => (
                  <Link key={cat._id} to={`/categoria/${cat.slug}`} className="text-lg">
                    {cat.name}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
```

**Commit:**

```bash
git add src/components/store/Header.tsx
git commit -m "feat: add store Header component"
```

---

## Tarea 21.2: Crear componente Footer

**Archivo:** `src/components/store/Footer.tsx`

```typescript
import { Link } from '@tanstack/react-router'

export function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-bold mb-4">Patche</h3>
            <p className="text-sm text-muted-foreground">
              Productos de oficina hechos con amor.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Enlaces</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link to="/productos">Productos</Link>
              <Link to="/">Contacto</Link>
            </nav>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span>Términos y condiciones</span>
              <span>Política de privacidad</span>
            </nav>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Patche. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
```

**Commit:**

```bash
git add src/components/store/Footer.tsx
git commit -m "feat: add store Footer component"
```

---

## Tarea 21.3: Crear hook useCart (localStorage)

**Archivo:** `src/hooks/useCart.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
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

const CART_KEY = 'patche_cart'

function getStoredCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(CART_KEY)
  return stored ? JSON.parse(stored) : []
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    setItems(getStoredCart())
  }, [])

  const saveCart = useCallback((newItems: CartItem[]) => {
    setItems(newItems)
    localStorage.setItem(CART_KEY, JSON.stringify(newItems))
  }, [])

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    const current = getStoredCart()
    const existingIndex = current.findIndex(
      (i) => i.productId === item.productId && i.variantId === item.variantId
    )

    if (existingIndex >= 0) {
      current[existingIndex].quantity += 1
    } else {
      current.push({ ...item, quantity: 1 })
    }
    saveCart(current)
  }, [saveCart])

  const updateQuantity = useCallback((productId: string, variantId: string | null, quantity: number) => {
    const current = getStoredCart()
    const index = current.findIndex(
      (i) => i.productId === productId && i.variantId === variantId
    )
    if (index >= 0) {
      if (quantity <= 0) {
        current.splice(index, 1)
      } else {
        current[index].quantity = quantity
      }
      saveCart(current)
    }
  }, [saveCart])

  const removeItem = useCallback((productId: string, variantId: string | null) => {
    const current = getStoredCart().filter(
      (i) => !(i.productId === productId && i.variantId === variantId)
    )
    saveCart(current)
  }, [saveCart])

  const clearCart = useCallback(() => {
    saveCart([])
  }, [saveCart])

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const hasPhysicalItems = items.some((item) => item.type === 'physical')

  return {
    items,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    itemCount,
    hasPhysicalItems,
  }
}
```

**Commit:**

```bash
git add src/hooks/useCart.ts
git commit -m "feat: add useCart hook with localStorage persistence"
```

---

## Tarea 21.4: Crear layout de tienda

**Archivo:** `src/components/store/StoreLayout.tsx`

```typescript
import { Header } from './Header'
import { Footer } from './Footer'

interface StoreLayoutProps {
  children: React.ReactNode
}

export function StoreLayout({ children }: StoreLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
```

**Commit:**

```bash
git add src/components/store/StoreLayout.tsx
git commit -m "feat: add StoreLayout component"
```

---

## Tarea 21.5: Actualizar página Home

**Archivo:** `src/routes/index.tsx`

```typescript
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { StoreLayout } from '~/components/store/StoreLayout'
import { ProductCard } from '~/components/store/ProductCard'
import { Button } from '~/components/ui/button'
import { ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { data: products } = useQuery(
    convexQuery(api.products.list, { activeOnly: true, limit: 8 })
  )
  const { data: categories } = useQuery(convexQuery(api.categories.list, {}))

  return (
    <StoreLayout>
      {/* Hero */}
      <section className="bg-muted py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Organiza tu vida con estilo
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Agendas, calendarios y productos de oficina hechos a mano con materiales de calidad
          </p>
          <Link to="/productos">
            <Button size="lg">
              Ver catálogo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Categorías */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">Categorías</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories?.map((category) => (
              <Link
                key={category._id}
                to={`/categoria/${category.slug}`}
                className="p-6 border rounded-lg hover:border-primary transition-colors text-center"
              >
                <h3 className="font-semibold">{category.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Productos destacados */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Productos destacados</h2>
            <Link to="/productos">
              <Button variant="outline">Ver todos</Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {products?.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </StoreLayout>
  )
}
```

**Commit:**

```bash
git add src/routes/index.tsx
git commit -m "feat: update home page with store layout and sections"
```

---

## Tarea 21.6: Crear componente ProductCard

**Archivo:** `src/components/store/ProductCard.tsx`

```typescript
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'
import { Badge } from '~/components/ui/badge'
import type { Id } from '../../../convex/_generated/dataModel'

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
  const { data: imageUrls } = useQuery(
    convexQuery(api.storage.getUrls, { storageIds: product.images.slice(0, 1) })
  )

  return (
    <Link to={`/producto/${product.slug}`} className="group">
      <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-3">
        {imageUrls?.[0] ? (
          <img
            src={imageUrls[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Sin imagen
          </div>
        )}
      </div>
      <h3 className="font-medium group-hover:text-primary transition-colors">
        {product.name}
      </h3>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-lg font-bold">${product.basePrice}</span>
        {product.type === 'digital' && (
          <Badge variant="secondary">Digital</Badge>
        )}
      </div>
      {product.preparationDays && (
        <p className="text-sm text-muted-foreground mt-1">
          {product.preparationDays} días de preparación
        </p>
      )}
    </Link>
  )
}
```

**Commit:**

```bash
git add src/components/store/ProductCard.tsx
git commit -m "feat: add ProductCard component"
```

---

## Verificación Final de Fase 21

```bash
pnpm run build
```

---

**Siguiente fase:** `fase-22-storefront-catalog.md`
