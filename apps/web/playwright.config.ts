import { defineConfig, devices } from "@playwright/test";

import { baseURL, persistDir } from "./e2e/support/env";

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/u },
    {
      dependencies: ["setup"],
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  retries: process.env.CI ? 1 : 0,
  testDir: "./e2e",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    // Wipe the isolated D1/R2 state so every run starts clean.
    command: `rm -rf ${persistDir} && wrangler d1 migrations apply patche --local --config ../../wrangler.jsonc --persist-to ${persistDir} && vite dev`,
    env: { APP_ENV: "e2e", E2E_PERSIST_DIR: persistDir },
    // BETTER_AUTH_URL defaults to this port, so a running dev server must be stopped first.
    reuseExistingServer: false,
    timeout: 180_000,
    url: baseURL,
  },
  workers: process.env.CI ? 2 : undefined,
});
