import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { test as base, expect, type Page } from "@playwright/test";

/**
 * Auto-applied fixtures shared by every spec in tests/e2e.
 *
 * - `cleanStorage` removes app-owned localStorage keys on every navigation, so
 *   each test starts from the default app state (default `info` tab, no
 *   features).
 * - `failOnConsoleError` collects console errors and uncaught page errors, then
 *   fails the test during teardown when any were seen. Console warnings are
 *   logged but never fail a test. The teardown error reports the current page
 *   URL and every collected message, one per line.
 * - `mapTileTracker` records successfully finished OpenFreeMap tile requests per
 *   page from before navigation, so `captureScreenshot` can gate on real map
 *   rendering.
 */
export const test = base.extend<{
    cleanStorage: void;
    failOnConsoleError: void;
    mapTileTracker: void;
}>({
    cleanStorage: [
        async ({ context }, use) => {
            await context.addInitScript(() => {
                try {
                    localStorage.removeItem("terra-draw");
                    localStorage.removeItem("tab");
                } catch {
                    // localStorage is unavailable on opaque origins (e.g. about:blank).
                }
            });

            await use();
        },
        { auto: true },
    ],

    mapTileTracker: [
        async ({ page }, use) => {
            const tileUrls: string[] = [];
            mapTileUrlsByPage.set(page, tileUrls);

            // `requestfinished` (not `response`) so the tile body is fully
            // downloaded; all of the app's style, sprite, font and tile hosts
            // are OpenFreeMap.
            page.on("requestfinished", (request) => {
                if (isMapTileUrl(request.url())) {
                    tileUrls.push(request.url());
                }
            });

            await use();
        },
        { auto: true },
    ],

    failOnConsoleError: [
        async ({ page }, use) => {
            const errors: string[] = [];

            page.on("console", (message) => {
                if (message.type() === "error") {
                    const { url, lineNumber } = message.location();
                    const where = url ? ` (${url}:${lineNumber})` : "";
                    errors.push(`[console.error] ${message.text()}${where}`);
                } else if (message.type() === "warning") {
                    console.warn(`[page warning] ${message.text()}`);
                }
            });

            page.on("pageerror", (error) => {
                errors.push(`[pageerror] ${error.message}`);
            });

            await use();

            if (errors.length > 0) {
                throw new Error(
                    [`Console/page errors detected on ${page.url()}:`, ...errors].join("\n"),
                );
            }
        },
        { auto: true },
    ],
});

const mapTileUrlsByPage = new WeakMap<Page, string[]>();

/**
 * OpenFreeMap basemap tile URLs:
 * - vector: https://tiles.openfreemap.org/planet/<version>/{z}/{x}/{y}.pbf
 *   The source is the TileJSON at /planet, which resolves to a versioned tile
 *   path (e.g. /planet/20260927_080001_pt/3/4/3.pbf), so the version segment is
 *   optional here.
 * - raster: https://tiles.openfreemap.org/natural_earth/<layer>/{z}/{x}/{y}.png
 *
 * Glyph ranges (`/fonts/.../{range}.pbf`), sprites and style/source JSON are
 * deliberately excluded.
 */
function isMapTileUrl(url: string) {
    if (!url.startsWith("https://tiles.openfreemap.org/")) {
        return false;
    }
    return (
        /\/planet\/(?:[^/]+\/)?\d+\/\d+\/\d+\.pbf/.test(url) ||
        /\/natural_earth\/[^/]+\/\d+\/\d+\/\d+\.png/.test(url)
    );
}

/** Live list of finished map-tile requests for a tracked page (oldest first). */
export function getMapTileUrls(page: Page): readonly string[] {
    return mapTileUrlsByPage.get(page) ?? [];
}

export type ColourProperty = "backgroundColor" | "color" | "borderTopColor";

/**
 * WCAG relative luminance (0 = black, 1 = white) of an element's computed
 * `backgroundColor`, `color` or `borderTopColor`.
 *
 * Throws instead of returning a misleading value when the element is missing
 * or the colour is fully transparent: a transparent body background would
 * otherwise score 0 and silently "pass" a dark-surface check.
 */
