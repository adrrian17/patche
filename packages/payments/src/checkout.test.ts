import { describe, expect, test } from "bun:test";

import type Stripe from "stripe";

import { startCheckout } from "./checkout";
import type { CheckoutDependencies } from "./checkout";
import { stockFromMovements } from "./stock";

describe("startCheckout", () => {
  test("derived Stock is the sum of Stock Movements", () => {
    expect(stockFromMovements([10, -3, 1, -8])).toBe(0);
    expect(stockFromMovements([5, -2])).toBe(3);
  });

  test("blocks checkout when a Physical Variant has no Stock", async () => {
    let sessionsCreated = 0;
    const dependencies: CheckoutDependencies = {
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
            priceAmount: 25_000,
            stock: stockFromMovements([4, -1, -3]),
            stripePriceId: "price_1",
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

  test("adds MX shipping only when the cart contains a Physical Variant", async () => {
    let capturedParams: Stripe.Checkout.SessionCreateParams | undefined;
    let capturedOptions: Stripe.RequestOptions | undefined;
    const dependencies: CheckoutDependencies = {
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
            kind: "physical",
            priceAmount: 25_000,
            stock: 3,
            stripePriceId: "price_1",
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
        metadata: { variantId: "variant_1" },
        price: "price_1",
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
    expect(capturedOptions?.idempotencyKey).toStartWith("checkout:customer_1:");
  });

  test("does not request shipping for a digital-only cart", async () => {
    let capturedParams: Stripe.Checkout.SessionCreateParams | undefined;
    let shippingRateReads = 0;
    const dependencies: CheckoutDependencies = {
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
            priceAmount: 25_000,
            stock: 0,
            stripePriceId: "price_1",
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
            priceAmount: 100,
            stock: 0,
            stripePriceId: `price_${id}`,
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
});
