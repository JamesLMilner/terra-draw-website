import { h } from "preact";
import style from "./style.module.css";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
} from "preact/hooks";
import maplibregl from "maplibre-gl";
import { GeoJSONStoreFeatures } from "terra-draw/dist/store/store";
import { setupDraw } from "./setup-draw";
import { setupMaplibreMap } from "./setup-maplibre";
import InfoTab from "../../components/info-tab/InfoTab";
import GeoJSONTab from "../../components/geojson-tab/GeoJSONTab";
import MapButtons from "../../components/map-buttons/MapButtons";
import GeolocationButton from "../../components/geolocation-button/GeolocationButton";
import ClearButton from "../../components/clear-button/ClearButton";
import { useLocalStorageStore } from "./store-local-storage";
import { stripSnapshot } from "./strip-snapshot";
import { TerraDraw } from "terra-draw";

const mapOptions = {
  id: "maplibre-map",
  lng: 0,
  lat: 30,
  zoom: 3,
};

const Home = () => {
  const ref = useRef(null);
  const [map, setMap] = useState<undefined | maplibregl.Map>();
  const [mode, setMode] = useState<string>("static");
  const [expanded, setExpanded] = useState<boolean>(true);
  const [selected, setSelected] = useState<GeoJSONStoreFeatures | undefined>();
  const [features, setFeatures] = useState<GeoJSONStoreFeatures[]>([]);
  const [tab, setTabState] = useState<"info" | "geojson">(localStorage.getItem(
    'tab') ? localStorage.getItem('tab') as 'info' | 'geojson' : "info"
  );
  const [format, setFormat] = useState<'geojson' | 'fgb'>('geojson');
  const [draw, setDraw] = useState<undefined | TerraDraw>();

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
    const maplibreMap = setupMaplibreMap(mapOptions);
    maplibreMap.once("style.load", () => {
      setMap(maplibreMap);
    });
  }, []);

  useEffect(() => {
    if (!map) {
      return
    }
    const terraDraw = setupDraw(map);
    terraDraw.start();

    setDraw(terraDraw)
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
        <div class={style.leftButtons}>
          {navigator.geolocation && draw ? (
            <GeolocationButton
              setLocation={(position) => {
                map && map.flyTo({ center: { lng: position[0], lat: position[1] }, zoom: 14, animate: false });
              }}
            />
          ) : null}
          {draw ? <ClearButton draw={draw} clearLocalStorage={clearLocalStorage} setFeatures={setFeatures} /> : null}
        </div>
        {draw ? <MapButtons mode={mode} changeMode={changeMode} /> : null}
      </div>
      <div class={expanded ? style.expanded : style.collapsed}>
        <button
          class={style.collapse}
          onClick={() => {
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
