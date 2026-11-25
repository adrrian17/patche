import { expect, test } from "@playwright/test";

import { e2eSeedTokenHeader } from "../src/lib/e2e-seed";

test.describe("Admin", () => {
  test.use({ storageState: "e2e/.auth/admin.json" });

  test("opens the admin area", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/u);
    await expect(page.getByText(/^admin-.+@e2e\.patche\.test$/u)).toBeVisible();
  });
});

test("refuses /api/e2e/seed without a valid token", async ({ request }) => {
  const data = { action: "seed-product", name: "Unauthorized" };
  const [missing, invalid] = await Promise.all([
    request.post("/api/e2e/seed", { data }),
    request.post("/api/e2e/seed", {
      data,
      headers: { [e2eSeedTokenHeader]: "wrong-token-0000000000000000" },
    }),
  ]);
  expect(missing.status()).toBe(404);
  expect(invalid.status()).toBe(404);
});