export async function relativeLuminance(
    page: Page,
    selector: string,
    property: ColourProperty,
): Promise<number> {
    return page.evaluate(
        ({
            cssSelector,
            cssProperty,
        }: {
            cssSelector: string;
            cssProperty: ColourProperty;
        }) => {
            const element = document.querySelector(cssSelector);
            if (!element) {
                throw new Error(`No element matches selector "${cssSelector}"`);
            }

            const value = getComputedStyle(element)[cssProperty];
            const match =
                /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/.exec(
                    value,
                );
            if (!match) {
                throw new Error(
                    `Cannot parse computed ${cssProperty} "${value}" for "${cssSelector}"`,
                );
            }

            const alpha = match[4] === undefined ? 1 : Number(match[4]);
            if (alpha === 0) {
                throw new Error(
                    `Computed ${cssProperty} "${value}" for "${cssSelector}" is fully transparent`,
                );
            }

            const linearise = (raw: string) => {
                const channel = Number(raw) / 255;
                return channel <= 0.04045
                    ? channel / 12.92
                    : ((channel + 0.055) / 1.055) ** 2.4;
            };

            const [r, g, b] = [match[1], match[2], match[3]].map(linearise);
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        },
        { cssSelector: selector, cssProperty: property },
    );
}

// Dark-mode chrome invariants. Deliberately loose — the palette values remain
// tuneable, so only "surface is dark" and "text is light" are asserted.
const DARK_LUMINANCE_CEILING = 0.2;
const LIGHT_TEXT_LUMINANCE_FLOOR = 0.7;

/** Dark-chrome invariants shared by every route: dark surfaces, light text. */
export async function expectDarkChrome(page: Page) {
    const bodyBackground = await relativeLuminance(page, "body", "backgroundColor");
    expect(
        bodyBackground,
        "body background luminance under prefers-color-scheme: dark",
    ).toBeLessThan(DARK_LUMINANCE_CEILING);

    const headerBackground = await relativeLuminance(page, "header", "backgroundColor");
    expect(
        headerBackground,
        "header background luminance under prefers-color-scheme: dark",
    ).toBeLessThan(DARK_LUMINANCE_CEILING);

    const bodyText = await relativeLuminance(page, "body", "color");
    expect(bodyText, "body text luminance under prefers-color-scheme: dark").toBeGreaterThan(
        LIGHT_TEXT_LUMINANCE_FLOOR,
    );
}

/**
 * One luminance capture of the live map canvas, taken exactly as rendered.
 * Callers that need a visually settled value must use `mapCanvasLuminance`.
 *
 * A screenshot of the `.maplibregl-canvas` element reads the composited page
 * clipped to the canvas box, so DOM overlays painted above it (the drawing
 * toolbar, MapLibre controls) leak their pixels into the value — bright button
 * tokens were measured pushing the dark-home value to 0.2014 while the basemap
 * was fully dark. The sample therefore excludes every pixel covered by a live
 * overlay bounding box (`#maplibre-map`'s children other than the canvas
 * container, plus its `.maplibregl-ctrl` controls), so the result derives from
 * basemap pixels only and no overlay can contribute.
 */
