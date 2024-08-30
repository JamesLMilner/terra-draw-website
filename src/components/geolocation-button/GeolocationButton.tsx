import { h } from "preact";
import style from "./style.module.css";
import geolocation from "../../assets/imgs/geolocation.png";

const GeolocationButton = ({
  setLocation,
}: {
  setLocation: (position: [number, number]) => void;
}) => {
  const classes = style.button;

  return (
    <button
      id="geolocation"
      class={classes}
      title={"Geolocation"}
      onClick={() => {
        console.log("clicked", navigator.geolocation);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation([position.coords.longitude, position.coords.latitude]);
          },
          (error) => {
            alert("Error getting geolocation");
            console.error(error);
          }
        );
      }}
    >
      <img class={style.geolocation} src={geolocation} />
    </button>
  );
};

export default GeolocationButton;
