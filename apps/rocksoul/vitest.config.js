import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    fileParallelism: false,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{js,jsx,ts,tsx}"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "src/App.tsx",
        "src/components/**/*.{ts,tsx}",
        "src/features/**/*.{ts,tsx}",
        "src/lib/**/*.ts",
        "src/store/**/*.ts",
      ],
      exclude: [
        "src/components/index.ts",
        "src/features/index.ts",
        "src/lib/index.ts",
        "src/store/index.ts",
        "src/**/*.d.ts",
      ],
      thresholds: {
        "src/lib/api.ts": {
          statements: 50,
          branches: 40,
          functions: 50,
          lines: 55,
        },
        "src/store/useAppStore.ts": {
          statements: 70,
          branches: 60,
          functions: 65,
          lines: 70,
        },
        "src/components/CreateIssueDialog.tsx": {
          statements: 80,
          branches: 60,
          functions: 75,
          lines: 90,
        },
        "src/components/EditIssueDialog.tsx": {
          statements: 75,
          branches: 70,
          functions: 45,
          lines: 90,
        },
        "src/components/IssueRow.tsx": {
          statements: 90,
          branches: 75,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
});
