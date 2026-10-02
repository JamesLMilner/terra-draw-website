import { readFile } from "node:fs/promises";
import {
    test,
    expect,
    captureScreenshot,
    getMapTileUrls,
    mapCanvasLuminance,
    SCREENSHOT_MIME,
} from "../fixtures";
import type { Page } from "@playwright/test";

/**
 * Repeatable committed demo captures.
 *
 * Seeds tests/data/big-route.geojson (a single Terra Draw-native LineString)
 * into the app's localStorage restore path, frames the route, waits for real
 * map tiles and asserts the data really loaded. It then regenerates both
 * committed companions in screenshots/docs/: demo-light.jpg
 * from the light basemap, and demo-dark.jpg after emulating the dark colour
 * scheme, which swaps the basemap live while preserving the seeded route layer.
 */

test.setTimeout(120_000);

// MapLibre's flyTo ignores `animate: false`, but its reduced-motion branch
// jumps instantly. Emulating reduced motion makes the geolocation click a
// deterministic, exact camera jump (centre + zoom) instead of a long flight.
test.use({ contextOptions: { reducedMotion: "reduce" } });

const DATA_PATH = "tests/data/big-route.geojson";
const LIGHT_SCREENSHOT_PATH = "screenshots/docs/demo-light.jpg";
const DARK_SCREENSHOT_PATH = "screenshots/docs/demo-dark.jpg";
const ROUTE_CENTER = { longitude: -57.646, latitude: 47.2345 };
const GEOLOCATION_ZOOM = 14;
const KEYBOARD_ZOOM_OUT_STEPS = 8;
const FINE_WHEEL_DELTA = 135;
const MAP_CENTER_OFFSET = { x: 470, y: 450 };

// Under reduced motion MapLibre's easeTo applies synchronously (duration 0),
// so each "-" keypress is an exact, instant -1 zoom: 14 -> 6. A single
// isolated wheel event then trims by log2(2 / (1 + e^(-delta/450))) = 0.2002
// to 5.7998, so MapLibre requests tile zoom 5 (tileZoom = floor(zoom)) for
// the final camera.
const FINAL_ZOOM =
    GEOLOCATION_ZOOM -
    KEYBOARD_ZOOM_OUT_STEPS -
    Math.log2(2 / (1 + Math.exp(-FINE_WHEEL_DELTA / 450)));
const FINAL_TILE_ZOOM = Math.floor(FINAL_ZOOM);

type RouteFeature = {
    type: "Feature";
    geometry: { type: string; coordinates: number[][] };
    properties: Record<string, unknown>;
};

async function clickMap(page: Page, x: number, y: number) {
    const box = await page.locator("#maplibre-map").boundingBox();
    if (!box) {
        throw new Error("Map container #maplibre-map has no bounding box");
    }
    await page.mouse.click(box.x + x, box.y + y);
}

function badgeValue(page: Page, label: string) {
    return page
        .locator("#sidepanel")
        .getByText(label, { exact: true })
        .locator("xpath=following-sibling::*[1]");
}

