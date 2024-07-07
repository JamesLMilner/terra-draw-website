import * as leaflet from "leaflet";
import * as protomaps from "protomaps-leaflet";

export function setupLeafletMap({
  L,
  id,
  lat,
  lng,
  zoom,
}: {
  L: typeof leaflet;
  id: string;
  lat: number;
  lng: number;
  zoom: number;
}) {
  const leafletMap = L.map(id, {
    center: [lat, lng],
    zoom, // starting zoom,
    minZoom: 3,
    maxZoom: 20,
    tapTolerance: 10,
  });

  const PMTILES_KEY = "d23c43b7c56e123d";
  const layer: any = protomaps.leafletLayer({
    url: `https://api.protomaps.com/tiles/v3/{z}/{x}/{y}.mvt?key=${PMTILES_KEY}`,
    theme: "white"
  });

  layer.addTo(leafletMap);

  return leafletMap;
}
