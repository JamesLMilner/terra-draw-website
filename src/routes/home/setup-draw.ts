import {
  TerraDraw,
  TerraDrawLeafletAdapter,
  TerraDrawSelectMode,
  TerraDrawPointMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawCircleMode,
  TerraDrawFreehandMode,
  TerraDrawRenderMode,
  TerraDrawGreatCircleMode,
  ValidateNotSelfIntersecting,
} from "terra-draw";
import * as L from "leaflet";

export function setupDraw(map: L.Map, leaflet: typeof L) {
  return new TerraDraw({
    adapter: new TerraDrawLeafletAdapter({
      lib: leaflet,
      map,
      coordinatePrecision: 9,
    }),
    modes: [
      new TerraDrawSelectMode({
        flags: {
          arbitary: {
            feature: {},
          },
          polygon: {
            feature: {
              scaleable: true,
              rotateable: true,
              draggable: true,
              coordinates: {
                midpoints: true,
                draggable: true,
                deletable: true,
              },
            },
          },
          linestring: {
            feature: {
              draggable: true,
              coordinates: {
                midpoints: true,
                draggable: true,
                deletable: true,
              },
            },
          },
          circle: {
            feature: {
              draggable: true,
            },
          },
          point: {
            feature: {
              draggable: true,
            },
          },
          freehand: {
            feature: {
              draggable: true,
            },
          },
        },
      }),
      new TerraDrawPointMode(),
      new TerraDrawLineStringMode({
        snapping: true,
        validation: (feature, { updateType }) => {
          if (updateType === "finish" || updateType === "commit") {
            return ValidateNotSelfIntersecting(feature);
          }
          return true
        }
      }),
      new TerraDrawGreatCircleMode({
        snapping: true,
      }),
      new TerraDrawPolygonMode({
        // snapping: true,
        pointerDistance: 30,
        validation: (feature, { updateType }) => {
          if (updateType === "finish" || updateType === "commit") {
            return ValidateNotSelfIntersecting(feature);
          }
          return true
        }
      }),
      new TerraDrawCircleMode(),
      new TerraDrawFreehandMode(),
      new TerraDrawRenderMode({
        modeName: 'arbitary',
        styles: {
          polygonFillColor: "#4357AD",
          polygonOutlineColor: "#48A9A6",
          polygonOutlineWidth: 2,
        },
      }),
    ],
  });
}
