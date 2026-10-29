import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { baseURL } from "./support/env";

test.use({ storageState: "e2e/.auth/admin.json" });

// 1x1 PNGs in two colors, so a replacement is a different file.
const firstPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);
const secondPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN44JAAAAOEAYHRaWEwAAAAAElFTkSuQmCC",
  "base64"
);

// Home images are decorative (alt=""), so they are found by their R2 source.
function slotImage(page: Page, slot: string) {
  return page.locator(`main img[src*="/api/media/home/${slot}/"]`);
}

async function uploadHero(page: Page, png: Buffer) {
  const section = page.getByRole("region", { name: "Imágenes de inicio" });
  // A change before hydration does nothing, so retry until the upload lands.
  await expect(async () => {
    await page.reload();
    await section
      .getByLabel("Imagen principal")
      .setInputFiles({ buffer: png, mimeType: "image/png", name: "hero.png" });
    await expect(page.getByText("Imagen guardada")).toBeVisible({
      timeout: 3000,
    });
  }).toPass({ timeout: 20_000 });
}

async function heroSrc(page: Page) {
  await page.goto("/");
  const hero = slotImage(page, "hero");
  await expect(hero).toHaveAttribute("alt", "");
  await expect
    .poll(() => hero.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(1);
  return (await hero.getAttribute("src")) ?? "";
}

test("the Admin replaces the Home hero image stored in R2", async ({
  page,
}, testInfo) => {
  await page.goto("/admin/settings");
  await uploadHero(page, firstPng);
  const firstSrc = await heroSrc(page);

  await page.goto("/admin/settings");
  await uploadHero(page, secondPng);
  const secondSrc = await heroSrc(page);
  expect(secondSrc).not.toBe(firstSrc);

  const oldImage = await page.request.get(new URL(firstSrc, baseURL).href);
  expect(oldImage.status()).toBe(404);

  // No test uploads the pens slot, so it shows the color panel, not a broken image.
  await expect(slotImage(page, "pens")).toHaveCount(0);
  await testInfo.attach("home-with-r2-hero", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("a visitor cannot upload Home images", async ({ playwright }) => {
  // newContext inherits the file's admin storageState unless it is cleared.
  const anonymous = await playwright.request.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] },
  });
  const form = new FormData();
  form.set("slot", "hero");
  form.set("file", new Blob([firstPng], { type: "image/png" }), "hero.png");
  const response = await anonymous.post("/api/admin/home-images", {
    headers: { origin: baseURL },
    multipart: form,
  });
  expect(response.status()).toBe(403);
  await anonymous.dispose();
});
