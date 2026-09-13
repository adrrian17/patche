# Patche

Online stationery store (notebooks, calendars, planners) selling physical and digital goods in Mexico, priced in MXN. This document is the glossary for the store and its admin.

## Language

### People

**Admin**: The single store operator who manages the catalog, inventory, and orders. Distinguished from a Customer by role, not by a separate account type. _Avoid_: Staff, owner, superuser

**Customer**: A person with an account who can place orders. Every non-admin account is a Customer. _Avoid_: User, client, buyer, account

### Catalog

**Product**: A commercial listing (name, description, images) shown to Customers. A Product is never bought directly; its Variants are. _Avoid_: Item, article, listing

**Variant**: The purchasable unit of a Product, with its own SKU, price, and Kind. Every Product has at least one Variant, even if only a default one. _Avoid_: SKU (as a noun for the thing), option, price

**Kind**: Whether a Variant is Physical (shipped, tracked by Stock) or Digital (delivered as a file from storage, never out of stock). _Avoid_: Type, format

**Category**: A flat label (notebooks, calendars, planners) a Product may belong to. A Product has at most one Category; there is no hierarchy. _Avoid_: Collection, tag, department

**Product Status**: Whether a Product is Draft (being prepared), Active (visible to Customers), or Archived (hidden but kept for past Orders). Products are never deleted. _Avoid_: Published, deleted, hidden

**Media**: A public image attached to a Product. _Avoid_: Asset, attachment, photo

**Digital File**: The private file a Customer receives when buying a Digital Variant. _Avoid_: Download, asset, attachment

### Inventory

**Stock**: The current quantity on hand of a Physical Variant, always derived as the sum of its Stock Movements. Stock zero means the Variant cannot be bought. _Avoid_: Inventory count, quantity, availability

**Low Stock Threshold**: The per-Variant Stock level at or below which the Admin is warned to restock. _Avoid_: Reorder point, minimum stock

**Stock Movement**: A single dated change to a Physical Variant's Stock with a reason (received, sold, adjusted, returned). Movements are never edited or deleted. _Avoid_: Adjustment (as the general term), transaction, log entry

### Orders

**Order**: A Customer's confirmed purchase created from a completed Stripe Checkout. Has one Payment Status and one Fulfillment Status. _Avoid_: Purchase, transaction, cart, checkout

**Order Item**: One Variant and quantity within an Order, with the price captured at purchase time. _Avoid_: Line, line item, position

**Payment Status**: What Stripe says about the money for an Order: pending, succeeded, failed, canceled, or refunded. Only webhooks change it. _Avoid_: Order status, paid flag

**Fulfillment Status**: Where the goods are for an Order: unfulfilled, shipped, or delivered. Digital-only Orders are delivered as soon as payment succeeds. _Avoid_: Shipping status, order status

**Shipping Rate**: The single flat amount, set by the Admin, charged on any Order containing a Physical Variant. _Avoid_: Shipping cost, delivery fee, freight

**Download Grant**: A Customer's right to fetch the Digital File of a Digital Variant they bought, tied to an Order Item. Revoked when the Order is refunded. _Avoid_: License, download link, entitlement