async function captureCanvasLuminance(page: Page): Promise<number> {
    try {
        const shot = await page.locator(".maplibregl-canvas").screenshot();
        const dataUrl = `data:image/png;base64,${shot.toString("base64")}`;

        return await page.evaluate(async (url) => {
            const canvasElement = document.querySelector(".maplibregl-canvas");
            if (!canvasElement) {
                return Number.NaN;
            }

            const image = new Image();
            image.src = url;
            await image.decode();

            const sample = document.createElement("canvas");
            sample.width = image.width;
            sample.height = image.height;
            const context = sample.getContext("2d");
            if (!context) {
                return Number.NaN;
            }
            context.drawImage(image, 0, 0);

            // Overlays painted above the canvas in the capture. Their live
            // bounding boxes are rasterised into a mask so the per-pixel loop
            // below can skip them structurally, whatever their size or count.
            const overlayRects = Array.from(
                document.querySelectorAll(
                    "#maplibre-map > :not(.maplibregl-canvas-container), #maplibre-map .maplibregl-ctrl",
                ),
            )
                .map((element) => element.getBoundingClientRect())
                .filter((rect) => rect.width > 0 && rect.height > 0);

            const canvasRect = canvasElement.getBoundingClientRect();
            // Image pixels per CSS pixel; the capture may not be at ratio 1.
            const scaleX = image.width / Math.max(1, canvasRect.width);
            const scaleY = image.height / Math.max(1, canvasRect.height);

            const mask = document.createElement("canvas");
            mask.width = image.width;
            mask.height = image.height;
            const maskContext = mask.getContext("2d");
            if (!maskContext) {
                return Number.NaN;
            }
            maskContext.fillStyle = "#000";
            const pad = 2;
            for (const rect of overlayRects) {
                maskContext.fillRect(
                    (rect.left - canvasRect.left - pad) * scaleX,
                    (rect.top - canvasRect.top - pad) * scaleY,
                    (rect.width + 2 * pad) * scaleX,
                    (rect.height + 2 * pad) * scaleY,
                );
            }
            const maskData = maskContext.getImageData(
                0,
                0,
                mask.width,
                mask.height,
            ).data;

            const { data } = context.getImageData(0, 0, sample.width, sample.height);
            let total = 0;
            let counted = 0;
            for (let i = 0; i < data.length; i += 4) {
                if (maskData[i + 3] !== 0) {
                    continue;
                }
                total +=
                    (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
                counted += 1;
            }
            return counted > 0 ? total / counted : Number.NaN;
        }, dataUrl);
    } catch {
        return Number.NaN;
    }
}

// A capture counts as visually settled once consecutive frames differ by no
// more than this mean-luminance delta. An in-progress basemap label/line fade
// moves the mean roughly an order of magnitude more per capture, so the
// threshold is wide enough to ignore rasterisation noise yet narrow enough to
// wait a fade out. Two consecutive small deltas are required so a momentary
// plateau mid-load cannot be mistaken for the final frame.
const LUMINANCE_STABLE_DELTA = 0.002;
const LUMINANCE_STABLE_STEPS = 2;

// Bound on settling: a genuinely stuck map still returns its last capture for
// the caller's own readiness poll to reject, rather than hanging.
const LUMINANCE_SETTLE_TIMEOUT = 6_000;

/**
 * Mean relative luminance (0 = black, 1 = white) of the live map canvas, i.e.
 * the basemap only. Unlike a style-request count this only passes once the new
 * basemap has actually painted, so drawing that follows happens against the
 * swapped style. Returns NaN on a transient capture failure, which fails either
 * comparison so the poll keeps retrying.
 *
 * A freshly committed style is not visually static the moment its tiles finish
 * downloading: MapLibre fades the new labels and lines in over the following
 * frames, moving the mean luminance. Sampling that moving target made two
 * windows a few hundred milliseconds apart disagree by ~0.015 even with no
 * overlay present (fixture-self-test). The value is therefore only returned
 * once `LUMINANCE_STABLE_STEPS` consecutive captures agree to within
 * `LUMINANCE_STABLE_DELTA`, so a caller comparing two samples compares settled
 * frames rather than a fade in progress.
 */
export async function mapCanvasLuminance(page: Page): Promise<number> {
    const deadline = Date.now() + LUMINANCE_SETTLE_TIMEOUT;
    let previous = await captureCanvasLuminance(page);
    let stableSteps = 0;

    while (Date.now() < deadline) {
        const current = await captureCanvasLuminance(page);
        if (
            Number.isFinite(previous) &&
            Number.isFinite(current) &&
            Math.abs(current - previous) <= LUMINANCE_STABLE_DELTA
        ) {
            stableSteps += 1;
            if (stableSteps >= LUMINANCE_STABLE_STEPS) {
                return current;
            }
        } else {
            stableSteps = 0;
        }
        previous = current;
    }

    return previous;
}

/**
 * Hard gate for map screenshots: refuses to let a capture proceed until
 * MapLibre itself reports the map has finished rendering.
 *
 * The previous gate inferred readiness from a 160x160 colour count of a
 * `.maplibregl-canvas` element screenshot. That element shot is a crop of the
 * composited page, so DOM overlays (toolbar, buttons, attribution) satisfied
 * its colour threshold before MapLibre had painted a single tile. Gating on
 * MapLibre's own `idle` event instead is immune to what overlays show.
 *
 * A plain `once("idle")` can hang when the map is already idle, so this
 * attaches the listener first, then forces a repaint (`triggerRepaint`); the
 * `idle` that follows is necessarily one this call initiated. An in-page
 * timeout rejects loudly rather than hanging.
 *
 * Non-map screens (e.g. the `/#/api/` TypeDoc route) return immediately.
 *
 * Note this gate proves the live canvas finished rendering; it cannot by
 * itself stop a later full-viewport capture from reading back blank pixels (a
 * Chromium WebGL readback race). `captureScreenshot` validates the captured
 * bytes for that reason.
 */
export async function waitForMapTilesReady(
    page: Page,
    options: { timeout?: number } = {},
) {
    const timeout = options.timeout ?? 30_000;

    if ((await page.locator("#maplibre-map").count()) === 0) {
        return;
    }

    // Shared deadline so the hook wait and the idle wait cannot stack into two
    // full timeouts.
    const deadline = Date.now() + timeout;

    try {
        await page.waitForFunction(() => Boolean(window.__terraMap), null, {
            timeout: Math.max(1, deadline - Date.now()),
        });
    } catch (error) {
        throw new Error(
            `Timed out waiting for the MapLibre map handle on ${page.url()}: window.__terraMap was never exposed. Refusing to capture a potentially blank map.`,
            { cause: error },
        );
    }

    const remaining = Math.max(1, deadline - Date.now());
    try {
        await page.evaluate(
            (waitMs) =>
                new Promise<void>((resolve, reject) => {
                    const map = window.__terraMap;
                    if (!map) {
                        reject(new Error("window.__terraMap disappeared before the idle wait"));
                        return;
                    }

                    const timer = setTimeout(
                        () =>
                            reject(
                                new Error(
                                    `MapLibre did not emit idle after a forced repaint within ${waitMs}ms`,
                                ),
                            ),
                        waitMs,
                    );

                    // Attach before repainting so the event cannot be missed; the
                    // forced repaint guarantees a fresh idle even when the map
                    // was already settled.
                    map.once("idle", () => {
                        clearTimeout(timer);
                        resolve();
                    });
                    map.triggerRepaint();
                }),
            remaining,
        );
    } catch (error) {
        throw new Error(
            `Timed out waiting for MapLibre to finish rendering on ${page.url()}. Refusing to capture a blank map.`,
            { cause: error },
        );
    }

    // Final compositor settle before the capture.
    await page.evaluate(
        () =>
            new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            ),
    );
}

