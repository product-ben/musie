/**
 * The same flat config apps/web uses, minus react-refresh: this package
 * exports hooks and pure functions, not components, so there is no fast-refresh
 * boundary to police.
 *
 * pcm-worklet.js is deliberately NOT linted as browser code — it runs in the
 * AudioWorkletGlobalScope, where `AudioWorkletProcessor`, `registerProcessor`
 * and `sampleRate` are globals that exist in no other environment.
 */
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
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
  {
    files: ["src/audio/pcm-worklet.js"],
    languageOptions: {
      globals: {
        ...globals.worker,
        AudioWorkletProcessor: "readonly",
        registerProcessor: "readonly",
        sampleRate: "readonly",
      },
    },
  },
];
