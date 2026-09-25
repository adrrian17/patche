# Review, test/e2e-suite, 2026-09-25

**Reviewed by**: Claude Sonnet 5 (author on unspecified) **Scope**: 17 files, branch vs main (merge-base 93fefba4) **Verdict**: Approve with nits

## Summary

This adds the Playwright E2E harness and the first real slice (auth + CI job), matching the contract in `docs/scope/scope.md` features 1 and 2 and the linked plan. The design is careful: `APP_ENV=e2e` only affects build-time plugin config (`vite.config.ts`'s `persistState`) and Varlock's env schema, never app runtime code, so there's no risk of an e2e-only code path leaking into production. The magic-link flow reading from Miniflare's email files, the hydration-retry loops, and the CI job (pinned action SHAs, `persist-credentials: false`, placeholder secrets with real-secret fallback) are all solid and consistent with the existing `quality` job's patterns. Nothing here blocks merge; the notes below are refinements.

## Minor

### 🟡 Possible SQLite contention under parallel CI workers, `apps/web/playwright.config.ts:32`

**Problem**: CI runs `workers: 2` against a single `vite dev` webServer backed by one local D1 SQLite file (`persistDir`). `auth.setup.ts`'s `promoteToAdmin` also shells out to a _separate_ `wrangler d1 execute` process that opens the same file while the dev server has it open, and `auth.spec.ts`'s own registrations can run concurrently with `smoke.spec.ts` in the second worker. **Why it matters**: Cross-process concurrent writes to a single SQLite file can produce transient `SQLITE_BUSY`/lock errors, i.e. CI flakiness that looks unrelated to the code being tested. **Suggested fix**: Not urgent — `retries: 1` in CI likely already absorbs occasional contention. If flakiness shows up in practice, the fix is `workers: 1` for the `chromium` project in CI, not more retries.

## Nits

- ⚪ `apps/web/e2e/support/stripe-events.ts:1`, `postSignedEvent`/`findStripeEvent` are unused by any current spec (Slice 3/4 aren't built yet). Matches the plan's "harness ships the shared helpers up front" intent, but it's currently dead code with no test exercising it — fine to leave per the plan, just flagging so it isn't forgotten if the next slice's shape ends up different.
- ⚪ `apps/web/e2e/support/promote-to-admin.ts:16`, the `UPDATE user SET role = 'admin' WHERE email = '${email}'` string is injection-shaped even though the email always comes from `crypto.randomUUID()`-based test data. `wrangler d1 execute --command` has no parameter-binding option, so there may be no cleaner fix available — worth a one-line comment noting that constraint explicitly rather than "never from user input," which reads as a promise about the future, not just the present.
- ⚪ `apps/web/e2e/smoke.spec.ts:3`, the file is really "admin session persists across a fresh page load," not a general smoke test; the name may mislead once more smoke-style checks are added later.

## Strengths

- `.env.schema` and `vite.config.ts` keep `APP_ENV=e2e` fully contained to build/plugin config; no app code branches on it, so there's no risk of test-only behavior shipping to production.
- The hydration-retry patterns in `apps/web/e2e/support/magic-link.ts:26` and `apps/web/e2e/auth.spec.ts:20` are a well-reasoned, minimal fix for a real flake (pre-hydration clicks doing a native GET) rather than a blanket `waitForTimeout`.
- CI job mirrors the existing `quality` job's security posture exactly: pinned action SHAs, `persist-credentials: false`, and placeholder secrets that never touch a real deploy.

## Test coverage

This diff _is_ the test suite (`TEST_SIGNAL = none-yet` doesn't apply in the usual sense — it's E2E code, not app code needing E2E coverage). Feature 2's "done when" criteria (register, sign out, Customer blocked from `/admin`, CI uploads report on failure) are all directly covered by `auth.spec.ts` and the `ci.yml` `e2e` job. Slices 3-6 are explicitly deferred per `docs/scope/scope.md` and out of scope for this review.
