import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "dock-journey.spec.ts",
  workers: 1,
  reporter: "list",
  outputDir: "../../.verify/dock-results",
  use: {
    baseURL: "http://127.0.0.1:3108",
    browserName: "chromium",
    ...(process.env.PLAYWRIGHT_BROWSER_CHANNEL === "msedge" ? { channel: "msedge" as const } : {}),
  },
  webServer: [
    {
      command: "pnpm --filter @moonwitness/api exec tsx src/dock-test-server.ts",
      url: "http://127.0.0.1:3002/api/v1/timeline/eras",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "pnpm exec next start --hostname 127.0.0.1 --port 3108",
      url: "http://127.0.0.1:3108/dock",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
