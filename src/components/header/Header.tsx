import { h } from "preact";
import { Link } from "preact-router/match";
import style from "./style.module.css";
import logo from "../../assets/imgs/logo.png";
import github from "../../assets/imgs/github.png";
import { ExternalLink, Heart } from "lucide-preact";

const Header = () => (
  <header class={style.header}>
    <div class={style.nav}>
      <img class={style.logo} src={logo} alt="Terra Draw Logo" />
      <nav>
        <Link class={style.homeLink} activeClassName={style.active} href="/">
          Home
        </Link>
        <Link class={style.apiLink} activeClassName={style.active} href="/api">
          API Docs
        </Link>
        <span class={style.navDivider} aria-hidden={true} />
        <a
          class={style.externalLink}
          href="https://github.com/JamesLMilner/terra-draw/blob/main/guides/1.GETTING_STARTED.md"
          target="_blank"
          rel="noopener noreferrer"
          title="Getting Started guide (opens in new tab)"
          aria-label="Getting Started guide (opens in new tab)"
        >
          <span>Getting Started</span>
          <ExternalLink size={14} strokeWidth={2.25} aria-hidden={true} />
        </a>
      </nav>
    </div>
    <div class={style.github}>
      <a
        href="https://www.github.com/JamesLMilner/terra-draw"
        title="View on GitHub"
        aria-label="View on GitHub"
      >
        <img src={github} alt="GitHub Logo" />
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
