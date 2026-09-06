# Stripe payments

Apply these rules to checkout, order payment, refunds, and Stripe webhook code.

## Trust boundaries

- Keep Stripe secret keys and webhook signing secrets on the server. Expose only publishable keys to the browser.
- Calculate product prices, discounts, taxes, shipping, currency, and the final amount on the server. Never accept a client-provided total as authoritative.
- Represent money as an integer in the currency's smallest unit. Store the currency with every amount.
- Use Stripe-hosted payment pages or Stripe Elements. Do not collect or store raw card details in Patche.

## Payment lifecycle

- Give retried Stripe write requests an idempotency key derived from the order and payment attempt.
- Treat the verified Stripe webhook as the source of truth for payment completion. Do not fulfill an order from a browser redirect or client callback.
- Persist the Patche order ID, Stripe object IDs, amount, currency, and payment status needed to reconcile an order.
- Model payment states explicitly. A pending, succeeded, failed, canceled, or refunded payment must not be inferred from the presence of a Stripe ID.

## Webhooks

- Verify every webhook with its `Stripe-Signature`, the endpoint secret, and the unmodified raw request body before reading the event.
- Assume Stripe can deliver an event more than once. Record processed event IDs and make handlers idempotent.
- Do not assume events arrive in order.
- Return a successful response quickly after durable receipt. Move slow fulfillment work out of the request path when the implementation supports it.
- Reject invalid signatures and unsupported payloads without changing order state.

## Sensitive data

- Do not log API keys, webhook secrets, client secrets, card data, or full webhook payloads.
- Keep logs useful for reconciliation by recording internal order IDs, Stripe object IDs, event types, and sanitized failure codes.
- Use Stripe test mode and test fixtures for development and automated tests.

References: [Stripe webhook guidance](https://docs.stripe.com/webhooks), [idempotent requests](https://docs.stripe.com/api/idempotent_requests), and [API key practices](https://docs.stripe.com/keys-best-practices).
