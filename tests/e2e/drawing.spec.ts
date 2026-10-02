import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * UI-driven drawing coverage. All interactions go through the real map canvas
 * and toolbar; readiness is gated on #select (MapLibre style.load + Terra Draw
 * constructed). No sleeps, no app test hooks.
 */

/** Offsets (px) from the map container's top-left; kept clear of the toolbar rows and attribution control. */
const VERTEX_1 = { x: 220, y: 300 };
const VERTEX_2 = { x: 320, y: 380 };
const VERTEX_3 = { x: 420, y: 300 };

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

/** A count badge's value span, found via its label span's sibling. */
function badgeValue(page: Page, label: string) {
    return page
        .locator("#sidepanel")
        .getByText(label, { exact: true })
        .locator("xpath=following-sibling::*[1]");
}

async function openGeoJSONTab(page: Page) {
    await page.getByText("GeoJSON", { exact: true }).click();
    await expect(page.getByRole("textbox")).toBeVisible();
}

async function readFeatureCollection(page: Page) {
    const raw = await page.getByRole("textbox").inputValue();
    return JSON.parse(raw) as { features: Array<{ geometry: { type: string } }> };
}

test("draws a polygon and shows area and coordinate measurements", async ({ page }) => {
    await openHome(page);

    await page.locator("#polygon").click();
    await expect(page.locator("#polygon")).toHaveClass(/active/);

    await clickMap(page, VERTEX_1);
    await clickMap(page, VERTEX_2);
    await clickMap(page, VERTEX_3);
    await page.keyboard.press("Enter");

    await expect(badgeValue(page, "Polygons")).toHaveText("1");
    await expect(badgeValue(page, "Total")).toHaveText("1");

    const rows = page.locator("#sidepanel tbody tr");
    await expect(rows).toHaveCount(1);

    // Selecting via the table row is the deterministic path.
    await rows.first().click();
    await expect(page.getByText("Selected Feature Measurements")).toBeVisible();

    // At the default zoom (3) a screen-visible polygon is far larger than the
    // app's 1 km² threshold, so the measurement renders as "Area (km2)";
    // accept either label to track the measurement wiring rather than the
    // threshold.
    const areaLabel = page.locator("#sidepanel").getByText(/^Area \((m2|km2)\)$/);
    await expect(areaLabel).toBeVisible();
    await expect(areaLabel.locator("xpath=following-sibling::*[1]")).toHaveText(/^\d+(\.\d+)?$/);

    const coordinatesLabel = page.locator("#sidepanel").getByText("Coordinates", { exact: true });
    await expect(coordinatesLabel).toBeVisible();
    await expect(coordinatesLabel.locator("xpath=following-sibling::*[1]")).toHaveText(/^\d+$/);

    await openGeoJSONTab(page);
    const collection = await readFeatureCollection(page);
    const polygon = collection.features.find((f) => f.geometry.type === "Polygon");
    expect(polygon).toBeDefined();
});

test("draws a line and shows length measurement", async ({ page }) => {
    await openHome(page);

    await page.locator("#linestring").click();
    await expect(page.locator("#linestring")).toHaveClass(/active/);

    await clickMap(page, VERTEX_1);
    await clickMap(page, VERTEX_2);
    await clickMap(page, VERTEX_3);
    await page.keyboard.press("Enter");

    await expect(badgeValue(page, "Lines")).toHaveText("1");
    await expect(badgeValue(page, "Total")).toHaveText("1");

    const rows = page.locator("#sidepanel tbody tr");
    await expect(rows).toHaveCount(1);

    await rows.first().click();
    await expect(page.getByText("Selected Feature Measurements")).toBeVisible();

    const lengthLabel = page.locator("#sidepanel").getByText("Length (km)", { exact: true });
    await expect(lengthLabel).toBeVisible();
    await expect(lengthLabel.locator("xpath=following-sibling::*[1]")).toHaveText(/^\d+(\.\d+)?$/);

    await openGeoJSONTab(page);
    const collection = await readFeatureCollection(page);
    const line = collection.features.find((f) => f.geometry.type === "LineString");
    expect(line).toBeDefined();
});

test("undo, redo and clear update features and empty state", async ({ page }) => {
    await openHome(page);

    await expect(page.locator("#undo")).toBeDisabled();
    await expect(page.locator("#redo")).toBeDisabled();

    await page.locator("#point").click();
    await expect(page.locator("#point")).toHaveClass(/active/);
    await clickMap(page, VERTEX_2);

    const rows = page.locator("#sidepanel tbody tr");
    await expect(badgeValue(page, "Points")).toHaveText("1");
    await expect(badgeValue(page, "Total")).toHaveText("1");
    await expect(rows).toHaveCount(1);

    await expect(page.locator("#undo")).toBeEnabled();
    await page.locator("#undo").click();
    await expect(badgeValue(page, "Points")).toHaveText("0");
    await expect(badgeValue(page, "Total")).toHaveText("0");
    await expect(rows).toHaveCount(0);

    await expect(page.locator("#redo")).toBeEnabled();
    await page.locator("#redo").click();
    await expect(badgeValue(page, "Points")).toHaveText("1");
    await expect(badgeValue(page, "Total")).toHaveText("1");
    await expect(rows).toHaveCount(1);

    await page.locator("#clear").click();

    await expect(badgeValue(page, "Points")).toHaveText("0");
    await expect(badgeValue(page, "Polygons")).toHaveText("0");
    await expect(badgeValue(page, "Lines")).toHaveText("0");
    await expect(badgeValue(page, "Total")).toHaveText("0");
    await expect(rows).toHaveCount(0);

    expect(await page.evaluate(() => localStorage.getItem("terra-draw"))).toBeNull();

    await openGeoJSONTab(page);
    const raw = await page.getByRole("textbox").inputValue();
    expect(JSON.parse(raw)).toEqual({ type: "FeatureCollection", features: [] });
});
