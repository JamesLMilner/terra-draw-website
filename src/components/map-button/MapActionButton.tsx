import { h } from "preact";
import style from "./style.module.css";
import { titleCase } from "../../utils/casing";

const MapActionButton = ({
  action,
  changeAction,
  label,
  hiddenOnTouch,
}: {
  action: string;
  currentAction: string;
  changeAction: (action: string) => void;
  label?: string;
  hiddenOnTouch?: boolean;
}) => {
  let classes = style.button;

  if (hiddenOnTouch) {
    classes = `${style.hiddenOnMobile} ${classes}`;
  }

  return (
    <button
      id={action}
      class={classes}
      onClick={() => {
        changeAction(action);
      }}
    >
      {label ? label : titleCase(action)}
    </button>
  );
};

export default MapActionButton;
