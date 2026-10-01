# Patche verification map

This directory is the maintained source for verifying the user-facing behavior of Patche. Read this index before driving the app, then use the matching feature file as the recipe. Every recipe runs through Playwright specs in `../drives/` via `../scripts/drive.sh` (see `../SKILL.md`).

## Baseline preconditions

- `scripts/launch.sh` started the instance and `scripts/doctor.sh` prints only `ok` lines.
- The instance is the `verify` Alchemy stage with a fresh local D1, R2, and email directory.
- `drives/auth.setup.ts` has run (it runs automatically before every drive), so `.verify/auth/customer.json` and `.verify/auth/admin.json` hold signed-in sessions.
- Never drive an instance that `doctor.sh` reports as `NOT ours`.

## Driving conventions

- Paths in specs are relative to `apps/web`, where Playwright runs.
- Use roles and accessible names. UI copy is Spanish; copy names exactly as written in the feature files.
- Give every record you create a `crypto.randomUUID()` suffix. D1 persists across drives within one launch.
- Wrap dialog triggers and the dev checkout submit in `expect(...).toPass()`; clicks before hydration are ignored.
- Seed with D1 helpers only for preconditions the feature under test does not own.

## Proof and skip reporting

- Save an ordered screenshot after each meaningful step with `page.screenshot({ path: testInfo.outputPath("<n>-<step>.png") })`.
- Back every mutation with a second view: a reload, another role's page, or a `findRow` D1 read saved as JSON.
- Name the feature and sub-feature IDs you covered when you report.
- Report an unreachable path with the attempted step and the unmet precondition. Do not report a skipped entry point as verified through a different one.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior, then exactly four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with Playwright`, `Gotchas`.

## Features

- [Accounts and sign-in](./auth.md) covers registration with email verification, sign-in, sign-out, password recovery, and role routing.
- [Admin catalog](./admin-catalog.md) covers categories, products, variants, price edits, and archiving. Worked drive: `drives/admin-catalog.spec.ts`.
- [Product media](./product-media.md) covers image upload, reorder, alt text, deletion, and the viewer.
- [Checkout and orders](./checkout-and-orders.md) covers Stripe Checkout, webhook processing, stock reservation, fulfillment, and refunds.

Not yet mapped: `/admin/inventory`, `/admin/settings`, and digital downloads (`/api/download/*`).
