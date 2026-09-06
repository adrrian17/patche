import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";
import tanstackJsPlugins from "ultracite/oxlint/tanstack/js-plugins";

const jsPlugins = selectJsPlugins(["github", "sonarjs", "react-doctor"]);

export default defineConfig({
  extends: [core, react, tanstack, tanstackJsPlugins, antiSlop, jsPlugins],
  ignorePatterns: [
    ...core.ignorePatterns,
    "packages/ui/**",
    "packages/db/src/migrations/**",
    ".agents/skills/**",
    ".claude/skills/**",
  ],
  jsPlugins: jsPlugins.jsPlugins,
  overrides: [
    {
      files: [
        "packages/auth/src/index.ts",
        "packages/db/src/index.ts",
        "packages/db/src/schema/index.ts",
      ],
      rules: {
        "oxc/no-barrel-file": "off",
        "sonarjs/no-wildcard-import": "off",
      },
    },
    {
      files: ["packages/db/src/schema/auth.ts"],
      rules: {
        "eslint/no-inline-comments": "off",
      },
    },
    {
      files: ["apps/web/src/routes/**/*.{ts,tsx}"],
      rules: {
        "func-style": "off",
        "github/filenames-match-regex": "off",
        "sonarjs/function-name": "off",
      },
    },
    {
      files: ["apps/web/src/components/**/*.{ts,tsx}"],
      rules: {
        "func-style": "off",
      },
    },
    {
      files: ["packages/infra/alchemy.run.ts"],
      rules: {
        "sonarjs/no-wildcard-import": "off",
      },
    },
    {
      files: ["packages/env/src/server.ts"],
      rules: {
        "typescript/triple-slash-reference": "off",
      },
    },
    {
      files: ["packages/env/env.d.ts"],
      rules: {
        "typescript/no-empty-interface": "off",
        "typescript/no-empty-object-type": "off",
      },
    },
  ],
  rules: {
    "func-style": ["error", "declaration"],
    "react/function-component-definition": [
      "error",
      {
        namedComponents: "function-declaration",
        unnamedComponents: "function-expression",
      },
    ],
  },
  settings: jsPluginSettings,
});
