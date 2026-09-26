# Patche

Patche is an online stationery store for notebooks, calendars, planners, and related office goods. The storefront will use Stripe for payments.

## Project status

The repository contains the storefront and admin application, authentication, catalog and inventory management, Stripe checkout and webhook processing, digital file storage, shared UI, and Cloudflare infrastructure.

GitHub Actions runs linting, formatting, build, type checks, package tests, and browser E2E tests on pushes to `main` and pull requests.

## Stack

- Bun and Turborepo
- TypeScript and React
- TanStack Start and TanStack Router
- Tailwind CSS and shared shadcn/ui primitives
- Better Auth
- Drizzle ORM and Cloudflare D1
- Alchemy and Cloudflare Workers
- Stripe Checkout and verified webhooks for payments
- Ultracite with Oxlint and Oxfmt

## Getting started

Use the Bun version pinned in `package.json`.

```bash
bun install
bun run dev
```

`bun run dev` runs `alchemy dev`, which emulates D1, R2, and email locally. The application is available at [http://localhost:3001](http://localhost:3001).

## Database

Patche uses Cloudflare D1 with Drizzle ORM. Schema definitions live in `packages/db/src/schema`, and generated migrations live in `packages/db/src/migrations`.

Generate a migration from the repository root:

```bash
bun run db:generate
```

Review generated SQL before deployment. Runtime access uses the `DB` binding declared in `packages/infra/alchemy.run.ts`.

To inspect the local database, start the application once so Alchemy creates its local D1 state, then open Drizzle Studio:

```bash
bun run dev
bun run db:studio
```

Alchemy applies the committed migrations in `packages/db/src/migrations` on every `alchemy dev` and `alchemy deploy`.

## Payments

Stripe Checkout handles payments. Patche calculates order totals on the server and treats verified Stripe webhooks as the source of truth for payment completion. A physical Checkout reserves Stock before the Stripe session is created. Failed and expired sessions release their reservations.

Payment implementation rules are documented in [docs/agent-guidelines/payments.md](docs/agent-guidelines/payments.md).

## End-to-end tests

Run the Playwright suite against a fresh local D1 database and the local Workers runtime:

```bash
bun run test:e2e
```

Install Chromium first if Playwright has not been set up locally:

```bash
bunx playwright install chromium
```

The suite covers storefront smoke checks and magic-link authentication. On failure, Playwright saves an HTML report, screenshots, and traces under `apps/web/playwright-report` and `apps/web/test-results`.

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

`packages/infra/alchemy.run.ts` declares every Cloudflare resource: the web Worker, the D1 database, the media and digital R2 buckets, and the email binding. Alchemy creates and updates those resources, applies D1 migrations, builds the app with Vite, and uploads the Worker. The Worker is served from its `workers.dev` URL, which Alchemy also passes to the app as `BETTER_AUTH_URL` and `MEDIA_PUBLIC_BASE_URL`. The Worker proxies media requests.

Varlock reads secrets from the root `.env.schema` through the 1Password plugin and passes them to Alchemy as environment variables. `APP_ENV` defaults to `production`; `bun run dev` sets `development`.

Deploy production from your machine:

```bash
bunx alchemy profile edit   # once, to connect your Cloudflare account
bun run deploy       # deploys the production stage from packages/infra
```

Deployment state lives in a Cloudflare Worker that Alchemy creates on the first deploy, so any authorized machine sees the same resources. Local development and E2E keep their state in `packages/infra/.alchemy` and need no Cloudflare credentials.

GitHub Actions deploys on its own. A push to `main` deploys the `production` stage. Each pull request deploys an isolated `pr-<number>` stage, comments the Worker URL on the pull request, and destroys that stage when the pull request closes. Preview stages read the Development items in 1Password. Varlock loads `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from those items. Add `OP_SERVICE_ACCOUNT_TOKEN` as a repository secret so Actions can reach 1Password. Add a `CLOUDFLARE_API_TOKEN` field to the Production and Development items in the Patche vault.

Any other stage name deploys an isolated copy of the whole stack, for example `bunx varlock run -- turbo run deploy -F @patche/infra -- --stage preview`. Remove it with `bun run destroy -- --stage preview`.

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
│   ├── infra/        # Alchemy stack and Cloudflare resources
│   ├── payments/     # Stripe checkout and webhook logic
│   ├── storage/      # R2 keys and signed URLs
│   └── ui/           # Shared components and styles
└── docs/
    └── agent-guidelines/
```

## Commands

- `bun run dev`: start the app with `alchemy dev` and local D1, R2, and email
- `bun run build`: build the workspace
- `bun run check-types`: type-check the workspace
- `bun run test:integration`: test the Stripe webhook against local Cloudflare D1
- `bun run test:e2e`: run Playwright browser tests against local Cloudflare Workers and D1
- `bun run check`: check linting and formatting
- `bun run fix`: apply lint and formatting fixes
- `bun run db:generate`: generate Drizzle migrations
- `bun run db:studio`: inspect the local Alchemy D1 database
- `bun run deploy`: deploy production with Alchemy

Contributor and coding instructions start in [AGENTS.md](AGENTS.md).
