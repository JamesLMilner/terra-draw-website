// filepath: c:\Users\yawen.li\Documents\Yawen\Dev\terra-draw-website\src\routes\home\setup-mapbox.ts
import mapboxgl from "mapbox-gl";

export function setupMapboxMap({
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
  mapboxgl.accessToken = "your-access-token"; // Replace with your Mapbox access token

  return new mapboxgl.Map({
    container: id,
    style: "mapbox://styles/mapbox/streets-v11", // You can change the style as needed
    center: [lng, lat],
    zoom,
  });
}
