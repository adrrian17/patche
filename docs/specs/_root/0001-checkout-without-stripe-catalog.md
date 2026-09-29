# 0001. Price Checkout inline from D1 instead of a Stripe catalog

**Date**: 2026-09-26 **Status**: Accepted

## Summary

Patche stops creating Products and Prices in Stripe. When a Customer checks out, each line carries its price and name straight from D1 (inline `price_data`, meaning the price is sent with the request instead of pointing at a saved Stripe Price). The admin catalog then has no Stripe calls and no rollback code, and two columns go away. Orders keep working because the webhook reads the price and names back from the Checkout Session itself.

## Context

ADR 0001 made D1 the catalog source of truth and had every admin save mirror itself to Stripe in the same request. In practice the mirror is only used in one place: `startCheckout` in `packages/payments/src/checkout.ts` passes `variant.stripePriceId` as each line item's `price`. Nothing else reads the Stripe Products or Prices.

That single use costs a lot. `apps/web/src/functions/catalog.ts` makes a Stripe call in all seven write functions (create, update, and archive a Product; create, update, reprice, and archive a Variant), and each one carries hand written rollback code for when D1 and Stripe disagree. A price change creates a new Price, archives the old one, and has three separate compensation paths. Every test fixture has to invent fake `stripe_product_id` and `stripe_price_id` values, and the planned Admin catalog E2E (feature 3) would need to check a real Stripe sandbox for each save.

The webhook also depends on the mirror by accident: `loadPurchasedLineItems` in `apps/web/src/lib/payments.server.ts` takes the Order Item's Variant name from `lineItem.price.nickname`, which only exists on a saved Price. It takes the Product name from `lineItem.description`.

Constraints: amounts are MXN integer minor units calculated on the server; only verified webhooks change Payment Status; the storefront and cart do not exist yet, and no shared D1 stage (production or staging) has been deployed, so no live Checkout Sessions or catalog rows need care during the change. The work touches `packages/payments`, `apps/web`, and `packages/db`, so this spec is repo wide.

## Requirements

**User stories**:

- As the Admin, I want catalog saves to touch only D1, so that a Stripe outage or error never blocks or half applies a catalog edit.
- As a Customer, I want Checkout to charge the price the store shows right now, with a clear name per line.
- As the Admin, I want every paid Checkout to become an Order with the price and names captured at payment time, as it does today.

**Acceptance criteria**:

