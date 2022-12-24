import * as leaflet from "leaflet";

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
    zoom: zoom + 1, // starting zoom
  });

  L.tileLayer(
    "https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.{ext}",
    {
      attribution:
        'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: "abcd",
      minZoom: 3,
      maxZoom: 17,
      ext: "png",
    } as any
  ).addTo(leafletMap);

  console.log("loaded");

  return leafletMap;
}
