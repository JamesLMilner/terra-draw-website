import {
    test,
    expect,
    captureScreenshot,
    expectDarkChrome,
    waitForMapTilesReady,
    SCREENSHOT_MIME,
} from "../fixtures";

/**
 * Responsivity matrix for the home route.
 *
 * Captures the default empty home state across three device-ish sizes, both
 * orientations, and both colour schemes: 3 x 2 x 2 = 12 committed assets in
 * screenshots/responsivity/. The auto-applied `cleanStorage` fixture
 * removes the persisted `terra-draw` state on every navigation, so every
 * capture shows the default empty home state.
 *
 * Viewports are set explicitly per test (DPR 1) rather than relying on the
 * default 1280x720 project viewport. These captures deliberately assert only
 * that the map pipeline mounted; toolbar contrast is asserted separately in
 * `dark-mode.spec.ts`.
 */

type Size = {
    name: string;
    portrait: { width: number; height: number };
    landscape: { width: number; height: number };
};

const SIZES: Size[] = [
    {
        name: "small",
        portrait: { width: 390, height: 844 },
        landscape: { width: 844, height: 390 },
    },
    {
        name: "medium",
        portrait: { width: 768, height: 1024 },
        landscape: { width: 1024, height: 768 },
    },
    {
        name: "large",
        portrait: { width: 900, height: 1440 },
        landscape: { width: 1440, height: 900 },
    },
];

const SCHEMES = ["light", "dark"] as const;
const ORIENTATIONS = ["portrait", "landscape"] as const;

for (const scheme of SCHEMES) {
    test.describe(`home responsivity capture (${scheme})`, () => {
        test.use({ colorScheme: scheme });

        for (const size of SIZES) {
            for (const orientation of ORIENTATIONS) {
                const viewport = size[orientation];

                test(`captures home-${size.name}-${scheme}-${orientation}`, async ({
                    page,
                }, testInfo) => {
                    await page.setViewportSize(viewport);
                    await page.goto("/");

                    // #select is only mounted after MapLibre's style.load fires
                    // and Terra Draw is constructed, so waiting for it proves
                    // the real map pipeline ran.
                    await expect(page.locator("#maplibre-map")).toBeVisible();
                    await expect(page.locator("#select")).toBeVisible();

                    if (scheme === "dark") {
                        await expectDarkChrome(page);
                    }

                    await waitForMapTilesReady(page);

                    const name = `home-${size.name}-${scheme}-${orientation}`;
                    const screenshot = await captureScreenshot(
                        page,
                        `screenshots/responsivity/${name}.jpg`,
                    );
                    await testInfo.attach(name, {
                        body: screenshot,
                        contentType: SCREENSHOT_MIME,
                    });
                });
            }
        }
    });
}