test("regenerates the light and dark demo captures from the big route data", async ({
    page,
    context,
}, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const collection = JSON.parse(await readFile(DATA_PATH, "utf8")) as {
        features: RouteFeature[];
    };
    const expectedCoordinates = collection.features[0].geometry.coordinates.length;

    // Seed before the app boots. The cleanStorage fixture registers its init
    // script first, so this later-registered script runs after it on every
    // navigation and the seed survives.
    await context.addInitScript(
        (json) => localStorage.setItem("terra-draw", json),
        JSON.stringify(collection.features),
    );

    // Shared tracker (fixtures.ts) records finished tile requests from before
    // navigation; this spec adds a stricter final-camera check on top of the
    // generic gate that captureScreenshot applies.
    const tileResponses = getMapTileUrls(page);

    await context.grantPermissions(["geolocation"], { origin: "http://127.0.0.1:4173" });
    await context.setGeolocation(ROUTE_CENTER);

    await page.goto("/");
    await expect(page.locator("#select")).toBeVisible();

    // The seed survived the auto storage-cleaning fixture.
    expect(await page.evaluate(() => localStorage.getItem("terra-draw"))).not.toBeNull();

    // Data loaded through the app's restore path: one Terra Draw-native line.
    await expect(badgeValue(page, "Total")).toHaveText("1");
    await expect(badgeValue(page, "Lines")).toHaveText("1");
    await expect(badgeValue(page, "Points")).toHaveText("0");
    await expect(badgeValue(page, "Polygons")).toHaveText("0");
    await expect(page.locator("#sidepanel tbody tr")).toHaveCount(1);

    // Frame the route: exact centre + zoom 14 jump via the geolocation button
    // (instant under reduced motion).
    await page.locator("#geolocation").click();
    const tilesBeforeJump = tileResponses.length;
    await expect
        .poll(() => tileResponses.length, { timeout: 20_000 })
        .toBeGreaterThan(tilesBeforeJump);

    const mapBox = await page.locator("#maplibre-map").boundingBox();
    if (!mapBox) {
        throw new Error("Map container #maplibre-map has no bounding box");
    }

    // Clicking the map centre focuses the MapLibre canvas without changing any
    // app state (static mode), so the keyboard handler receives the zoom keys.
    await clickMap(page, MAP_CENTER_OFFSET.x, MAP_CENTER_OFFSET.y);
    for (let step = 0; step < KEYBOARD_ZOOM_OUT_STEPS; step += 1) {
        await page.keyboard.press("-");
    }

    // One isolated wheel event at the centre trims to the final zoom. A single
    // event cannot coalesce with another, so its target is exact.
    await page.mouse.move(mapBox.x + MAP_CENTER_OFFSET.x, mapBox.y + MAP_CENTER_OFFSET.y);
    await page.mouse.wheel(0, FINE_WHEEL_DELTA);

    // Strict final wait: the committed asset is only overwritten once several
    // tiles for the final camera's zoom level have actually arrived.
    const finalZoomTiles = () =>
        tileResponses.filter((url) =>
            new RegExp(`/planet/(?:[^/]+/)?${FINAL_TILE_ZOOM}/\\d+/\\d+\\.pbf`).test(url),
        ).length;
    await expect.poll(finalZoomTiles, { timeout: 20_000 }).toBeGreaterThanOrEqual(3);

    // Exported data reflects the loaded route. Selection is deliberately not
    // exercised here: clicking the row for this 69.6k-coordinate LineString
    // stalls Terra Draw's select mode (per-vertex selection points + midpoints
    // ≈ 139k guidance features) beyond the 120s test timeout. The store
    // snapshot therefore holds exactly the one seeded feature, so exact
    // equality is deterministic and stronger than a lower bound.
    await page.getByText("GeoJSON", { exact: true }).click();
    const exported = JSON.parse(await page.getByRole("textbox").inputValue()) as {
        features: RouteFeature[];
    };
    expect(exported.features).toHaveLength(1);
    expect(exported.features[0].geometry.type).toBe("LineString");
    expect(exported.features[0].geometry.coordinates).toHaveLength(expectedCoordinates);
    expect(exported.features[0].geometry.coordinates[0]).toHaveLength(2);
    expect(exported.features[0].properties.mode).toBe("linestring");

    // Back to the Info tab, and wait for its 160ms colour transition to settle
    // so the capture shows the active-tab styling rather than a mid-transition
    // blend (this was visible as a green GeoJSON pill over Info content).
    const infoTab = page.getByText("Info", { exact: true });
    await infoTab.click();
    await expect(infoTab).toHaveCSS("color", "rgb(0, 138, 91)");

    const lightScreenshot = await captureScreenshot(page, LIGHT_SCREENSHOT_PATH);
    await testInfo.attach("demo-light", {
        body: lightScreenshot,
        contentType: SCREENSHOT_MIME,
    });

    // Emulating the dark scheme fires the app's matchMedia change listener,
    // which swaps the basemap to the dark style with { transformStyle:
    // preserveTerraDrawLayers }, keeping the seeded route layer on top.
    await page.emulateMedia({ colorScheme: "dark" });

    // Gate on the dark basemap actually painting, mirroring the draw-after-swap
    // test in dark-mode.spec.ts: a style request alone would not prove the
    // swapped style had rendered before the capture.
    await expect
        .poll(() => mapCanvasLuminance(page), {
            timeout: 20_000,
            message: "expected the dark basemap to paint before the demo-dark capture",
        })
        .toBeLessThan(0.2);

    const darkScreenshot = await captureScreenshot(page, DARK_SCREENSHOT_PATH);
    await testInfo.attach("demo-dark", {
        body: darkScreenshot,
        contentType: SCREENSHOT_MIME,
    });
});