/**
 * Minimum distinct exact (8-bit) colours expected in the overlay-free map
 * interior of a painted capture. Painted captures score hundreds to
 * thousands (e.g. 2831 light / 466 dark at 390x844), the flat interior
 * scores 1 and the observed blank artifact 24 (JPEG ringing around overlay
 * edges), so 32 separates painted from blank. See `capturedMapColourCount`
 * for the masked sampling this drives.
 */
const MINIMUM_PAINTED_COLOURS = 32;

/**
 * Grid used to cross-check a full-page capture against the live map canvas
 * (see `contradictedMapCells`). A compositor-tile-sized defect (the observed
 * one covered half a map) spans many cells, while an eight-by-eight grid keeps
 * flat geography comfortably inside single cells.
 */
const CAPTURE_GRID_COLUMNS = 8;
const CAPTURE_GRID_ROWS = 8;

/**
 * A capture cell is only "contradicted" when it is a single flat colour while
 * the live canvas at the same place shows clearly varied content. The
 * six-colour floor deliberately ignores an antialiased coastline or a single
 * fading label (2-5 colours) — the only legitimate ways a flat cell can differ
 * from the canvas — while a true uncomposited region is varied far beyond it.
 * `MAXIMUM_CONTRADICTED_CELLS` tolerates a couple of stray timing artefacts
 * yet still catches a defect that spans a whole compositor tile.
 */
const MINIMUM_CANVAS_CELL_COLOURS = 6;
const MAXIMUM_CONTRADICTED_CELLS = 2;

/**
 * JPEG quality for every committed full-page capture. The literal `"jpeg"` is
 * passed directly to Playwright; `SCREENSHOT_MIME` is exported so specs can
 * label the matching attachments correctly.
 */
const SCREENSHOT_QUALITY = 85;
export const SCREENSHOT_MIME = "image/jpeg";

