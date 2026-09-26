import { readdir } from "node:fs/promises";
import path from "node:path";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import type { D1Migration } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

async function readPatcheMigrations() {
  const migrationsPath = path.resolve(
    import.meta.dirname,
    "../../packages/db/src/migrations"
  );
  const entries = await readdir(migrationsPath, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory());
  // Migration order is significant; this array is local and safe to mutate.
  // oxlint-disable-next-line unicorn/no-array-sort
  directories.sort((left, right) => left.name.localeCompare(right.name));
  const migrations = await Promise.all(
    directories.map(async (directory) => {
      const [migration] = await readD1Migrations(
        path.join(migrationsPath, directory.name)
      );
      return migration
        ? { ...migration, name: `${directory.name}.sql` }
        : undefined;
    })
  );

  return migrations.filter(
    (migration): migration is D1Migration => migration !== undefined
  );
}

export default defineConfig(async () => {
  const migrations = await readPatcheMigrations();

  return {
    plugins: [
      cloudflareTest({
        miniflare: {
          bindings: {
            BETTER_AUTH_URL: "http://localhost:3001",
            STRIPE_SECRET_KEY: "sk_test_integration",
            TEST_MIGRATIONS: migrations,
          },
          compatibilityDate: "2026-08-15",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: ["DB"],
          r2Buckets: ["MEDIA_BUCKET"],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
    },
    test: {
      include: ["src/**/*.integration.ts"],
      setupFiles: ["./src/test/apply-migrations.ts"],
    },
  };
});
