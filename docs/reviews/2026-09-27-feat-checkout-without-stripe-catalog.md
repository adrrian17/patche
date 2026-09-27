# Review, feat/checkout-without-stripe-catalog, 2026-09-27

**Reviewed by**: GPT-6-Astra (author on GPT / gpt-6-luna)
**Scope**: 20 files, branch vs main (merge base `a79d2fa3880c5d7e07db266bbf3cfdb17483220d`, including working tree and untracked migration/ADR)
**Verdict**: Changes requested

## Summary

The change removes the synchronous Stripe catalog mirror, builds Checkout lines from D1 values, and records purchased names from line item metadata. The implementation preserves the existing reservation and webhook boundaries, and the migration explicitly protects cascading Media rows. The main gap is that the new persisted purchase snapshot and fallback contract has no meaningful integration assertions; the development route guard also broadens access to every non-production deployment.

## Major

### 🟠 Protect the persisted purchase snapshot and fallback contract, `apps/web/src/lib/payments.integration.ts:71`

**Problem**: The updated fixture provides `productName` and `variantName`, but its names and amount exactly match D1. None of the three integration tests queries `order_item.product_name`, `variant_name`, or `unit_amount`. Consequently, ignoring Stripe metadata and always reading the current catalog would pass every test, as would breaking the new missing/empty-name fallback. These are explicit AC-4 behaviors and critical test scenarios in the governing spec.

**Why it matters**: Renaming or repricing a Variant after Checkout creation must not change the historical purchase snapshot. The current assertions only prove reservation/event/refund behavior, so they cannot catch a regression in the feature's central webhook contract. The fallback adds branching behavior at the payment persistence boundary, which the configured-test review rubric requires covering before merge.

**Suggested fix**: Extend the existing real webhook-to-D1 integration boundary with a case whose current D1 names and price differ from the purchased metadata and amount, then assert the persisted Order Item keeps the purchased values. Exercise absent and empty name metadata and assert fallback to D1 while retaining the purchased amount. Use the existing fixture and database path; no test-only production exports are needed.

## Minor

### 🟡 Non-production stage is broader than development-only checkout, `packages/infra/alchemy.run.ts:58`

**Problem**: `String(!isProductionStage)` enables `/dev/checkout` for every stage except the exact `STAGE=production` value. The checked-in PR deployment workflow uses `pr-<number>`, so ordinary deployed preview builds now enable this route; previously the `import.meta.env.DEV` guard excluded built deployments. `apps/web/AGENTS.md` requires the route to remain limited to development use, and this catalog change does not specify broadening that boundary.

**Why it matters**: A deployed preview or other named stage exposes the internal Variant-ID checkout form to any signed-in Customer, with no explicit decision or test defining where it belongs. This does not bypass the existing Checkout authentication or enable the standard production stage, so it is a scope and environment-contract issue rather than a confirmed payment exploit.

**Suggested fix**: Derive the binding from the actual local development mode, preserving the documented local E2E path. If selected deployed verification stages are intended, make that an explicit narrow allowlist and document the changed contract; avoid enabling all unknown stage names by default.

## Strengths

- Prices and names come from server-loaded catalog data, and the same prepared Session parameters are reused for ambiguous-request recovery. The mixed Physical/Digital unit case asserts the Stripe request contract, including MXN amounts and the absence of saved Price IDs.
- The migration backs up and restores Media before rebuilding its parent, checks foreign-key integrity before resetting deferral, and keeps the generated snapshot limited to the two removed columns and their unique constraints. Catalog authorization and input validation remain in place while the Stripe compensation paths are deleted.

## Test coverage

The checkout tests cover inline Physical/Digital lines, optional image inclusion/omission, shipping, metadata size, and the existing reservation recovery behavior. The integration suite still exercises event deduplication, consumed reservations, and refund delivery ordering, but does not assert the new Order Item snapshot/fallback behavior identified above. The integration setup applies migrations before seeding, so that suite alone does not establish preservation of populated tables during the rebuild; the spec's separate populated-D1 safety check remains the relevant evidence.

This was a read-only code and test review, apart from this findings file. No test suites, live Stripe requests, or populated-D1 migrations were run during this review. The new snapshot was parsed and compared with its predecessor: its parent ID matches, and the only removed DDL entries are the two Stripe catalog columns and their unique constraints.
