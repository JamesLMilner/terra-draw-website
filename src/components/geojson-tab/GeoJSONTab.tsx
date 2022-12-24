import { h } from "preact";
import style from "./style.css";
import { getHHMMSS } from "../../utils/dates";
import { area, length } from "../../utils/geo";
import { useMemo } from "preact/hooks";
import { GeoJSONStoreFeatures } from "terra-draw/dist/store/store";

const GeoJSONTab = ({ features }: { features: GeoJSONStoreFeatures[] }) => {
  const featureCollection = useMemo(() => {
    return JSON.stringify({ type: "FeatureCollection", features }, null, 4);
  }, [features]);

  return (
    <div class={style.container}>
      <textarea class={style.geojson} readonly>
        {featureCollection}
      </textarea>
    </div>
  );
};

export default GeoJSONTab;
