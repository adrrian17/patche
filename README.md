# Patche

Patche is an online stationery store for notebooks, calendars, planners, and related office goods. The storefront will use Stripe for payments.

## Project status

The repository contains the application foundation, authentication, database, shared UI, and Cloudflare infrastructure. Stripe checkout and payment processing are planned but are not yet present in the application dependencies.

## Stack

- Bun and Turborepo
- TypeScript and React
- TanStack Start and TanStack Router
- Tailwind CSS and shared shadcn/ui primitives
- Better Auth
- Drizzle ORM and Cloudflare D1
- Alchemy and Cloudflare
- Stripe for the planned payment system
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

Review generated SQL before deployment. Runtime access uses the Cloudflare `DB` binding declared in `packages/infra/alchemy.run.ts`. A local `DATABASE_URL` is only for database tooling.

Alchemy applies committed D1 migrations during deployment.

## Payments

Stripe will provide checkout and payment processing. The implementation must calculate order totals on the server and treat verified Stripe webhooks as the source of truth for payment completion.

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

Alchemy provisions the web application and D1 database on Cloudflare.

Configure the provider from `packages/infra`:

```bash
cd packages/infra
bunx alchemy login --configure
```

Development deployments use a personal `dev_<username>` stage. Production must use an explicit stage and requires reviewing the planned resource and migration changes:

```bash
cd packages/infra
bunx alchemy deploy --stage production
```

Do not destroy a stage until its name and resources have been inspected.

## Quality checks

```bash
bun run check
bun run check-types
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
│   ├── env/          # Typed environment variables
│   ├── infra/        # Alchemy and Cloudflare resources
│   └── ui/           # Shared components and styles
└── docs/
    └── agent-guidelines/
```

## Commands

- `bun run dev`: start the workspace in development mode
- `bun run dev:web`: start only the web application
- `bun run build`: build the workspace
- `bun run check-types`: type-check the workspace
- `bun run check`: check linting and formatting
- `bun run fix`: apply lint and formatting fixes
- `bun run db:generate`: generate Drizzle migrations
- `bun run deploy`: deploy the infrastructure
- `bun run destroy`: destroy the selected infrastructure stage

Contributor and coding instructions start in [AGENTS.md](AGENTS.md).
