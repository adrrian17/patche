# Fase 17: Admin - Gestión de Colecciones

> **Prerrequisitos:** Fase 16 completada
> **Resultado:** UI completa para CRUD de colecciones en el admin

---

## Tarea 17.1: Crear página de listado de colecciones

**Archivo:** `src/routes/admin.colecciones.tsx`

**Paso 1: Crear la página**

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { Textarea } from '~/components/ui/textarea'
import { Checkbox } from '~/components/ui/checkbox'
import { Badge } from '~/components/ui/badge'
import { useToast } from '~/components/ui/use-toast'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Skeleton } from '~/components/ui/skeleton'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/admin/colecciones')({
  component: AdminColeccionesPage,
})

function AdminColeccionesPage() {
  const { data: collections, isLoading } = useQuery(
    convexQuery(api.collections.list, {})
  )

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<
    (typeof collections)[0] | null
  >(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Colecciones</h1>
          <p className="text-muted-foreground">
            Agrupa productos por temporada, promoción o tema
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva colección
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva colección</DialogTitle>
              <DialogDescription>
                Crea una nueva colección para destacar productos
              </DialogDescription>
            </DialogHeader>
            <CollectionForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las colecciones</CardTitle>
          <CardDescription>
            {collections?.length ?? 0} colección(es) en total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <CollectionsTableSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections?.map((collection) => (
                  <TableRow key={collection._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{collection.name}</div>
                        {collection.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {collection.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {collection.slug}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={collection.isActive ? 'default' : 'secondary'}
                      >
                        {collection.isActive ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <ToggleActiveButton collection={collection} />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingCollection(collection)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <DeleteCollectionButton id={collection._id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {collections?.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-8"
                    >
                      No hay colecciones. Crea la primera.
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
        open={!!editingCollection}
        onOpenChange={(open) => !open && setEditingCollection(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar colección</DialogTitle>
            <DialogDescription>
              Modifica los datos de la colección
            </DialogDescription>
          </DialogHeader>
          {editingCollection && (
            <CollectionForm
              collection={editingCollection}
              onSuccess={() => setEditingCollection(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente del formulario
interface CollectionFormProps {
  collection?: {
    _id: Id<'collections'>
    name: string
    slug: string
    description: string | null
    isActive: boolean
  }
  onSuccess: () => void
}

function CollectionForm({ collection, onSuccess }: CollectionFormProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const createMutation = useConvexMutation(api.collections.create)
  const updateMutation = useConvexMutation(api.collections.update)

  const [name, setName] = useState(collection?.name ?? '')
  const [slug, setSlug] = useState(collection?.slug ?? '')
  const [description, setDescription] = useState(collection?.description ?? '')
  const [isActive, setIsActive] = useState(collection?.isActive ?? true)
  const [isLoading, setIsLoading] = useState(false)

  function handleNameChange(value: string) {
    setName(value)
    if (!collection) {
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
      if (collection) {
        await updateMutation({
          id: collection._id,
          name,
          slug,
          description: description || null,
          isActive,
        })
        toast({ title: 'Colección actualizada' })
      } else {
        await createMutation({
          name,
          slug,
          description: description || null,
          image: null,
          isActive,
        })
        toast({ title: 'Colección creada' })
      }
      queryClient.invalidateQueries({ queryKey: ['collections'] })
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
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isActive"
          checked={isActive}
          onCheckedChange={(checked) => setIsActive(checked === true)}
        />
        <Label htmlFor="isActive">Colección activa</Label>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {collection ? 'Guardar cambios' : 'Crear colección'}
      </Button>
    </form>
  )
}

// Botón de toggle activo
function ToggleActiveButton({
  collection,
}: {
  collection: { _id: Id<'collections'>; isActive: boolean }
}) {
  const queryClient = useQueryClient()
  const toggleMutation = useConvexMutation(api.collections.toggleActive)
  const [isLoading, setIsLoading] = useState(false)

  async function handleToggle() {
    setIsLoading(true)
    try {
      await toggleMutation({ id: collection._id })
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : collection.isActive ? (
        'Desactivar'
      ) : (
        'Activar'
      )}
    </Button>
  )
}

// Botón de eliminar
function DeleteCollectionButton({ id }: { id: Id<'collections'> }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const deleteMutation = useConvexMutation(api.collections.remove)
  const [isLoading, setIsLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('¿Eliminar esta colección?')) return

    setIsLoading(true)
    try {
      await deleteMutation({ id })
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      toast({ title: 'Colección eliminada' })
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

function CollectionsTableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  )
}
```

**Paso 2: Commit**

```bash
git add src/routes/admin.colecciones.tsx
git commit -m "feat: add admin collections management page"
```

---

## Verificación Final de Fase 17

```bash
pnpm run build
```

**Probar manualmente:**

1. Iniciar: `pnpm run dev`
2. Ir a `/admin/colecciones`
3. Crear, editar, activar/desactivar y eliminar colecciones

---

**Siguiente fase:** `fase-18-admin-products.md`
