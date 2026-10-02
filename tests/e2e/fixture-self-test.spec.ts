import { existsSync, rmSync } from "node:fs";
import {
    test,
    expect,
    captureScreenshot,
    mapCanvasLuminance,
    waitForMapTilesReady,
} from "./fixtures";

/**
 * Meta-test: proves the auto-applied console-error fixture really fails a test
 * that logs an error.
 *
 * `test.fail()` marks the test as expected to fail, so when the fixture's
 * teardown error fires the test is reported as an expected failure and the
 * suite still exits 0.
 *
 * We use about:blank (no app navigation) because the teardown guard is the
 * behaviour under test, not the app; this keeps the meta-test fast. We wait for
 * the console event explicitly so the fixture's listener has definitely seen it
 * before teardown runs.
 */
test("console-error fixture fails tests that log a console error", async ({ page }) => {
    test.fail();

    const consoleError = page.waitForEvent(
        "console",
        (message) => message.type() === "error",
    );
    await page.evaluate(() =>
        console.error("intentional console error from fixture self-test"),
    );
    await consoleError;
});

/**
 * Meta-test: proves `captureScreenshot` refuses to write the file when the
 * captured bytes show a blank map, even though the capture call itself
 * "succeeds". The live page is painted; the page's screenshot method is stubbed
 * with a real capture of an empty page, making the blank-readback race
 * deterministic instead of probabilistic. Nothing may be written until the
 * pixels validate.
 */
test("captureScreenshot refuses to write a blank capture", async ({ page }) => {
    const target = ".opencode/tmp/capture-guard.jpg";

    await page.goto("/");
    await expect(page.locator("#select")).toBeVisible();

    // Build a valid 1x1 white JPEG through the 2D canvas API (no compositor
    // involvement), then stub the page's screenshot to return it. A real blank
    // capture would be flaky here for the very readback race under test.
    const blankDataUrl = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL("image/jpeg", 0.85);
    });
    const blankBuffer = Buffer.from(blankDataUrl.split(",")[1], "base64");

    const originalScreenshot = page.screenshot.bind(page);
    page.screenshot = (() => Promise.resolve(blankBuffer)) as typeof page.screenshot;

    let fileWrittenAfterFailure = false;
    try {
        await expect(captureScreenshot(page, target)).rejects.toThrow(
            /Refusing to write a blank screenshot/,
        );
        fileWrittenAfterFailure = existsSync(target);
    } finally {
        page.screenshot = originalScreenshot;
        rmSync(target, { force: true });
    }

    expect(fileWrittenAfterFailure, "blank capture must never reach the disk").toBe(false);
});

/**
 * Meta-test: proves `captureScreenshot` also refuses a *partially* composited
 * capture — one where the map region is a single flat colour on the left while
 * the right is fully painted, so the band colour count alone still passes. This
 * is the exact defect observed as `home-medium-dark-portrait.jpg` (left half
 * `#2b2b2b`, 1 distinct colour).
 *
 * The partial fixture is manufactured from the proven-painted canvas (element
 * screenshots are unaffected by the `page.screenshot` stub) rather than a real
 * capture, which would be flaky for the very readback race under test. Nothing
 * may be written until the pixels validate.
 */
