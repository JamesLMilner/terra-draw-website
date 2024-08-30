import { h } from "preact";
import style from "./style.module.css";
import { useMemo } from "preact/hooks";
import { GeoJSONStoreFeatures } from "terra-draw/dist/store/store";
import { fileDate } from "../../utils/dates";
import { useDownloadFlatGeobuf } from "./useDownloadFlatGeobuf";
import { FeatureCollection } from "geojson";
import { useDownloadJSON } from "./useDownloadJSON";

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
      <textarea class={style.geojson} readonly>
        {featureCollectionString}
      </textarea>
      {navigator.clipboard ? <button class={style.copy} onClick={copyGeoJSON}>
        Copy
      </button> : null}
      <div class={style.downloadContainer}>
        <button class={style.download} onClick={downloadGeoJSON}>
          Download
        </button>
        <select class={style.formatSelect} onChange={(event) => {
          setFormat(event.currentTarget.value as 'geojson' | 'fgb')
        }}>
          <option value="geojson">GeoJSON</option>
          <option value="flatgeobuf">FlatGeobuf</option>
        </select>
      </div>

    </div>
  );
};

export default GeoJSONTab;
