import { h } from "preact";
import style from "./style.module.css";
import { formatDateTime } from "../../utils/dates";
import { area, length } from "../../utils/geo";
import { useMemo, useState } from "preact/hooks";
import { GeoJSONStoreFeatures } from "terra-draw/dist/store/store";

const LARGE_AREA_M2_THRESHOLD = 1_000_000;

const isGuidanceFeature = (feature: GeoJSONStoreFeatures) => {
  const properties = feature.properties;

  return Boolean(
    properties.selectionPoint ||
    properties.midPoint ||
    properties.closingPoint ||
    properties.snappingPoint ||
    properties.coordinatePoint ||
    properties.virtualPoint
  );
};

const InfoTab = ({
  selected,
  features,
  onSelectFeature,
}: {
  selected: undefined | GeoJSONStoreFeatures;
  features: GeoJSONStoreFeatures[];
  onSelectFeature: (featureId: string) => void;
}) => {
  const [hideGuidanceFeatures, setHideGuidanceFeatures] = useState(true);

  const tableFeatures = useMemo(
    () =>
      hideGuidanceFeatures
        ? features.filter((feature) => !isGuidanceFeature(feature))
        : features,
    [features, hideGuidanceFeatures]
  );

  const { points, lines, polygons } = useMemo(() => {
    const points: GeoJSONStoreFeatures[] = [];
    const lines: GeoJSONStoreFeatures[] = [];
    const polygons: GeoJSONStoreFeatures[] = [];

    tableFeatures.forEach((f) => {
      if (f.geometry.type === "Point") {
        points.push(f);
      }
      if (f.geometry.type === "LineString") {
        lines.push(f);
      }
      if (f.geometry.type === "Polygon") {
        polygons.push(f);
      }
    });

    return { points, lines, polygons };
  }, [tableFeatures]);

  const selectedAreaValue = useMemo(() => {
    if (!selected || selected.geometry.type !== "Polygon") {
      return null;
    }

    const areaM2 = area(selected);
    const useKm2 = areaM2 >= LARGE_AREA_M2_THRESHOLD;

    return {
      label: useKm2 ? "Area (km2)" : "Area (m2)",
      value: useKm2 ? (areaM2 / LARGE_AREA_M2_THRESHOLD).toFixed(2) : areaM2.toFixed(2),
    };
  }, [selected]);

  return (
    <div class={style.container}>
      <div class={style.all}>
        <div class={style.headerRow}>
          <h3 class={style.header}> All Features </h3>
          <label class={style.filterToggle}>
            <input
              type="checkbox"
              checked={hideGuidanceFeatures}
              onChange={(event) => setHideGuidanceFeatures(event.currentTarget.checked)}
            />
            Hide guidance features
          </label>
        </div>
        <div class={style.badgeGroup}>
          <span class={style.badge}>
            <span class={style.badgeLabel}>Total</span>
            <span class={style.badgeValue}>{tableFeatures.length}</span>
          </span>
          <span class={style.badge}>
            <span class={style.badgeLabel}>Polygons</span>
            <span class={style.badgeValue}>{polygons.length}</span>
          </span>
          <span class={style.badge}>
            <span class={style.badgeLabel}>Lines</span>
            <span class={style.badgeValue}>{lines.length}</span>
          </span>
          <span class={style.badge}>
            <span class={style.badgeLabel}>Points</span>
            <span class={style.badgeValue}>{points.length}</span>
          </span>
        </div>
        <div class={style.tableContainer}>
          <table class={style.table}>
            <thead>
              <tr>
                <th class={style.tableHeader}>ID</th>
                <th class={style.tableHeader}>Type</th>
                <th class={style.tableHeader}>Created</th>
                <th class={style.tableHeader}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {tableFeatures.map((f) => {
                const guidanceFeature = isGuidanceFeature(f);

                return (
                  <tr
                    key={f.id as string}
                    class={`${style.featureRow} ${guidanceFeature ? style.nonSelectableRow : ""} ${selected && f.id === selected.id ? style.selectedRow : ""
                      }`}
                    onClick={() => {
                      if (!guidanceFeature) {
                        onSelectFeature(f.id as string);
                      }
                    }}
                    title={guidanceFeature ? "Guidance features cannot be selected" : ""}
                  >
                    <td class={style.cell}>{(f.id as string).slice(0, 8)}...</td>
                    <td class={style.cell}>{f.geometry.type}</td>
                    <td class={style.cell}>
                      {f.properties.createdAt
                        ? formatDateTime(f.properties.createdAt as number)
                        : "N/A"}
                    </td>
                    <td class={style.cell}>
                      {f.properties.updatedAt
                        ? formatDateTime(f.properties.updatedAt as number)
                        : "N/A"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {selected && (selected.geometry.type === "Polygon" || selected.geometry.type === "LineString") && (
          <div class={style.selectedFeatureSection}>
            <div class={style.selectedFeatureLabel}>Selected Feature Measurements</div>
            <div class={style.selectedBadgeGroup}>
              {selected.geometry.type === "Polygon" && (
                <span class={style.badge}>
                  <span class={style.badgeLabel}>{selectedAreaValue?.label ?? "Area (m2)"}</span>
                  <span class={style.badgeValue}>{selectedAreaValue?.value ?? "N/A"}</span>
                </span>
              )}
              {selected.geometry.type === "LineString" && (
                <span class={style.badge}>
                  <span class={style.badgeLabel}>Length (km)</span>
                  <span class={style.badgeValue}>{length(selected).toFixed(2)}</span>
                </span>
              )}
              <span class={style.badge}>
                <span class={style.badgeLabel}>Coordinates</span>
                <span class={style.badgeValue}>{selected && selected.geometry.type === "Polygon"
                  ? selected.geometry.coordinates[0].length
                  : selected && selected.geometry.type === "LineString"
                    ? selected.geometry.coordinates.length
                    : "N/A"}</span>
              </span>
            </div>
          </div>)}
      </div>
    </div>
  );
};

export default InfoTab;
