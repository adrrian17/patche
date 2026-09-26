import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { seedProduct } from "./support/seed-product";

test.use({ storageState: "e2e/.auth/admin.json" });

// 1x1 transparent PNG.
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

function mediaAlts(page: Page) {
  return page
    .getByRole("list", { name: "Imágenes del producto" })
    .getByRole("img");
}

function mediaItem(page: Page, alt: string) {
  return page.getByRole("listitem").filter({ has: page.getByAltText(alt) });
}

function mediaAltsInOrder(page: Page) {
  return mediaAlts(page).evaluateAll((images) =>
    images.map((image) => image.getAttribute("alt"))
  );
}

test("uploads several images at once and reorders them", async ({
  page,
}, testInfo) => {
  const session = await page.request.get("/api/auth/get-session");
  // SAFETY: the admin storageState always carries a signed-in Better Auth session.
  const { user } = (await session.json()) as { user: { email: string } };
  const productId = seedProduct("Libreta de medios", user.email);
  await page.goto(`/admin/products/${productId}`);

  // A click before hydration does nothing, so retry until the dialog opens.
  const dialog = page.getByRole("dialog", { name: "Añadir imágenes" });
  await expect(async () => {
    await page
      .getByRole("button", { name: "Añadir imágenes" })
      .click({ timeout: 2000 });
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass();

  await dialog.getByLabel("Seleccionar imágenes").setInputFiles(
    ["uno", "dos", "tres"].map((name) => ({
      buffer: png,
      mimeType: "image/png",
      name: `${name}.png`,
    }))
  );
  for (const name of ["uno", "dos", "tres"]) {
    // oxlint-disable-next-line no-await-in-loop -- parallel fills fight over focus and mix the text
    await dialog
      .getByLabel(`Texto alternativo de ${name}.png`)
      .fill(`Foto ${name}`);
  }
  await dialog.getByRole("button", { name: "Subir 3 imágenes" }).click();
  await expect(dialog).toBeHidden();
  await expect(mediaAlts(page)).toHaveCount(3);
  expect(await mediaAltsInOrder(page)).toEqual([
    "Foto uno",
    "Foto dos",
    "Foto tres",
  ]);

  await mediaItem(page, "Foto tres").dragTo(mediaItem(page, "Foto uno"));
  await expect
    .poll(() => mediaAltsInOrder(page))
    .toEqual(["Foto tres", "Foto uno", "Foto dos"]);

  await mediaItem(page, "Foto dos").dragTo(mediaItem(page, "Foto tres"));
  await expect
    .poll(() => mediaAltsInOrder(page))
    .toEqual(["Foto dos", "Foto tres", "Foto uno"]);

  // Keyboard users reorder through the grip button.
  await page
    .getByRole("button", { name: /^Reordenar Foto dos/u })
    .press("ArrowRight");
  await expect
    .poll(() => mediaAltsInOrder(page))
    .toEqual(["Foto tres", "Foto dos", "Foto uno"]);

  const altInput = page.getByRole("textbox", {
    name: "Texto alternativo de Foto uno",
  });
  await altInput.fill("Portada de la libreta");
  await altInput.press("Enter");
  await expect
    .poll(() => mediaAltsInOrder(page))
    .toEqual(["Foto tres", "Foto dos", "Portada de la libreta"]);

  await page.getByRole("button", { name: "Eliminar Foto dos" }).click();
  await page
    .getByRole("alertdialog", { name: "¿Eliminar imagen?" })
    .getByRole("button", { name: "Eliminar" })
    .click();
  await expect
    .poll(() => mediaAltsInOrder(page))
    .toEqual(["Foto tres", "Portada de la libreta"]);

  await page.getByRole("button", { name: "Ver en grande: Foto tres" }).click();
  const viewer = page.getByRole("dialog", { name: "Foto tres" });
  await expect(viewer.getByText("1 de 2")).toBeVisible();
  await viewer.press("ArrowRight");
  await expect(
    page.getByRole("dialog", { name: "Portada de la libreta" })
  ).toBeVisible();
  await page.keyboard.press("Escape");

  // Every change must survive a reload, so it came from D1 and not local state.
  await page.reload();
  await expect
    .poll(() => mediaAltsInOrder(page))
    .toEqual(["Foto tres", "Portada de la libreta"]);
  await testInfo.attach("product-media", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
