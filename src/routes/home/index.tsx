import { h } from "preact";
import style from "./style.module.css";
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
import GeolocationButton from "../../components/geolocation-button/GeolocationButton";
import ClearButton from "../../components/clear-button/ClearButton";
import { useLocalStorageStore } from "./store-local-storage";
import { stripSnapshot } from "./strip-snapshot";

const Home = () => {
  const mapOptions = {
    L,
    id: "leaflet-map",
    lng: 0,
    lat: 30,
    zoom: 3,
  };
  const ref = useRef(null);
  const [map, setMap] = useState<undefined | L.Map>();
  const [mode, setMode] = useState<string>("static");
  const [expanded, setExpanded] = useState<boolean>(true);
  const [selected, setSelected] = useState<GeoJSONStoreFeatures | undefined>();
  const [features, setFeatures] = useState<GeoJSONStoreFeatures[]>([]);
  const [tab, setTabState] = useState<"info" | "geojson">(localStorage.getItem(
    'tab') ? localStorage.getItem('tab') as 'info' | 'geojson' : "info"
  );
  const [format, setFormat] = useState<'geojson' | 'fgb'>('geojson');

  const setTab = (newTab: 'info' | 'geojson') => {
    setTabState(newTab);
    localStorage.setItem('tab', newTab);
  }

  const {
    clearLocalStorage,
    setLocalStorage,
    getLocalStorage
  } = useLocalStorageStore();

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
    if (draw) {
      draw.on("change", () => {
        const snapshot = draw.getSnapshot();
        setFeatures(snapshot);
        setSelected(snapshot.find((f) => f.properties.selected));
        setLocalStorage(stripSnapshot(snapshot));
      });

      const snapshot = getLocalStorage()
      if (snapshot) {
        const parsed = JSON.parse(snapshot);
        draw.addFeatures(parsed);
      }
    }

  }, [getLocalStorage, setLocalStorage, draw]);

  return (
    <div class={style.home}>
      <div ref={ref} class={style.map} id={mapOptions.id}>
        {navigator.geolocation && draw ? (
          <GeolocationButton
            setLocation={(position) => {
              map && map.setView([position[1], position[0]], 14);
            }}
          />
        ) : null}
        {draw ? <ClearButton draw={draw} clearLocalStorage={clearLocalStorage} /> : null}
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
              class={tab === "geojson" ? style.tabActive : style.tab}
              onClick={() => setTab("geojson")}
            >
              GeoJSON
            </span>
            <span
              class={tab === "info" ? style.tabActive : style.tab}
              onClick={() => setTab("info")}
            >
              Info
            </span>
          </div>

          {tab === "info" ? (
            <InfoTab selected={selected} features={features} />
          ) : (
            <GeoJSONTab features={features} format={format} setFormat={(newFormat: 'geojson' | 'fgb') => setFormat(newFormat)} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
