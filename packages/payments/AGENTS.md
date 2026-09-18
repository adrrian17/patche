# Payments

## Overview

This workspace contains Stripe checkout and webhook domain logic. Its functions keep Stripe access at the edge and receive database behavior through explicit dependencies so tests can cover payment state changes.

## Key files

| File | Owns |
| --- | --- |
| `src/checkout.ts` | Checkout validation, totals, shipping, metadata, and session creation |
| `src/webhook-events.ts` | Idempotent Stripe event processing and payment transitions |
| `src/stock.ts` | Stock calculation from movements |
| `src/index.ts` | Public exports, Stripe client creation, and webhook verification |

## Commands

Run these from the repository root.

```bash
bun test packages/payments
bun run check-types
```

## Conventions

- Represent MXN amounts as integer minor units.
- Calculate prices, shipping, and final totals on the server.
- Verify webhooks from the raw request body and `Stripe-Signature` header.
- Make webhook processing idempotent and tolerate events arriving out of order.
- Inject persistence behavior into payment functions so domain tests stay isolated.

## Gotchas

- The Stripe API version is pinned in `src/index.ts`.
- Checkout currently reserves physical stock before creating a Stripe session. Keep reservation release and reactivation behavior consistent with webhook outcomes.
- A browser redirect does not confirm payment. Only a verified webhook may do that.

## Related specs

- [Stripe payment rules](../../docs/agent-guidelines/payments.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
