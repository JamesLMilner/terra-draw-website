import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: "docs"
  },
  optimizeDeps: {
    // MapLibre v6 worker bundling can fail during dependency pre-bundling.
    exclude: ['maplibre-gl'],
  },
});