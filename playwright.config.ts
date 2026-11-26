import { defineConfig, devices } from "@playwright/test";

// E6_PORT: reuse a dev server already running in this folder (Next allows one per folder)
const PORT = Number(process.env.E6_PORT ?? 3621);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  workers: 4,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 800 },
    // page.route mocks must see every request; the one worker test (e2e/pwa.spec.ts) allows it
    serviceWorkers: "block",
  },
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
