import { h } from "preact";
import style from "./style.module.css";
import { LocateFixed } from "lucide-preact";

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
      title={"Geolocate"}
      aria-label={"Geolocate"}
      onClick={() => {
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
      <LocateFixed size={16} aria-hidden={true} />
    </button>
  );
};

export default GeolocationButton;
