import { expect, test } from "@playwright/test";

import { registerCustomer } from "./support/password-auth";
import { seedOrder } from "./support/seed-order";
import { seedProduct, seedVariant } from "./support/seed-product";

const day = 86_400_000;

function seedCatalog(email: string) {
  const suffix = crypto.randomUUID().slice(0, 8);
  const notebookName = `Libreta Pedidos ${suffix}`;
  const plannerName = `Planner Digital ${suffix}`;
  const notebookId = seedVariant(email, {
    name: "Tapa dura",
    priceAmount: 25_000,
    productId: seedProduct(notebookName, email, "active"),
  });
  const plannerProductId = seedProduct(plannerName, email, "active");
  const plannerId = seedVariant(email, {
    digitalFile: { key: `e2e/${suffix}.pdf`, name: "planner.pdf" },
    name: "PDF imprimible",
    priceAmount: 9900,
    productId: plannerProductId,
  });
  const calendarId = seedVariant(email, {
    digitalFile: { key: `e2e/${suffix}-cal.pdf`, name: "calendario.pdf" },
    name: "Calendario PDF",
    priceAmount: 5000,
    productId: plannerProductId,
  });
  // A digital Variant can be sold before the Admin uploads its file.
  const stickersId = seedVariant(email, {
    kind: "digital",
    name: "Stickers sin archivo",
    priceAmount: 3000,
    productId: plannerProductId,
  });
  return {
    calendarId,
    notebookId,
    notebookName,
    plannerId,
    plannerName,
    stickersId,
  };
}

