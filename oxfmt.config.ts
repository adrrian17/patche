import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...ultracite.ignorePatterns,
    "packages/ui/**",
    "packages/db/src/migrations/**",
    ".agents/skills/**",
    ".claude/skills/**",
  ],
});
