import { h } from "preact";
import style from "./style.css";
import { useMemo } from "preact/hooks";
import { GeoJSONStoreFeatures } from "terra-draw/dist/store/store";
import { useDownloadJSON } from "./useDownloadJSON";

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
    downloadJSON(featureCollection, "terradraw.geojson");

  return (
    <div class={style.container}>
      <textarea class={style.geojson} readonly>
        {featureCollectionString}
      </textarea>
      <button class={style.download} onClick={downloadGeoJSON}>
        Download GeoJSON
      </button>
    </div>
  );
};

export default GeoJSONTab;
