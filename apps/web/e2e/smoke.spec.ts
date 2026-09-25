import { expect, test } from "@playwright/test";

test.describe("Customer", () => {
  test.use({ storageState: "e2e/.auth/customer.json" });

  test("sees the dashboard with their email", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByText(/^customer-.+@e2e\.patche\.test$/u)
    ).toBeVisible();
  });
});

test.describe("Admin", () => {
  test.use({ storageState: "e2e/.auth/admin.json" });

  test("opens the admin area", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/u);
    await expect(page.getByText(/^admin-.+@e2e\.patche\.test$/u)).toBeVisible();
  });
});
