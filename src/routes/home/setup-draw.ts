import {
  TerraDraw,
  TerraDrawSelectMode,
  TerraDrawPointMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawCircleMode,
  TerraDrawFreehandMode,
  ValidateNotSelfIntersecting,
  TerraDrawRectangleMode,
} from "terra-draw";

import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";

import maplibregl from "maplibre-gl";

export function setupDraw(map: maplibregl.Map) {
  return new TerraDraw({
    tracked: true,
    adapter: new TerraDrawMapLibreGLAdapter({
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
          rectangle: {
            feature: {
              draggable: true,
              coordinates: {
                resizable: 'opposite'
              }
            }
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
          return {
            valid: true
          }
        }
      }),
      new TerraDrawRectangleMode(),
      new TerraDrawPolygonMode({
        // snapping: true,
        pointerDistance: 30,
        validation: (feature, { updateType }) => {
          if (updateType === "finish" || updateType === "commit") {
            return ValidateNotSelfIntersecting(feature);
          }
          return {
            valid: true
          }
        }
      }),
      new TerraDrawCircleMode(),
      new TerraDrawFreehandMode({
        pointerDistance: 5,
        validation: (feature) => {
          return ValidateNotSelfIntersecting(feature);
        }
      }),
    ],
  });
}
