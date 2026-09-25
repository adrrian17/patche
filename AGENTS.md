# Patche agent guide

Patche is an online stationery store for notebooks, calendars, planners, and related office goods, with payments built on Stripe.

## Stack

- TypeScript and React 19 on Bun 1.4
- TanStack Start and TanStack Router
- Turborepo with Bun workspaces
- Drizzle ORM on Cloudflare D1
- Wrangler with Cloudflare Workers and R2

## Build approach

<TBD, set by /scope>

## Essentials

- Use the Bun version pinned in `package.json`. Prefer `bun install`, `bun run`, and `bunx` over npm or npx.
- Build the workspace with `bun run build`.
- Type-check the workspace with `bun run check-types`.
- Check changed code with `bun run check`; apply automated fixes with `bun run fix`.
- Run the test suite with `bun test`.
- Run the Cloudflare and D1 integration suite with `bun run test:integration`.
- Read `CONTEXT.md` before changing domain terms or business rules.
- Read the testing approach in [docs/agent-guidelines/testing.md](docs/agent-guidelines/testing.md) before writing any code, because it decides when tests come first.

## Task-specific guidance

Read only the guides relevant to the files you are changing:

- [TypeScript and code structure](docs/agent-guidelines/typescript.md)
- [React and accessibility](docs/agent-guidelines/react.md)
- [Stripe payments](docs/agent-guidelines/payments.md)
- [Database and migrations](docs/agent-guidelines/database.md)
- [Infrastructure and deployment](docs/agent-guidelines/infrastructure.md)
- [Testing](docs/agent-guidelines/testing.md)
- [Security and performance](docs/agent-guidelines/security-performance.md)
- [Linting and formatting](docs/agent-guidelines/tooling.md)

## Context files

- [apps/web/AGENTS.md](apps/web/AGENTS.md) (TanStack Start storefront, admin, routes, and server functions)
- [packages/db/AGENTS.md](packages/db/AGENTS.md) (Drizzle schema, migrations, and local D1 tooling)
- [docs/agent-guidelines/infrastructure.md](docs/agent-guidelines/infrastructure.md) (Wrangler configuration and Cloudflare deployment)
- [packages/payments/AGENTS.md](packages/payments/AGENTS.md) (Stripe checkout and webhook domain logic)
- [packages/ui/AGENTS.md](packages/ui/AGENTS.md) (shared UI components, styles, and shadcn configuration)
