import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { registerCustomer } from "./support/password-auth";
import { seedOrder } from "./support/seed-order";
import {
  seedProduct,
  seedVariant,
  signedInEmail,
} from "./support/seed-product";

test.use({ storageState: "e2e/.auth/admin.json" });

interface DigitalFixture {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

// Unique bytes per run, so a stale object from another test can never pass the comparison.
function digitalFixture(suffix: string): DigitalFixture {
  return {
    buffer: Buffer.from(
      `%PDF-1.4\n% Patche E2E ${crypto.randomUUID()}\n%%EOF\n`
    ),
    mimeType: "application/pdf",
    // The accent proves the filename survives the RFC 5987 encoding.
    name: `guía-${suffix}.pdf`,
  };
}

async function uploadDigitalFileAsAdmin(
  page: Page,
  productId: string,
  variantName: string,
  file: DigitalFixture
) {
  await page.goto(`/admin/products/${productId}`);
  const dialog = page.getByRole("dialog", { name: `Editar ${variantName}` });
  // A click before hydration does nothing, so retry until the dialog opens.
  await expect(async () => {
    await page.getByRole("button", { name: "Editar" }).click({ timeout: 2000 });
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass();
  await dialog.getByLabel("Archivo digital").setInputFiles(file);
  await expect(page.getByText("Archivo digital guardado")).toBeVisible({
    timeout: 15_000,
  });
  await expect(dialog).toContainText(file.name);
}

test("an uploaded Digital File downloads through a paid Download Grant", async ({
  browser,
  page,
}, testInfo) => {
  const adminEmail = await signedInEmail(page);
  const suffix = crypto.randomUUID().slice(0, 8);
  const productName = `Planner Descargable ${suffix}`;
  const variantName = `PDF ${suffix}`;
  const productId = seedProduct(productName, adminEmail, "active");
  const variantId = seedVariant(adminEmail, {
    kind: "digital",
    name: variantName,
    priceAmount: 9900,
    productId,
  });
  const file = digitalFixture(suffix);

  await uploadDigitalFileAsAdmin(page, productId, variantName, file);

  const customerContext = await browser.newContext({
    baseURL: "http://localhost:3001",
  });
  try {
    const customerPage = await customerContext.newPage();
    const customerEmail = await registerCustomer(
      customerPage,
      "Cliente Descarga"
    );
    const { grantIds, orderId } = seedOrder(customerEmail, {
      createdAt: new Date(),
      items: [
        {
          grant: "active",
          kind: "digital",
          productName,
          quantity: 1,
          unitAmount: 9900,
          variantId,
          variantName,
        },
      ],
      paymentStatus: "succeeded",
      shippingAmount: 0,
    });

    await customerPage.goto(`/dashboard/orders/${orderId}`);
    const downloadButton = customerPage
      .getByRole("listitem")
      .filter({ hasText: variantName })
      .getByRole("button", { name: "Descargar" });
    await expect(downloadButton).toBeEnabled({ timeout: 25_000 });
    const downloadEvent = customerPage.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe(file.name);
    const downloaded = await readFile(await download.path());
    expect(downloaded).toEqual(file.buffer);

    const [grantId] = grantIds;
    const response = await customerContext.request.get(
      `/api/download/${grantId}`
    );
    expect(response.status()).toBe(200);
    expect(response.headers()).toMatchObject({
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "content-type": file.mimeType,
      "x-content-type-options": "nosniff",
    });
    expect(await response.body()).toEqual(file.buffer);

    await testInfo.attach("downloaded-order", {
      body: await customerPage.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    await testInfo.attach(file.name, {
      body: downloaded,
      contentType: file.mimeType,
    });
  } finally {
    await customerContext.close();
  }
});

test("the local upload route refuses Customers and unknown intents", async ({
  browser,
  page,
}, testInfo) => {
  const body = Buffer.from("%PDF-1.4\n%%EOF\n");
  const headers = { "content-type": "application/pdf" };
  const unknown = await page.request.put(
    "/api/admin/digital-uploads/no-such-intent",
    { data: body, headers }
  );
  expect(unknown.status()).toBe(404);

  const customerContext = await browser.newContext({
    baseURL: "http://localhost:3001",
  });
  try {
    const customerPage = await customerContext.newPage();
    await registerCustomer(customerPage, "Cliente Curioso");
    const forbidden = await customerContext.request.put(
      "/api/admin/digital-uploads/no-such-intent",
      { data: body, headers }
    );
    expect(forbidden.status()).toBe(403);
    await testInfo.attach("customer-dashboard", {
      body: await customerPage.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  } finally {
    await customerContext.close();
  }
});
