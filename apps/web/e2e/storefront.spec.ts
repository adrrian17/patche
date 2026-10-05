import { expect, test } from "@playwright/test";

import {
  seedProduct,
  seedStock,
  seedVariant,
  signedInEmail,
} from "./support/seed-product";

test.use({ storageState: "e2e/.auth/customer.json" });

test("a Customer finds a Product, fills the cart, and reaches Stripe Checkout", async ({
  page,
}, testInfo) => {
  function shot(step: string) {
    return page.screenshot({
      fullPage: true,
      path: testInfo.outputPath(`${step}.png`),
    });
  }
  const email = await signedInEmail(page);
  const productName = `Agenda Tienda ${crypto.randomUUID().slice(0, 8)}`;
  const productId = seedProduct(productName, email, "active");
  const variantId = seedVariant(email, {
    name: "Tapa dura",
    priceAmount: 32_000,
    productId,
  });
  seedStock(email, variantId, 3);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Organiza tu flujo creativo/u })
  ).toBeVisible();
  await shot("1-home");

  await page.getByRole("searchbox", { name: "Buscar" }).fill(productName);
  await page.getByRole("searchbox", { name: "Buscar" }).press("Enter");
  await expect(page).toHaveURL(/\/products\?q=/u);
  await shot("2-catalog-search");

  // The card link does nothing until the page hydrates, so retry the click until the Product page opens.
  await expect(async () => {
    await page.getByRole("link", { name: productName }).first().click();
    await expect(page).toHaveURL(/\/products\/e2e-/u, { timeout: 1500 });
  }).toPass({ timeout: 15_000 });
  // The URL changes before the Product loader resolves, so the catalog's headings can still be on screen.
  await expect(
    page.getByRole("heading", { exact: true, level: 1, name: productName })
  ).toBeVisible();
  await expect(page.getByText("$320.00").first()).toBeVisible();
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  const cartLink = page.getByRole("link", { name: /Carrito, 1 artículo/u });
  await expect(cartLink).toBeVisible();
  await shot("3-product-added");

  await cartLink.click();
  await expect(
    page.getByRole("heading", { name: "Carrito de compras" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Aumentar cantidad" }).click();
  await expect(page.getByText("$640.00").first()).toBeVisible();
  await shot("4-cart");

  await page.getByRole("button", { name: "Proceder al pago" }).click();
  await expect(page).toHaveURL(/checkout\.stripe\.com/u, { timeout: 15_000 });
});
