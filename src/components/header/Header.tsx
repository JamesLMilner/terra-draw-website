import { h } from "preact";
import { Link } from "preact-router/match";
import style from "./style.module.css";
import logo from "../../assets/imgs/logo.png";
import github from "../../assets/imgs/github.png";
import { Heart } from "lucide-preact";

const Header = () => (
  <header class={style.header}>
    <div class={style.nav}>
      <img class={style.logo} src={logo} />
      <nav>
        <Link class={style.homeLink} activeClassName={style.active} href="/">
          Home
        </Link>
        <Link class={style.apiLink} activeClassName={style.active} href="/api">
          API Docs
        </Link>
      </nav>
    </div>
    <div class={style.github}>
      <a
        href="https://www.github.com/JamesLMilner/terra-draw"
        title="View on GitHub"
        aria-label="View on GitHub"
      >
        <img src={github} />
      </a>
      <a
        class={style.sponsorButton}
        href="https://github.com/sponsors/JamesLMilner"
        title="Sponsor on GitHub"
        aria-label="Sponsor on GitHub"
        target="_blank"
        rel="noreferrer"
      >
        <Heart
          class={style.sponsorHeart}
          size={14}
          strokeWidth={2.3}
          fill="currentColor"
          aria-hidden={true}
        />
        Sponsor
      </a>
    </div>
  </header>
);

export default Header;
