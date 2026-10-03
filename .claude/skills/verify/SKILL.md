---
name: verify
description: Launch and drive the Patche storefront and admin (TanStack Start on local Cloudflare Workers, D1, R2, and email via Alchemy) in a real browser with Playwright, and capture proof. Use to confirm a web change works the way a Customer or Admin experiences it (sign-up and login, admin catalog, product media, Stripe checkout and orders), not just that tests pass.
---

# Verify Patche

Patche's user surface is one web app at `http://localhost:3001`: the storefront (`/`, `/products`, `/cart`, `/login`, `/dashboard`) and the admin (`/admin/*`). Stripe Checkout is a real hosted page in Stripe test mode. There is no CLI surface; HTTP endpoints (`/api/auth/*`, `/api/stripe/webhook`, `/api/media/*`) are reached through the browser.

All helpers live in `.claude/skills/verify/scripts/` and run from any directory inside the repo. Feature recipes live in [`features/`](features/README.md); read the index before driving.

## Isolation

The app is pinned to port `3001` (`strictPort`, and Better Auth's URL is derived from it). Only ONE instance can run, so a verify run cannot coexist with the user's `bun run dev` or a `bun run test:e2e` run. `launch.sh` refuses to start when `:3001` is taken. Never stop a server you did not start; ask the user to stop theirs instead.

The verify instance uses its own Alchemy stage (`verify`) with a fresh local D1 and R2 each launch, and `APP_ENV=e2e` so Stripe uses the E2E test keys. It never touches the user's `dev_*` stage data.

Requires the 1Password desktop app to be unlocked (Varlock reads `op://Patche/Development/*` and `op://Patche/E2E/*`). Check with `APP_ENV=e2e bunx varlock load` if launch fails on secrets.

## Launch

```bash
.claude/skills/verify/scripts/launch.sh
```

Ready when it prints `ready: http://localhost:3001 (pid <pid>, log .verify/run/server.log)`. Usually 5 to 20 seconds; times out at 180 seconds. It deletes `packages/infra/.alchemy/state/patche/verify` first so D1 migrations apply to an empty database.

## Doctor

```bash
.claude/skills/verify/scripts/doctor.sh
```

Read-only. Every line must say `ok`: the launcher pid is alive, the `:3001` listener is in that pid's process tree (so it is ours), and `GET /` and `GET /api/auth/get-session` return 200. It also surfaces `error` lines from `server.log`. Run it first whenever anything looks off. A `NOT ours` line means someone else's server holds the port: do not drive it and do not kill it.

## Drive

Driving is Playwright, reusing the repo's E2E helpers in `apps/web/e2e/support/`. Write a spec in `.claude/skills/verify/drives/` and run it:

```bash
.claude/skills/verify/scripts/drive.sh <run-name> [playwright args]
# example: just the admin catalog drive
.claude/skills/verify/scripts/drive.sh admin-catalog admin-catalog
```

`drive.sh` runs doctor, links `apps/web/node_modules` into the skill directory (gitignored, needed because drives live outside `apps/web`), and runs Playwright from `apps/web` with `APP_ENV=e2e` through Varlock, so `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are available to helpers.

What is already in `drives/`:

- `auth.setup.ts` runs first on every drive. It registers a Customer and an Admin through the real sign-up form and emailed verification link, promotes the Admin in local D1, and writes `.verify/auth/customer.json` and `.verify/auth/admin.json`.
- One spec per mapped feature: `auth.spec.ts`, `admin-catalog.spec.ts`, `product-media.spec.ts`, `checkout-and-orders.spec.ts`. Each saves ordered screenshots and D1 rows as JSON. Pass the file name as the filter to run one.
- `d1.ts` exports `findRows(sql, ...params)` and `findRow(sql, ...params)` for read-only D1 checks. They return the first database file with matching rows, so never query aggregates (`COUNT`, `SUM` always return a row, from whichever file comes first).

Writing a new drive:

- Paths in specs are relative to `apps/web` (Playwright's cwd). Import repo helpers as `../../../../apps/web/e2e/support/<file>`.
- Sign in with `test.use({ storageState: "../../.verify/auth/admin.json" })` (or `customer.json`).
- Useful helpers: `registerWithPassword`, `signIn`, `requestReset`, `emailLink(email, "/verify-email?")` from `password-auth.ts`; `promoteToAdmin` from `promote-to-admin.ts`; `seedProduct`, `seedVariant`, `seedStock` from `seed-product.ts`; `postSignedEvent`, `findStripeEvent` from `stripe-events.ts`.
- Use roles and accessible names (UI copy is Spanish): `getByRole("button", { name: "Nuevo producto" })`, `getByLabel("Correo electrónico")`. The feature files list the exact names.
- Dialog triggers and the dev checkout form can miss clicks that land before hydration. Wrap them in `expect(async () => { ... }).toPass()` as `openDialog` in `admin-catalog.spec.ts` does.
- Use a fresh `crypto.randomUUID()` suffix for every name you create; the database persists across drives within one launch.

For a one-off look without a spec, `bunx playwright screenshot http://localhost:3001/login out.png` from `apps/web` works for unauthenticated pages.

## Evidence

Each `drive.sh` run writes `.verify/evidence/<YYYYMMDD-HHMMSS>-<run-name>/`:

- `run.log` is the Playwright console output.
- `artifacts/<test>/` holds `trace.zip` (open with `bunx playwright show-trace <path>` from `apps/web`), `test-finished-*.png`, and any file the drive writes with `testInfo.outputPath(...)`.
- `report/index.html` is the HTML report.

Proof standards:

- Drive the real user path: forms, buttons, emailed links, Stripe's hosted page. Seed helpers that write D1 directly are acceptable only for preconditions the feature under test does not own (for example seeding Stock to test checkout), never for the behavior being proven.
- Capture the action and the resulting state: a screenshot after each meaningful step, named in order (`1-…png`, `2-…png`), not only the final screen.
- Verify side effects alongside the UI: read the row back with `findRow` and write it to a `.json` next to the screenshots; for email, the text file under `packages/infra/.alchemy/local/email/text/`; for payments, the Stripe event and the webhook response body.
- The only mock boundary is the Stripe webhook delivery: local Stripe cannot reach `localhost`, so drives fetch the real event Stripe emitted and post it signed with `postSignedEvent`. The Checkout itself is real Stripe test mode.
- Email is not sent anywhere: Alchemy's local email binding writes files. Verify by reading those files, as `emailLink` does.

## Cleanup

```bash
.claude/skills/verify/scripts/cleanup.sh
```

Stops the launcher pid from `.verify/run/pid` and its whole process tree (Alchemy spawns `workerd` in separate process groups, so it walks the tree rather than a group). Never kill by name (`pkill workerd`, `pkill bun`) because that also kills the user's dev server. It then removes `.verify/run/`, `.verify/auth/`, and the `verify` stage state. It keeps `.verify/evidence/` intact; delete old evidence by hand when no longer needed. Old local D1 files under `packages/infra/.alchemy/local/d1/` accumulate across launches (the E2E suite has the same behavior) and are safe to leave.

Run cleanup after every run, including failed ones.

## Helpers

| Script | Use |
| --- | --- |
| `scripts/launch.sh` | Start the `verify` stage on `:3001` and wait for ready |
| `scripts/doctor.sh` | Read-only health and ownership check; non-zero exit means do not drive |
| `scripts/drive.sh <name> [args]` | Run drives with Playwright and collect evidence |
| `scripts/cleanup.sh` | Stop our process tree, remove scratch state, keep evidence |
| `scripts/lib.sh` | Sourced by the others (`root`, `run`, `descendants <pid>`); not run directly |
