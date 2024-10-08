import { h } from "preact";
import style from "./style.module.css";
import clear from "../../assets/imgs/clear.png";
import { TerraDraw } from "terra-draw";

const ClearButton = ({ draw, clearLocalStorage }: { draw: TerraDraw, clearLocalStorage: () => void }) => {
  const classes = style.button;

  return (
    <button
      id="clear"
      class={classes}
      title={"Clear"}
      onClick={() => {
        draw.clear();
        clearLocalStorage()
      }}
    >
      <img class={style.clear} src={clear} />
    </button>
  );
};

export default ClearButton;
