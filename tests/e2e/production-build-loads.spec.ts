import { test, expect } from "@playwright/test";

test("production build loads and renders the main UI", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Terra Draw/i);
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("link", { name: "API Docs" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sponsor" })).toBeVisible();

    await expect(page.getByText("Info", { exact: true })).toBeVisible();
    await expect(page.getByText("GeoJSON", { exact: true })).toBeVisible();

    await expect(page.getByRole("button", { name: "Collapse side panel" })).toBeVisible();
});
