# Patche

Patche is an online stationery store for notebooks, calendars, planners, and related office goods. The storefront will use Stripe for payments.

## Project status

The repository contains the storefront and admin application, authentication, catalog and inventory management, Stripe checkout and webhook processing, digital file storage, shared UI, and Cloudflare infrastructure.

## Stack

- Bun and Turborepo
- TypeScript and React
- TanStack Start and TanStack Router
- Tailwind CSS and shared shadcn/ui primitives
- Better Auth
- Drizzle ORM and Cloudflare D1
- Wrangler and Cloudflare Workers
- Stripe Checkout and verified webhooks for payments
- Ultracite with Oxlint and Oxfmt

## Getting started

Use the Bun version pinned in `package.json`.

```bash
bun install
bun run dev
```

The application is available at [http://localhost:3001](http://localhost:3001).

## Database

Patche uses Cloudflare D1 with Drizzle ORM. Schema definitions live in `packages/db/src/schema`, and generated migrations live in `packages/db/src/migrations`.

Generate a migration from the repository root:

```bash
bun run db:generate
```

Review generated SQL before deployment. Runtime access uses the `DB` binding in the root `wrangler.jsonc`.

To inspect the local database, start the application once so Wrangler creates its local D1 state, then open Drizzle Studio:

```bash
bun run dev
bun run db:studio
```

Wrangler uses the committed migrations in `packages/db/src/migrations`.

## Payments

Stripe Checkout handles payments. Patche calculates order totals on the server and treats verified Stripe webhooks as the source of truth for payment completion. A physical Checkout reserves Stock before the Stripe session is created. Failed and expired sessions release their reservations.

Payment implementation rules are documented in [docs/agent-guidelines/payments.md](docs/agent-guidelines/payments.md).

## UI development

Reusable primitives and shared styles belong in `packages/ui`. Storefront-specific blocks belong in `apps/web`.

- Edit design tokens and global styles in `packages/ui/src/styles/globals.css`.
- Edit shared primitives in `packages/ui/src/components`.
- Configure shadcn/ui aliases in `packages/ui/components.json` and `apps/web/components.json`.

Add shared primitives from the repository root:

```bash
bunx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components through the UI package:

```tsx
import { Button } from "@patche/ui/components/button";
```

Run the shadcn/ui CLI from `apps/web` when adding a block used only by the storefront.

## Deployment

The Worker and its bindings are configured in the root `wrangler.jsonc`. Local development uses the Cloudflare Vite plugin and Wrangler. Production deploys through Cloudflare Workers Builds connected to GitHub.

Varlock reads shared configuration from the root `.env.schema`; `apps/web/.env.schema` imports it. Secrets use the 1Password plugin. Configure the 1Password service-account token as a secret build variable named `OP_SERVICE_ACCOUNT_TOKEN`, and set `APP_ENV=production` plus `CF_ACCOUNT_ID` as build variables in Cloudflare. Replace the example `op://` references in the root schema with references in your vault. `APP_ENV` defaults to `production`; `bun run dev` sets `development`, and other local commands such as `bun run build` need `APP_ENV=development` to use development configuration.

In Cloudflare Workers Builds, use the repository root as the install directory, build with `bun run --cwd apps/web build`, and deploy with `bun run --cwd apps/web deploy` (which runs `varlock-wrangler deploy`). Before the first deploy, create or select the D1 database and R2 buckets, then set the D1 ID and bucket names in `wrangler.jsonc`. The Worker uses its assigned `workers.dev` URL, with no custom route. Set `WORKER_PUBLIC_URL` in Cloudflare Builds to `https://patche-web.<subdomain>.workers.dev`; it is required in production. The Worker also proxies media requests.

If you reuse a D1 database that Alchemy already migrated, baseline Wrangler's migration history before the first deploy. Alchemy records applied files in `__alchemy_migrations`, and Wrangler tracks its own history in `d1_migrations`, so the deploy script would otherwise re-run the committed migrations and fail on tables that already exist. List the migrations that Wrangler considers pending, then mark the ones that Alchemy already applied (compare them with `__alchemy_migrations`) as applied, using the exact names that the list command prints:

```bash
bunx wrangler d1 migrations list patche --remote
bunx wrangler d1 execute patche --remote --command "SELECT * FROM __alchemy_migrations"
bunx wrangler d1 execute patche --remote --command "INSERT INTO d1_migrations (name) VALUES ('<name>'), ('<name>')"
```

Run `wrangler d1 migrations list patche --remote` again afterwards and confirm that it reports no pending migrations. A new, empty database needs no baselining.

## Quality checks

```bash
bun run check
bun run check-types
bun run test:integration
bun run build
```

Use `bun run fix` to apply automatic lint and formatting fixes.

## Repository structure

```text
patche/
├── apps/
│   └── web/          # TanStack Start storefront
├── packages/
│   ├── auth/         # Better Auth configuration
│   ├── config/       # Shared TypeScript configuration
│   ├── db/           # Drizzle schema and D1 migrations
│   ├── email/        # React Email templates
│   ├── env/          # Typed environment variables
│   ├── payments/     # Stripe checkout and webhook logic
│   ├── storage/      # R2 keys and signed URLs
│   └── ui/           # Shared components and styles
└── docs/
    └── agent-guidelines/
```

## Commands

- `bun run dev`: start the workspace in development mode
- `bun run dev:web`: start only the web application
- `bun run build`: build the workspace
- `bun run check-types`: type-check the workspace
- `bun run test:integration`: test the Stripe webhook against local Cloudflare D1
- `bun run check`: check linting and formatting
- `bun run fix`: apply lint and formatting fixes
- `bun run db:generate`: generate Drizzle migrations
- `bun run db:studio`: inspect the local Wrangler D1 database
- `bun run deploy`: deploy the infrastructure

Contributor and coding instructions start in [AGENTS.md](AGENTS.md).
