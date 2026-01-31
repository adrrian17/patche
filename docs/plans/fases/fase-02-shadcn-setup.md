# Fase 02: Configurar shadcn/ui

> **Prerrequisitos:** Fase 01 completada
> **Resultado:** shadcn/ui configurado con componentes base instalados

---

## Tarea 2.1: Inicializar shadcn/ui

**Paso 1: Ejecutar init de shadcn**

```bash
pnpm dlx shadcn@latest init
```

**Respuestas al wizard:**
- Style: Default
- Base color: Neutral
- CSS variables: Yes

**Paso 2: Verificar archivos creados**

```bash
ls -la src/components/ui/
ls -la src/lib/
```

Esperado: Carpeta `ui/` y archivo `utils.ts` creados

**Paso 3: Commit**

```bash
git add .
git commit -m "chore: initialize shadcn/ui"
```

---

## Tarea 2.2: Instalar componentes de navegación

**Paso 1: Instalar Button**

```bash
pnpm dlx shadcn@latest add button
```

**Paso 2: Instalar NavigationMenu**

```bash
pnpm dlx shadcn@latest add navigation-menu
```

**Paso 3: Instalar DropdownMenu**

```bash
pnpm dlx shadcn@latest add dropdown-menu
```

**Paso 4: Commit**

```bash
git add .
git commit -m "feat: add navigation components (button, navigation-menu, dropdown-menu)"
```

---

## Tarea 2.3: Instalar componentes de formulario

**Paso 1: Instalar Form**

```bash
pnpm dlx shadcn@latest add form
```

**Paso 2: Instalar Input**

```bash
pnpm dlx shadcn@latest add input
```

**Paso 3: Instalar Textarea**

```bash
pnpm dlx shadcn@latest add textarea
```

**Paso 4: Instalar Select**

```bash
pnpm dlx shadcn@latest add select
```

**Paso 5: Instalar Checkbox**

```bash
pnpm dlx shadcn@latest add checkbox
```

**Paso 6: Instalar Label**

```bash
pnpm dlx shadcn@latest add label
```

**Paso 7: Commit**

```bash
git add .
git commit -m "feat: add form components (form, input, textarea, select, checkbox, label)"
```

---

## Tarea 2.4: Instalar componentes de layout

**Paso 1: Instalar Card**

```bash
pnpm dlx shadcn@latest add card
```

**Paso 2: Instalar Dialog**

```bash
pnpm dlx shadcn@latest add dialog
```

**Paso 3: Instalar Sheet (para sidebar móvil)**

```bash
pnpm dlx shadcn@latest add sheet
```

**Paso 4: Instalar Separator**

```bash
pnpm dlx shadcn@latest add separator
```

**Paso 5: Commit**

```bash
git add .
git commit -m "feat: add layout components (card, dialog, sheet, separator)"
```

---

## Tarea 2.5: Instalar componentes de feedback

**Paso 1: Instalar Toast**

```bash
pnpm dlx shadcn@latest add toast
```

**Paso 2: Instalar Alert**

```bash
pnpm dlx shadcn@latest add alert
```

**Paso 3: Instalar Badge**

```bash
pnpm dlx shadcn@latest add badge
```

**Paso 4: Instalar Skeleton**

```bash
pnpm dlx shadcn@latest add skeleton
```

**Paso 5: Commit**

```bash
git add .
git commit -m "feat: add feedback components (toast, alert, badge, skeleton)"
```

---

## Tarea 2.6: Instalar componentes de datos

**Paso 1: Instalar Table**

```bash
pnpm dlx shadcn@latest add table
```

**Paso 2: Instalar Tabs**

```bash
pnpm dlx shadcn@latest add tabs
```

**Paso 3: Instalar Avatar**

```bash
pnpm dlx shadcn@latest add avatar
```

**Paso 4: Commit**

```bash
git add .
git commit -m "feat: add data display components (table, tabs, avatar)"
```

---

## Tarea 2.7: Configurar Toaster en root layout

**Archivo:** `src/routes/__root.tsx`

**Paso 1: Leer archivo actual**

Lee el archivo para ver la estructura actual.

**Paso 2: Agregar import del Toaster**

Agregar al inicio del archivo:

```typescript
import { Toaster } from '~/components/ui/toaster'
```

**Paso 3: Agregar Toaster al body**

Buscar el `<body>` y agregar `<Toaster />` antes del cierre:

```tsx
<body>
  {/* ... contenido existente ... */}
  <Toaster />
</body>
```

**Paso 4: Verificar que compila**

```bash
pnpm run build
```

**Paso 5: Commit**

```bash
git add src/routes/__root.tsx
git commit -m "feat: add Toaster to root layout"
```

---

## Verificación Final de Fase 02

**Listar componentes instalados:**

```bash
ls src/components/ui/
```

Esperado: Todos los componentes listados:
- button.tsx
- navigation-menu.tsx
- dropdown-menu.tsx
- form.tsx
- input.tsx
- textarea.tsx
- select.tsx
- checkbox.tsx
- label.tsx
- card.tsx
- dialog.tsx
- sheet.tsx
- separator.tsx
- toast.tsx, toaster.tsx, use-toast.ts
- alert.tsx
- badge.tsx
- skeleton.tsx
- table.tsx
- tabs.tsx
- avatar.tsx

**Verificar build:**

```bash
pnpm run build
```

---

**Siguiente fase:** `fase-03-schema-productos.md`
