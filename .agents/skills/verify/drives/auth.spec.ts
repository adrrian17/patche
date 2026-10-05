import { writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import {
  emailLink,
  password,
  requestReset,
  signIn,
} from "../../../../apps/web/e2e/support/password-auth";
import { findRow } from "./d1";

const newPassword = "Verify-new-password-2026";

test("Customer registers, verifies, signs out, signs in, and resets the password", async ({
  page,
}, testInfo) => {
  const shot = (step: string) => page.screenshot({ path: testInfo.outputPath(`${step}.png`) });
  const email = `auth-${crypto.randomUUID()}@verify.patche.test`;
  const name = "Cliente Auth";
  // Better Auth allows 3 sign-ins per IP every 10 seconds, so each phase uses its own address.
  const freshIp = () =>
    page.setExtraHTTPHeaders({ "cf-connecting-ip": `10.${crypto.getRandomValues(new Uint8Array(3)).join(".")}` });
  await freshIp();

  // auth-register
  await page.goto("/");
  await page.getByRole("link", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/u);
  await page.getByRole("button", { name: "¿Aún no tienes cuenta? Regístrate" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill(name);
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { exact: true, name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Verifica tu correo" })).toBeVisible();
  await shot("1-verify-email-prompt");
  expect(findRow("SELECT email_verified FROM user WHERE email = ?", email)).toMatchObject({ email_verified: 0 });

  // auth-verify
  await page.goto(await emailLink(email, "/verify-email?"));
  await page.waitForURL("**/dashboard");
  await expect(page.getByText(`Bienvenido, ${name}`)).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await shot("2-dashboard-after-verify");

  // auth-signout: the button is disabled until hydration.
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeEnabled();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/u);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/u);
  await shot("3-dashboard-redirects-after-signout");

  // auth-signin
  await signIn(page, email, "wrong-password");
  await expect(page.getByRole("alert").filter({ hasText: "Correo o contraseña incorrectos" })).toBeVisible();
  await shot("4-wrong-password");
  await signIn(page, email);
  await expect(page).toHaveURL(/\/dashboard$/u);

  // auth-roles: a Customer cannot stay on /admin.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard$/u);

  // auth-reset
  await freshIp();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/u);
  await requestReset(page, email);
  await shot("5-reset-requested");
  const resetLink = await emailLink(email, "/reset-password/");
  await page.goto(resetLink);
  await page.getByLabel("Nueva contraseña").fill(newPassword);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByText("Contraseña guardada. Inicia sesión con tu nueva contraseña.")).toBeVisible();
  await shot("6-password-saved");
  await signIn(page, email, password);
  await expect(page.getByRole("alert").filter({ hasText: "Correo o contraseña incorrectos" })).toBeVisible();
  await signIn(page, email, newPassword);
  await expect(page).toHaveURL(/\/dashboard$/u);
  await shot("7-signed-in-with-new-password");

  const user = findRow("SELECT email, email_verified, role FROM user WHERE email = ?", email);
  await writeFile(testInfo.outputPath("8-d1-user.json"), JSON.stringify(user, null, 2));
  expect(user).toMatchObject({ email_verified: 1, role: "user" });
});

test.describe("Admin", () => {
  test.use({ storageState: "../../.verify/auth/admin.json" });

  // auth-roles
  test("stays on /admin", async ({ page }, testInfo) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/u);
    await expect(page.getByText(/^admin-.+@verify\.patche\.test$/u)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("admin-home.png") });
  });
});
