import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const newsletterFlagOn = process.env.VITE_NEWSLETTER_ENABLED === "true";
const count = newsletterFlagOn ? 1 : 0;

function trackConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

function footerTracks(page: Page) {
  return page
    .locator("footer .grid")
    .first()
    .evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean)
          .length
    );
}

test("the server-rendered HTML carries the newsletter only when enabled", async ({
  request,
}, testInfo) => {
  const response = await request.get("/");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html.includes("home-newsletter-email")).toBe(newsletterFlagOn);
  expect(html.includes("footer-newsletter-email")).toBe(newsletterFlagOn);
  expect(html.includes("Únete a la comunidad Patche")).toBe(newsletterFlagOn);
  expect(html.includes("10% de descuento")).toBe(newsletterFlagOn);
  expect(html.includes("Boletín")).toBe(newsletterFlagOn);
  await testInfo.attach("server-rendered-home", {
    body: html,
    contentType: "text/html",
  });
});

test("the hydrated Home and footer match, without errors or gaps", async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page.locator("#home-newsletter-email")).toHaveCount(count);
  await expect(page.locator("#footer-newsletter-email")).toHaveCount(count);
  await expect(page.getByText("Únete a la comunidad Patche")).toHaveCount(
    count
  );
  await expect(page.getByText(/10% de descuento/u)).toHaveCount(count * 2);
  await expect(page.getByRole("heading", { name: "Boletín" })).toHaveCount(
    count
  );

  const sections = await page.locator("main section").all();
  const rendered = await Promise.all(
    sections.map(async (section) => {
      const box = await section.boundingBox();
      const text = await section.textContent();
      return { height: box?.height ?? 0, text: (text ?? "").trim() };
    })
  );
  for (const { height, text } of rendered) {
    expect(text).not.toBe("");
    expect(height).toBeGreaterThan(0);
  }

  expect(await footerTracks(page)).toBe(newsletterFlagOn ? 4 : 3);
  await testInfo.attach("desktop", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page.setViewportSize({ height: 800, width: 375 });
  expect(await footerTracks(page)).toBe(1);
  await testInfo.attach("mobile", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  expect(errors).toEqual([]);
});

if (newsletterFlagOn) {
  test("the enabled newsletter forms keep their placeholder handler", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const input = page.locator("#home-newsletter-email");
    // A submit before hydration reloads the page, so retry until the handler runs.
    await expect(async () => {
      await input.fill("visitante@example.com");
      await page.getByRole("button", { name: "Suscribirme" }).click();
      await expect(
        page.getByText("Muy pronto podrás suscribirte a nuestro boletín.")
      ).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15_000 });
    await expect(input).toHaveValue("");
  });
}
