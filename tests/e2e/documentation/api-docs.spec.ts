import { test, expect, captureScreenshot, SCREENSHOT_MIME } from "../fixtures";

/**
 * Committed documentation capture for the API docs route.
 *
 * The router uses hash history, so the API route URL is /#/api/ — a plain
 * /api/ pathname renders the home screen (confirmed empirically). The route
 * embeds the external TypeDoc site in a single iframe; there is no map, so the
 * shared capture gate returns immediately. The asset lands in
 * screenshots/docs/.
 */

const API_SCREENSHOT = "screenshots/docs/api-docs.jpg";

test("captures the API docs screen", async ({ page }, testInfo) => {
    await page.goto("/#/api/");

    const iframe = page.locator("iframe");
    await expect(iframe).toHaveCount(1);
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute(
        "src",
        "https://jameslmilner.github.io/terra-draw/modules.html",
    );

    const screenshot = await captureScreenshot(page, API_SCREENSHOT);
    await testInfo.attach("api-docs", { body: screenshot, contentType: SCREENSHOT_MIME });
});
