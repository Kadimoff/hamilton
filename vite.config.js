import { defineConfig } from "vite";
import siteData from "./build/site-data.js";
import { createMailer } from "./server/mailer.js";
import { createRateLimiter } from "./server/rate-limit.js";
import { createContactHandler } from "./server/contact.js";

// /api/muraciet dev və preview serverlərində də işləsin (SMTP yoxdursa məktublar .mail-outbox/-a yazılır)
function contactApi() {
  const mount = (server) => {
    try { process.loadEnvFile(); } catch { /* .env yoxdur */ }
    const env = process.env;
    const handler = createContactHandler({
      // vite preview NODE_ENV=production qoyur, amma bu server həmişə lokaldır — outbox rejimi açıq qalsın
      mailer: createMailer({ ...env, NODE_ENV: "development" }),
      limiter: createRateLimiter({ max: Number(env.RATE_LIMIT_MAX || 5), windowMs: Number(env.RATE_LIMIT_WINDOW_MIN || 10) * 60 * 1000 })
    });
    server.middlewares.use("/api/muraciet", (req, res) => handler(req, res));
  };
  return { name: "hamilton-contact-api", configureServer: mount, configurePreviewServer: mount };
}

export default defineConfig({
  plugins: [siteData(), contactApi()],
  build: {
    target: "es2020",
    assetsInlineLimit: 0, // şriftlər ayrıca .woff2 faylı kimi qalsın (keşlənir)
    cssCodeSplit: false
  },
  server: { port: 5173 },
  preview: { port: 4173 },
  test: { include: ["tests/unit/**/*.test.js"] }
});
