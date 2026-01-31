# Fase 22: Storefront - Catálogo y Búsqueda

> **Prerrequisitos:** Fase 21 completada
> **Resultado:** Páginas de catálogo, categoría y colección con filtros

---

## Tarea 22.1: Crear página de catálogo completo

**Archivo:** `src/routes/productos.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { StoreLayout } from '~/components/store/StoreLayout'
import { ProductCard } from '~/components/store/ProductCard'
import { ProductFilters } from '~/components/store/ProductFilters'
import { useState } from 'react'

export const Route = createFileRoute('/productos')({
  component: ProductosPage,
})

function ProductosPage() {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'physical' | 'digital' | null>(null)

  const { data: products, isLoading } = useQuery(
    convexQuery(api.products.list, {
      activeOnly: true,
      categoryId: categoryFilter as any,
      type: typeFilter ?? undefined,
    })
  )

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Todos los productos</h1>

        <div className="flex gap-8">
          {/* Filtros sidebar */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <ProductFilters
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              typeFilter={typeFilter}
              onTypeChange={setTypeFilter}
            />
          </aside>

          {/* Grid de productos */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : products?.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No se encontraron productos
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {products?.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </StoreLayout>
  )
}
```

**Commit:**

```bash
git add src/routes/productos.tsx
git commit -m "feat: add products catalog page"
```

---

## Tarea 22.2: Crear componente ProductFilters

**Archivo:** `src/components/store/ProductFilters.tsx`

```typescript
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'
import { Label } from '~/components/ui/label'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { Button } from '~/components/ui/button'
import { X } from 'lucide-react'

interface ProductFiltersProps {
  categoryFilter: string | null
  onCategoryChange: (value: string | null) => void
  typeFilter: 'physical' | 'digital' | null
  onTypeChange: (value: 'physical' | 'digital' | null) => void
}

export function ProductFilters({
  categoryFilter,
  onCategoryChange,
  typeFilter,
  onTypeChange,
}: ProductFiltersProps) {
  const { data: categories } = useQuery(convexQuery(api.categories.list, {}))

  const hasFilters = categoryFilter || typeFilter

  return (
    <div className="space-y-6">
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onCategoryChange(null)
            onTypeChange(null)
          }}
        >
          <X className="h-4 w-4 mr-2" />
          Limpiar filtros
        </Button>
      )}

      {/* Tipo */}
      <div>
        <h3 className="font-semibold mb-3">Tipo</h3>
        <RadioGroup
          value={typeFilter ?? 'all'}
          onValueChange={(v) => onTypeChange(v === 'all' ? null : (v as any))}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="type-all" />
            <Label htmlFor="type-all">Todos</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="physical" id="type-physical" />
            <Label htmlFor="type-physical">Físicos</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="digital" id="type-digital" />
            <Label htmlFor="type-digital">Digitales</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Categorías */}
      <div>
        <h3 className="font-semibold mb-3">Categoría</h3>
        <RadioGroup
          value={categoryFilter ?? 'all'}
          onValueChange={(v) => onCategoryChange(v === 'all' ? null : v)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="cat-all" />
            <Label htmlFor="cat-all">Todas</Label>
          </div>
          {categories?.map((cat) => (
            <div key={cat._id} className="flex items-center space-x-2">
              <RadioGroupItem value={cat._id} id={`cat-${cat._id}`} />
              <Label htmlFor={`cat-${cat._id}`}>{cat.name}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  )
}
```

**Commit:**

```bash
git add src/components/store/ProductFilters.tsx
git commit -m "feat: add ProductFilters component"
```

---

## Tarea 22.3: Crear página de categoría

**Archivo:** `src/routes/categoria.$slug.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { StoreLayout } from '~/components/store/StoreLayout'
import { ProductCard } from '~/components/store/ProductCard'

export const Route = createFileRoute('/categoria/$slug')({
  component: CategoriaPage,
})

function CategoriaPage() {
  const { slug } = Route.useParams()

  const { data: category } = useQuery(
    convexQuery(api.categories.getBySlug, { slug })
  )
  const { data: products } = useQuery(
    convexQuery(api.products.list, {
      activeOnly: true,
      categoryId: category?._id,
    }),
    { enabled: !!category }
  )

  if (!category) {
    return (
      <StoreLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Categoría no encontrada</h1>
        </div>
      </StoreLayout>
    )
  }

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{category.name}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {products?.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
        {products?.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No hay productos en esta categoría
          </p>
        )}
      </div>
    </StoreLayout>
  )
}
```

**Commit:**

```bash
git add src/routes/categoria.\$slug.tsx
git commit -m "feat: add category page"
```

---

## Tarea 22.4: Crear página de colección

**Archivo:** `src/routes/coleccion.$slug.tsx`

Similar a la página de categoría pero filtrando por colección.

**Commit:**

```bash
git add src/routes/coleccion.\$slug.tsx
git commit -m "feat: add collection page"
```

---

## Verificación Final de Fase 22

```bash
pnpm run build
```

---

**Siguiente fase:** `fase-23-storefront-product.md`
