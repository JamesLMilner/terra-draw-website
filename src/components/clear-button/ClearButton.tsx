import { h } from "preact";
import style from "./style.css";
import clear from "../../assets/imgs/clear.png";
import { TerraDraw } from "terra-draw";

const ClearButton = ({ draw }: { draw: TerraDraw }) => {
  let classes = style.button;

  return (
    <button
      id="clear"
      class={classes}
      onClick={() => {
        draw.clear();
      }}
    >
      <img class={style.clear} src={clear} />
    </button>
  );
};

export default ClearButton;
