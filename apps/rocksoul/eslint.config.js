import js from "@eslint/js";
import { reactInternal } from "@moonwitness/eslint-config/react-internal";
import globals from "globals";

export default [
  { ignores: ["dist/**", "src-tauri/**", "node_modules/**", "coverage/**"] },
  ...reactInternal,
  {
    files: ["**/*.{js,jsx}"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^[A-Z_]" }],
      "no-undef": "error",
    },
  },
  {
    files: ["*.config.js", "eslint.config.js", "scripts/**/*.mjs"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
