import { Map, getRTLTextPluginStatus, setRTLTextPlugin, setWorkerUrl } from "maplibre-gl";

import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);

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

  return new Map({
    container: id,
    style: "https://www.ogis.org/basemap/style-light.json",
    center: { lat, lng },
    zoom,
  });
}
