/**
 * The same flat config the other packages use, minus the React plugins: this
 * package has no React in it. The pages themselves are markdown and are not
 * linted — their gate is `vitepress build`, which fails on a dead link.
 */
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [".vitepress/dist/**", ".vitepress/cache/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [".vitepress/**/*.ts"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
];
