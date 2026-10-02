declare module "*.css" {
  const mapping: Record<string, string>;
  export default mapping;
}

declare module "*.png" {
  const mapping: string;
  export default mapping;
}

declare module "preact-router/match" {
  import * as preact from "preact";

  interface LinkProps {
    activeClassName?: string;
    children?: preact.ComponentChildren;
    href?: string;
  }

  export function Link(
    props: LinkProps & preact.JSX.AnchorHTMLAttributes<HTMLAnchorElement>
  ): preact.VNode;
}

declare module '*?worker&url' {
  const workerUrl: string;
  export default workerUrl;
}

interface Window {
  // MapLibre instance exposed by setup-maplibre.ts for end-to-end tests, which
  // wait on the map's `idle` event before capturing screenshots. Ships in
  // production builds because Playwright runs against `vite preview`.
  __terraMap?: import("maplibre-gl").Map;
}