/**
 * Distinct exact (8-bit) colours painted by the map, read back from the
 * already-captured page buffer. Returns `null` when the page has no map (e.g.
 * the `/#/api/` TypeDoc route), so validation is skipped there.
 *
 * Why overlay-free canvas pixels, and why exact colours:
 * - The capture is the composited page, so it includes every DOM overlay
 *   painted above the map (the drawing toolbar, MapLibre controls). Counting
 *   the whole map container would count their antialiased pixels, letting a
 *   blank map score 40+ colours. Instead the live overlay bounding boxes are
 *   rasterised into a mask — the same selector and padding
 *   `captureCanvasLuminance` uses — and only unmasked pixels inside the
 *   `.maplibregl-canvas` rect are counted. A blank map therefore scores its
 *   single canvas colour whatever sits on top, including the toolbar wrapped
 *   over the map below 900px.
 * - Quantising to 4 bits per channel compresses the white basemap until a
 *   painted dark-home interior scores exactly 10 distinct colours — the
 *   boundary the live-canvas gate uses to mean "painted". Exact colours keep a
 *   wide margin: blank interiors score 1, while the painted committed assets
 *   score roughly 165-1438.
 *
 * The buffer's pixel scale is derived from `image.width / window.innerWidth` so
 * sampling stays correct if the capture pixel ratio ever changes.
 */
async function capturedMapColourCount(page: Page, shot: Buffer): Promise<number | null> {
    const dataUrl = `data:${SCREENSHOT_MIME};base64,${shot.toString("base64")}`;

    return page.evaluate(async (url) => {
        const canvasElement = document.querySelector(".maplibregl-canvas");
        const mapElement = canvasElement ?? document.querySelector("#maplibre-map");
        if (!canvasElement || !mapElement) {
            return null;
        }

        const image = new Image();
        image.src = url;
        await image.decode();

        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        if (!context) {
            // Cannot inspect the buffer; treat it as blank rather than risk
            // committing one that cannot be validated.
            return 0;
        }
        context.drawImage(image, 0, 0);

        // Overlays painted above the canvas in the capture. Their live
        // bounding boxes are rasterised into a mask so the per-pixel loop
        // below counts basemap pixels only, whatever their size or count.
        const overlayRects = Array.from(
            document.querySelectorAll(
                "#maplibre-map > :not(.maplibregl-canvas-container), #maplibre-map .maplibregl-ctrl",
            ),
        )
            .map((element) => element.getBoundingClientRect())
            .filter((rect) => rect.width > 0 && rect.height > 0);

        // Image pixels per CSS pixel; the page capture is viewport-sized.
        const scaleX = image.width / window.innerWidth;
        const scaleY = image.height / window.innerHeight;

        const mask = document.createElement("canvas");
        mask.width = image.width;
        mask.height = image.height;
        const maskContext = mask.getContext("2d");
        if (!maskContext) {
            return 0;
        }
        maskContext.fillStyle = "#000";
        const pad = 2;
        for (const rect of overlayRects) {
            maskContext.fillRect(
                (rect.left - pad) * scaleX,
                (rect.top - pad) * scaleY,
                (rect.width + 2 * pad) * scaleX,
                (rect.height + 2 * pad) * scaleY,
            );
        }

        // The `.maplibregl-canvas` rect within the page capture.
        const canvasRect = canvasElement.getBoundingClientRect();
        const sx = Math.max(0, Math.round(canvasRect.left * scaleX));
        const sy = Math.max(0, Math.round(canvasRect.top * scaleY));
        const ex = Math.min(image.width, Math.round(canvasRect.right * scaleX));
        const ey = Math.min(image.height, Math.round(canvasRect.bottom * scaleY));
        const width = ex - sx;
        const height = ey - sy;
        if (width <= 0 || height <= 0) {
            return 0;
        }

        const maskData = maskContext.getImageData(sx, sy, width, height).data;
        const { data } = context.getImageData(sx, sy, width, height);

        const colours = new Set<number>();
        for (let i = 0; i < data.length; i += 4) {
            if (maskData[i + 3] !== 0) {
                continue;
            }
            colours.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
        }
        return colours.size;
    }, dataUrl);
}

