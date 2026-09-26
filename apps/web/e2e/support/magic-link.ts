import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { alchemyDir } from "./env";

// `alchemy dev` writes each sent email as an .eml file under local/email.
const emailRoot = path.join(alchemyDir, "local/email");
const urlPattern =
  /https?:\/\/[^\s"'<>]+\/api\/auth\/magic-link\/verify[^\s"'<>]*/u;

async function findMagicLinkUrl(email: string) {
  if (!existsSync(emailRoot)) {
    return;
  }
  const entries = await readdir(emailRoot, { recursive: true });
  const bodies = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".eml"))
      .map((entry) => readFile(path.join(emailRoot, entry), "utf-8"))
  );
  // The email body names its recipient, so parallel logins never cross.
  const body = bodies.find((text) => text.includes(email));
  return body ? urlPattern.exec(body)?.[0] : undefined;
}

export async function registerWithMagicLink(
  page: Page,
  { email, name }: { email: string; name: string }
) {
  await page.goto("/login");
  // A click before hydration does a native GET submit and sends nothing, so retry until the confirmation shows.
  await expect(async () => {
    await page.getByLabel("Nombre").fill(name);
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByRole("button", { name: "Enviar enlace" }).click();
    await expect(
      page.getByRole("heading", { name: "Tu enlace está en camino" })
    ).toBeVisible({ timeout: 2000 });
  }).toPass();

  let url: string | undefined;
  await expect
    .poll(async () => {
      url = await findMagicLinkUrl(email);
      return url;
    })
    .toBeDefined();
  await page.goto(url ?? "");
  await page.waitForURL("**/dashboard");
}
