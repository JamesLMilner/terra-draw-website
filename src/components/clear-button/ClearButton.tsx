import { h } from "preact";
import style from "./style.module.css";
import clear from "../../assets/imgs/clear.png";
import { GeoJSONStoreFeatures, TerraDraw } from "terra-draw";

const ClearButton = ({
  draw,
  clearLocalStorage,
  setFeatures,
}: {
  draw: TerraDraw;
  clearLocalStorage: () => void;
  setFeatures: (features: GeoJSONStoreFeatures[]) => void;
}) => {
  const classes = style.button;

  return (
    <button
      id="clear"
      class={classes}
      title={"Clear"}
      onClick={() => {
        draw.clear();
        clearLocalStorage();
        setFeatures([]);
      }}
    >
      <img class={style.clear} src={clear} />
    </button>
  );
};

export default ClearButton;
