# Infrastructure

## Overview

This workspace defines the Alchemy stack deployed to Cloudflare. It provisions the web worker, D1 database, public and private R2 buckets, and email sending resources.

## Key files

| File | Owns |
| --- | --- |
| `alchemy.run.ts` | Cloudflare resources, bindings, domains, stages, and deployment output |
| `package.json` | Pinned Alchemy and Effect versions plus deployment scripts |

## Commands

Run these from the repository root.

```bash
bun run dev
bun run deploy -- --stage production
bun run destroy -- --stage <stage>
```

Provider setup runs from this workspace.

```bash
bunx alchemy login --configure
```

## Conventions

- Treat `alchemy.run.ts` as the source of truth for provisioned resources and bindings.
- Use a personal development stage for remote validation.
- Name the production stage explicitly when deploying production.
- Keep secrets in redacted Alchemy configuration values.

## Gotchas

- Production uses `patche.mx` and `media.patche.mx`. Local web development uses port `3001`.
- Alchemy applies committed D1 migrations during deployment.
- Inspect the exact stage and its resources before running any destroy command.
- Production destruction needs explicit user approval.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
