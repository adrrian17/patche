import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { defineConfig } from "drizzle-kit";

const localD1Directory = path.resolve(
  import.meta.dirname,
  "../../apps/web/.wrangler/state/v3/d1/miniflare-D1DatabaseObject"
);

function getLastActivity(databasePath: string): number {
  const walPath = `${databasePath}-wal`;
  const databaseActivity = statSync(databasePath).mtimeMs;

  if (!existsSync(walPath)) {
    return databaseActivity;
  }

  return Math.max(databaseActivity, statSync(walPath).mtimeMs);
}

function findLocalD1Database(): string {
  if (!existsSync(localD1Directory)) {
    throw new Error(
      "No se encontró la D1 local de Wrangler. Ejecuta `bun run dev` primero."
    );
  }

  let latestDatabase: { activity: number; path: string } | undefined;

  for (const fileName of readdirSync(localD1Directory)) {
    if (fileName === "metadata.sqlite" || !fileName.endsWith(".sqlite")) {
      continue;
    }

    const databasePath = path.resolve(localD1Directory, fileName);
    const activity = getLastActivity(databasePath);

    if (!latestDatabase || activity > latestDatabase.activity) {
      latestDatabase = { activity, path: databasePath };
    }
  }

  if (!latestDatabase) {
    throw new Error(
      "Wrangler todavía no ha creado una D1 local. Ejecuta `bun run dev` primero."
    );
  }

  return latestDatabase.path;
}

export default defineConfig({
  dbCredentials: {
    url: findLocalD1Database(),
  },
  dialect: "sqlite",
  schema: "./src/schema/index.ts",
});
