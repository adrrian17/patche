# Infrastructure

## Overview

This workspace defines the Alchemy stack deployed to Cloudflare. It provisions the web worker, D1 database, R2 buckets, and email sending.

## Key files

| File | Owns |
| --- | --- |
| `alchemy.run.ts` | Cloudflare resources, bindings, stages, and deployment output |
| `package.json` | Pinned Alchemy and Effect versions plus deployment scripts |

## Commands

Run these from the repository root.

```bash
bun run dev
bun run deploy
bun run destroy -- --stage <stage>
```

Connect Cloudflare once per machine from this workspace.

```bash
bunx alchemy profile edit
```

## Conventions

- Treat `alchemy.run.ts` as the source of truth for provisioned resources and bindings.
- Name the production stage explicitly when deploying production.
- Keep secrets in Varlock's root `.env.schema` and read them here with `Config.Redacted`.

## Gotchas

- Local development listens on port `3001`. Alchemy writes local state to `packages/infra/.alchemy`.
- Alchemy applies committed D1 migrations during deployment.
- Inspect the exact stage and its resources before running any destroy command.
- Production destruction needs explicit user approval.
