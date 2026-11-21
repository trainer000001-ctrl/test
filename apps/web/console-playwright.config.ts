import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "console-ui.spec.ts",
  workers: 1,
  reporter: "list",
  outputDir: "../../.verify/console-results",
  use: {
    baseURL: process.env.CONSOLE_BASE_URL ?? "http://localhost:3015",
    browserName: "chromium",
  },
});
