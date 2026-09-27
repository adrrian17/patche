# Checkout prices inline from D1

**Status**: Accepted

Patche keeps its catalog in D1 and sends each Variant's current price and name to Stripe Checkout as inline `price_data`. The webhook records the amount and names attached to the completed Session. Product and Price objects are no longer mirrored to Stripe, and the catalog does not store Stripe catalog IDs.

Catalog changes write only to D1. Checkout reads the active Product and Variant names and the Variant price from D1 when it creates the Session. Each line includes the Product and Variant names in metadata so the resulting Order Item preserves the values shown at purchase time, even if the catalog changes before webhook delivery.

Amounts remain integer MXN minor units and are calculated on the server. Only verified Stripe webhooks change Payment Status. Stripe remains responsible for hosted Checkout, payment events, refunds, and payment object IDs.

This replaces [ADR 0001](0001-database-is-catalog-source-of-truth.md). Stripe Dashboard revenue is no longer grouped by Patche Product, and features requiring saved Stripe Prices need a future catalog mirror decision.
