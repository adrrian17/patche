import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { alchemyDir } from "./env";

// oxlint-disable-next-line sonarjs/no-hardcoded-passwords -- Public local-only E2E credential.
export const password = "Patche-e2e-password-2026";
const emailLabel = "Correo electrónico";
const emailRoot = path.join(alchemyDir, "local/email/text");
const urlPattern = /https?:\/\/[^\s"'<>]+\/api\/auth\/[^\s"'<>]*/gu;

export async function emailLink(email: string, endpoint: string) {
  let url: string | undefined;
  await expect
    .poll(async () => {
      if (!existsSync(emailRoot)) {
        return;
      }
      const entries = await readdir(emailRoot, { recursive: true });
      const bodies = await Promise.all(
        entries
          .filter((entry) => entry.endsWith(".txt"))
          .map((entry) => readFile(path.join(emailRoot, entry), "utf-8"))
      );
      const urls = bodies
        .filter((body) => body.includes(email))
        .flatMap((body) =>
          [...body.matchAll(urlPattern)].map((match) => match[0])
        );
      url = urls.find((candidate) => candidate.includes(endpoint));
      return url;
    })
    .toBeDefined();
  if (!url) {
    throw new Error(`No ${endpoint} email for ${email}`);
  }
  return url;
}

export async function registerWithPassword(
  page: Page,
  { email, name }: { email: string; name: string }
) {
  const octets = crypto.getRandomValues(new Uint8Array(3));
  await page.setExtraHTTPHeaders({
    "cf-connecting-ip": `10.${octets.join(".")}`,
  });
  await page.goto("/login");
  await page
    .getByRole("button", { name: "¿Aún no tienes cuenta? Regístrate" })
    .click();
  await page.getByLabel("Nombre", { exact: true }).fill(name);
  await page.getByLabel(emailLabel).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { exact: true, name: "Crear cuenta" }).click();
  await expect(
    page.getByRole("heading", { name: "Verifica tu correo" })
  ).toBeVisible();
  await page.goto(await emailLink(email, "/verify-email?"));
  await page.waitForURL("**/dashboard");
}

export async function signIn(page: Page, email: string, value = password) {
  await page.goto("/login");
  await page.getByLabel(emailLabel).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(value);
  await page
    .getByRole("button", { exact: true, name: "Iniciar sesión" })
    .click();
}

export async function requestReset(page: Page, email: string) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Olvidé mi contraseña" }).click();
  await page.getByLabel(emailLabel).fill(email);
  await page.getByRole("button", { exact: true, name: "Enviar" }).click();
  await expect(page.getByRole("status")).toContainText("Si existe una cuenta");
}
