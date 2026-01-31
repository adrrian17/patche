# Fase 12: Configurar Convex Storage

> **Prerrequisitos:** Fase 11 completada
> **Resultado:** Functions para subir y gestionar archivos (imágenes y digitales)

---

## Tarea 12.1: Crear archivo de funciones de storage

**Archivo:** `convex/storage.ts`

**Paso 1: Crear archivo con imports**

```typescript
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
```

**Paso 2: Commit**

```bash
git add convex/storage.ts
git commit -m "feat(convex): create storage functions file"
```

---

## Tarea 12.2: Mutation para generar URL de subida

**Archivo:** `convex/storage.ts`

**Paso 1: Agregar mutation generateUploadUrl**

```typescript
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})
```

**Paso 2: Commit**

```bash
git add convex/storage.ts
git commit -m "feat(convex): add storage.generateUploadUrl mutation"
```

---

## Tarea 12.3: Query para obtener URL de archivo

**Archivo:** `convex/storage.ts`

**Paso 1: Agregar query getUrl**

```typescript
export const getUrl = query({
  args: { storageId: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})
```

**Paso 2: Commit**

```bash
git add convex/storage.ts
git commit -m "feat(convex): add storage.getUrl query"
```

---

## Tarea 12.4: Query para obtener múltiples URLs

**Archivo:** `convex/storage.ts`

**Paso 1: Agregar query getUrls**

```typescript
export const getUrls = query({
  args: { storageIds: v.array(v.string()) },
  returns: v.array(v.union(v.string(), v.null())),
  handler: async (ctx, args) => {
    const urls = await Promise.all(
      args.storageIds.map((id) => ctx.storage.getUrl(id))
    )
    return urls
  },
})
```

**Paso 2: Commit**

```bash
git add convex/storage.ts
git commit -m "feat(convex): add storage.getUrls query"
```

---

## Tarea 12.5: Mutation para eliminar archivo

**Archivo:** `convex/storage.ts`

**Paso 1: Agregar mutation deleteFile**

```typescript
export const deleteFile = mutation({
  args: { storageId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId)
    return null
  },
})
```

**Paso 2: Commit**

```bash
git add convex/storage.ts
git commit -m "feat(convex): add storage.deleteFile mutation"
```

---

## Tarea 12.6: Crear hook de React para subida de archivos

**Archivo:** `src/hooks/useUploadFile.ts`

**Paso 1: Crear carpeta hooks si no existe**

```bash
mkdir -p src/hooks
```

**Paso 2: Crear el hook**

```typescript
import { useMutation } from '@tanstack/react-query'
import { useConvexMutation } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'

interface UploadResult {
  storageId: string
  name: string
  size: number
}

export function useUploadFile() {
  const generateUploadUrl = useConvexMutation(api.storage.generateUploadUrl)

  return useMutation({
    mutationFn: async (file: File): Promise<UploadResult> => {
      // Obtener URL de subida
      const uploadUrl = await generateUploadUrl()

      // Subir el archivo
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!response.ok) {
        throw new Error('Failed to upload file')
      }

      const { storageId } = await response.json()

      return {
        storageId,
        name: file.name,
        size: file.size,
      }
    },
  })
}
```

**Paso 3: Commit**

```bash
git add src/hooks/useUploadFile.ts
git commit -m "feat: add useUploadFile hook for file uploads"
```

---

## Tarea 12.7: Crear componente de subida de imagen

**Archivo:** `src/components/ImageUpload.tsx`

**Paso 1: Crear el componente**

```typescript
import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { useUploadFile } from '~/hooks/useUploadFile'
import { Button } from '~/components/ui/button'
import { X, Upload, Loader2 } from 'lucide-react'

interface ImageUploadProps {
  value: string[]
  onChange: (storageIds: string[]) => void
  maxImages?: number
}

export function ImageUpload({
  value,
  onChange,
  maxImages = 5,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const uploadFile = useUploadFile()

  // Obtener URLs de las imágenes
  const { data: imageUrls } = useQuery(
    convexQuery(api.storage.getUrls, { storageIds: value })
  )

  const handleUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return

      setIsUploading(true)
      try {
        const newStorageIds: string[] = []
        for (const file of Array.from(files)) {
          if (value.length + newStorageIds.length >= maxImages) break
          const result = await uploadFile.mutateAsync(file)
          newStorageIds.push(result.storageId)
        }
        onChange([...value, ...newStorageIds])
      } catch (error) {
        console.error('Upload failed:', error)
      } finally {
        setIsUploading(false)
        event.target.value = ''
      }
    },
    [value, onChange, maxImages, uploadFile]
  )

  const handleRemove = useCallback(
    (index: number) => {
      const newValue = value.filter((_, i) => i !== index)
      onChange(newValue)
    },
    [value, onChange]
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {value.map((storageId, index) => (
          <div key={storageId} className="relative aspect-square">
            {imageUrls?.[index] ? (
              <img
                src={imageUrls[index]!}
                alt={`Image ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <div className="w-full h-full bg-muted rounded-lg animate-pulse" />
            )}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => handleRemove(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {value.length < maxImages && (
        <div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={isUploading}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload">
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              asChild
            >
              <span>
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Subir imagen
              </span>
            </Button>
          </label>
        </div>
      )}
    </div>
  )
}
```

**Paso 2: Commit**

```bash
git add src/components/ImageUpload.tsx
git commit -m "feat: add ImageUpload component"
```

---

## Verificación Final de Fase 12

```bash
pnpm run build
```

Esperado: Build exitoso sin errores de tipos

---

**Siguiente fase:** `fase-13-crud-orders.md`
