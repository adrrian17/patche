import { describe, expect, test } from "bun:test";

import type Stripe from "stripe";

import { startCheckout } from "./checkout";
import type { CheckoutDependencies } from "./checkout";

const inventoryDependencies = {
  activateInventoryReservation() {
    return Promise.resolve();
  },
  expireSession() {
    return Promise.resolve();
  },
  releaseInventoryReservation() {
    return Promise.resolve();
  },
  reserveInventory(
    _customerId: string,
    _items: { quantity: number; variantId: string }[],
    expiresAt: Date
  ) {
    return Promise.resolve({ expiresAt, id: "reservation_1" });
  },
} satisfies Pick<
  CheckoutDependencies,
  | "activateInventoryReservation"
  | "expireSession"
  | "releaseInventoryReservation"
  | "reserveInventory"
>;

describe("startCheckout", () => {
  test("blocks checkout when a Physical Variant has no Stock", async () => {
    let sessionsCreated = 0;
    const dependencies: CheckoutDependencies = {
      ...inventoryDependencies,
      createSession() {
        sessionsCreated += 1;
        return Promise.resolve({ id: "cs_test", url: "https://checkout.test" });
      },
      getShippingRateAmount() {
        return Promise.resolve(1000);
      },
      getVariants() {
        return Promise.resolve([
          {
            id: "variant_1",
            kind: "physical",
            name: "A5",
            priceAmount: 25_000,
            productName: "Cuaderno",
            stock: 0,
          },
        ]);
      },
    };

    await expect(
      startCheckout(
        {
          customerId: "customer_1",
          items: [{ quantity: 1, variantId: "variant_1" }],
          origin: "https://patche.mx",
        },
        dependencies
      )
    ).rejects.toThrow("Stock insuficiente para variant_1");
    expect(sessionsCreated).toBe(0);
  });

  test("sends the primary image and adds MX shipping for Physical checkout", async () => {
    let capturedParams: Stripe.Checkout.SessionCreateParams | undefined;
    let capturedOptions: Stripe.RequestOptions | undefined;
    const dependencies: CheckoutDependencies = {
      ...inventoryDependencies,
      createSession(params, options) {
        capturedParams = params;
        capturedOptions = options;
        return Promise.resolve({ id: "cs_test", url: "https://checkout.test" });
      },
      getShippingRateAmount() {
        return Promise.resolve(1500);
      },
      getVariants() {
        return Promise.resolve([
          {
            id: "variant_1",
            imageUrl:
              "https://media.example/api/media/products/product_1/image_1",
            kind: "physical",
            name: "A5",
            priceAmount: 25_000,
            productName: "Cuaderno",
            stock: 3,
          },
        ]);
      },
    };

    await startCheckout(
      {
        customerId: "customer_1",
        items: [{ quantity: 2, variantId: "variant_1" }],
        origin: "https://patche.mx",
      },
      dependencies
    );

    expect(capturedParams?.line_items).toEqual([
      {
        metadata: {
          productName: "Cuaderno",
          variantId: "variant_1",
          variantName: "A5",
        },
        price_data: {
          currency: "mxn",
          product_data: {
            images: [
              "https://media.example/api/media/products/product_1/image_1",
            ],
            name: "Cuaderno · A5",
          },
          unit_amount: 25_000,
        },
        quantity: 2,
      },
    ]);
    expect(capturedParams?.shipping_address_collection).toEqual({
      allowed_countries: ["MX"],
    });
    expect(capturedParams?.shipping_options).toEqual([
      {
        shipping_rate_data: {
          display_name: "Envío",
          fixed_amount: { amount: 1500, currency: "mxn" },
          type: "fixed_amount",
        },
      },
    ]);
    expect(
      JSON.parse(String(capturedParams?.metadata?.items ?? "null"))
    ).toEqual([{ qty: 2, variantId: "variant_1" }]);
    expect(capturedOptions?.idempotencyKey).toBe("checkout:reservation_1");
    expect(capturedParams?.metadata?.reservationId).toBe("reservation_1");
    expect(capturedParams?.payment_intent_data?.metadata?.reservationId).toBe(
      "reservation_1"
    );
    expect(capturedParams?.expires_at).toBeNumber();
  });

  test("prices each Physical and Digital line inline from the catalog values", async () => {
    let capturedParams: Stripe.Checkout.SessionCreateParams | undefined;
    const dependencies: CheckoutDependencies = {
      ...inventoryDependencies,
      createSession(params) {
        capturedParams = params;
        return Promise.resolve({ id: "cs_test", url: "https://checkout.test" });
      },
      getShippingRateAmount() {
        return Promise.resolve(1500);
      },
      getVariants() {
        return Promise.resolve([
          {
            id: "variant_physical",
            kind: "physical",
            name: "A5",
            priceAmount: 12_345,
            productName: "Cuaderno",
            stock: 3,
          },
          {
            id: "variant_digital",
            kind: "digital",
            name: "PDF",
            priceAmount: 23_456,
            productName: "Planner",
            stock: 0,
          },
        ]);
      },
    };

    await startCheckout(
      {
        customerId: "customer_1",
        items: [
          { quantity: 2, variantId: "variant_physical" },
          { quantity: 1, variantId: "variant_digital" },
        ],
        origin: "https://patche.mx",
      },
      dependencies
    );

    expect(capturedParams?.line_items).toEqual([
      {
        metadata: {
          productName: "Cuaderno",
          variantId: "variant_physical",
          variantName: "A5",
        },
        price_data: {
          currency: "mxn",
          product_data: { name: "Cuaderno · A5" },
          unit_amount: 12_345,
        },
        quantity: 2,
      },
      {
        metadata: {
          productName: "Planner",
          variantId: "variant_digital",
          variantName: "PDF",
        },
        price_data: {
          currency: "mxn",
          product_data: { name: "Planner · PDF" },
          unit_amount: 23_456,
        },
        quantity: 1,
      },
    ]);
  });

  test("does not request shipping for a digital-only cart", async () => {
    let capturedParams: Stripe.Checkout.SessionCreateParams | undefined;
    let shippingRateReads = 0;
    const dependencies: CheckoutDependencies = {
      ...inventoryDependencies,
      createSession(params) {
        capturedParams = params;
        return Promise.resolve({ id: "cs_test", url: "https://checkout.test" });
      },
      getShippingRateAmount() {
        shippingRateReads += 1;
        return Promise.resolve(1500);
      },
      getVariants() {
        return Promise.resolve([
          {
            id: "variant_1",
            kind: "digital",
            name: "A5",
            priceAmount: 25_000,
            productName: "Cuaderno",
            stock: 0,
          },
        ]);
      },
    };

    await startCheckout(
      {
        customerId: "customer_1",
        items: [{ quantity: 1, variantId: "variant_1" }],
        origin: "https://patche.mx",
      },
      dependencies
    );

    expect(capturedParams?.shipping_address_collection).toBeUndefined();
    expect(capturedParams?.shipping_options).toBeUndefined();
    expect(shippingRateReads).toBe(0);
  });

  test("allows checkout metadata at Stripe's 500-character boundary", async () => {
    let capturedParams: Stripe.Checkout.SessionCreateParams | undefined;
    const variantIds = Array.from({ length: 10 }, (_, index) =>
      `${index}`.padEnd(index === 0 ? 24 : 25, "a")
    );
    const dependencies: CheckoutDependencies = {
      ...inventoryDependencies,
      createSession(params) {
        capturedParams = params;
        return Promise.resolve({ id: "cs_test", url: "https://checkout.test" });
      },
      getShippingRateAmount() {
        return Promise.resolve(0);
      },
      getVariants() {
        return Promise.resolve(
          variantIds.map((id) => ({
            id,
            kind: "digital" as const,
            name: "A5",
            priceAmount: 100,
            productName: "Cuaderno",
            stock: 0,
          }))
        );
      },
    };

    await startCheckout(
      {
        customerId: "customer_1",
        items: variantIds.map((variantId) => ({ quantity: 1, variantId })),
        origin: "https://patche.mx",
      },
      dependencies
    );

    expect(capturedParams?.metadata?.items).toHaveLength(500);
  });

  test("rejects checkout metadata over Stripe's 500-character limit", async () => {
    let sessionsCreated = 0;
    const variantIds = Array.from({ length: 10 }, (_, index) =>
      `${index}`.padEnd(25, "a")
    );
    const dependencies: CheckoutDependencies = {
      ...inventoryDependencies,
      createSession() {
        sessionsCreated += 1;
        return Promise.resolve({ id: "cs_test", url: "https://checkout.test" });
      },
      getShippingRateAmount() {
        return Promise.resolve(0);
      },
      getVariants() {
        return Promise.resolve([]);
      },
    };

    await expect(
      startCheckout(
        {
          customerId: "customer_1",
          items: variantIds.map((variantId) => ({ quantity: 1, variantId })),
          origin: "https://patche.mx",
        },
        dependencies
      )
    ).rejects.toThrow("El carrito excede el límite permitido");
    expect(sessionsCreated).toBe(0);
  });

  test("expires Stripe and releases Stock when reservation activation fails", async () => {
    const expiredSessions: string[] = [];
    const releasedReservations: string[] = [];
    const dependencies: CheckoutDependencies = {
      ...inventoryDependencies,
      activateInventoryReservation() {
        return Promise.reject(new Error("D1 unavailable"));
      },
      createSession() {
        return Promise.resolve({ id: "cs_test", url: "https://checkout.test" });
      },
      expireSession(sessionId) {
        expiredSessions.push(sessionId);
        return Promise.resolve();
      },
      getShippingRateAmount() {
        return Promise.resolve(1000);
      },
      getVariants() {
        return Promise.resolve([
          {
            id: "variant_1",
            kind: "physical",
            name: "A5",
            priceAmount: 25_000,
            productName: "Cuaderno",
            stock: 2,
          },
        ]);
      },
      releaseInventoryReservation(reservationId) {
        releasedReservations.push(reservationId);
        return Promise.resolve();
      },
    };

    await expect(
      startCheckout(
        {
          customerId: "customer_1",
          items: [{ quantity: 1, variantId: "variant_1" }],
          origin: "https://patche.mx",
        },
        dependencies
      )
    ).rejects.toThrow("D1 unavailable");
    expect(expiredSessions).toEqual(["cs_test"]);
    expect(releasedReservations).toEqual(["reservation_1"]);
  });

  test("recovers an ambiguously created Stripe Session with the same key", async () => {
    const idempotencyKeys: (string | undefined)[] = [];
    let attempts = 0;
    const dependencies: CheckoutDependencies = {
      ...inventoryDependencies,
      createSession(_params, options) {
        attempts += 1;
        idempotencyKeys.push(options.idempotencyKey);
        if (attempts === 1) {
          return Promise.reject(new Error("response lost"));
        }
        return Promise.resolve({ id: "cs_recovered", url: null });
      },
      getShippingRateAmount() {
        return Promise.resolve(1000);
      },
      getVariants() {
        return Promise.resolve([
          {
            id: "variant_1",
            kind: "physical",
            name: "A5",
            priceAmount: 25_000,
            productName: "Cuaderno",
            stock: 2,
          },
        ]);
      },
    };

    await expect(
      startCheckout(
        {
          customerId: "customer_1",
          items: [{ quantity: 1, variantId: "variant_1" }],
          origin: "https://patche.mx",
        },
        dependencies
      )
    ).resolves.toEqual({ id: "cs_recovered", url: null });
    expect(idempotencyKeys).toEqual([
      "checkout:reservation_1",
      "checkout:reservation_1",
    ]);
  });

  test("keeps Stock reserved when Stripe expiration cannot be confirmed", async () => {
    const releasedReservations: string[] = [];
    const dependencies: CheckoutDependencies = {
      ...inventoryDependencies,
      activateInventoryReservation() {
        return Promise.reject(new Error("D1 unavailable"));
      },
      createSession() {
        return Promise.resolve({ id: "cs_active", url: null });
      },
      expireSession() {
        return Promise.reject(new Error("Stripe unavailable"));
      },
      getShippingRateAmount() {
        return Promise.resolve(1000);
      },
      getVariants() {
        return Promise.resolve([
          {
            id: "variant_1",
            kind: "physical",
            name: "A5",
            priceAmount: 25_000,
            productName: "Cuaderno",
            stock: 2,
          },
        ]);
      },
      releaseInventoryReservation(reservationId) {
        releasedReservations.push(reservationId);
        return Promise.resolve();
      },
    };

    await expect(
      startCheckout(
        {
          customerId: "customer_1",
          items: [{ quantity: 1, variantId: "variant_1" }],
          origin: "https://patche.mx",
        },
        dependencies
      )
    ).rejects.toThrow("D1 unavailable");
    expect(releasedReservations).toEqual([]);
  });
});
