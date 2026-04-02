import MapButton from "../map-button/MapButton";
import { h } from "preact";
import style from "./style.module.css";
import MapActionButton from "../map-button/MapActionButton";

const MapButtons = ({
  mode,
  changeMode,
  action,
  changeAction,
}: {
  mode: string;
  changeMode: (mode: string) => void;
  action?: string;
  changeAction?: (action: string) => void;
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
        label={"Rectangle"}
        mode={"rectangle"}
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
      <MapButton mode={"marker"} currentMode={mode} changeMode={changeMode} />

      {/* Undo/Redo Actions */}
      <MapActionButton
        action="undo"
        currentAction={action as string}
        changeAction={changeAction as () => void}
      />
      <MapActionButton
        action="redo"
        currentAction={action as string}
        changeAction={changeAction as () => void}
      />
    </div>
  );
};

export default MapButtons;
