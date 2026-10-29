import { writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { findRow } from "./d1";

test.use({ storageState: "../../.verify/auth/admin.json" });

// 1x1 PNGs in three colors.
const pngs = {
  "Escritura fina":
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN44JAAAAOEAYHRaWEwAAAAAElFTkSuQmCC",
  "Imagen principal":
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "Washi tapes":
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4cMAAAASEAeFrDGXYAAAAAElFTkSuQmCC",
};

const homeAlts = {
  hero: "Agenda verde de tapa dura sobre un escritorio",
  pens: "Selección de plumas finas",
  washi: "Rollos de washi tape con patrones",
};

test("the Admin fills the three Home image slots and the Home serves them from R2", async ({
  page,
}, testInfo) => {
  const shot = (name: string) =>
    page.screenshot({ fullPage: true, path: testInfo.outputPath(name) });

  await page.goto("/");
  await expect(page.getByRole("img", { name: homeAlts.hero })).toHaveCount(0);
  await shot("1-home-empty-slots.png");

  await page.goto("/admin/settings");
  const section = page.getByRole("region", { name: "Imágenes de inicio" });
  await expect(section).toBeVisible();
  await shot("2-settings-before.png");

  for (const [label, base64] of Object.entries(pngs)) {
    // oxlint-disable-next-line no-await-in-loop -- each upload waits for its own toast
    await expect(async () => {
      await section.getByLabel(label).setInputFiles({
        buffer: Buffer.from(base64, "base64"),
        mimeType: "image/png",
        name: `${label}.png`,
      });
      await expect(page.getByText("Imagen guardada").first()).toBeVisible({
        timeout: 3000,
      });
    }).toPass({ timeout: 20_000 });
  }
  // Previews are decorative (alt=""), so they have no img role.
  await expect(section.locator("img")).toHaveCount(3);
  await shot("3-settings-after.png");

  await page.goto("/");
  const rows: Record<string, unknown> = {};
  for (const [slot, alt] of Object.entries(homeAlts)) {
    const image = page.getByRole("img", { name: alt });
    // oxlint-disable-next-line no-await-in-loop -- sequential checks keep the evidence ordered
    await expect(image).toHaveAttribute(
      "src",
      new RegExp(`/api/media/home/${slot}/`, "u")
    );
    // oxlint-disable-next-line no-await-in-loop -- sequential checks keep the evidence ordered
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBe(1);
    // oxlint-disable-next-line no-await-in-loop -- sequential checks keep the evidence ordered
    const src = (await image.getAttribute("src")) ?? "";
    const key = new URL(src, "http://localhost").pathname.replace("/api/media/", "");
    const row = findRow(
      "SELECT key, value FROM store_setting WHERE value = ?",
      key
    );
    expect(row).toEqual({ key: `home_image_${slot}`, value: key });
    rows[slot] = { row, src };
  }
  await shot("4-home-from-r2.png");
  await writeFile(
    testInfo.outputPath("store-setting-rows.json"),
    JSON.stringify(rows, null, 2)
  );
});
