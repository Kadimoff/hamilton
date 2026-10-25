import { defineConfig } from "vite";
import siteData from "./build/site-data.js";
export default defineConfig({
  plugins: [siteData()],
  build: {
    target: "es2020",
    assetsInlineLimit: 0, // şriftlər ayrıca .woff2 faylı kimi qalsın (keşlənir)
    cssCodeSplit: false
  },
  server: { port: 5173 },
  preview: { port: 4173 },
  test: { include: ["tests/unit/**/*.test.js"] }
});
