# Admin catalog

An Admin manages the store catalog: creates categories, creates products with a category and status, adds variants with SKU and price, edits prices, and archives variants and products.

## Sub-features

- `catalog-category` creates a category from `/admin/categories`.
- `catalog-product` creates a product and opens its detail page.
- `catalog-variant` adds a variant with SKU and price in cents.
- `catalog-price` edits a variant price.
- `catalog-archive` archives and unarchives a variant, and archives a product.

## How to get to it (user POV)

- Sidebar `Categorías` (`/admin/categories`), button `Nueva categoría`.
- Sidebar `Productos` (`/admin/products`), button `Nuevo producto`.
- Product detail `/admin/products/<id>`, button `Nueva variante`, and per-variant card buttons `Editar` and `Archivar`.

## Driving it with Playwright

Preconditions:

- `test.use({ storageState: "../../.verify/auth/admin.json" })`.
- Worked example: `drives/admin-catalog.spec.ts` covers `catalog-category`, `catalog-product`, and `catalog-variant`, and checks D1.

- **Category.** On `/admin/categories`, open dialog `Nueva categoría`, fill label `Nombre`, click `Crear categoría`. Toast `Categoría creada` appears.
- **Product.** On `/admin/products`, open dialog `Nuevo producto`, fill `Nombre` and `Descripción`, pick combobox `Categoría` then option `<category>`, pick combobox `Estado` then option `Activo`, click `Crear producto`. URL matches `/admin/products/<id>`.
- **Variant.** Open dialog `Nueva variante`, fill `Nombre`, `SKU`, `Precio en centavos` (`25000`), click `Crear variante`. A card shows the variant name and `Físico · $250.00 · <SKU>`.
- **Price.** In the variant card (`[data-slot="card"]` filtered by the variant name), click `Editar`; in dialog `Editar <variant>` set `Precio en centavos` to `27500` and click `Guardar`. Text `Físico · $275.00` appears and survives a reload.
- **Archive.** Card button `Archivar` shows `Archivado`; `Desarchivar` removes it. The product-level `Archivar` (first on the page) makes the `/admin/products` row show `Archivado`.
- **Proof.** Screenshot after each step; save `findRow` of `variant` joined to `product` and `category` (see the spec) as JSON.

## Gotchas

- Dialog trigger buttons ignore clicks before hydration; use the `openDialog` retry in the worked spec.
- The category combobox options render in a portal: query `page.getByRole("option")`, not the dialog.
- Full-page screenshots on the detail page show the sticky header stitched mid-page. Use viewport screenshots when the header matters.
- Prices are entered in cents and displayed in MXN (`$250.00`).
