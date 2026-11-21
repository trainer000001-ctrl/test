import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "operations-routes.spec.ts",
  workers: 1,
  reporter: "list",
  outputDir: "../../.verify/operations-results",
  use: {
    baseURL: "http://127.0.0.1:3110",
    browserName: "chromium",
    ...(process.env.PLAYWRIGHT_BROWSER_CHANNEL === "msedge" ? { channel: "msedge" as const } : {}),
  },
  webServer: {
    command: "pnpm exec next start --hostname 127.0.0.1 --port 3110",
    url: "http://127.0.0.1:3110/radius",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
