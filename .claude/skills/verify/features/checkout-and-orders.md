# Checkout and orders

A signed-in Customer starts Stripe Checkout for a variant, pays on Stripe's hosted page in test mode, and returns to the dashboard. Stock is reserved before the Stripe session is created. The paid order appears in `/admin/orders`, where an Admin marks it shipped, delivered, and refunds it. Stock drops by the quantity sold; a refund does not return it.

## Sub-features

- `checkout-start` creates a Stripe Checkout session from `/dev/checkout`.
- `checkout-no-stock` refuses to start Checkout with `Stock insuficiente`.
- `checkout-pay` completes payment on Stripe and returns to `/dashboard`.
- `orders-paid` shows the order as `Pagado` with the Stripe total after the webhook.
- `orders-fulfill` moves the order to `Enviado` and `Entregado`.
- `orders-refund` moves it to `Reembolso pendiente`, then `Reembolsado` after the `charge.refunded` webhook. Stock stays reduced.

## How to get to it (user POV)

- There is no storefront product page yet. The only entry is the development page `/dev/checkout` (signed in): field `Variant ID`, optional `Segundo Variant ID (opcional)`, field `Cantidad`, button `Ir a Stripe Checkout`.
- Admin: sidebar `Órdenes` (`/admin/orders`), click the order row link, then buttons `Marcar enviada`, `Marcar entregada`, `Reembolso total`.

## Driving it with Playwright

Preconditions:

- An active product with a physical variant and Stock. Create them through `admin-catalog`, or seed with `seedProduct(name, email, "active")`, `seedVariant(email, { name, priceAmount, productId })`, `seedStock(email, variantId, 2)` when checkout is the feature under test.
- Worked drive: `drives/checkout-and-orders.spec.ts` covers every sub-feature, including the D1 reservation and order rows.

- **Start.** Retry: `goto("/dev/checkout")`, fill `Variant ID`, click `Ir a Stripe Checkout`, expect URL `checkout.stripe.com`. The session ID is `cs_test_…` in the URL.
- **No stock.** Same with a variant without Stock: alert `Stock insuficiente`, URL stays on `/dev/checkout`.
- **Pay.** On Stripe fill `Email`, `Full name`, `Enter address manually`, address line 1, `City`, `State` (`Nuevo León`), postal code, then card `4242424242424242`, expiration `1234`, CVC `123` through `fillStripeField`. Tick checkbox `I am an AI agent acting on behalf of someone else`; untick `Save my information for faster checkout` if checked. Click the last `Pay` button. URL reaches `/dashboard` within 60 seconds.
- **Webhook.** `findStripeEvent("checkout.session.completed", sessionId)` until defined, then `postSignedEvent(page.request, event)`. Response `200` with body `{ received: true, result: "processed" }`.
- **Admin order.** New context with `admin.json`: `/admin/orders` row for the customer email shows `Pagado` and the Stripe total formatted `es-MX` MXN. Detail shows the item row with product name and `$250.00`.
- **Fulfill and refund.** Click `Marcar enviada` (text `Enviado`), `Marcar entregada` (`Entregado`), `Reembolso total` (`Reembolso pendiente`). Find and post `charge.refunded` by Payment Intent ID; after reload, `Reembolsado`.
- **Proof.** Screenshots of Stripe before paying, the dashboard return, the order at each status; the two webhook response bodies as JSON; `/admin/products` variant list `Variantes de <product>` showing `Stock 1` (seeded 2, sold 1).

## Gotchas

- Local Stripe cannot reach `localhost`, so webhooks are never delivered by Stripe here. Fetch the real event and post it signed; that is the only mocked boundary.
- Stripe card fields live in iframes that get replaced; use `fillStripeField`, which walks `page.frames()` and retries on detached frames.
- The agent-disclosure checkbox is a native input under Stripe's styling; `purchase.spec.ts` clicks it through `evaluate((el) => el.click())` and then asserts it is checked.
- Outside Mexico, Stripe pre-checks Link and then demands a phone number; untick it.
- `/dev/checkout` returns 404 in production (`DEV_CHECKOUT_ENABLED`). It exists only in local and preview stages.
- This feature uses the shared E2E Stripe test account; each run leaves test-mode sessions and refunds there.
