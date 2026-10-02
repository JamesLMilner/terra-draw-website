## Start Here

Full docs index: [`documentation/README.md`](documentation/README.md).
Project overview: [`README.md`](README.md).

## Gotchas

- Prerender scaffolding is inert — `@preact/preset-vite` defaults `prerender.enabled` to false, so the build emits an empty `#app` shell.
- Legacy dead code, not in the build: `src/sw.js`, `src/manifest.json` and `size-plugin.json`. The Leaflet CSS CDN link in `index.html` is a separate case: unused (the map stack is MapLibre) but **shipped**, adding an external CDN request on every load.
- `npm run typecheck` checks `src/**/*` only — `vite.config.ts`, `playwright.config.ts` and tests are silently excluded.
