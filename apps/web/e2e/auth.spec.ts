import { expect, test } from "@playwright/test";

import { registerWithMagicLink } from "./support/magic-link";

// Each test registers its own user, so signing out never kills the shared storageState sessions.
function uniqueEmail(label: string) {
  return `${label}-${crypto.randomUUID()}@e2e.patche.test`;
}

test("registers through a magic link and lands on the dashboard", async ({
  page,
}) => {
  const email = uniqueEmail("register");
  await registerWithMagicLink(page, { email, name: "Nueva Cliente" });

  await expect(page.getByText("Bienvenido, Nueva Cliente")).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});

test("signs out and loses access to the dashboard", async ({ page }) => {
  await registerWithMagicLink(page, {
    email: uniqueEmail("signout"),
    name: "Cliente Saliente",
  });

  // A click before hydration does nothing, so retry until the redirect lands.
  await expect(async () => {
    if (!page.url().endsWith("/login")) {
      await page
        .getByRole("button", { name: "Cerrar sesión" })
        .click({ timeout: 2000 });
    }
    await expect(page).toHaveURL(/\/login$/u, { timeout: 2000 });
  }).toPass();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/u);
});

test.describe("Customer", () => {
  test.use({ storageState: "e2e/.auth/customer.json" });

  test("is sent away from /admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard$/u);
  });
});