test("shows an empty state before the first purchase", async ({
  page,
}, testInfo) => {
  await registerCustomer(page, "Cliente Sin Pedidos");
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { level: 1, name: "Mis pedidos" })
  ).toBeVisible();
  await expect(page.getByText("Aún no tienes pedidos")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Explorar la tienda" })
  ).toBeVisible();
  await testInfo.attach("empty-orders", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("lists Orders, opens one, and downloads through its Download Grant", async ({
  page,
}, testInfo) => {
  const email = await registerCustomer(page, "Cliente Pedidos");
  const catalog = seedCatalog(email);
  const paid = seedOrder(email, {
    createdAt: new Date(Date.now() - day),
    fulfillmentStatus: "shipped",
    items: [
      {
        kind: "physical",
        productName: catalog.notebookName,
        quantity: 2,
        unitAmount: 25_000,
        variantId: catalog.notebookId,
        variantName: "Tapa dura",
      },
      {
        grant: "active",
        kind: "digital",
        productName: catalog.plannerName,
        quantity: 1,
        unitAmount: 9900,
        variantId: catalog.plannerId,
        variantName: "PDF imprimible",
      },
      {
        grant: "revoked",
        kind: "digital",
        productName: catalog.plannerName,
        quantity: 1,
        unitAmount: 5000,
        variantId: catalog.calendarId,
        variantName: "Calendario PDF",
      },
      {
        grant: "active",
        kind: "digital",
        productName: catalog.plannerName,
        quantity: 1,
        unitAmount: 3000,
        variantId: catalog.stickersId,
        variantName: "Stickers sin archivo",
      },
    ],
    paymentStatus: "succeeded",
    shipping: {
      address: {
        city: "Monterrey",
        country: "MX",
        line1: "Av. Constitución 100",
        line2: null,
        postalCode: "64000",
        state: "Nuevo León",
      },
      name: "Cliente Pedidos",
    },
    shippingAmount: 9900,
  });
  const pending = seedOrder(email, {
    createdAt: new Date(Date.now() - 2 * day),
    items: [
      {
        grant: "active",
        kind: "digital",
        productName: catalog.plannerName,
        quantity: 1,
        unitAmount: 9900,
        variantId: catalog.plannerId,
        variantName: "PDF imprimible",
      },
    ],
    paymentStatus: "pending",
    shippingAmount: 0,
  });

  await page.goto("/dashboard");
  const orderLinks = page
    .getByRole("region", { name: "Mis pedidos" })
    .getByRole("listitem")
    .getByRole("link");
  await expect(orderLinks).toHaveCount(2);
  // Newest first: the paid Order was placed a day after the pending one.
  await expect(orderLinks.nth(0)).toContainText(`Pedido ${paid.orderId}`);
  await expect(orderLinks.nth(0)).toContainText("$778.00");
  await expect(orderLinks.nth(0)).toContainText("Pagado");
  await expect(orderLinks.nth(0)).toContainText("Enviado");
  await expect(orderLinks.nth(1)).toContainText(`Pedido ${pending.orderId}`);
  await expect(orderLinks.nth(1)).toContainText("Pago pendiente");
  await expect(orderLinks.nth(1)).toContainText("Por preparar");

  await orderLinks.nth(0).click();
  await expect(page).toHaveURL(`/dashboard/orders/${paid.orderId}`);
  await expect(
    page.getByRole("heading", { level: 1, name: `Pedido ${paid.orderId}` })
  ).toBeVisible();
  const items = page.getByRole("listitem");
  const notebook = items.filter({ hasText: catalog.notebookName });
  await expect(notebook).toContainText("Tapa dura · Físico");
  await expect(notebook).toContainText("2 × $250.00");
  await expect(notebook.getByRole("button")).toHaveCount(0);
  const missingFile = items.filter({ hasText: "Stickers sin archivo" });
  await expect(missingFile).toContainText(
    "Este archivo no está disponible para descarga."
  );
  await expect(missingFile.getByRole("button")).toHaveCount(0);
  const revoked = items.filter({ hasText: "Calendario PDF" });
  await expect(revoked).toContainText(
    "Este archivo no está disponible para descarga."
  );
  await expect(page.getByText("$679.00", { exact: true })).toBeVisible();
  await expect(page.getByText("$778.00", { exact: true })).toBeVisible();
  await expect(page.getByText("Av. Constitución 100")).toBeVisible();
  await expect(page.getByText("64000 Monterrey")).toBeVisible();
  await testInfo.attach("order-detail", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  // The seeded file key has no object in R2; digital-download.spec.ts covers a real upload.
  // "Archivo no encontrado" is the reply that comes only after the grant passed every check.
  const [grantId] = paid.grantIds;
  const downloadButton = items
    .filter({ hasText: "PDF imprimible" })
    .getByRole("button", { name: "Descargar" });
  await expect(downloadButton).toBeEnabled({ timeout: 25_000 });
  const downloadResponse = page.waitForResponse(`**/api/download/${grantId}`);
  await downloadButton.click();
  const response = await downloadResponse;
  expect(response.status()).toBe(404);
  expect(await response.text()).toBe("Archivo no encontrado");

  // A pending payment keeps the grant locked even though it exists.
  await page.goto(`/dashboard/orders/${pending.orderId}`);
  await expect(
    page.getByText("Este archivo no está disponible para descarga.")
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Descargar" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Envío" })).toHaveCount(0);
});

test("hides another Customer's Order and refuses its download", async ({
  page,
}, testInfo) => {
  const ownerEmail = await registerCustomer(page, "Dueño Pedido");
  const catalog = seedCatalog(ownerEmail);
  const owned = seedOrder(ownerEmail, {
    createdAt: new Date(),
    items: [
      {
        grant: "active",
        kind: "digital",
        productName: catalog.plannerName,
        quantity: 1,
        unitAmount: 9900,
        variantId: catalog.plannerId,
        variantName: "PDF imprimible",
      },
    ],
    paymentStatus: "succeeded",
    shippingAmount: 0,
  });

  await registerCustomer(page, "Otro Cliente");
  await page.goto("/dashboard");
  await expect(page.getByText("Aún no tienes pedidos")).toBeVisible();

  await page.goto(`/dashboard/orders/${owned.orderId}`);
  await expect(
    page.getByRole("heading", { name: "No encontramos ese pedido" })
  ).toBeVisible();
  await expect(page.getByText(catalog.plannerName)).toHaveCount(0);

  const [grantId] = owned.grantIds;
  const response = await page.request.get(`/api/download/${grantId}`);
  expect(response.status()).toBe(404);
  expect(await response.text()).toBe("Download no disponible");
  await testInfo.attach("foreign-order", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
