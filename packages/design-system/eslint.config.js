import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    // Layer 1 ships as CSS and JSON plus one browser-global init script that
    // is loaded with a <script> tag, not imported. Nothing here is linted.
    ignores: ["tokens/**", "storybook-static/**", "!.storybook"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Node build scripts, not browser code.
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["src/**/*.{ts,tsx}", "stories/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
];
