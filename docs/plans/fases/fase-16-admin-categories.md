# Fase 16: Admin - Gestión de Categorías

> **Prerrequisitos:** Fase 15 completada
> **Resultado:** UI completa para CRUD de categorías en el admin

---

## Tarea 16.1: Crear página de listado de categorías

**Archivo:** `src/routes/admin.categorias.tsx`

**Paso 1: Crear la página**

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { useToast } from '~/components/ui/use-toast'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Skeleton } from '~/components/ui/skeleton'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/admin/categorias')({
  component: AdminCategoriasPage,
})

function AdminCategoriasPage() {
  const { data: categories, isLoading } = useQuery(
    convexQuery(api.categories.list, {})
  )

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<
    (typeof categories)[0] | null
  >(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorías</h1>
          <p className="text-muted-foreground">
            Gestiona las categorías de productos
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva categoría</DialogTitle>
              <DialogDescription>
                Crea una nueva categoría para organizar tus productos
              </DialogDescription>
            </DialogHeader>
            <CategoryForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las categorías</CardTitle>
          <CardDescription>
            {categories?.length ?? 0} categoría(s) en total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <CategoriesTableSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead className="w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories?.map((category) => (
                  <TableRow key={category._id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.slug}
                    </TableCell>
                    <TableCell>{category.order}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingCategory(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <DeleteCategoryButton id={category._id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {categories?.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-8"
                    >
                      No hay categorías. Crea la primera.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de edición */}
      <Dialog
        open={!!editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
            <DialogDescription>
              Modifica los datos de la categoría
            </DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm
              category={editingCategory}
              onSuccess={() => setEditingCategory(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente del formulario
interface CategoryFormProps {
  category?: {
    _id: Id<'categories'>
    name: string
    slug: string
    order: number
    image: string | null
  }
  onSuccess: () => void
}

function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const createMutation = useConvexMutation(api.categories.create)
  const updateMutation = useConvexMutation(api.categories.update)

  const [name, setName] = useState(category?.name ?? '')
  const [slug, setSlug] = useState(category?.slug ?? '')
  const [order, setOrder] = useState(category?.order ?? 0)
  const [isLoading, setIsLoading] = useState(false)

  // Auto-generar slug desde nombre
  function handleNameChange(value: string) {
    setName(value)
    if (!category) {
      const newSlug = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setSlug(newSlug)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (category) {
        await updateMutation({
          id: category._id,
          name,
          slug,
          order,
        })
        toast({ title: 'Categoría actualizada' })
      } else {
        await createMutation({
          name,
          slug,
          order,
          image: null,
        })
        toast({ title: 'Categoría creada' })
      }
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      onSuccess()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug (URL)</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="order">Orden</Label>
        <Input
          id="order"
          type="number"
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {category ? 'Guardar cambios' : 'Crear categoría'}
      </Button>
    </form>
  )
}

// Botón de eliminar
function DeleteCategoryButton({ id }: { id: Id<'categories'> }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const deleteMutation = useConvexMutation(api.categories.remove)
  const [isLoading, setIsLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('¿Eliminar esta categoría?')) return

    setIsLoading(true)
    try {
      await deleteMutation({ id })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast({ title: 'Categoría eliminada' })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4 text-destructive" />
      )}
    </Button>
  )
}

function CategoriesTableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}
```

**Paso 2: Commit**

```bash
git add src/routes/admin.categorias.tsx
git commit -m "feat: add admin categories management page"
```

---

## Verificación Final de Fase 16

```bash
pnpm run build
```

**Probar manualmente:**

1. Iniciar: `pnpm run dev`
2. Ir a `/admin/categorias`
3. Crear, editar y eliminar categorías

---

**Siguiente fase:** `fase-17-admin-collections.md`
