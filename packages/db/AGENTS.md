# Database

## Overview

This workspace owns the Drizzle schema, generated migrations, and the Cloudflare D1 database factory. Schema files are the source for migration generation.

## Key files

| File | Owns |
| --- | --- |
| `src/schema/` | Authentication, catalog, stock, order, settings, and storage tables |
| `src/migrations/` | Generated D1 migrations committed with schema changes |
| `src/index.ts` | Runtime Drizzle client built from the Cloudflare `DB` binding |
| `drizzle.config.ts` | Migration generation configuration |
| `drizzle-local.config.ts` | Local Drizzle Studio connection to Alchemy D1 state |

## Commands

Run these from the repository root.

```bash
bun run db:generate
bun run db:studio
bun run check-types
```

## Conventions

- Keep schema definitions in `src/schema`.
- Generate migrations with `bun run db:generate`, then review the generated SQL.
- Treat migrations deployed to a shared stage as append only. Add a corrective migration when needed.
- Use the `DB` binding for runtime access.

## Gotchas

- Local Studio discovers the latest SQLite database in Alchemy local state (`packages/infra/.alchemy/local`). Run `bun run dev` first.
- Lint and formatting checks ignore `src/migrations`. Review migration SQL directly.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
