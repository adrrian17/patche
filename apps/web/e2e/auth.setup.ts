import { test as setup } from "@playwright/test";

import { registerWithMagicLink } from "./support/magic-link";
import { promoteToAdmin } from "./support/promote-to-admin";

const runId = Date.now().toString(36);

setup("log in a Customer", async ({ page }) => {
  await registerWithMagicLink(page, {
    email: `customer-${runId}@e2e.patche.test`,
    name: "Cliente E2E",
  });
  await page.context().storageState({ path: "e2e/.auth/customer.json" });
});

setup("log in an Admin", async ({ page }) => {
  const email = `admin-${runId}@e2e.patche.test`;
  await registerWithMagicLink(page, { email, name: "Admin E2E" });
  promoteToAdmin(email);
  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});
