import { h } from "preact";
import style from "./style.css";
import {
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "preact/hooks";
import { GeoJSONStoreFeatures } from "terra-draw/dist/store/store";
import { setupDraw } from "./setup-draw";
import { setupLeafletMap } from "./setup-leaflet";
import * as L from "leaflet";
import InfoTab from "../../components/info-tab/InfoTab";
import GeoJSONTab from "../../components/geojson-tab/GeoJSONTab";
import MapButtons from "../../components/map-buttons/MapButtons";

const Home = () => {
  const mapOptions = {
    L,
    id: "leaflet-map",
    lng: -0.118092,
    lat: 51.509865,
    zoom: 12,
  };
  const ref = useRef(null);
  const [map, setMap] = useState<undefined | L.Map>();
  const [mode, setMode] = useState<string>("static");
  const [tab, setTab] = useState<"info" | "geojson">("info");
  const [expanded, setExpanded] = useState<boolean>(true);
  const [selected, setSelected] = useState<GeoJSONStoreFeatures | undefined>();
  const [features, setFeatures] = useState<GeoJSONStoreFeatures[]>([]);

  useEffect(() => {
    setMap(setupLeafletMap(mapOptions));
  }, []);

  const draw = useMemo(() => {
    if (map) {
      const terraDraw = setupDraw(map, L);
      terraDraw.start();
      return terraDraw;
    }
  }, [map]);

  const changeMode = useCallback(
    (newMode: string) => {
      if (draw) {
        setMode(newMode);
        draw.setMode(newMode);
      }
    },
    [draw]
  );

  useEffect(() => {
    draw?.on("change", () => {
      const snapshot = draw.getSnapshot();
      setFeatures(snapshot);
      setSelected(snapshot.find((f) => f.properties.selected));
    });
  }, [draw]);

  return (
    <div class={style.home}>
      <div ref={ref} class={style.map} id={mapOptions.id}>
        {draw ? <MapButtons mode={mode} changeMode={changeMode} /> : null}
      </div>
      <div class={expanded ? style.expanded : style.collapsed}>
        <button
          class={style.collapse}
          onClick={() => {
            // Normally I would never suggest using this
            // approach but here there is a 500ms animation
            if (typeof window !== "undefined") {
              setTimeout(() => {
                map?.invalidateSize();
              }, 500);
            }
            setExpanded(!expanded);
          }}
        >
          {expanded ? ">" : "<"}
        </button>
        <div class={expanded ? style.tabs : style.tabsHidden}>
          <div class={style.tabButtons}>
            <span
              class={tab === "info" ? style.tabActive : style.tab}
              onClick={() => setTab("info")}
            >
              Info
            </span>
            <span
              class={tab === "geojson" ? style.tabActive : style.tab}
              onClick={() => setTab("geojson")}
            >
              GeoJSON
            </span>
          </div>

          {tab === "info" ? (
            <InfoTab selected={selected} features={features} />
          ) : (
            <GeoJSONTab features={features} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
