import js from "@eslint/js";
import ts from "typescript-eslint";
export default ts.config(
  {
    ignores: [
      "out/**",
      "release/**",
      "node_modules/**",
      ".tools/**",
      ".cache/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["scripts/*.mjs"],
    languageOptions: {
      globals: { console: "readonly", Buffer: "readonly", fetch: "readonly" },
    },
  },
);
