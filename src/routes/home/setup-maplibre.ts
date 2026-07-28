import maplibregl from "maplibre-gl";

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
  if (maplibregl.getRTLTextPluginStatus() === "unavailable") {
    maplibregl.setRTLTextPlugin(
      "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js",
      true,
    );
  }

  const PROTOMAPS_API_KEY = "d23c43b7c56e123d";
  return new maplibregl.Map({
    container: id,
    style: `https://api.protomaps.com/styles/v3/white.json?key=${PROTOMAPS_API_KEY}`,
    center: { lat, lng },
    zoom,
  });
}
