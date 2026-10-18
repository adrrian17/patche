import { z } from "zod";

import { withAdminDatabase } from "./seed-product";

function randomId() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 21);
}

interface SeedOrderItem {
  variantId: string;
  productName: string;
  variantName: string;
  kind: "digital" | "physical";
  unitAmount: number;
  quantity: number;
  grant?: "active" | "revoked";
}

interface SeedOrder {
  createdAt: Date;
  paymentStatus: "pending" | "succeeded";
  fulfillmentStatus?: "delivered" | "shipped" | "unfulfilled";
  shippingAmount: number;
  shipping?: {
    name: string;
    address: {
      city: string;
      country: string;
      line1: string;
      line2: string | null;
      postalCode: string;
      state: string;
    };
  };
  items: SeedOrderItem[];
}

// Inserts the Order the checkout webhook would write, so the test does not need a Stripe payment.
export function seedOrder(customerEmail: string, seed: SeedOrder) {
  const orderId = randomId();
  const grantIds: string[] = [];
  const subtotalAmount = seed.items.reduce(
    (sum, item) => sum + item.unitAmount * item.quantity,
    0
  );
  withAdminDatabase(customerEmail, (db) => {
    const { id: customerId } = z
      .object({ id: z.string() })
      .parse(
        db.prepare("SELECT id FROM user WHERE email = ?").get(customerEmail)
      );
    db.prepare(
      `INSERT INTO "order" (id, customer_id, stripe_checkout_session_id, payment_status, fulfillment_status, subtotal_amount, shipping_amount, total_amount, shipping_name, shipping_address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      orderId,
      customerId,
      `cs_test_e2e_${orderId}`,
      seed.paymentStatus,
      seed.fulfillmentStatus ?? "unfulfilled",
      subtotalAmount,
      seed.shippingAmount,
      subtotalAmount + seed.shippingAmount,
      seed.shipping?.name ?? null,
      seed.shipping ? JSON.stringify(seed.shipping.address) : null,
      seed.createdAt.getTime(),
      seed.createdAt.getTime()
    );
    for (const item of seed.items) {
      const orderItemId = randomId();
      db.prepare(
        "INSERT INTO order_item (id, order_id, variant_id, product_name, variant_name, kind, unit_amount, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        orderItemId,
        orderId,
        item.variantId,
        item.productName,
        item.variantName,
        item.kind,
        item.unitAmount,
        item.quantity
      );
      if (item.grant) {
        const grantId = randomId();
        db.prepare(
          "INSERT INTO download_grant (id, order_item_id, customer_id, variant_id, revoked_at) VALUES (?, ?, ?, ?, ?)"
        ).run(
          grantId,
          orderItemId,
          customerId,
          item.variantId,
          item.grant === "revoked" ? Date.now() : null
        );
        grantIds.push(grantId);
      }
    }
  });
  return { grantIds, orderId };
}
