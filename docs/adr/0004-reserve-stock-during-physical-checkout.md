# Reserve Stock during a physical Checkout

A physical Checkout creates a Checkout Reservation before its Stripe session. Reserved Stock is unavailable to other Customers, which prevents concurrent Checkouts from buying the same units. The reservation lasts slightly longer than the Stripe session and is released when session creation fails, payment fails, or the session expires. A completed Checkout keeps the Stock deduction and links the reservation to its Order. This replaces the decision in ADR 0002 because preventing oversells is now worth the extra reservation lifecycle.