/**
 * Cross-checks an already-captured full-page JPEG against a fresh capture of
 * the live map canvas, cell by cell, to catch a partially composited capture
 * that a single-band colour count cannot see (a half-uniform capture still
 * scores hundreds of colours from its painted half).
 *
 * Why the live canvas, not the JPEG alone: a fully composited dark capture
 * legitimately contains large, exactly uniform regions (the dark basemap
 * paints a flat `#0c0c0c` background and `rgb(27,27,29)` water), and the observed
 * uncomposited colour `#2b2b2b` also occurs 609 times in a *good* dark capture
 * — so "is this colour a map colour?" and "does this colour appear elsewhere?"
 * cannot separate a defect from flat geography. The canvas, by contrast, is
 * proven painted by `waitForMapTilesReady`, so a cell that is uniform in the
 * capture while the canvas at the same place is varied can only mean the
 * capture is missing the composited pixels there.
 *
 * False-positive safety:
 * - Only capture cells that are a single flat colour are examined, and only
 *   when the canvas cell is strongly varied. A legitimately flat region is
 *   flat in the canvas too, so it is never flagged; an antialiased boundary
 *   (2-5 colours) is skipped as ambiguous.
 * - Cells touching a toolbar/control overlay are skipped: those are painted
 *   above the canvas in the page capture but absent from the canvas capture.
 * - If the canvas capture itself looks unpainted the comparison retries rather
 *   than flagging, so a canvas readback glitch cannot fail a good capture.
 *
 * Returns `null` when the page has no map canvas (e.g. the `/#/api/` route);
 * otherwise the number of contradicted cells out of those sampled.
 */
