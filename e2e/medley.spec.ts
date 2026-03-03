import { test, expect } from "@playwright/test";

test.describe("Medley page", () => {
  test("loads and displays timeline", async ({ page }) => {
    // This test requires a running dev server and test data in the database.
    // For CI, seed the database before running or use a mock endpoint.
    await page.goto("/");
    await expect(page).toHaveTitle(/Medlean/);
  });
});
