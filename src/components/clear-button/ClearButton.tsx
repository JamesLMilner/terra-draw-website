import { h } from "preact";
import style from "./style.module.css";
import { GeoJSONStoreFeatures, TerraDraw } from "terra-draw";
import { Trash2 } from "lucide-preact";

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
      aria-label={"Clear"}
      onClick={() => {
        draw.clear();
        clearLocalStorage();
        setFeatures([]);
      }}
    >
      <Trash2 size={16} aria-hidden={true} />
    </button>
  );
};

export default ClearButton;
