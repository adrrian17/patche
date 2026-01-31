# Fase 20: Admin - Configuración de Tienda

> **Prerrequisitos:** Fase 19 completada
> **Resultado:** UI para configurar ajustes de la tienda

---

## Tarea 20.1: Crear funciones de configuración en Convex

**Archivo:** `convex/settings.ts`

```typescript
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const get = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id('storeSettings'),
      _creationTime: v.number(),
      shippingRate: v.number(),
      freeShippingThreshold: v.number(),
      contactEmail: v.string(),
      lastOrderNumber: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    return await ctx.db.query('storeSettings').first()
  },
})

export const update = mutation({
  args: {
    shippingRate: v.optional(v.number()),
    freeShippingThreshold: v.optional(v.number()),
    contactEmail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let settings = await ctx.db.query('storeSettings').first()

    if (!settings) {
      await ctx.db.insert('storeSettings', {
        shippingRate: args.shippingRate ?? 99,
        freeShippingThreshold: args.freeShippingThreshold ?? 999,
        contactEmail: args.contactEmail ?? 'tienda@patche.mx',
        lastOrderNumber: 1000,
      })
      return null
    }

    const updates: Record<string, unknown> = {}
    if (args.shippingRate !== undefined) updates.shippingRate = args.shippingRate
    if (args.freeShippingThreshold !== undefined) updates.freeShippingThreshold = args.freeShippingThreshold
    if (args.contactEmail !== undefined) updates.contactEmail = args.contactEmail

    await ctx.db.patch(settings._id, updates)
    return null
  },
})
```

**Commit:**

```bash
git add convex/settings.ts
git commit -m "feat(convex): add store settings functions"
```

---

## Tarea 20.2: Crear página de configuración

**Archivo:** `src/routes/admin.configuracion.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { useState, useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { useToast } from '~/components/ui/use-toast'
import { Loader2, Save } from 'lucide-react'

export const Route = createFileRoute('/admin/configuracion')({
  component: AdminConfiguracionPage,
})

function AdminConfiguracionPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: settings, isLoading } = useQuery(convexQuery(api.settings.get, {}))
  const updateSettings = useConvexMutation(api.settings.update)

  const [shippingRate, setShippingRate] = useState(0)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(0)
  const [contactEmail, setContactEmail] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setShippingRate(settings.shippingRate)
      setFreeShippingThreshold(settings.freeShippingThreshold)
      setContactEmail(settings.contactEmail)
    }
  }, [settings])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      await updateSettings({ shippingRate, freeShippingThreshold, contactEmail })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast({ title: 'Configuración guardada' })
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div>Cargando...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Configuración</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Envío</CardTitle>
            <CardDescription>Configura las tarifas de envío</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tarifa de envío ($)</Label>
                <Input type="number" value={shippingRate} onChange={(e) => setShippingRate(Number(e.target.value))} min={0} step={0.01} />
              </div>
              <div className="space-y-2">
                <Label>Mínimo para envío gratis ($)</Label>
                <Input type="number" value={freeShippingThreshold} onChange={(e) => setFreeShippingThreshold(Number(e.target.value))} min={0} step={0.01} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Email de contacto</Label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  )
}
```

**Commit:**

```bash
git add src/routes/admin.configuracion.tsx
git commit -m "feat: add admin settings page"
```

---

## Verificación Final de Fase 20

```bash
pnpm run build
```

---

**Siguiente fase:** `fase-21-storefront-home.md`
