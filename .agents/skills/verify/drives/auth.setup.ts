import { test as setup } from "@playwright/test";

import { registerWithPassword } from "../../../../apps/web/e2e/support/password-auth";
import { promoteToAdmin } from "../../../../apps/web/e2e/support/promote-to-admin";

const auth = "../../.verify/auth";
const runId = Date.now().toString(36);

// Real sign-up path: form, emailed verification link, dashboard. Then promote one user to Admin in local D1.
setup("register a Customer and an Admin", async ({ page, browser }) => {
  await registerWithPassword(page, {
    email: `customer-${runId}@verify.patche.test`,
    name: "Cliente Verify",
  });
  await page.context().storageState({ path: `${auth}/customer.json` });

  const admin = await browser.newPage();
  const email = `admin-${runId}@verify.patche.test`;
  await registerWithPassword(admin, { email, name: "Admin Verify" });
  promoteToAdmin(email);
  await admin.context().storageState({ path: `${auth}/admin.json` });
  await admin.close();
});
