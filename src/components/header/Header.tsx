import { h } from "preact";
import { Link } from "preact-router/match";
import style from "./style.module.css";
import logo from "../../assets/imgs/logo.png";
import github from "../../assets/imgs/github.png";

const Header = () => (
  <header class={style.header}>
    <div class={style.nav}>
      <img class={style.logo} src={logo} />
      <nav>
        <Link activeClassName={style.active} href="/">
          Home
        </Link>
        <Link activeClassName={style.active} href="/api">
          API Docs
        </Link>
      </nav>
    </div>
    <div class={style.github}>
      <a href="https://www.github.com/JamesLMilner/terra-draw">
        <img src={github} />
      </a>
    </div>
  </header>
);

export default Header;
