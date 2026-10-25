import { defineConfig, devices } from "@playwright/test";

const PORT = 4180;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://127.0.0.1:${PORT}`, ...devices["Desktop Chrome"] },
  // istehsal serverinin özü yoxlanılır (dist/ + /api/muraciet); məktublar test qovluğuna yazılır
  webServer: {
    command: "npm run build && node server/index.js",
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORT: String(PORT),
      NODE_ENV: "test",
      SMTP_HOST: "",
      MAIL_DEV_OUTBOX: "1",
      MAIL_OUTBOX_DIR: "test-results/mail-outbox",
      RATE_LIMIT_MAX: "1000"
    }
  }
});
