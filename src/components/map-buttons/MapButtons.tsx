import MapButton from "../map-button/MapButton";
import { h } from "preact";
import style from "./style.module.css";
import MapActionButton from "../map-button/MapActionButton";
import ClearButton from "../clear-button/ClearButton";
import GeolocationButton from "../geolocation-button/GeolocationButton";
import { GeoJSONStoreFeatures, TerraDraw } from "terra-draw";
import { Redo2, Undo2 } from "lucide-preact";

const MapButtons = ({
  mode,
  changeMode,
  action,
  changeAction,
  draw,
  clearLocalStorage,
  setFeatures,
  setLocation,
}: {
  mode: string;
  changeMode: (mode: string) => void;
  action?: string;
  changeAction?: (action: string) => void;
  draw: TerraDraw;
  clearLocalStorage: () => void;
  setFeatures: (features: GeoJSONStoreFeatures[]) => void;
  setLocation: (position: [number, number]) => void;
}) => {
  return (
    <div class={style.buttons}>
      <div class={`${style.section} ${style.actionSection}`}>
        {navigator.geolocation ? <GeolocationButton setLocation={setLocation} /> : null}
        <MapActionButton
          action="undo"
          currentAction={action as string}
          changeAction={changeAction as () => void}
          title="Undo"
          ariaLabel="Undo"
          label={<Undo2 size={16} aria-hidden={true} />}
        />
        <MapActionButton
          action="redo"
          currentAction={action as string}
          changeAction={changeAction as () => void}
          title="Redo"
          ariaLabel="Redo"
          label={<Redo2 size={16} aria-hidden={true} />}
        />
        <ClearButton
          draw={draw}
          clearLocalStorage={clearLocalStorage}
          setFeatures={setFeatures}
        />
      </div>

      <div class={`${style.section} ${style.modeSection}`}>
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
      </div>
    </div>
  );
};

export default MapButtons;
