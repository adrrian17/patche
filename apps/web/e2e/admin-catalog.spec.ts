import { expect, test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/admin.json" });

function uniqueName(prefix: string) {
  return `${prefix} ${crypto.randomUUID().slice(0, 8)}`;
}

test("creates catalog records, changes a price, and archives a product", async ({
  page,
}, testInfo) => {
  const category = uniqueName("Libretas");
  await page.goto("/admin/categories");
  await page.getByLabel("Nombre", { exact: true }).fill(category);
  const categoryCreated = page.getByText("Categoría creada");
  await expect(async () => {
    if (!(await categoryCreated.isVisible())) {
      await page.getByLabel("Nombre", { exact: true }).fill(category);
      await page
        .getByRole("button", { name: "Crear categoría" })
        .click({ timeout: 2000 });
    }
    await expect(categoryCreated).toBeVisible({ timeout: 2000 });
  }).toPass();
  const categoryName = page.getByRole("textbox", {
    name: `Nombre de ${category}`,
  });
  await expect(categoryName).toBeVisible();
  await page.reload();
  await expect(categoryName).toBeVisible();

  const product = uniqueName("Agenda");
  await page.goto("/admin/products");
  const productDialog = page.getByRole("dialog", { name: "Nuevo producto" });
  await expect(async () => {
    if (!(await productDialog.isVisible())) {
      await page
        .getByRole("button", { name: "Nuevo producto" })
        .click({ timeout: 2000 });
    }
    await expect(productDialog).toBeVisible({ timeout: 2000 });
  }).toPass();
  await productDialog.getByLabel("Nombre").fill(product);
  await productDialog.getByLabel("Descripción").fill("Prueba de catálogo E2E");
  await productDialog.getByRole("combobox", { name: "Categoría" }).click();
  await page.getByRole("option", { name: category }).click();
  await productDialog.getByRole("combobox", { name: "Estado" }).click();
  await page.getByRole("option", { name: "Activo" }).click();
  await productDialog.getByRole("button", { name: "Crear producto" }).click();
  await expect(page).toHaveURL(/\/admin\/products\/[^/]+$/u);
  await page.reload();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(product);
  await expect(page.getByRole("combobox", { name: "Categoría" })).toContainText(
    category
  );

  const variant = uniqueName("Tapa dura");
  const variantDialog = page.getByRole("dialog", { name: "Nueva variante" });
  await expect(async () => {
    if (!(await variantDialog.isVisible())) {
      await page
        .getByRole("button", { name: "Nueva variante" })
        .click({ timeout: 2000 });
    }
    await expect(variantDialog).toBeVisible({ timeout: 2000 });
  }).toPass();
  await variantDialog.getByLabel("Nombre").fill(variant);
  await variantDialog
    .getByLabel("SKU")
    .fill(`E2E-${crypto.randomUUID().slice(0, 8)}`);
  await variantDialog.getByLabel("Precio en centavos").fill("25000");
  await variantDialog.getByRole("button", { name: "Crear variante" }).click();
  await expect(page.getByText(variant, { exact: true })).toBeVisible();

  const variantCard = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText(variant, { exact: true }) });
  await variantCard.getByRole("button", { name: "Editar" }).click();
  const editDialog = page.getByRole("dialog", { name: `Editar ${variant}` });
  await editDialog.getByLabel("Precio en centavos").fill("27500");
  await editDialog.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText(/Físico · \$275\.00/u)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Físico · \$275\.00/u)).toBeVisible();

  await variantCard.getByRole("button", { name: "Archivar" }).click();
  await expect(variantCard.getByText("Archivado")).toBeVisible();
  await page.reload();
  await expect(variantCard.getByText("Archivado")).toBeVisible();

  await variantCard.getByRole("button", { name: "Desarchivar" }).click();
  await expect(variantCard.getByText("Archivado")).toBeHidden();
  await page.reload();
  await expect(variantCard.getByText("Archivado")).toBeHidden();
  await expect(
    variantCard.getByRole("button", { name: "Archivar" })
  ).toBeEnabled();

  await page.getByRole("button", { name: "Archivar" }).first().click();
  await expect(page).toHaveURL(/\/admin\/products$/u);
  const productRow = page.getByRole("row").filter({ hasText: product });
  await expect(productRow.getByText("Archivado")).toBeVisible();
  await page.reload();
  await expect(productRow.getByText("Archivado")).toBeVisible();

  await testInfo.attach("admin-catalog", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("records stock movements and shows the low stock warning", async ({
  page,
}, testInfo) => {
  const product = uniqueName("Inventario");
  await page.goto("/admin/products");
  const productDialog = page.getByRole("dialog", { name: "Nuevo producto" });
  await expect(async () => {
    if (!(await productDialog.isVisible())) {
      await page
        .getByRole("button", { name: "Nuevo producto" })
        .click({ timeout: 2000 });
    }
    await expect(productDialog).toBeVisible({ timeout: 2000 });
  }).toPass();
  await productDialog.getByLabel("Nombre").fill(product);
  await productDialog.getByRole("button", { name: "Crear producto" }).click();
  await expect(page).toHaveURL(/\/admin\/products\/[^/]+$/u);

  const variant = uniqueName("Papel");
  const variantDialog = page.getByRole("dialog", { name: "Nueva variante" });
  await expect(async () => {
    if (!(await variantDialog.isVisible())) {
      await page
        .getByRole("button", { name: "Nueva variante" })
        .click({ timeout: 2000 });
    }
    await expect(variantDialog).toBeVisible({ timeout: 2000 });
  }).toPass();
  await variantDialog.getByLabel("Nombre").fill(variant);
  await variantDialog
    .getByLabel("SKU")
    .fill(`E2E-${crypto.randomUUID().slice(0, 8)}`);
  await variantDialog.getByLabel("Precio en centavos").fill("18000");
  await variantDialog.getByRole("button", { name: "Crear variante" }).click();
  await expect(page.getByText(variant, { exact: true })).toBeVisible();

  const variantCard = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText(variant, { exact: true }) });
  await variantCard.getByRole("button", { name: "Editar" }).click();
  const editDialog = page.getByRole("dialog", { name: `Editar ${variant}` });
  await editDialog.getByLabel("Umbral de stock").fill("3");
  await editDialog.getByRole("button", { name: "Guardar" }).click();

  await page.goto("/admin/inventory");
  await page.getByRole("button", { name: "Registrar movimiento" }).click();
  const movementDialog = page.getByRole("dialog", {
    name: "Registrar movimiento",
  });
  const option = page.getByRole("option", { name: `${product} · ${variant}` });
  await expect(async () => {
    if (!(await option.isVisible())) {
      await movementDialog
        .getByRole("combobox", { name: "Variante" })
        .click({ timeout: 2000 });
    }
    await expect(option).toBeVisible({ timeout: 2000 });
  }).toPass();
  await option.click();
  await movementDialog.getByLabel("Cantidad").fill("1");
  await movementDialog.getByLabel("Nota").fill("Recepción E2E");
  await movementDialog.getByRole("button", { name: "Registrar" }).click();
  await expect(movementDialog).toBeHidden();
  const movementRow = page
    .getByRole("table")
    .getByRole("row")
    .filter({ hasText: variant });
  await expect(movementRow).toContainText("+1");
  await page.reload();
  await expect(movementRow).toContainText("+1");

  await page.goto("/admin");
  const warningRow = page.getByRole("row").filter({ hasText: variant });
  await expect(warningRow).toContainText("1");
  await expect(warningRow).toContainText("3");
  await testInfo.attach("low-stock-warning", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("saves the shipping rate to the catalog settings", async ({
  page,
}, testInfo) => {
  await page.goto("/admin/settings");
  const rate = page.getByLabel("Monto en MXN");
  await rate.fill("123.45");
  await page.getByRole("button", { name: "Guardar tarifa" }).click();
  await expect(page.getByText("Tarifa guardada")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Monto en MXN")).toHaveValue("123.45");
  await testInfo.attach("shipping-rate", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
