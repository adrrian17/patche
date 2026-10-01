# Product media

An Admin uploads several images to a product at once with alt text, reorders them by drag or keyboard, edits alt text inline, deletes an image after confirming, and browses them in a full-size viewer. The first image is the cover shown in the product list.

## Sub-features

- `media-upload` uploads multiple images with per-file alt text.
- `media-reorder` reorders by drag and by the keyboard grip button.
- `media-alt` edits alt text inline.
- `media-delete` deletes an image through a confirmation dialog.
- `media-viewer` opens the viewer and pages with arrow keys.
- `media-cover` shows the first image as `Portada` in `/admin/products`.

## How to get to it (user POV)

- Product detail `/admin/products/<id>`, section `Imágenes`, button `Añadir imágenes`.
- Each image tile: grip button `Reordenar <alt>`, textbox `Texto alternativo de <alt>`, button `Eliminar <alt>`, button `Ver en grande: <alt>`.

## Driving it with Playwright

Preconditions:

- `admin.json` storage state. A product exists: create one through `admin-catalog`, or `seedProduct(name, adminEmail)` from `seed-product.ts` when media is the only feature under test (`signedInEmail(page)` returns the admin email).

- **Upload.** Open dialog `Añadir imágenes` (retry until visible), `getByLabel("Seleccionar imágenes").setInputFiles([...])` with PNG buffers, fill each `Texto alternativo de <file>.png`, click `Subir <n> imágenes`. The dialog closes and list `Imágenes del producto` has `<n>` images.
- **Reorder.** `mediaItem(a).dragTo(mediaItem(b))`, or focus `Reordenar <alt>` and press `ArrowRight`. Read order with `evaluateAll` over the list's `img` `alt` attributes.
- **Alt text.** Fill textbox `Texto alternativo de <alt>` and press `Enter`; the image alt updates.
- **Delete.** Click `Eliminar <alt>`, then `Eliminar` inside alertdialog `¿Eliminar imagen?`.
- **Viewer.** Click `Ver en grande: <alt>`; dialog `<alt>` shows `1 de <n>`; `ArrowRight` moves to the next image; `Escape` closes.
- **Proof.** Reload and assert the same order (proves D1, not local state); screenshot; save `findRow("SELECT alt, sort, r2_key FROM product_media WHERE product_id = ? ORDER BY sort", productId)` as JSON and fetch one `/api/media/<r2_key>` to confirm the object is served.

## Gotchas

- `findRow` returns one row; for the full ordering, open the D1 file with `libsql` the way `drives/d1.ts` does and call `.all()`.
- A 1x1 PNG buffer (see `product-media.spec.ts`) is enough for upload proofs.
- The order updates after a server round trip; assert it with `expect.poll`, not immediately after `dragTo`.
