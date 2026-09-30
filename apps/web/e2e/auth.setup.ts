import { test as setup } from "@playwright/test";

import { registerWithPassword } from "./support/password-auth";
import { promoteToAdmin } from "./support/promote-to-admin";

const runId = Date.now().toString(36);

setup("log in a Customer", async ({ page }) => {
  await registerWithPassword(page, {
    email: `customer-${runId}@e2e.patche.test`,
    name: "Cliente E2E",
  });
  await page.context().storageState({ path: "e2e/.auth/customer.json" });
});

setup("log in an Admin", async ({ page }) => {
  const email = `admin-${runId}@e2e.patche.test`;
  await registerWithPassword(page, { email, name: "Admin E2E" });
  promoteToAdmin(email);
  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});