test("captureScreenshot refuses to write a partially composited capture", async ({
    page,
}) => {
    const target = ".opencode/tmp/capture-partial-guard.jpg";

    await page.goto("/");
    await expect(page.locator("#select")).toBeVisible();
    await waitForMapTilesReady(page);

    // Repaint the live canvas into a viewport-sized PNG, then replace the left
    // half of its overlay-free band with one flat colour. The right half stays
    // fully painted, so the capture passes the band check and only the
    // canvas cross-check can reject it.
    const canvasBuffer = await page.locator(".maplibregl-canvas").screenshot();
    const canvasDataUrl = `data:image/png;base64,${canvasBuffer.toString("base64")}`;

    const partialDataUrl = await page.evaluate(async (url) => {
        const mapElement = document.querySelector(".maplibregl-canvas");
        if (!mapElement) {
            throw new Error("map canvas missing while building the partial fixture");
        }
        const rect = mapElement.getBoundingClientRect();

        const image = new Image();
        image.src = url;
        await image.decode();

        const canvas = document.createElement("canvas");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("2d context unavailable while building the partial fixture");
        }
        context.drawImage(image, rect.x, rect.y, rect.width, rect.height);

        context.fillStyle = "#2b2b2b";
        context.fillRect(rect.x + 8, rect.y + 120, (rect.width - 16) / 2, rect.height - 160);

        return canvas.toDataURL("image/jpeg", 0.85);
    }, canvasDataUrl);
    const partialBuffer = Buffer.from(partialDataUrl.split(",")[1], "base64");

    const originalScreenshot = page.screenshot.bind(page);
    page.screenshot = (() => Promise.resolve(partialBuffer)) as typeof page.screenshot;

    let fileWrittenAfterFailure = false;
    try {
        await expect(captureScreenshot(page, target)).rejects.toThrow(
            /Refusing to write a blank screenshot/,
        );
        fileWrittenAfterFailure = existsSync(target);
    } finally {
        page.screenshot = originalScreenshot;
        rmSync(target, { force: true });
    }

    expect(
        fileWrittenAfterFailure,
        "partial capture must never reach the disk",
    ).toBe(false);
});

/**
 * Meta-test: proves the capture validator no longer accepts a blank map merely
 * because real DOM overlays are painted over it. The diagnosed false pass
 * scored colours from the drawing toolbar and attribution (and, below 900px,
 * the toolbar wrapping into the old fixed band), so the validator now samples
 * only unmasked map interior.
 *
 * The live page is fully painted, so its overlays are genuine. The synthetic
 * capture fills the whole viewport with one flat colour and pastes the real
 * overlay element screenshots at their live rects — exactly the overlays a
 * false pass would have exploited. Element screenshots are unaffected by the
 * `page.screenshot` stub. Nothing may be written until the pixels validate.
 */
test("captureScreenshot refuses a blank map covered by real overlays", async ({
    page,
}) => {
    const target = ".opencode/tmp/capture-overlay-guard.jpg";

    await page.goto("/");
    await expect(page.locator("#select")).toBeVisible();
    await waitForMapTilesReady(page);

    // The same overlay set the capture validator masks out of the map.
    const overlaySelector =
        "#maplibre-map > :not(.maplibregl-canvas-container), #maplibre-map .maplibregl-ctrl";

    const overlayRects = await page.evaluate(
        (selector) =>
            Array.from(document.querySelectorAll(selector)).map((element) => {
                const rect = element.getBoundingClientRect();
                return {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                };
            }),
        overlaySelector,
    );

    const overlayLocators = await page.locator(overlaySelector).all();
    const overlays: Array<{
        rect: { left: number; top: number; width: number; height: number };
        dataUrl: string;
    }> = [];
    for (let index = 0; index < overlayLocators.length; index += 1) {
        const rect = overlayRects[index];
        if (!rect || rect.width <= 0 || rect.height <= 0) {
            continue;
        }
        const shot = await overlayLocators[index].screenshot();
        overlays.push({
            rect,
            dataUrl: `data:image/png;base64,${shot.toString("base64")}`,
        });
    }
    expect(
        overlays.length,
        "the live map must expose at least one overlay",
    ).toBeGreaterThan(0);

    // A flat map with the real overlay pixels composited on top. Drawing at the
    // live CSS rects maps the element screenshots (which may be at
    // devicePixelRatio) back onto viewport coordinates.
    const compositeDataUrl = await page.evaluate(
        async ({ overlayImages, colour }) => {
            const canvas = document.createElement("canvas");
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const context = canvas.getContext("2d");
            if (!context) {
                throw new Error("2d context unavailable while building the overlay fixture");
            }
            context.fillStyle = colour;
            context.fillRect(0, 0, canvas.width, canvas.height);
            for (const { rect, dataUrl } of overlayImages) {
                const image = new Image();
                image.src = dataUrl;
                await image.decode();
                context.drawImage(image, rect.left, rect.top, rect.width, rect.height);
            }
            return canvas.toDataURL("image/jpeg", 0.85);
        },
        { overlayImages: overlays, colour: "#2b2b2b" },
    );
    const compositeBuffer = Buffer.from(compositeDataUrl.split(",")[1], "base64");

    const originalScreenshot = page.screenshot.bind(page);
    page.screenshot = (() => Promise.resolve(compositeBuffer)) as typeof page.screenshot;

    let fileWrittenAfterFailure = false;
    try {
        await expect(captureScreenshot(page, target)).rejects.toThrow(
            /Refusing to write a blank screenshot/,
        );
        fileWrittenAfterFailure = existsSync(target);
    } finally {
        page.screenshot = originalScreenshot;
        rmSync(target, { force: true });
    }

    expect(
        fileWrittenAfterFailure,
        "overlay-covered blank capture must never reach the disk",
    ).toBe(false);
});

