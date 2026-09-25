import { expect, test } from "@playwright/test";

test.describe("Admin", () => {
  test.use({ storageState: "e2e/.auth/admin.json" });

  test("opens the admin area", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/u);
    await expect(page.getByText(/^admin-.+@e2e\.patche\.test$/u)).toBeVisible();
  });
});
