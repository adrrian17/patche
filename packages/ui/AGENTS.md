# Shared UI

## Overview

This workspace contains shared React primitives, hooks, design tokens, and global styles. Application specific blocks stay in `apps/web`.

## Key files

| File | Owns |
|---|---|
| `src/components/` | Shared shadcn and Base UI primitives |
| `src/styles/globals.css` | Tailwind setup, design tokens, and global styles |
| `src/lib/utils.ts` | Shared class name utilities |
| `components.json` | shadcn aliases and component generation settings |
| `postcss.config.mjs` | Tailwind PostCSS integration |

## Commands

Add shared components from the repository root.

```bash
bunx shadcn@latest add <component> -c packages/ui
bun run check-types
```

## Conventions

- Import components through paths such as `@patche/ui/components/button`.
- Put reusable primitives here and storefront specific compositions in `apps/web`.
- Edit shared tokens and global styles in `src/styles/globals.css`.
- Keep aliases in `components.json` aligned with package exports.

## Gotchas

- Root lint and formatting checks ignore `packages/ui`. Review changes directly and run type checking.
- This package uses Base UI primitives. Do not assume Radix APIs when editing generated components.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
