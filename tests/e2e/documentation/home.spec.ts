import {
    test,
    expect,
    captureScreenshot,
    expectDarkChrome,
    waitForMapTilesReady,
    SCREENSHOT_MIME,
} from "../fixtures";

/**
 * Committed documentation captures for the home route.
 *
 * The auto-applied `cleanStorage` fixture removes the persisted `terra-draw`
 * state on every navigation, so both captures show the default empty home
 * state. Light is the default viewport and colour scheme; the dark capture
 * emulates `prefers-color-scheme: dark`, which the app follows with no UI
 * toggle. Assets land in screenshots/docs/.
 */

const LIGHT_SCREENSHOT = "screenshots/docs/home-light.jpg";
const DARK_SCREENSHOT = "screenshots/docs/home-dark.jpg";

test.describe("home documentation capture (light)", () => {
    test.use({ colorScheme: "light" });

    test("captures the light home screen", async ({ page }, testInfo) => {
        await page.goto("/");

        await expect(page).toHaveTitle(/Terra Draw/i);
        await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
        await expect(page.getByRole("link", { name: "API Docs" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Sponsor" })).toBeVisible();

        await expect(page.getByText("Info", { exact: true })).toBeVisible();
        await expect(page.getByText("GeoJSON", { exact: true })).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Collapse side panel" }),
        ).toBeVisible();

        // Default state guaranteed by the storage-isolation fixture: the Info
        // tab is active and no features exist yet.
        await expect(page.getByRole("heading", { name: "All Features" })).toBeVisible();
        await expect(page.locator("#sidepanel tbody tr")).toHaveCount(0);

        // Map readiness: #select is only mounted after MapLibre's style.load
        // fires and Terra Draw is constructed, so waiting for it proves the real
        // map pipeline ran. The shared gate then waits for finished tile
        // requests and proves the live canvas painted.
        await expect(page.locator("#maplibre-map")).toBeVisible();
        await expect(page.locator("#select")).toBeVisible();
        await waitForMapTilesReady(page);

        const screenshot = await captureScreenshot(page, LIGHT_SCREENSHOT);
        await testInfo.attach("home-light", { body: screenshot, contentType: SCREENSHOT_MIME });
    });
});

test.describe("home documentation capture (dark)", () => {
    test.use({ colorScheme: "dark" });

    test("captures the dark home screen", async ({ page }, testInfo) => {
        await page.goto("/");
        await expect(page.locator("#select")).toBeVisible();
        await expectDarkChrome(page);
        await waitForMapTilesReady(page);

        const screenshot = await captureScreenshot(page, DARK_SCREENSHOT);
        await testInfo.attach("home-dark", { body: screenshot, contentType: SCREENSHOT_MIME });
    });
});
