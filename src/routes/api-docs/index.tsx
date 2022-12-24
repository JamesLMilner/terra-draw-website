import { h } from "preact";
import style from "./style.css";

const APIDocs = () => {
  return (
    <iframe
      class={style.apiDocs}
      width="100%"
      src="https://jameslmilner.github.io/terra-draw/modules.html"
    />
  );
};

export default APIDocs;