async function contradictedMapCells(
    page: Page,
    shot: Buffer,
): Promise<{ contradictedCells: number; sampledCells: number } | null> {
    const canvasLocator = page.locator(".maplibregl-canvas");
    if ((await canvasLocator.count()) === 0) {
        return null;
    }

    // A protocol error here is a transient capture failure; let the caller
    // retry instead of silently skipping validation.
    const canvasShot = await canvasLocator.screenshot();

    const pageUrl = `data:${SCREENSHOT_MIME};base64,${shot.toString("base64")}`;
    const canvasUrl = `data:image/png;base64,${canvasShot.toString("base64")}`;

    return page.evaluate(
        async ({ pageUrl, canvasUrl, columns, rows, minimumCellColours, minimumPainted }) => {
            const canvasElement = document.querySelector(".maplibregl-canvas");
            const mapElement = canvasElement ?? document.querySelector("#maplibre-map");
            if (!canvasElement || !mapElement) {
                return null;
            }

            const decode = async (url: string) => {
                const image = new Image();
                image.src = url;
                await image.decode();
                return image;
            };
            const [pageImage, canvasImage] = await Promise.all([
                decode(pageUrl),
                decode(canvasUrl),
            ]);

            // One offscreen canvas per capture, drawn once, so cells can be
            // read back cheaply with `getImageData`.
            const contextFor = (image: HTMLImageElement) => {
                const canvas = document.createElement("canvas");
                canvas.width = image.width;
                canvas.height = image.height;
                const context = canvas.getContext("2d");
                if (!context) {
                    return null;
                }
                context.drawImage(image, 0, 0);
                return context;
            };
            const pageContext = contextFor(pageImage);
            const canvasContext = contextFor(canvasImage);
            if (!pageContext || !canvasContext) {
                return null;
            }

            const mapRect = mapElement.getBoundingClientRect();
            const canvasRect = canvasElement.getBoundingClientRect();

            // Image pixels per CSS pixel for each capture.
            const pageScaleX = pageImage.width / window.innerWidth;
            const pageScaleY = pageImage.height / window.innerHeight;
            const canvasScaleX = canvasImage.width / Math.max(1, canvasRect.width);
            const canvasScaleY = canvasImage.height / Math.max(1, canvasRect.height);

            // If the canvas capture is itself blank it cannot be trusted as
            // ground truth; throwing makes the caller retry the whole capture.
            // Overlays painted above the canvas leak into the element capture,
            // so their live bounding boxes are rasterised into a mask first
            // (same selector and padding as `captureCanvasLuminance`); otherwise
            // a flat canvas covered by overlays would score enough colours to
            // pass this guard.
            const overlayMask = document.createElement("canvas");
            overlayMask.width = canvasImage.width;
            overlayMask.height = canvasImage.height;
            const overlayMaskContext = overlayMask.getContext("2d");
            if (!overlayMaskContext) {
                return null;
            }
            overlayMaskContext.fillStyle = "#000";
            const maskPad = 2;
            for (const overlay of Array.from(
                document.querySelectorAll(
                    "#maplibre-map > :not(.maplibregl-canvas-container), #maplibre-map .maplibregl-ctrl",
                ),
            ).map((element) => element.getBoundingClientRect())) {
                if (overlay.width <= 0 || overlay.height <= 0) {
                    continue;
                }
                overlayMaskContext.fillRect(
                    (overlay.left - canvasRect.left - maskPad) * canvasScaleX,
                    (overlay.top - canvasRect.top - maskPad) * canvasScaleY,
                    (overlay.width + 2 * maskPad) * canvasScaleX,
                    (overlay.height + 2 * maskPad) * canvasScaleY,
                );
            }
            const overlayMaskData = overlayMaskContext.getImageData(
                0,
                0,
                overlayMask.width,
                overlayMask.height,
            ).data;

            const canvasColours = new Set<number>();
            const canvasData = canvasContext.getImageData(
                0,
                0,
                canvasImage.width,
                canvasImage.height,
            ).data;
            for (let i = 0; i < canvasData.length; i += 4) {
                if (overlayMaskData[i + 3] !== 0) {
                    continue;
                }
                canvasColours.add(
                    (canvasData[i] << 16) | (canvasData[i + 1] << 8) | canvasData[i + 2],
                );
            }
            if (canvasColours.size <= minimumPainted) {
                throw new Error(
                    `Live canvas capture was blank (${canvasColours.size} colour(s))`,
                );
            }

            // Grid area the cell cross-check samples.
            const band = {
                x: mapRect.x + 8,
                y: mapRect.y + 120,
                width: Math.max(1, mapRect.width - 16),
                height: Math.max(1, mapRect.height - 160),
            };

            // Overlays are painted above the canvas in the page capture but are
            // absent from the canvas capture; their cells must be skipped.
            const overlayRects = Array.from(
                document.querySelectorAll(
                    "#maplibre-map > :not(.maplibregl-canvas-container)",
                ),
            ).map((element) => element.getBoundingClientRect());

            const distinctColours = (
                context: CanvasRenderingContext2D,
                image: HTMLImageElement,
                region: { x: number; y: number; width: number; height: number },
                scaleX: number,
                scaleY: number,
            ) => {
                const x = Math.max(0, Math.round(region.x * scaleX));
                const y = Math.max(0, Math.round(region.y * scaleY));
                if (x >= image.width || y >= image.height) {
                    return null;
                }
                const width = Math.min(
                    Math.max(1, Math.round(region.width * scaleX)),
                    image.width - x,
                );
                const height = Math.min(
                    Math.max(1, Math.round(region.height * scaleY)),
                    image.height - y,
                );
                const { data } = context.getImageData(x, y, width, height);
                const colours = new Set<number>();
                for (let i = 0; i < data.length; i += 4) {
                    colours.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
                }
                return colours;
            };

            const cellWidth = band.width / columns;
            const cellHeight = band.height / rows;
            let sampledCells = 0;
            let contradictedCells = 0;

            for (let row = 0; row < rows; row += 1) {
                for (let column = 0; column < columns; column += 1) {
                    const cell = {
                        x: band.x + column * cellWidth,
                        y: band.y + row * cellHeight,
                        width: cellWidth,
                        height: cellHeight,
                    };

                    const centreX = cell.x + cell.width / 2;
                    const centreY = cell.y + cell.height / 2;
                    const underOverlay = overlayRects.some(
                        (overlay) =>
                            centreX >= overlay.left - 2 &&
                            centreX <= overlay.right + 2 &&
                            centreY >= overlay.top - 2 &&
                            centreY <= overlay.bottom + 2,
                    );
                    // The cell must also lie fully inside the canvas image.
                    const outsideCanvas =
                        cell.x < canvasRect.x ||
                        cell.y < canvasRect.y ||
                        cell.x + cell.width > canvasRect.right ||
                        cell.y + cell.height > canvasRect.bottom;
                    if (underOverlay || outsideCanvas) {
                        continue;
                    }

                    const pageColours = distinctColours(
                        pageContext,
                        pageImage,
                        cell,
                        pageScaleX,
                        pageScaleY,
                    );
                    if (!pageColours || pageColours.size !== 1) {
                        continue;
                    }

                    const canvasCell = {
                        x: (cell.x - canvasRect.x) * canvasScaleX,
                        y: (cell.y - canvasRect.y) * canvasScaleY,
                        width: cell.width * canvasScaleX,
                        height: cell.height * canvasScaleY,
                    };
                    const canvasCellColours = distinctColours(
                        canvasContext,
                        canvasImage,
                        canvasCell,
                        1,
                        1,
                    );
                    if (!canvasCellColours) {
                        continue;
                    }

                    sampledCells += 1;
                    if (canvasCellColours.size >= minimumCellColours) {
                        contradictedCells += 1;
                    }
                }
            }

            return { contradictedCells, sampledCells };
        },
        {
            pageUrl,
            canvasUrl,
            columns: CAPTURE_GRID_COLUMNS,
            rows: CAPTURE_GRID_ROWS,
            minimumCellColours: MINIMUM_CANVAS_CELL_COLOURS,
            minimumPainted: MINIMUM_PAINTED_COLOURS,
        },
    );
}