- **AC-1**: Creating, updating, and archiving a Product, and creating, updating, repricing, and archiving a Variant, make no request to Stripe. `apps/web/src/functions/catalog.ts` no longer imports `getStripeClient`, and none of those functions has Stripe rollback code.
- **AC-2**: Each Checkout Session line item is sent with `price_data` (`currency: "mxn"`, `unit_amount` = the Variant's `price_amount` read from D1 when checkout starts, `product_data.name` = `"<Product name> · <Variant name>"`), its `quantity`, and `metadata` = `{ variantId, productName, variantName }`. No line item sends `price`.
- **AC-3**: After the Admin changes a Variant's price, the next Checkout charges the new price with no other step. A Session created before the change keeps the price it was created with.
- **AC-4**: On `checkout.session.completed`, each Order Item's `unit_amount` comes from `lineItem.price.unit_amount`, and its `product_name` and `variant_name` come from the line item's `metadata.productName` and `metadata.variantName`, falling back to the current D1 names when a value is missing or an empty string (the fallback already lives in the Order Item builder in `payments.server.ts`; switch its `??` to `||` so an empty string also falls back). The existing checks (a `variantId` on each line, matching quantity, `mxn`, integer amount, no duplicates, no missing lines) still reject a Session that fails them.
- **AC-5**: Webhook idempotency, Checkout Reservations, Stock, Download Grants, and refunds behave exactly as before: the existing unit and integration suites pass once their fixtures drop the Stripe catalog IDs.
- **AC-6**: The columns `product.stripe_product_id` and `variant.stripe_price_id` are gone from the Drizzle schema and from D1 through a generated migration, and that migration keeps every row in `product`, `variant`, `product_media`, and every table that references them.
- **AC-7**: The admin product page no longer says changes are sent to Stripe or that prices are immutable Stripe Prices.
- **AC-8**: A new ADR 0005 records that Checkout prices inline from D1, and ADR 0001 is marked superseded by it.

## Options considered

### Option 1: Keep the synchronous mirror (fix in place)

Leave ADR 0001 as is and only tidy the rollback code, for example by moving the compensation logic into one helper.

**Pros**:

- No migration and no change to Checkout or the webhook.
- Stripe Dashboard keeps a browsable copy of the catalog.

**Cons**:

- Every catalog save still depends on Stripe being up, and every save still has a window where D1 and Stripe disagree.
- Admin catalog E2E still has to check a real Stripe sandbox for each save.
- Keeps two IDs per row whose only reader is one line in `startCheckout`.

### Option 2: Inline `price_data` from D1 at checkout, names in line item metadata

Checkout builds each line from D1 with `price_data` and `product_data`, and writes the Product and Variant names into line item metadata next to `variantId`. The webhook reads them back. The catalog functions lose all Stripe code and the two columns are dropped.

**Pros**:

- Catalog saves are plain D1 writes; all rollback code disappears.
- Price changes take effect immediately with no Price rotation.
- Names on the Order Item are frozen at payment time and set by the server, not the client.

**Cons**:

- Stripe Dashboard and reports show ad hoc prices, so you can't group revenue by a Stripe Product.
- Needs a table rebuild migration, because the `UNIQUE` on each column creates an index that stops SQLite from dropping it in place.

### Option 3: Inline `price_data`, read names from D1 in the webhook

Same as Option 2, but without name metadata. The webhook looks the names up in D1 when it runs.

**Pros**:

- Slightly smaller Checkout payload, and the fallback path already exists.

**Cons**:

- The Order Item records the name at webhook time, not purchase time. A rename between payment and webhook, or a replayed event days later, changes the Order.

### Option 4: Keep Stripe Products, drop only Prices

Keep one Stripe Product per Patche Product and use `price_data.product` to point at it.

**Pros**:

- Dashboard revenue still groups by Product.

**Cons**:

- Keeps Product create, update, and archive calls and their rollback, so most of the complexity survives for a reporting need nobody has asked for.

## Decision

**Chosen option**: Option 2: Inline `price_data` from D1 at checkout, names in line item metadata.

Checkout prices and names every line from D1 when the Session is created, the webhook captures them from the Session, and Patche no longer keeps any catalog objects in Stripe.

## Rationale

The only consumer of the mirror is one field in `startCheckout`, while its cost is spread across seven server functions, their rollback paths, every fixture, and the upcoming E2E. Option 2 removes the dependency where it is used and deletes the rest. It also matches ADR 0001's own reason for choosing D1 (inventory, Kind, Media, and Digital Files have no home in Stripe) more fully than the mirror did.

Option 2 beats Option 3 on correctness: the Order Item is defined as holding the price captured at purchase time, and the names belong with it. The server writes them into the Session when checkout starts, so they are as trustworthy as the amount and do not drift with later edits. Option 4 keeps most of the complexity for Dashboard grouping, which no requirement asks for.

With no shared stage deployed, there are no open Sessions using saved Prices and no live rows to protect, so a direct replacement (no strangler, no dual read of `price.nickname`) is safe. The one real hazard is the table rebuild, covered in the Migration plan.

## Feature design

**Data model sketch** (target, only removals):

- `product`: drop `stripe_product_id` (was `text NOT NULL UNIQUE`). Every other column, index, and FK stays as is.
- `variant`: drop `stripe_price_id` (was `text NOT NULL UNIQUE`). Every other column, index, and FK stays as is.
- `order_item`: unchanged. `product_name`, `variant_name`, and `unit_amount` keep their meaning and are filled from the Session as described below.
- References into these tables that must survive the rebuild: `product_media.product_id` (`ON DELETE CASCADE`), `variant.product_id`, `stock_movement.variant_id`, `digital_upload_intent.variant_id`, `order_item.variant_id`, and `download_grant.variant_id`.

**API surface** (no new endpoints; changed contracts only):

| Surface | Change | Key inputs | Key outputs | Auth | Key errors |
| --- | --- | --- | --- | --- | --- |
| `createProduct`, `updateProduct`, `archiveProduct`, `createVariant`, `changeVariantPrice`, `updateVariant`, `archiveVariant` (server functions in `catalog.ts`) | Remove all Stripe calls, idempotency keys, and rollback blocks; write D1 only. `createProduct` and `createVariant` stop setting the dropped columns | unchanged | unchanged | `adminMiddleware` (unchanged) | "Product no encontrado", "Variant no encontrada" (unchanged) |
| `startCheckout` (`packages/payments/src/checkout.ts`) | `CheckoutVariant` drops `stripePriceId` and adds `name` and `productName`; line items use `price_data` plus name metadata | `items[]`, `customerId`, `origin` (unchanged) | `{ id, url }` (unchanged) | Customer session (unchanged) | unchanged |
| `getVariants` dependency (`payments.server.ts`) | Select `variant.name` and `product.name` instead of `stripePriceId` | variant IDs | `CheckoutVariant[]` | server only | none new |
| `loadPurchasedLineItems` (`payments.server.ts`) | Read names from `lineItem.metadata`, keep `unit_amount` from `lineItem.price.unit_amount` | Session ID, expected items | per Variant `{ unitAmount, productName, variantName }` | server only | existing validation errors |

Line item shape sent to Stripe (per item):

```ts
{
  price_data: {
    currency: "mxn",
    unit_amount: variant.priceAmount,
    product_data: { name: `${variant.productName} · ${variant.name}` },
  },
  quantity: item.quantity,
  metadata: {
    variantId: item.variantId,
    productName: variant.productName,
    variantName: variant.name,
  },
}
```

**Value sourcing**:

| Action | Value produced / displayed | Source |
| --- | --- | --- |
| `startCheckout` | `unit_amount` per line | `variant.price_amount` via `getVariants` (only active Product, not archived Variant, as today) |
| `startCheckout` | `product_data.name` per line | derived: `product.name` + `" · "` + `variant.name` via `getVariants` |
| `startCheckout` | `metadata.productName`, `metadata.variantName` | `product.name`, `variant.name` via `getVariants` |
| `startCheckout` | `metadata.variantId` | input `items[].variantId` (unchanged) |
| `startCheckout` | currency | constant `"mxn"` (unchanged convention) |
| webhook, Order Item | `unit_amount` | `lineItem.price.unit_amount` (Stripe returns an ad hoc Price object for `price_data` lines) |
| webhook, Order Item | `product_name` | `lineItem.metadata.productName`, else `product.name` from D1 (existing fallback) |
| webhook, Order Item | `variant_name` | `lineItem.metadata.variantName`, else `variant.name` from D1 (existing fallback) |
| webhook, Order Item | `quantity`, `variant_id` | `lineItem.quantity` checked against Session `metadata.items`; `lineItem.metadata.variantId` (unchanged) |

Stop reading `lineItem.description` for the Product name: with the new line name it would hold `"Product · Variant"`.

**Key invariants**:

- The server alone decides `unit_amount`; it is read from D1 in the same request that creates the Session, never from the client.
- No Patche table stores a Stripe catalog ID after this change. Stripe IDs that stay are per payment (`stripe_checkout_session_id`, `stripe_payment_intent_id`, `stripe_customer_id`, `stripe_event`).
- Each line item metadata value stays under Stripe's 500 character per value limit: Product and Variant names are capped at 160 characters by `nameSchema`, and `variantId` at 32.
- `createSessionWithRecovery` must send identical params on its retry so the idempotency key still matches; building the params once before the call (as today) keeps that true.

**Security model**: unchanged. Catalog functions stay behind `adminMiddleware`; Checkout requires a signed in Customer; webhooks are verified by signature. Metadata holds only public catalog names, no personal data. Payments are in PCI scope only through Stripe hosted Checkout, as before.

**Configuration required**: none. `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are still needed for Checkout, webhooks, and refunds.

**Critical test scenarios**:

- Happy path: `startCheckout` with one Physical and one Digital Variant sends two `price_data` lines with D1 amounts, the combined name, and the three metadata keys, and no `price` field (unit, `checkout.test.ts`), verifies **AC-2**.
- Reprice: change a Variant's price in D1, start a new checkout, and the new `unit_amount` is sent (unit), verifies **AC-3**.
- Webhook capture: a stubbed `listLineItems` response with metadata names produces Order Items with those names and `price.unit_amount`, even when the D1 names were changed after checkout (integration, `payments.integration.ts`), verifies **AC-4**.
- Webhook fallback and rejection: a line without name metadata falls back to D1 names; a line without `variantId` or with a wrong quantity is still rejected (integration), verifies **AC-4**.
- No Stripe from the catalog: `catalog.ts` has no Stripe import (type checking fails on any leftover call), `/check verify` confirms a search of `catalog.ts` finds no `stripe` or `getStripeClient`, and the Admin catalog E2E (feature 3) runs every save through the UI, verifies **AC-1**. (An integration test was dropped: the server functions need a TanStack request context and an admin session that the Workers pool can't provide without new infrastructure.)
- Migration safety: on local D1 with the old schema, seed a Product with Media, a Variant with Stock Movements, a `digital_upload_intent`, and an Order with an Order Item and a `download_grant`; apply the new migration; check every row is still there, every `product_media` row keeps its original values, and `PRAGMA foreign_key_check` returns no rows, verifies **AC-6**.
- Regression: the full `bun test` and `bun run test:integration` suites pass, verifies **AC-5**.

## Build plan

Tracer Bullet: slice 1 proves the new pipe end to end (Checkout to Order) while the old columns still exist; slices 2 and 3 thicken by deleting. One PR, each slice leaves the app working.

**Slice 1: inline pricing end to end**

1. Update `CheckoutVariant` and `startCheckout` to send `price_data`, `product_data.name`, and name metadata; update `checkout.test.ts` expectations first (write down each way line building can fail before changing code, per the testing guide), satisfies **AC-2**, **AC-3**
2. Change `getVariants` in `payments.server.ts` to select `variant.name` and `product.name` instead of `stripePriceId`, satisfies **AC-2**
3. Change `loadPurchasedLineItems` to read `productName` and `variantName` from `lineItem.metadata`; stop reading `description` and `price.nickname`; update the `listLineItems` stub and add the rename and fallback cases in `payments.integration.ts`, satisfies **AC-4**, **AC-5**
4. Run `/dev/checkout` once against Stripe test mode, including one Product and Variant whose names are both 160 characters, and confirm the hosted page shows `"Product · Variant"` and the right amount, and the webhook creates the Order. The Purchase E2E (feature 4) later automates this against real test mode, satisfies **AC-2**, **AC-4**

**Slice 2: catalog without Stripe**

5. Remove every Stripe call, idempotency key, and rollback block from the seven functions in `catalog.ts`, and drop the `getStripeClient` import, satisfies **AC-1**
6. Confirm `bun run check-types` passes and a search of `catalog.ts` finds no `stripe` or `getStripeClient`, satisfies **AC-1**
7. Remove the Stripe sentences from `apps/web/src/routes/admin/products/$productId.tsx` (the notes on name and status changes and on immutable Prices; it is the only admin file that mentions Stripe for the catalog), satisfies **AC-7**
8. Write `docs/adr/0005-checkout-prices-inline-from-d1.md` and mark ADR 0001 superseded by it, satisfies **AC-8**

**Slice 3: drop the columns**

9. Remove `stripeProductId` and `stripePriceId` from `packages/db/src/schema/catalog.ts`, run `bun run db:generate`, then shape the SQL as the Migration plan requires (regular Media backup table, deferred foreign keys, integrity check, and deferred counter reset), satisfies **AC-6**
10. Remove the columns from fixtures and seeds: `apps/web/e2e/support/seed-product.ts`, `apps/web/src/lib/storage.integration.ts`, `apps/web/src/lib/payments.integration.ts`, `packages/payments/src/checkout.test.ts`, satisfies **AC-5**, **AC-6**
11. Run the migration safety check (seeded old schema, apply, count rows in every table listed in the data model sketch), then `bun run check-types`, `bun run check`, `bun test`, and `bun run test:integration`, satisfies **AC-5**, **AC-6**

## Migration plan

**Strategy**: direct replacement (no shared stage exists, so no strangler or dual read is needed).

**Options**:

- Keep the table rebuild, use a regular Media backup table, assert that SQLite reports no foreign key violations, then turn deferred checks off. This is the recommended fix because it keeps the schema change narrow and preserves D1 enforcement.
- Rebuild every child table to avoid dropping referenced parents. This adds more schema churn and data copying without improving the resulting schema.
- Turn foreign keys off around the rebuild. D1 does not allow that migration pattern.

**Phases**:

1. Slices 1 and 2 ship code that no longer reads the columns while they still exist.
2. Slice 3 drops them with one migration, generated by Drizzle and then adjusted as below.

**Required migration shape**: the `UNIQUE` on both columns creates an index that stops SQLite from dropping them in place, so the migration rebuilds `product` and `variant` (`CREATE TABLE __new_…`, copy, `DROP TABLE`, rename). Alchemy's local D1 migration path rejected `CREATE TEMP TABLE`, so use a regular scratch table for the Media backup and drop it before the migration ends.

- Start with `PRAGMA defer_foreign_keys = on`. Copy `product_media` to `__product_media_backup`, rebuild `product`, restore the Media rows, and drop the backup. Then rebuild `variant`.
- Before finishing, assert `SELECT json(CASE WHEN EXISTS (SELECT 1 FROM pragma_foreign_key_check) THEN 'invalid' ELSE '[]' END)`. This returns `[]` when the database is sound and raises a malformed JSON error if any FK is broken, stopping the batch before the reset. SQLite retains deferred violation counts from the parent table drops even when the replacement tables restore valid references, so finish with `PRAGMA defer_foreign_keys = off` to clear that stale count. This does not turn off foreign key enforcement for later queries. D1 supports both settings within the migration transaction.
- The local D1 safety check must apply this migration to populated tables, confirm every original row and Media value remains, and confirm `PRAGMA foreign_key_check` returns no rows. Drizzle emits `PRAGMA foreign_keys=OFF`; do not use it. Hand editing the generated SQL is allowed because the migration has not reached a shared database.

**Rollback**: before any shared stage exists, revert the PR and recreate the local D1 state. After a shared stage exists, a revert would need a new migration that adds the columns back as nullable, and the catalog code would need real Stripe IDs again, so treat this as one way.

**Risks**: a mistake in the rebuild silently deletes Media or fails the deploy; the safety check covers both. If it fails, stop and fix the SQL before merging.

## References

- [Cloudflare D1 foreign keys](https://developers.cloudflare.com/d1/sql-api/foreign-keys/): D1 supports deferring and re-enabling FK checks inside a transaction.
- [SQLite discussion of deferred FK counters during table rebuilds](https://sqlite.org/forum/info/64fb781a226df95c0f4edc474e590214c28ae1b4b5ddeee8f7ec4ad77286796c): `DROP TABLE` followed by a rename can leave the deferred counter set although `foreign_key_check` reports no rows.

## Consequences

**Positive**:

- Catalog saves become plain D1 writes: no Stripe outage, latency, or partial failure in the admin.
- Roughly half of `catalog.ts` (all compensation paths) is deleted.
- Admin catalog E2E (feature 3) loses its Stripe mirror checks and needs no Stripe sandbox for catalog work.
- Fixtures no longer invent fake Stripe IDs.

**Negative / tradeoffs**:

- Stripe Dashboard and Stripe reports no longer group sales by Product; revenue by Product must come from Patche's `order_item` table.
- Products and Prices already created in the Stripe accounts stay there, unused and active, and will look like a catalog to anyone browsing the Dashboard.
- Dropping the columns is one way once a shared stage exists.
- Stripe features that need saved Prices (Payment Links, subscriptions, some coupon rules scoped to Products) are not available without reintroducing a mirror.

**Neutral**:

- Tax behaviour is unchanged: `price_data` omits `tax_behavior`, just as the saved Prices did.
- Line names on Stripe receipts change from the Product name to `"Product · Variant"`.

## Follow-up

- [ ] Scope feature 3 (Admin catalog E2E): drop the "Product and Price present in Stripe" checks from its done criteria once this ships (the scope already notes it waits for feature 7).
- [ ] Scope row B ("each save mirrored to Stripe") no longer matches the code after this ships; `/scope` should update it.
- [ ] Stripe Products and Prices left in the accounts stay as is by decision; revisit only if they cause confusion in the Dashboard.
