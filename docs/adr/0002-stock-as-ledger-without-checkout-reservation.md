# Stock is a derived sum of Stock Movements, and Checkout does not reserve it

Stock for a Physical Variant is never stored as an editable number; it is the sum of immutable Stock Movements (received, sold, adjusted, returned). Stock is decremented only when the Stripe webhook confirms a completed Checkout, not when the Checkout session is created. This admits overselling if two Customers buy the last unit at the same time. We accepted that at Patche's volume rather than add reservation movements with expiry and cleanup. Revisit if oversells actually happen.
