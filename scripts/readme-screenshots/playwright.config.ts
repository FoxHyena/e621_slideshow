import { defineConfig, devices } from "@playwright/test";

/**
 * Regenerates the README screenshots in docs/screenshots against the mocked
 * e621 from e2e/mock.ts, with generated placeholder art instead of real posts.
 * Run: pnpm screenshots
 */
const PORT = 3621;

export default defineConfig({
  testDir: ".",
  testMatch: "shots.ts",
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 800 },
    colorScheme: "dark",
  },
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
