import * as leaflet from "leaflet";
import * as protomaps from "protomaps";

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
    zoom: zoom, // starting zoom,
    minZoom: 3,
    maxZoom: 20,
    tapTolerance: 35,
  });

  const PMTILES_KEY = "d23c43b7c56e123d";
  var layer = protomaps.leafletLayer({
    url: `https://api.protomaps.com/tiles/v2/{z}/{x}/{y}.pbf?key=${PMTILES_KEY}`,
  });
  layer.addTo(leafletMap);

  return leafletMap;
}
