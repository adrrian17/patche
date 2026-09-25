# Scope: Patche

Patche is an online stationery store (notebooks, calendars, planners, office goods) with Stripe payments. This slice adds an end to end test suite over the critical paths, so you can ship new features without fear of regressions.

**Build approach:** Tracer Bullet (prove the whole pipe with one thin working thread, then thicken one segment at a time). **Workflow:** Beta (after `/develop`, run `/check verify`, then `/test`). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

The decisions for this slice were settled in a grilling session and live in the plan at `~/Documents/Notes/Dev/Plans/2026-09-24-claude-e2e-test-suite.md`. Read it before building any feature below.

## At a glance

| #   | Feature                       | Phase      | Status      |
| --- | ----------------------------- | ---------- | ----------- |
| A   | Magic link auth               | Existing   | existing    |
| B   | Admin catalog                 | Existing   | existing    |
| C   | Admin orders and refunds      | Existing   | existing    |
| D   | Checkout and Stripe webhooks  | Existing   | in-progress |
| 1   | E2E harness                   | Foundation | done        |
| 2   | Auth E2E and CI job           | Slice 1    | planned     |
| 3   | Admin catalog E2E             | Slice 2    | planned     |
| 4   | Purchase E2E                  | Slice 3    | planned     |
| 5   | Post sale E2E                 | Slice 4    | planned     |
| 6   | Payments integration coverage | Slice 5    | planned     |

## Already built

### A. Magic link auth · existing

Sign in and register by magic link, sign out, protected routes, admin role check. code in `packages/auth/`, `apps/web/src/routes/login.tsx`, `apps/web/src/functions/request-magic-link.ts`

### B. Admin catalog · existing

Products, Variants, Categories, Media, Digital Files, Stock Movements and Shipping Rate, each save mirrored to Stripe. code in `apps/web/src/functions/catalog.ts`, `apps/web/src/routes/admin/`

### C. Admin orders and refunds · existing

Order list and detail, Fulfillment Status updates, refunds that settle through the `charge.refunded` webhook. code in `apps/web/src/functions/refund-order.ts`, `apps/web/src/routes/admin/`

### D. Checkout and Stripe webhooks · in-progress

Server priced hosted Stripe Checkout with Checkout Reservations, and idempotent webhook handling that creates Orders. The only entry point today is the DEV only `/dev/checkout` page; the storefront and cart are not built yet. code in `packages/payments/`, `apps/web/src/lib/payments.server.ts`

## Foundations

### 1. E2E harness

Playwright in `apps/web/e2e/`, running against `vite dev` with `APP_ENV=e2e` and an isolated D1 that is wiped each run. Shared helpers: magic link login from the Miniflare email file, admin promotion via local D1, Stripe event fetch and signing, catalog fixtures, and `storageState` per role. **Done when:** `bun run test:e2e` boots a clean app, logs in a Customer and an Admin through the setup project, and a smoke test passes with a trace kept on failure.

- [x] `/develop e2e harness`

## Slice 1: Auth E2E and CI job

### 2. Auth E2E and CI job

The thin thread through every layer: real magic link login, protected routes, and a CI job that runs the suite on each PR. **Done when:** register, sign out, and Customer blocked from `/admin` pass locally and in CI, and CI uploads the Playwright report and traces when a test fails.

- [ ] `/develop auth e2e and ci job`

## Slice 2: Admin catalog E2E

### 3. Admin catalog E2E

The Admin manages the catalog through the UI, and the tests check that Stripe mirrors it. **Done when:** create Category, Product and Physical Variant (Product and Price present in Stripe), change price (new Price active, old one off), archive, upload Media, record a Stock Movement with the low stock warning, and change the Shipping Rate all pass.

- [ ] `/develop admin catalog e2e`

## Slice 3: Purchase E2E

### 4. Purchase E2E

A Customer pays in hosted Stripe Checkout, and the real event is signed and posted to the webhook. **Done when:** a paid Order shows in admin with Order Items at the captured price and Stock decremented, and a Checkout cannot start without enough Stock.

- [ ] `/develop purchase e2e`

## Slice 4: Post sale E2E

### 5. Post sale E2E

After a real purchase, the Admin fulfills and refunds the Order. **Done when:** an Order moves shipped then delivered, and a refund goes `refund_pending` then `refunded` once the real `charge.refunded` event is posted.

- [ ] `/develop post sale e2e`

## Slice 5: Payments integration coverage

### 6. Payments integration coverage

Cover in the Miniflare integration suite the rules that need no browser, and run that suite in CI. **Done when:** a Download Grant is created on completion and revoked on refund, a Checkout Reservation is released on `checkout.session.expired` and on `payment_intent.payment_failed`, and CI runs `test:integration`.

- [ ] `/develop payments integration coverage`

## Deferred

Out of scope for the current build pass, kept so the plan stays honest.

- **Digital Variant E2E**: buy and download a Digital File, which needs a real R2 test bucket and credentials
- **Production like E2E server**: run against the build with `wrangler dev` once a real storefront and cart replace `/dev/checkout`
- **Test only login route**: better-auth `testUtils` behind a test route, if many roles or users per test make magic link login too slow · needs a decision

## Legend

**Feature lifecycle**: `planned` → `in-progress` → `done`, plus `existing` (built before this workflow) and `dropped` (out of scope, kept for history).

- **Next step** = the first unticked box.
- **needs a decision** = run `/architect` first; otherwise go straight to `/develop`.
- **Workflow** Beta means: after `/develop`, run `/check verify`, then `/test`. A tier tag beside a heading (e.g. `· GA`) overrides it for that feature.
- **Pointer line** (`spec <n> · code in <path>`): the spec link is added by `/architect`, the code path by `/develop`.
