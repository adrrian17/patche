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

function refundedEvent(): Stripe.Event {
  // SAFETY: The processor reads only the fields supplied by this fixture.
  return {
    data: { object: { payment_intent: "pi_test", refunded: true } },
    id: "evt_charge_refunded",
    type: "charge.refunded",
  } as Stripe.Event;
}

function stubLineItems() {
  const fetchMock = vi.fn((_input: RequestInfo | URL) =>
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
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function seedCheckoutReservation(
  kind: "digital" | "physical" = "physical"
) {
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(variantId, productId, "A5", "SKU-TEST", kind, 10_000, "price_test"),
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

afterEach(async () => {
  vi.unstubAllGlobals();
  // D1 storage is shared across tests in this file; delete children first.
  await env.DB.batch(
    [
      "download_grant",
      "order_item",
      "stock_movement",
      "`order`",
      "checkout_reservation",
      "stripe_event",
      "variant",
      "product",
      "user",
    ].map((table) => env.DB.prepare(`DELETE FROM ${table}`))
  );
});

describe("Stripe webhook inventory reservation", () => {
  test("a completed Checkout consumes its reservation permanently", async () => {
    const expiresAt = await seedCheckoutReservation();
    const fetchMock = stubLineItems();

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
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      `/v1/checkout/sessions/${sessionId}/line_items`
    );
    expect(reservation?.status).toBe("consumed");
    expect(movement).toEqual({
      orderId: expect.any(String),
      reason: "sold",
    });
    expect(releasedMovement).toBeNull();
  });
});

describe("Stripe webhook event store", () => {
  test("a redelivered event is reported as a duplicate without a second Order", async () => {
    await seedCheckoutReservation();
    const fetchMock = stubLineItems();
    const store = createWebhookStore();

    const first = await processStripeEvent(checkoutCompletedEvent(), store);
    // oxlint-disable-next-line react-doctor/server-sequential-independent-await -- the redelivery must follow the first commit
    const second = await processStripeEvent(checkoutCompletedEvent(), store);
    const [orders, events] = await Promise.all([
      env.DB.prepare(
        "SELECT COUNT(*) AS count FROM `order` WHERE stripe_checkout_session_id = ?"
      )
        .bind(sessionId)
        .first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM stripe_event").first<{
        count: number;
      }>(),
    ]);

    expect([first, second]).toEqual(["processed", "duplicate"]);
    expect(orders?.count).toBe(1);
    expect(events?.count).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("a refund delivered before its Checkout is retried until it refunds the Order", async () => {
    await seedCheckoutReservation("digital");
    stubLineItems();
    const store = createWebhookStore();

    await expect(processStripeEvent(refundedEvent(), store)).rejects.toThrow(
      "Order pendiente para Charge reembolsado"
    );
    const recordedEarlyRefund = await env.DB.prepare(
      "SELECT id FROM stripe_event WHERE id = ?"
    )
      .bind("evt_charge_refunded")
      .first();
    // oxlint-disable-next-line react-doctor/server-sequential-independent-await -- Stripe delivers these in sequence
    await processStripeEvent(checkoutCompletedEvent(), store);
    // oxlint-disable-next-line react-doctor/server-sequential-independent-await -- the retry must follow the Checkout commit
    const retry = await processStripeEvent(refundedEvent(), store);
    // oxlint-disable-next-line react-doctor/server-sequential-independent-await -- reads must follow the retry commit
    const [paidOrder, grant] = await Promise.all([
      env.DB.prepare(
        "SELECT payment_status AS paymentStatus FROM `order` WHERE stripe_payment_intent_id = ?"
      )
        .bind("pi_test")
        .first<{ paymentStatus: string }>(),
      env.DB.prepare(
        "SELECT revoked_at AS revokedAt FROM download_grant WHERE variant_id = ?"
      )
        .bind(variantId)
        .first<{ revokedAt: number | null }>(),
    ]);

    expect(recordedEarlyRefund).toBeNull();
    expect(retry).toBe("processed");
    expect(paidOrder?.paymentStatus).toBe("refunded");
    expect(grant?.revokedAt).toEqual(expect.any(Number));
  });
});
