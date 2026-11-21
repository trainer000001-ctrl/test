import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["skin-lab-and-canon.spec.ts", "console-ui.spec.ts", "allah-homepage.spec.ts"],
  workers: 1,
  reporter: "list",
  outputDir: "../../.verify/cross-world-results",
  use: {
    baseURL: "http://127.0.0.1:3112",
    browserName: "chromium",
  },
  webServer: {
    command: "pnpm exec next start --hostname 127.0.0.1 --port 3112",
    url: "http://127.0.0.1:3112/skin-lab",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
