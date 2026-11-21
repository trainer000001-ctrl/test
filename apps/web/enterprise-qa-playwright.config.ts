import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "enterprise-visual-qa.spec.ts",
  workers: 1,
  timeout: 30_000,
  reporter: "list",
  outputDir: "../../.verify/enterprise-qa-results",
  use: {
    baseURL: "http://127.0.0.1:3033",
    browserName: "chromium",
  },
  webServer: {
    command: "pnpm exec next start --port 3033 --hostname 127.0.0.1",
    url: "http://127.0.0.1:3033/api/health",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
