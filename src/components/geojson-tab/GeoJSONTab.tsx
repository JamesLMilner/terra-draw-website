import { h } from "preact";
import style from "./style.css";
import { useMemo } from "preact/hooks";
import { GeoJSONStoreFeatures } from "terra-draw/dist/store/store";
import { useDownloadJSON } from "./useDownloadJSON";
import { fileDate } from "../../utils/dates";

const GeoJSONTab = ({ features }: { features: GeoJSONStoreFeatures[] }) => {
  // Create a FeatureCollection when features changes
  const featureCollection = useMemo(
    () => ({
      type: "FeatureCollection",
      features,
    }),
    [features]
  );

  // Turn it into a string so it can be rendered,
  // again only when features change
  const featureCollectionString = useMemo(() => {
    return JSON.stringify(featureCollection, null, 4);
  }, [featureCollection]);

  const downloadJSON = useDownloadJSON();

  // Download to a file called terradraw.geojson
  const downloadGeoJSON = () =>
    downloadJSON(featureCollection, `terradraw_${fileDate()}.geojson`);

  const copyGeoJSON = () => {
    navigator.clipboard && navigator.clipboard.writeText(featureCollectionString);
  }

  return (
    <div class={style.container}>
      <textarea class={style.geojson} readonly>
        {featureCollectionString}
      </textarea>
      {navigator.clipboard ? <button class={style.download} onClick={copyGeoJSON}>
        Copy
      </button> : null}
      <button class={style.download} onClick={downloadGeoJSON}>
        Download
      </button>
    </div>
  );
};

export default GeoJSONTab;
