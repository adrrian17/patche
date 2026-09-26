import { defineConfig, devices } from "@playwright/test";

import { alchemyDir, baseURL } from "./e2e/support/env";

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
  // The HTML report is what CI uploads alongside traces when a test fails.
  reporter: [["list"], ["html", { open: "never" }]],
  retries: process.env.CI ? 1 : 0,
  testDir: "./e2e",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    // Dropping the e2e stage state makes Alchemy create a fresh local D1 and R2 each run.
    command: `rm -rf ${alchemyDir}/state/patche/e2e && cd ../../packages/infra && bunx alchemy dev --stage e2e`,
    env: { APP_ENV: "e2e" },
    // BETTER_AUTH_URL defaults to this port, so a running dev server must be stopped first.
    reuseExistingServer: false,
    timeout: 180_000,
    url: baseURL,
  },
  workers: process.env.CI ? 2 : undefined,
});
