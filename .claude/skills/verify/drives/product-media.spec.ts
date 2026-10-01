import { writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { seedProduct, signedInEmail } from "../../../../apps/web/e2e/support/seed-product";
import { findRows } from "./d1";

test.use({ storageState: "../../.verify/auth/admin.json" });

// 1x1 transparent PNG.
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

const altsInOrder = (page: Page) =>
  page
    .getByRole("list", { name: "Imágenes del producto" })
    .getByRole("img")
    .evaluateAll((images) => images.map((image) => image.getAttribute("alt")));

const mediaItem = (page: Page, alt: string) =>
  page.getByRole("listitem").filter({ has: page.getByAltText(alt) });

test("Admin uploads, reorders, renames, deletes, and views product images", async ({ page }, testInfo) => {
  const shot = (step: string) => page.screenshot({ path: testInfo.outputPath(`${step}.png`) });
  // Media is the feature under test, so the product itself is a seeded precondition.
  const name = `Libreta Media ${crypto.randomUUID().slice(0, 8)}`;
  const productId = seedProduct(name, await signedInEmail(page));
  await page.goto(`/admin/products/${productId}`);

  // media-upload
  const dialog = page.getByRole("dialog", { name: "Añadir imágenes" });
  await expect(async () => {
    if (!(await dialog.isVisible())) {
      await page.getByRole("button", { name: "Añadir imágenes" }).click({ timeout: 2000 });
    }
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass();
  await dialog.getByLabel("Seleccionar imágenes").setInputFiles(
    ["uno", "dos", "tres"].map((file) => ({ buffer: png, mimeType: "image/png", name: `${file}.png` }))
  );
  for (const file of ["uno", "dos", "tres"]) {
    // oxlint-disable-next-line no-await-in-loop -- parallel fills fight over focus
    await dialog.getByLabel(`Texto alternativo de ${file}.png`).fill(`Foto ${file}`);
  }
  await shot("1-upload-dialog");
  await dialog.getByRole("button", { name: "Subir 3 imágenes" }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => altsInOrder(page)).toEqual(["Foto uno", "Foto dos", "Foto tres"]);
  await shot("2-uploaded");

  // media-reorder by drag, then by keyboard
  await mediaItem(page, "Foto tres").dragTo(mediaItem(page, "Foto uno"));
  await expect.poll(() => altsInOrder(page)).toEqual(["Foto tres", "Foto uno", "Foto dos"]);
  await page.getByRole("button", { name: /^Reordenar Foto dos/u }).press("ArrowLeft");
  await expect.poll(() => altsInOrder(page)).toEqual(["Foto tres", "Foto dos", "Foto uno"]);
  await shot("3-reordered");

  // media-alt
  const altInput = page.getByRole("textbox", { name: "Texto alternativo de Foto uno" });
  await altInput.fill("Contraportada");
  await altInput.press("Enter");
  await expect.poll(() => altsInOrder(page)).toEqual(["Foto tres", "Foto dos", "Contraportada"]);

  // media-delete
  await page.getByRole("button", { name: "Eliminar Foto dos" }).click();
  await page.getByRole("alertdialog", { name: "¿Eliminar imagen?" }).getByRole("button", { name: "Eliminar" }).click();
  await expect.poll(() => altsInOrder(page)).toEqual(["Foto tres", "Contraportada"]);

  // media-viewer
  await page.getByRole("button", { name: "Ver en grande: Foto tres" }).click();
  const viewer = page.getByRole("dialog", { name: "Foto tres" });
  await expect(viewer.getByText("1 de 2")).toBeVisible();
  await shot("4-viewer");
  await viewer.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "Contraportada" })).toBeVisible();
  await page.keyboard.press("Escape");

  // Every change must survive a reload, so it came from D1 and not local state.
  await page.reload();
  await expect.poll(() => altsInOrder(page)).toEqual(["Foto tres", "Contraportada"]);
  await shot("5-after-reload");

  const rows = findRows("SELECT alt, sort, r2_key FROM product_media WHERE product_id = ? ORDER BY sort", productId);
  await writeFile(testInfo.outputPath("6-d1-media.json"), JSON.stringify(rows, null, 2));
  expect(rows.map((row) => row.alt)).toEqual(["Foto tres", "Contraportada"]);
  const served = await page.request.get(`/api/media/${rows[0]?.r2_key}`);
  expect(served.status()).toBe(200);
  expect(served.headers()["content-type"]).toContain("image/png");

  // media-cover
  await page.goto("/admin/products");
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row.getByRole("img", { name: "Foto tres" })).toBeVisible();
  await expect(row.getByRole("img", { name: "Contraportada" })).toHaveCount(0);
  await shot("7-cover-in-list");
});
