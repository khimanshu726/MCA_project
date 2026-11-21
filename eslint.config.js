import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

// Lints the three codebases in this repo: the storefront (src/), the admin app
// (admin-app/src/) and the Express API (server/). Run with `npm run lint`; CI
// runs it on every PR.
//
// Deliberately small: ESLint's recommended set plus the two React hooks rules.
// The goal is catching real mistakes (unused imports and variables, undefined
// names, hooks called conditionally), not enforcing style.

const sharedRules = {
  "no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrors: "none",
      ignoreRestSiblings: true,
    },
  ],
};

export default [
  {
    ignores: [
      "dist/**",
      "dist-admin/**",
      "node_modules/**",
      "uploads/**",
      "reports/**",
      "output/**",
      "exports/**",
      "tmp/**",
      "data/**",
      "docs/**",
      "superpowers/**",
      "public/**",
      ".claude/**",
    ],
  },

  // A few files carry disable comments for rules this config doesn't enable
  // (e.g. no-await-in-loop). They document intent, so don't flag them.
  { linterOptions: { reportUnusedDisableDirectives: "off" } },

  js.configs.recommended,

  // Browser apps: storefront + admin.
  {
    files: ["src/**/*.{js,jsx}", "admin-app/src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      ...sharedRules,
      // Without this, a component used only in JSX looks unused to ESLint.
      "react/jsx-uses-vars": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // API server, build/config files and Node scripts.
  {
    files: ["server/**/*.js", "scripts/**/*.{js,mjs,cjs}", "*.config.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: sharedRules,
  },

  // Tests run under Vitest (globals off, but jsdom tests touch browser APIs).
  {
    files: ["**/*.test.{js,jsx}", "**/tests/**/*.{js,jsx}", "src/test/**/*.{js,jsx}"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
];
