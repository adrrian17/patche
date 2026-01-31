# Fase 18: Admin - Gestión de Productos

> **Prerrequisitos:** Fase 17 completada
> **Resultado:** UI completa para CRUD de productos con variantes

---

## Tarea 18.1: Crear página de listado de productos

**Archivo:** `src/routes/admin.productos.tsx`

**Paso 1: Crear página de listado**

```typescript
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { Button } from '~/components/ui/button'
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
import { Badge } from '~/components/ui/badge'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '~/components/ui/use-toast'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/admin/productos')({
  component: AdminProductosPage,
})

function AdminProductosPage() {
  const { data: products, isLoading } = useQuery(
    convexQuery(api.products.list, {})
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-muted-foreground">
            Gestiona el catálogo de productos
          </p>
        </div>
        <Link to="/admin/productos/nuevo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo producto
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos los productos</CardTitle>
          <CardDescription>
            {products?.length ?? 0} producto(s) en total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => (
                <TableRow key={product._id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {product.type === 'physical' ? 'Físico' : 'Digital'}
                    </Badge>
                  </TableCell>
                  <TableCell>${product.basePrice}</TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? 'default' : 'secondary'}>
                      {product.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link to={`/admin/productos/${product._id}`}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <DeleteProductButton id={product._id} />
                    </div>
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

function DeleteProductButton({ id }: { id: Id<'products'> }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const deleteMutation = useConvexMutation(api.products.remove)
  const [isLoading, setIsLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('¿Eliminar este producto y todas sus variantes?')) return
    setIsLoading(true)
    try {
      await deleteMutation({ id })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({ title: 'Producto eliminado' })
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isLoading}>
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
    </Button>
  )
}
```

**Paso 2: Commit**

```bash
git add src/routes/admin.productos.tsx
git commit -m "feat: add admin products list page"
```

---

## Tarea 18.2: Crear página de nuevo producto

**Archivo:** `src/routes/admin.productos.nuevo.tsx`

**Paso 1: Crear página con formulario completo**

El formulario debe incluir:
- Nombre, slug, descripción
- Precio base
- Tipo (físico/digital)
- Días de preparación (para físicos)
- Categoría (select)
- Colecciones (multi-select)
- Imágenes (usando ImageUpload)
- Estado activo

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Checkbox } from '~/components/ui/checkbox'
import { useToast } from '~/components/ui/use-toast'
import { ImageUpload } from '~/components/ImageUpload'
import { Loader2, ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/productos/nuevo')({
  component: AdminProductoNuevoPage,
})

function AdminProductoNuevoPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: categories } = useQuery(convexQuery(api.categories.list, {}))
  const { data: collections } = useQuery(convexQuery(api.collections.list, {}))
  const createProduct = useConvexMutation(api.products.create)

  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [basePrice, setBasePrice] = useState(0)
  const [type, setType] = useState<'physical' | 'digital'>('physical')
  const [preparationDays, setPreparationDays] = useState<number | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [selectedCollections, setSelectedCollections] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)

  function handleNameChange(value: string) {
    setName(value)
    setSlug(value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryId) {
      toast({ title: 'Selecciona una categoría', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      await createProduct({
        name,
        slug,
        description,
        basePrice,
        type,
        preparationDays: type === 'physical' ? preparationDays : null,
        categoryId: categoryId as any,
        collectionIds: selectedCollections as any[],
        images,
        isActive,
      })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({ title: 'Producto creado' })
      navigate({ to: '/admin/productos' })
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Error', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/productos">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-3xl font-bold">Nuevo Producto</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Información básica</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={name} onChange={(e) => handleNameChange(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
              </div>
              <div className="space-y-2">
                <Label>Precio base</Label>
                <Input type="number" value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} min={0} step={0.01} required />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Configuración</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Físico</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {type === 'physical' && (
                <div className="space-y-2">
                  <Label>Días de preparación</Label>
                  <Input type="number" value={preparationDays ?? ''} onChange={(e) => setPreparationDays(e.target.value ? Number(e.target.value) : null)} min={0} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (<SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="isActive" checked={isActive} onCheckedChange={(c) => setIsActive(c === true)} />
                <Label htmlFor="isActive">Producto activo</Label>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Imágenes</CardTitle></CardHeader>
            <CardContent>
              <ImageUpload value={images} onChange={setImages} maxImages={5} />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Link to="/admin/productos"><Button variant="outline">Cancelar</Button></Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Crear producto
          </Button>
        </div>
      </form>
    </div>
  )
}
```

**Paso 2: Commit**

```bash
git add src/routes/admin.productos.nuevo.tsx
git commit -m "feat: add new product form page"
```

---

## Tarea 18.3: Crear página de edición de producto

**Archivo:** `src/routes/admin.productos.$id.tsx`

Similar al formulario de creación pero:
- Carga datos existentes del producto
- Incluye sección de variantes
- Permite agregar/editar/eliminar variantes
- Para productos digitales, permite subir archivos

**Paso 1: Crear la página con tabs para Información y Variantes**

```typescript
// Estructura similar a nuevo.tsx pero con:
// - useQuery para cargar producto por ID
// - Tabs para "Información" y "Variantes"
// - Formulario de variantes (nombre, atributos, precio, stock, SKU)
// - Lista de variantes existentes con edición inline
```

**Paso 2: Commit**

```bash
git add src/routes/admin.productos.\$id.tsx
git commit -m "feat: add product edit page with variants"
```

---

## Verificación Final de Fase 18

```bash
pnpm run build
```

---

**Siguiente fase:** `fase-19-admin-orders.md`
