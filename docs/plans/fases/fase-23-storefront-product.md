# Fase 23: Storefront - Detalle de Producto y Carrito

> **Prerrequisitos:** Fase 22 completada
> **Resultado:** Página de producto con selector de variantes y página de carrito

---

## Tarea 23.1: Crear página de detalle de producto

**Archivo:** `src/routes/producto.$slug.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { StoreLayout } from '~/components/store/StoreLayout'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { useCart } from '~/hooks/useCart'
import { useToast } from '~/components/ui/use-toast'
import { useState } from 'react'
import { ShoppingCart, Clock } from 'lucide-react'

export const Route = createFileRoute('/producto/$slug')({
  component: ProductoPage,
})

function ProductoPage() {
  const { slug } = Route.useParams()
  const { toast } = useToast()
  const { addItem } = useCart()

  const { data: product } = useQuery(
    convexQuery(api.products.getBySlug, { slug })
  )
  const { data: variants } = useQuery(
    convexQuery(api.variants.listByProduct, { productId: product?._id! }),
    { enabled: !!product }
  )
  const { data: imageUrls } = useQuery(
    convexQuery(api.storage.getUrls, { storageIds: product?.images ?? [] }),
    { enabled: !!product?.images.length }
  )

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [mainImage, setMainImage] = useState(0)

  if (!product) {
    return (
      <StoreLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Producto no encontrado</h1>
        </div>
      </StoreLayout>
    )
  }

  const selectedVariant = variants?.find((v) => v._id === selectedVariantId)
  const price = selectedVariant?.price ?? product.basePrice
  const inStock = selectedVariant ? selectedVariant.stock > 0 : true

  function handleAddToCart() {
    addItem({
      productId: product._id,
      variantId: selectedVariantId as any,
      name: product.name,
      variantName: selectedVariant?.name ?? null,
      price,
      type: product.type,
      image: product.images[0] ?? null,
    })
    toast({ title: 'Agregado al carrito' })
  }

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Galería */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden">
              {imageUrls?.[mainImage] ? (
                <img
                  src={imageUrls[mainImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Sin imagen
                </div>
              )}
            </div>
            {imageUrls && imageUrls.length > 1 && (
              <div className="flex gap-2">
                {imageUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setMainImage(i)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      mainImage === i ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={url!} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{product.category.name}</Badge>
                {product.type === 'digital' && <Badge>Digital</Badge>}
              </div>
              <h1 className="text-3xl font-bold">{product.name}</h1>
            </div>

            <p className="text-2xl font-bold">${price}</p>

            {product.preparationDays && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{product.preparationDays} días de preparación</span>
              </div>
            )}

            <p className="text-muted-foreground">{product.description}</p>

            {/* Selector de variante */}
            {variants && variants.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Variante</label>
                <Select
                  value={selectedVariantId ?? ''}
                  onValueChange={setSelectedVariantId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((v) => (
                      <SelectItem key={v._id} value={v._id} disabled={v.stock === 0}>
                        {v.name} {v.stock === 0 && '(Agotado)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={handleAddToCart}
              disabled={!inStock || (variants?.length && !selectedVariantId)}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {inStock ? 'Agregar al carrito' : 'Agotado'}
            </Button>
          </div>
        </div>
      </div>
    </StoreLayout>
  )
}
```

**Commit:**

```bash
git add src/routes/producto.\$slug.tsx
git commit -m "feat: add product detail page with variant selector"
```

---

## Tarea 23.2: Crear página de carrito

**Archivo:** `src/routes/carrito.tsx`

```typescript
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { StoreLayout } from '~/components/store/StoreLayout'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useCart } from '~/hooks/useCart'
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'

export const Route = createFileRoute('/carrito')({
  component: CarritoPage,
})

function CarritoPage() {
  const { items, updateQuantity, removeItem, subtotal, hasPhysicalItems } = useCart()

  const { data: settings } = useQuery(convexQuery(api.settings.get, {}))

  const shippingCost = hasPhysicalItems
    ? subtotal >= (settings?.freeShippingThreshold ?? 999)
      ? 0
      : settings?.shippingRate ?? 99
    : 0

  const total = subtotal + shippingCost

  if (items.length === 0) {
    return (
      <StoreLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">Tu carrito está vacío</h1>
          <Link to="/productos">
            <Button>Ver productos</Button>
          </Link>
        </div>
      </StoreLayout>
    )
  }

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Carrito</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <CartItem
                key={`${item.productId}-${item.variantId}`}
                item={item}
                onUpdateQuantity={(q) => updateQuantity(item.productId, item.variantId, q)}
                onRemove={() => removeItem(item.productId, item.variantId)}
              />
            ))}
          </div>

          {/* Resumen */}
          <div className="lg:col-span-1">
            <div className="border rounded-lg p-6 space-y-4 sticky top-24">
              <h2 className="font-bold text-lg">Resumen</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal}</span>
                </div>
                {hasPhysicalItems && (
                  <div className="flex justify-between">
                    <span>Envío</span>
                    <span>{shippingCost === 0 ? 'Gratis' : `$${shippingCost}`}</span>
                  </div>
                )}
                {hasPhysicalItems && shippingCost > 0 && settings && (
                  <p className="text-xs text-muted-foreground">
                    Envío gratis en compras mayores a ${settings.freeShippingThreshold}
                  </p>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${total}</span>
                </div>
              </div>

              <Link to="/checkout" className="block">
                <Button className="w-full" size="lg">
                  Proceder al pago
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </StoreLayout>
  )
}

function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: ReturnType<typeof useCart>['items'][0]
  onUpdateQuantity: (quantity: number) => void
  onRemove: () => void
}) {
  const { data: imageUrls } = useQuery(
    convexQuery(api.storage.getUrls, { storageIds: item.image ? [item.image] : [] }),
    { enabled: !!item.image }
  )

  return (
    <div className="flex gap-4 p-4 border rounded-lg">
      <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
        {imageUrls?.[0] ? (
          <img src={imageUrls[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" />
        )}
      </div>

      <div className="flex-1">
        <h3 className="font-medium">{item.name}</h3>
        {item.variantName && (
          <p className="text-sm text-muted-foreground">{item.variantName}</p>
        )}
        <p className="font-bold mt-1">${item.price}</p>
      </div>

      <div className="flex flex-col items-end gap-2">
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onUpdateQuantity(item.quantity - 1)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onUpdateQuantity(item.quantity + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

**Commit:**

```bash
git add src/routes/carrito.tsx
git commit -m "feat: add cart page with quantity controls"
```

---

## Verificación Final de Fase 23

```bash
pnpm run build
```

---

**Siguiente fase:** `fase-24-checkout-stripe.md`
