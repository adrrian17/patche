# Patche agent guide

Patche is an online stationery store for notebooks, calendars, planners, and related office goods, with payments built on Stripe.

## Essentials

- Use the Bun version pinned in `package.json`. Prefer `bun install`, `bun run`, and `bunx` over npm or npx.
- Build the workspace with `bun run build`.
- Type-check the workspace with `bun run check-types`.
- Check changed code with `bun run check`; apply automated fixes with `bun run fix`.

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
