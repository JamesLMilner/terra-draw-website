import { h } from "preact";
import style from "./style.module.css";
import { useMemo } from "preact/hooks";
import { GeoJSONStoreFeatures } from "terra-draw/dist/store/store";
import { fileDate } from "../../utils/dates";
import { useDownloadFlatGeobuf } from "./useDownloadFlatGeobuf";
import { FeatureCollection } from "geojson";
import { useDownloadJSON } from "./useDownloadJSON";
import { Copy, Download } from "lucide-preact";

const GeoJSONTab = ({ features, format, setFormat }: { features: GeoJSONStoreFeatures[], format: 'geojson' | 'fgb', setFormat: (format: 'geojson' | 'fgb') => void }) => {
  // Create a FeatureCollection when features changes
  const featureCollection = useMemo(
    () => ({
      type: "FeatureCollection",
      features,
    } as FeatureCollection),
    [features]
  );

  // Turn it into a string so it can be rendered,
  // again only when features change
  const featureCollectionString = useMemo(() => {
    return JSON.stringify(featureCollection, null, 4);
  }, [featureCollection]);

  const downloadJSON = useDownloadJSON();
  const downloadFlatGeobuf = useDownloadFlatGeobuf();

  // Download to a file called terradraw.geojson
  const downloadGeoJSON = () => format === 'geojson' ?
    downloadJSON(featureCollection, `terradraw_${fileDate()}.geojson`) :
    downloadFlatGeobuf(featureCollection, `terradraw_${fileDate()}.fgb`);

  const copyGeoJSON = () => {
    navigator.clipboard && navigator.clipboard.writeText(featureCollectionString);
  }

  return (
    <div class={style.container}>
      <div class={style.geojsonSection}>
        <textarea class={style.geojson} readOnly>
          {featureCollectionString}
        </textarea>
        {navigator.clipboard ? <div class={style.copyRow}>
          <button class={style.copy} onClick={copyGeoJSON}>
            <Copy size={16} aria-hidden={true} />
            Copy GeoJSON
          </button>
        </div>
          : null}
      </div>

      <div class={style.exportSection}>
        <div class={style.exportHeader}>Export</div>
        <div class={style.formatRow}>
          <label class={style.formatLabel} for="download-format">Format</label>
          <select
            id="download-format"
            class={style.formatSelect}
            value={format}
            onChange={(event) => {
              setFormat(event.currentTarget.value as 'geojson' | 'fgb')
            }}
          >
            <option value="geojson">GeoJSON</option>
            <option value="fgb">FlatGeobuf</option>
          </select>
        </div>
        <button class={style.download} onClick={downloadGeoJSON}>
          <Download size={16} aria-hidden={true} />
          Download
        </button>
      </div>

    </div>
  );
};

export default GeoJSONTab;