/**
 * Captures a screenshot and writes it to `path` only once the captured bytes
 * prove the map actually painted. Gated on map-tile readiness (see
 * `waitForMapTilesReady`) and validated per attempt:
 *
 * - Chromium can transiently reject `Page.captureScreenshot` while several
 *   headless browsers render WebGL maps in parallel. Those protocol errors are
 *   retried with linear backoff; the rejection window is short but real, and
 *   immediate retries burn all attempts within milliseconds.
 * - Independently of protocol errors, Chromium can return a *successful*
 *   screenshot with blank or *partially* composited map pixels (a
 *   compositor/readback race under GPU load; observed as "GPU stall due to
 *   ReadPixels" warnings, and once as a half-uniform capture). Neither is ever
 *   written. Each attempt decodes its own JPEG buffer, counts real painted
 *   colours in the map region, and cross-checks that region against the live
 *   canvas cell by cell (`contradictedMapCells`); a failing capture re-runs
 *   `waitForMapTilesReady` — which forces a fresh MapLibre frame — then waits
 *   the same bounded backoff (400ms, then 800ms) before retrying.
 *
 * Writing the file only after validation means a failure can never leave a
 * blank or partial asset behind. If every attempt fails the function throws
 * with the path and the last colour count it saw. Non-map screens (no
 * `#maplibre-map`) skip pixel validation. Returns the buffer so callers can
 * attach it to the report.
 */
export async function captureScreenshot(page: Page, path: string): Promise<Buffer> {
    await waitForMapTilesReady(page);

    // Delay after each failed attempt; length + 1 = total attempts.
    const backoffMs = [400, 800];
    let lastColourCount: number | null = null;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= backoffMs.length + 1; attempt += 1) {
        if (attempt > 1) {
            // The idle-gated wait forces a fresh MapLibre frame itself.
            await waitForMapTilesReady(page);
            await new Promise((resolve) => setTimeout(resolve, backoffMs[attempt - 2]));
        }

        try {
            const shot = await page.screenshot({
                type: "jpeg",
                quality: SCREENSHOT_QUALITY,
            });
            const colourCount = await capturedMapColourCount(page, shot);
            if (typeof colourCount === "number") {
                lastColourCount = colourCount;
            }

            const bandPainted =
                colourCount === null || colourCount > MINIMUM_PAINTED_COLOURS;
            // Only cross-check the canvas once the cheap band check has passed,
            // so an obviously blank capture fails without a second screenshot.
            const integrity = bandPainted ? await contradictedMapCells(page, shot) : null;
            const gridPainted =
                integrity === null ||
                integrity.contradictedCells <= MAXIMUM_CONTRADICTED_CELLS;

            if (bandPainted && gridPainted) {
                // Match `page.screenshot({ path })`: create missing parent
                // directories before writing.
                await mkdir(dirname(path), { recursive: true });
                await writeFile(path, shot);
                return shot;
            }
        } catch (error) {
            lastError = error;
        }
    }

    if (lastColourCount !== null) {
        const errorNote = lastError ? ` Last capture error: ${String(lastError)}` : "";
        throw new Error(
            `Refusing to write a blank screenshot to ${path}: ${backoffMs.length + 1} capture attempt(s) did not prove a fully painted map (last band colour count ${lastColourCount}, minimum ${MINIMUM_PAINTED_COLOURS}; a partially composited capture is rejected too).${errorNote}`,
        );
    }

    throw lastError;
}

export { expect };
