import { writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { findRow } from "./d1";

test.use({ storageState: "../../.verify/auth/admin.json" });

// Dialog triggers ignore clicks that land before hydration, so retry until the dialog opens.
async function openDialog(page: import("@playwright/test").Page, button: string, dialogName = button) {
  const dialog = page.getByRole("dialog", { name: dialogName });
  await expect(async () => {
    if (!(await dialog.isVisible())) {
      await page.getByRole("button", { name: button }).click({ timeout: 2000 });
    }
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass();
  return dialog;
}

test("Admin creates a category, product, and variant", async ({ page }, testInfo) => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const category = `Libretas ${suffix}`;
  const product = `Libreta Verify ${suffix}`;
  const variant = `Tapa dura ${suffix}`;

  await page.goto("/admin/categories");
  const categoryDialog = await openDialog(page, "Nueva categoría");
  await categoryDialog.getByLabel("Nombre").fill(category);
  await categoryDialog.getByRole("button", { name: "Crear categoría" }).click();
  await expect(page.getByText("Categoría creada")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("1-category-created.png") });

  await page.goto("/admin/products");
  const productDialog = await openDialog(page, "Nuevo producto");
  await productDialog.getByLabel("Nombre").fill(product);
  await productDialog.getByLabel("Descripción").fill("Producto creado por /verify");
  await productDialog.getByRole("combobox", { name: "Categoría" }).click();
  await page.getByRole("option", { name: category }).click();
  await productDialog.getByRole("combobox", { name: "Estado" }).click();
  await page.getByRole("option", { name: "Activo" }).click();
  await productDialog.getByRole("button", { name: "Crear producto" }).click();
  await expect(page).toHaveURL(/\/admin\/products\/[^/]+$/u);

  const variantDialog = await openDialog(page, "Nueva variante");
  await variantDialog.getByLabel("Nombre").fill(variant);
  await variantDialog.getByLabel("SKU").fill(`VERIFY-${suffix}`);
  await variantDialog.getByLabel("Precio en centavos").fill("25000");
  await variantDialog.getByRole("button", { name: "Crear variante" }).click();
  await expect(page.getByText(variant, { exact: true })).toBeVisible();
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("2-variant-created.png") });

  // Side effect: the rows exist in local D1, linked to each other, not just rendered.
  const row = findRow(
    `SELECT p.status, v.price_amount, c.name AS category
       FROM variant v JOIN product p ON p.id = v.product_id
       LEFT JOIN category c ON c.id = p.category_id
      WHERE v.name = ?`,
    variant
  );
  await writeFile(testInfo.outputPath("3-d1-row.json"), JSON.stringify(row, null, 2));
  expect(row).toMatchObject({ category, price_amount: 25_000, status: "active" });
});
