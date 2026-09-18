import type { Stripe } from "@patche/payments";
import { processStripeEvent } from "@patche/payments";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, test, vi } from "vitest";

import { releaseExpiredInventoryReservations } from "./inventory-reservations.server";
import { createWebhookStore } from "./payments.server";

const customerId = "customer_1";
const productId = "product_1";
const reservationId = "reservation_1";
const sessionId = "cs_test";
const variantId = "variant_1";

function checkoutCompletedEvent(): Stripe.Event {
  // SAFETY: The processor reads only the fields supplied by this fixture.
  // oxlint-disable-next-line anti-slop/no-chained-type-assertions -- minimal Stripe fixture
  return {
    data: {
      object: {
        amount_subtotal: 10_000,
        amount_total: 10_000,
        client_reference_id: customerId,
        collected_information: {
          shipping_details: {
            address: {
              city: "Monterrey",
              country: "MX",
              line1: "Test 1",
              line2: null,
              postal_code: "64000",
              state: "NL",
            },
            name: "Customer",
          },
        },
        currency: "mxn",
        id: sessionId,
        metadata: {
          items: JSON.stringify([{ qty: 1, variantId }]),
          reservationId,
        },
        payment_intent: "pi_test",
        payment_method_types: ["card"],
        payment_status: "paid",
        total_details: { amount_shipping: 0 },
      },
    },
    id: "evt_checkout_completed",
    type: "checkout.session.completed",
  } as unknown as Stripe.Event;
}

async function seedCheckoutReservation() {
  const expiresAt = Date.now() + 60_000;

  await env.DB.batch([
    env.DB.prepare("INSERT INTO user (id, name, email) VALUES (?, ?, ?)").bind(
      customerId,
      "Customer",
      "customer@patche.mx"
    ),
    env.DB.prepare(
      `INSERT INTO product (
        id, name, slug, description, status, stripe_product_id
      ) VALUES (?, ?, ?, '', 'active', ?)`
    ).bind(productId, "Cuaderno", "cuaderno", "prod_test"),
    env.DB.prepare(
      `INSERT INTO variant (
        id, product_id, name, sku, kind, price_amount, stripe_price_id
      ) VALUES (?, ?, ?, ?, 'physical', ?, ?)`
    ).bind(variantId, productId, "A5", "SKU-TEST", 10_000, "price_test"),
    env.DB.prepare(
      `INSERT INTO checkout_reservation (
        id, customer_id, stripe_checkout_session_id, status, expires_at
      ) VALUES (?, ?, ?, 'active', ?)`
    ).bind(reservationId, customerId, sessionId, expiresAt),
    env.DB.prepare(
      `INSERT INTO stock_movement (
        id, variant_id, quantity, reason
      ) VALUES (?, ?, 1, 'received')`
    ).bind("movement_received", variantId),
    env.DB.prepare(
      `INSERT INTO stock_movement (
        id, variant_id, quantity, reason, reservation_id
      ) VALUES (?, ?, -1, 'reserved', ?)`
    ).bind("movement_1", variantId, reservationId),
  ]);

  return expiresAt;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Stripe webhook inventory reservation", () => {
  test("a completed Checkout consumes its reservation permanently", async () => {
    const expiresAt = await seedCheckoutReservation();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json(
            {
              data: [
                {
                  currency: "mxn",
                  description: "Cuaderno",
                  metadata: { variantId },
                  price: { nickname: "A5", unit_amount: 10_000 },
                  quantity: 1,
                },
              ],
              has_more: false,
              object: "list",
              url: `/v1/checkout/sessions/${sessionId}/line_items`,
            },
            { status: 200 }
          )
        )
      )
    );

    const result = await processStripeEvent(
      checkoutCompletedEvent(),
      createWebhookStore()
    );
    // oxlint-disable-next-line react-doctor/server-sequential-independent-await -- cleanup must run after the webhook transaction commits
    await releaseExpiredInventoryReservations(new Date(expiresAt + 1));

    const [reservation, movement, releasedMovement] = await Promise.all([
      env.DB.prepare("SELECT status FROM checkout_reservation WHERE id = ?")
        .bind(reservationId)
        .first<{ status: string }>(),
      env.DB.prepare(
        `SELECT reason, order_id AS orderId
         FROM stock_movement WHERE reservation_id = ?`
      )
        .bind(reservationId)
        .first<{ orderId: string | null; reason: string }>(),
      env.DB.prepare(
        `SELECT id FROM stock_movement
         WHERE reservation_id = ? AND reason = 'released'`
      )
        .bind(reservationId)
        .first(),
    ]);

    expect(result).toBe("processed");
    expect(reservation?.status).toBe("consumed");
    expect(movement).toEqual({
      orderId: expect.any(String),
      reason: "sold",
    });
    expect(releasedMovement).toBeNull();
  });
});
