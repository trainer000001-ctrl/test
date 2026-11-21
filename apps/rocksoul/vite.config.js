import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react({ jsxRuntime: "automatic" }), tailwindcss()],
  clearScreen: false,
  envDir: "../..",
  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
    fs: {
      allow: ["../.."],
    },
    watch: {
      ignored: ["**/node_modules/**", "**/.git/**", "**/src-tauri/target/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/motion/")) return "motion";
        },
      },
    },
  },
});
