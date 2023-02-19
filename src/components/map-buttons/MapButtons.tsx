import MapButton from "../map-button/MapButton";
import { h } from "preact";
import style from "./style.css";

const MapButtons = ({
  mode,

  changeMode,
}: {
  mode: string;
  changeMode: (mode: string) => void;
}) => {
  return (
    <div class={style.buttons}>
      <MapButton mode={"select"} currentMode={mode} changeMode={changeMode} />
      <MapButton mode={"point"} currentMode={mode} changeMode={changeMode} />
      <MapButton
        label={"Line"}
        mode={"linestring"}
        currentMode={mode}
        changeMode={changeMode}
      />
      <MapButton
        label={"Flight Line "}
        mode={"greatcircle"}
        currentMode={mode}
        changeMode={changeMode}
        hiddenOnTouch={true}
      />
      <MapButton mode={"polygon"} currentMode={mode} changeMode={changeMode} />
      <MapButton
        mode={"freehand"}
        currentMode={mode}
        changeMode={changeMode}
        hiddenOnTouch={true}
      />
      <MapButton
        mode={"circle"}
        currentMode={mode}
        changeMode={changeMode}
        hiddenOnTouch={true}
      />
    </div>
  );
};

export default MapButtons;
