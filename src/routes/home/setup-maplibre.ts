import { Map, getRTLTextPluginStatus, setRTLTextPlugin, setWorkerUrl } from "maplibre-gl";

import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);

// Default prefix applied to every source/layer Terra Draw adds (its adapter's
// `prefixId`). Used to carry draw features across a basemap style swap.
const TERRA_DRAW_PREFIX = "td-";

type TransformStyle = NonNullable<
  NonNullable<Parameters<Map["setStyle"]>[1]>["transformStyle"]
>;
type StyleSources = Parameters<TransformStyle>[1]["sources"];

/**
 * `map.setStyle()` diffs the current style against the incoming one, which
 * removes programmatically added sources/layers — including Terra Draw's
 * `td-*` features. The adapter has no `style.load` re-registration and
 * `TerraDraw.start()` early-returns once enabled, so they must be preserved.
 *
 * Copy only the `td-` sources and layers into the next style, appended after
 * the new basemap layers so draw features stay on top.
 */
const preserveTerraDrawLayers: TransformStyle = (previous, next) => {
  if (!previous) {
    return next;
  }

  const terraDrawSources: StyleSources = {};
  for (const [sourceId, source] of Object.entries(previous.sources)) {
    if (sourceId.startsWith(TERRA_DRAW_PREFIX)) {
      terraDrawSources[sourceId] = source;
    }
  }
  const terraDrawLayers = previous.layers.filter((layer) =>
    layer.id.startsWith(TERRA_DRAW_PREFIX),
  );

  return {
    ...next,
    sources: { ...next.sources, ...terraDrawSources },
    layers: [...next.layers, ...terraDrawLayers],
  };
};

export function setupMaplibreMap({
  id,
  lat,
  lng,
  zoom,
}: {
  id: string;
  lat: number;
  lng: number;
  zoom: number;
}) {
  if (getRTLTextPluginStatus() === "unavailable") {
    setRTLTextPlugin(
      "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js",
      true,
    );
  }

  const LIGHT_STYLE = "https://tiles.openfreemap.org/styles/positron";
  const DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

  const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const preferredStyle = () => (colorScheme.matches ? DARK_STYLE : LIGHT_STYLE);

  const map = new Map({
    container: id,
    // Pick the right flavour up front so the initial load never swaps style.
    style: preferredStyle(),
    center: { lat, lng },
    zoom,
  });

  // Hold swaps until the map's first style has settled; the initial style was
  // already chosen correctly at construction, and swapping mid-load is unsafe.
  let initialStyleLoaded = false;
  map.once("style.load", () => {
    initialStyleLoaded = true;
  });

  const handleColorSchemeChange = () => {
    if (!initialStyleLoaded) {
      return;
    }
    map.setStyle(preferredStyle(), { transformStyle: preserveTerraDrawLayers });
  };

  colorScheme.addEventListener("change", handleColorSchemeChange);

  map.once("remove", () => {
    colorScheme.removeEventListener("change", handleColorSchemeChange);
  });

  // Expose the instance so end-to-end tests can wait on MapLibre's `idle`
  // event (a reliable paint signal) before capturing a screenshot.
  window.__terraMap = map;

  return map;
}
