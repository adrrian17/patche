import { expect, test } from "@playwright/test";

import {
  seedProduct,
  seedVariant,
  signedInEmail,
} from "./support/seed-product";

test.use({ storageState: "e2e/.auth/admin.json" });

// 1x1 transparent PNG.
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

test("lists each product with its main image and variant prices", async ({
  page,
}, testInfo) => {
  const adminEmail = await signedInEmail(page);
  const name = `Agenda ${crypto.randomUUID().slice(0, 8)}`;
  const productId = seedProduct(name, adminEmail);
  seedVariant(adminEmail, {
    name: "Tapa dura",
    priceAmount: 25_000,
    productId,
  });
  seedVariant(adminEmail, {
    name: "Tapa blanda",
    priceAmount: 18_000,
    productId,
  });
  for (const alt of ["Portada", "Interior"]) {
    // oxlint-disable-next-line no-await-in-loop -- uploads must land in order so Portada is the main image
    const upload = await page.request.post("/api/admin/media", {
      multipart: {
        alt,
        file: { buffer: png, mimeType: "image/png", name: `${alt}.png` },
        productId,
      },
    });
    expect(upload.ok()).toBe(true);
  }

  await page.goto("/admin/products");
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row.getByRole("img", { name: "Portada" })).toBeVisible();
  await expect(row.getByRole("img", { name: "Interior" })).toHaveCount(0);

  // A click before hydration does nothing, so retry until the variants show.
  const variants = page.getByRole("list", { name: `Variantes de ${name}` });
  await expect(async () => {
    if (!(await variants.isVisible())) {
      await row
        .getByRole("button", { name: /2 variantes/u })
        .click({ timeout: 2000 });
    }
    await expect(variants).toBeVisible({ timeout: 2000 });
  }).toPass();
  await expect(variants.getByRole("listitem")).toHaveText([
    /Tapa blanda.*\$180\.00/u,
    /Tapa dura.*\$250\.00/u,
  ]);
  await expect(page).toHaveURL(/\/admin\/products$/u);

  await row.getByRole("button", { name: "Ver en grande: Portada" }).click();
  await expect(page.getByRole("dialog", { name: "Portada" })).toBeVisible();
  await page.keyboard.press("Escape");

  await testInfo.attach("product-list", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
