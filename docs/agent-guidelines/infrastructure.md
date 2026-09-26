# Infrastructure and deployment

Apply these rules when changing Cloudflare resources or deployment scripts.

- `packages/infra/alchemy.run.ts` is the source of truth for Cloudflare resources and Worker bindings. Alchemy creates, updates, and deletes what it declares.
- Pin `alchemy`, `effect`, and `@effect/platform-*` to exact versions. Alchemy v2 is in beta and breaks between releases.
- Keep Worker secrets in Varlock's root `.env.schema`, sourced from 1Password, and read them in `alchemy.run.ts` with `Config.Redacted`. Do not commit secret values.
- `bun run dev` runs `alchemy dev` in `packages/infra` against local emulators with state in `packages/infra/.alchemy`. It needs no Cloudflare credentials.
- `bun run deploy` deploys the `production` stage. Deployment state lives in Alchemy's Cloudflare state store, so connect Cloudflare once per machine with `bunx alchemy profile edit`.
- GitHub Actions deploys `production` on pushes to `main` and an isolated `pr-<number>` stage for each pull request. Closing the pull request destroys that stage. Varlock loads `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from 1Password. CI authenticates to 1Password with `OP_SERVICE_ACCOUNT_TOKEN`.
- Alchemy applies D1 migrations from `packages/db/src/migrations` on every deploy. Review migration SQL before deploying production.
- Inspect a stage's resources before `alchemy destroy`. Destroying `production` needs explicit user approval.