/**
 * Meta-test: proves the storage-isolation fixture clears app-owned keys on
 * every navigation (and therefore before app scripts run).
 */
test("storage isolation fixture clears app-owned localStorage keys", async ({ page }) => {
    await page.goto("/#/api/");

    await page.evaluate(() => {
        localStorage.setItem("terra-draw", "{}");
        localStorage.setItem("tab", "geojson");
    });

    // The reload re-runs the fixture's init script before the app boots.
    await page.reload();

    const stored = await page.evaluate(() => ({
        terraDraw: localStorage.getItem("terra-draw"),
        tab: localStorage.getItem("tab"),
    }));

    expect(stored).toEqual({ terraDraw: null, tab: null });
});

/**
 * Meta-test: proves `mapCanvasLuminance` measures the basemap only. The drawing
 * toolbar and MapLibre's attribution paint above the canvas, so an element
 * capture of the canvas would otherwise include them — bright button tokens
 * were measured tripping the dark gate at 0.2014 while the basemap was fully
 * dark. A large bright overlay injected over the map must not move the value
 * across the dark ceiling.
 */
test("mapCanvasLuminance ignores DOM overlays painted over the canvas", async ({
    page,
}) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("#select")).toBeVisible();
    await waitForMapTilesReady(page);

    // Average a few samples on each side so a single transient capture cannot
    // decide the comparison.
    const sample = async () => {
        const values: number[] = [];
        for (let i = 0; i < 3; i += 1) {
            values.push(await mapCanvasLuminance(page));
            await page.waitForTimeout(150);
        }
        const finite = values.filter(Number.isFinite);
        expect(
            finite.length,
            "mapCanvasLuminance must return at least one finite sample",
        ).toBeGreaterThan(0);
        return finite.reduce((sum, value) => sum + value, 0) / finite.length;
    };

    const before = await sample();

    await page.evaluate(() => {
        const map = document.querySelector("#maplibre-map");
        if (!map) {
            throw new Error("map container missing while injecting the overlay");
        }
        const overlay = document.createElement("div");
        overlay.id = "luminance-overlay-probe";
        overlay.style.position = "absolute";
        overlay.style.left = "200px";
        overlay.style.top = "300px";
        overlay.style.width = "300px";
        overlay.style.height = "80px";
        overlay.style.background = "#ffffff";
        overlay.style.zIndex = "9999";
        map.appendChild(overlay);
    });

    const after = await sample();

    await page.evaluate(() =>
        document.querySelector("#luminance-overlay-probe")?.remove(),
    );

    expect(
        Math.abs(after - before),
        `a bright overlay changed the canvas luminance (${before} -> ${after})`,
    ).toBeLessThan(0.01);
    expect(after, "the dark basemap must stay under the dark ceiling").toBeLessThan(
        0.2,
    );
});
