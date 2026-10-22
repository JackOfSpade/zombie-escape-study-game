import { defineConfig } from "@playwright/test";
const port = process.env.GAME_TEST_PORT ?? "5173";
export default defineConfig({
  testDir: "./tests/browser",
  // Live keyboard/RAF survival cases model one player. Competing game pages
  // delay controller input independently of simulation and can exhaust cover.
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      port === "5173"
        ? "npm run dev"
        : `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true,
  },
  reporter: "list",
});
