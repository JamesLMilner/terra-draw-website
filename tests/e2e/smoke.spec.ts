import { test, expect, waitForMapTilesReady } from "./fixtures";

test("home screen renders the map and default side panel", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Terra Draw/i);
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("link", { name: "API Docs" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sponsor" })).toBeVisible();

    await expect(page.getByText("Info", { exact: true })).toBeVisible();
    await expect(page.getByText("GeoJSON", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Collapse side panel" })).toBeVisible();

    // Default state guaranteed by the storage-isolation fixture: the Info tab
    // is active and no features exist yet.
    await expect(page.getByRole("heading", { name: "All Features" })).toBeVisible();
    await expect(page.locator("#sidepanel tbody tr")).toHaveCount(0);

    // Map readiness: #select is only mounted after MapLibre's style.load fires
    // and Terra Draw is constructed, so waiting for it proves the real map
    // pipeline ran (no sleeps or networkidle needed).
    await expect(page.locator("#maplibre-map")).toBeVisible();
    await expect(page.locator("#select")).toBeVisible();

    // Rendering readiness: style.load does not prove tiles were fetched or
    // painted (captures used to be blank white maps). The shared gate waits for
    // finished tile requests and proves the live canvas painted.
    await waitForMapTilesReady(page);
});

test("API docs screen embeds the TypeDoc site", async ({ page }) => {
    // The router uses hash history, so the API route URL is /#/api/ — a plain
    // /api/ pathname renders the home screen (confirmed empirically).
    await page.goto("/#/api/");

    const iframe = page.locator("iframe");
    await expect(iframe).toHaveCount(1);
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute(
        "src",
        "https://jameslmilner.github.io/terra-draw/modules.html",
    );
});
