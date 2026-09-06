# Database and migrations

Apply these rules when changing Drizzle schemas, queries, or Cloudflare D1 migrations.

- Keep Drizzle schema definitions in `packages/db/src/schema`.
- Generate migrations from the repository root with `bun run db:generate`.
- Generated migrations belong in `packages/db/src/migrations`. Review their SQL before deployment even though linting and formatting ignore that directory.
- Do not hand-edit a generated migration unless the task explicitly requires repairing it and the migration's deployment history is known.
- Treat committed migrations as append-only after they have reached a shared or production database. Add a corrective migration instead of rewriting history.
- Runtime database access uses the Cloudflare `DB` binding declared in `packages/infra/alchemy.run.ts`. A local `DATABASE_URL` is for database tooling only.
- Review schema compatibility, data backfills, and rollback consequences before deploying a migration.
