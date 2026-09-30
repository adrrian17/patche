import { expect, test } from "@playwright/test";

import {
  emailLink,
  password,
  registerWithPassword,
  requestReset,
  signIn,
} from "./support/password-auth";
import { promoteToAdmin, removeCredential } from "./support/promote-to-admin";

// Each test registers its own user, so signing out never kills the shared storageState sessions.
test.afterEach(async ({ page }, testInfo) => {
  await page.screenshot({ path: testInfo.outputPath("auth-result.png") });
});

function uniqueEmail(label: string) {
  return `${label}-${crypto.randomUUID()}@e2e.patche.test`;
}

test("registers with a password and verified email and lands on the dashboard", async ({
  page,
}) => {
  const email = uniqueEmail("register");
  await page.goto("/login");
  await page
    .getByRole("button", { name: "¿Aún no tienes cuenta? Regístrate" })
    .click();
  await page.getByLabel("Nombre", { exact: true }).fill("Nueva Cliente");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { exact: true, name: "Crear cuenta" }).click();
  await expect(
    page.getByRole("heading", { name: "Verifica tu correo" })
  ).toBeVisible();
  const unverified = await page.request.post("/api/auth/sign-in/email", {
    data: {
      callbackURL: "http://localhost:3001/auth/continue",
      email,
      password,
    },
  });
  expect(unverified.status()).toBe(403);
  await page.goto(await emailLink(email, "/verify-email?"));
  await page.waitForURL("**/dashboard");

  await expect(page.getByText("Bienvenido, Nueva Cliente")).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});

test("signs out and loses access to the dashboard", async ({ page }) => {
  await registerWithPassword(page, {
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

test("rejects incorrect credentials and signs in with a password", async ({
  page,
}) => {
  const email = uniqueEmail("signin");
  await registerWithPassword(page, { email, name: "Cliente Contraseña" });
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/u);
  await signIn(page, email, "wrong-password");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Correo o contraseña incorrectos" })
  ).toBeVisible();
  await signIn(page, email);
  await expect(page).toHaveURL(/\/dashboard$/u);
});

test("recovers a legacy account, revokes sessions and rejects reused tokens", async ({
  page,
  browser,
}) => {
  const email = uniqueEmail("legacy");
  await registerWithPassword(page, { email, name: "Cliente Existente" });
  promoteToAdmin(email);
  const userId = removeCredential(email);
  const oldSession = await page.context().storageState();
  await requestReset(page, email);
  const link = await emailLink(email, "/reset-password/");
  await page.goto(link);
  const resetURL = page.url();
  await page.getByLabel("Nueva contraseña").fill("Patche-new-password-2026");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión" })
  ).toBeVisible();
  await signIn(page, email, password);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Correo o contraseña incorrectos" })
  ).toBeVisible();
  await signIn(page, email, "Patche-new-password-2026");
  await expect(page).toHaveURL(/\/admin$/u);
  const session = await page.request.get("/api/auth/get-session");
  const sessionData = await session.json();
  expect(sessionData.user.id).toBe(userId);
  expect(sessionData.user.name).toBe("Cliente Existente");
  expect(sessionData.user.role).toBe("admin");
  const context = await browser.newContext({ storageState: oldSession });
  const stalePage = await context.newPage();
  await stalePage.goto("http://localhost:3001/dashboard");
  await expect(stalePage).toHaveURL(/\/login$/u);
  await context.close();
  await page.goto(resetURL);
  await page.getByLabel("Nueva contraseña").fill("Another-password-2026");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "El enlace ya no es válido" })
  ).toBeVisible();
});

test("recovery does not disclose unknown accounts and rejects invalid links", async ({
  page,
}) => {
  await requestReset(page, uniqueEmail("unknown"));
  await page.goto("/reset-password?error=INVALID_TOKEN");
  await expect(page.getByRole("alert")).toContainText(
    "El enlace ya no es válido"
  );
  await expect(
    page.getByRole("button", { name: "Guardar contraseña" })
  ).toHaveCount(0);
  const response = await page.request.post("/api/auth/sign-in/magic-link", {
    data: { email: uniqueEmail("disabled") },
  });
  expect(response.status()).toBe(404);
});

test("replaces an existing password through recovery", async ({ page }) => {
  const email = uniqueEmail("reset");
  await registerWithPassword(page, { email, name: "Cliente Recuperación" });
  await requestReset(page, email);
  await page.goto(await emailLink(email, "/reset-password/"));
  await page.getByLabel("Nueva contraseña").fill("Replacement-password-2026");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión" })
  ).toBeVisible();
  await signIn(page, email);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Correo o contraseña incorrectos" })
  ).toBeVisible();
  await signIn(page, email, "Replacement-password-2026");
  await expect(page).toHaveURL(/\/dashboard$/u);
});
