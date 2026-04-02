import { ComponentChildren, h } from "preact";
import style from "./style.module.css";
import { titleCase } from "../../utils/casing";

const MapActionButton = ({
  action,
  changeAction,
  label,
  ariaLabel,
  title,
  hiddenOnTouch,
}: {
  action: string;
  currentAction: string;
  changeAction: (action: string) => void;
  label?: ComponentChildren;
  ariaLabel?: string;
  title?: string;
  hiddenOnTouch?: boolean;
}) => {
  let classes = `${style.button} ${style.actionButton}`;

  if (hiddenOnTouch) {
    classes = `${style.hiddenOnMobile} ${classes}`;
  }

  return (
    <button
      id={action}
      class={classes}
      title={title ?? titleCase(action)}
      aria-label={ariaLabel ?? titleCase(action)}
      onClick={() => {
        changeAction(action);
      }}
    >
      {label ? label : titleCase(action)}
    </button>
  );
};

export default MapActionButton;
