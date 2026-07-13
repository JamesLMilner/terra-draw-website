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
