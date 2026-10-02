import { readFile } from "node:fs/promises";
import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * Export coverage for the GeoJSON tab. Downloads are produced by a blob +
 * synthetic <a download> click, so Playwright's download event is the
 * observable seam.
 */

const VERTEX_1 = { x: 220, y: 300 };
const VERTEX_2 = { x: 320, y: 380 };
const VERTEX_3 = { x: 420, y: 300 };

// Matches fileDate() in src/utils/dates.ts: ISO timestamp with :/. replaced by -/_.
const FILENAME_DATE = "\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}_\\d+";

async function openHome(page: Page) {
    await page.goto("/");
    await expect(page.locator("#select")).toBeVisible();
}

async function clickMap(page: Page, point: { x: number; y: number }) {
    const box = await page.locator("#maplibre-map").boundingBox();
    if (!box) {
        throw new Error("Map container #maplibre-map has no bounding box");
    }
    await page.mouse.click(box.x + point.x, box.y + point.y);
}

function badgeValue(page: Page, label: string) {
    return page
        .locator("#sidepanel")
        .getByText(label, { exact: true })
        .locator("xpath=following-sibling::*[1]");
}

async function openGeoJSONTab(page: Page) {
    await page.getByText("GeoJSON", { exact: true }).click();
    await expect(page.locator("#download-format")).toBeVisible();
}

async function downloadFile(page: Page, format?: "geojson" | "fgb") {
    if (format) {
        await page.locator("#download-format").selectOption(format);
    }

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download", exact: true }).click();

    return await downloadPromise;
}

test("downloads the drawn polygon as GeoJSON", async ({ page }) => {
    await openHome(page);

    await page.locator("#polygon").click();
    await clickMap(page, VERTEX_1);
    await clickMap(page, VERTEX_2);
    await clickMap(page, VERTEX_3);
    await page.keyboard.press("Enter");
    await expect(badgeValue(page, "Polygons")).toHaveText("1");

    await openGeoJSONTab(page);
    await expect(page.locator("#download-format")).toHaveValue("geojson");

    // No format change: exercise the default GeoJSON path.
    const download = await downloadFile(page);
    expect(download.suggestedFilename()).toMatch(
        new RegExp(`^terradraw_${FILENAME_DATE}\\.geojson$`),
    );

    const path = await download.path();
    const raw = await readFile(path, "utf8");

    // The file must be exactly what the page renders in the textarea.
    expect(raw).toBe(await page.getByRole("textbox").inputValue());

    const collection = JSON.parse(raw);
    expect(collection.type).toBe("FeatureCollection");

    const polygon = collection.features.find(
        (feature: { geometry: { type: string } }) => feature.geometry.type === "Polygon",
    );
    expect(polygon).toBeDefined();
    expect(polygon.geometry.coordinates[0].length).toBeGreaterThanOrEqual(4);
});

test("downloads a feature as FlatGeobuf", async ({ page }) => {
    await openHome(page);

    // A point is the cheapest feature that still goes through serialization.
    await page.locator("#point").click();
    await clickMap(page, VERTEX_2);
    await expect(badgeValue(page, "Points")).toHaveText("1");

    await openGeoJSONTab(page);

    const download = await downloadFile(page, "fgb");
    expect(download.suggestedFilename()).toMatch(
        new RegExp(`^terradraw_${FILENAME_DATE}\\.fgb$`),
    );

    const path = await download.path();
    const buffer = await readFile(path);

    expect(buffer.byteLength).toBeGreaterThan(0);

    // FlatGeobuf magic bytes: ASCII "fgb" followed by the format version (3).
    expect(Array.from(buffer.subarray(0, 3))).toEqual([0x66, 0x67, 0x62]);
    expect(buffer[3]).toBe(3);
});
