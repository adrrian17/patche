import { describe, expect, test } from "bun:test";

import { e2eSeedActionSchema, isAuthorizedE2eSeedRequest } from "./e2e-seed";

const validToken = "e2e-token-0123456789abcdef";

describe("isAuthorizedE2eSeedRequest", () => {
  test("accepts requests only in e2e with a matching token", () => {
    expect(
      isAuthorizedE2eSeedRequest({
        appEnv: "e2e",
        expectedToken: validToken,
        providedToken: validToken,
      })
    ).toBe(true);
  });

  test("refuses every non-e2e environment even with a matching token", () => {
    for (const appEnv of [
      "production",
      "preview",
      "development",
      undefined,
      "",
    ]) {
      expect(
        isAuthorizedE2eSeedRequest({
          appEnv,
          expectedToken: validToken,
          providedToken: validToken,
        })
      ).toBe(false);
    }
  });

  test("refuses missing or short server tokens", () => {
    for (const expectedToken of [undefined, "", "too-short"]) {
      expect(
        isAuthorizedE2eSeedRequest({
          appEnv: "e2e",
          expectedToken,
          providedToken: expectedToken ?? "",
        })
      ).toBe(false);
    }
  });

  test("refuses missing, different-length, or mismatched caller tokens", () => {
    for (const providedToken of [
      null,
      undefined,
      "",
      `${validToken}x`,
      "e2e-token-0123456789abcdee",
    ]) {
      expect(
        isAuthorizedE2eSeedRequest({
          appEnv: "e2e",
          expectedToken: validToken,
          providedToken,
        })
      ).toBe(false);
    }
  });
});

describe("e2eSeedActionSchema", () => {
  test("parses every supported action with defaults", () => {
    expect(
      e2eSeedActionSchema.parse({
        action: "promote-admin",
        email: "admin@e2e.patche.test",
      })
    ).toEqual({
      action: "promote-admin",
      email: "admin@e2e.patche.test",
    });

    expect(
      e2eSeedActionSchema.parse({
        action: "remove-credential",
        email: "legacy@e2e.patche.test",
      })
    ).toEqual({
      action: "remove-credential",
      email: "legacy@e2e.patche.test",
    });

    expect(
      e2eSeedActionSchema.parse({
        action: "seed-product",
        name: "Libreta",
      })
    ).toEqual({
      action: "seed-product",
      name: "Libreta",
      status: "draft",
    });

    expect(
      e2eSeedActionSchema.parse({
        action: "seed-variant",
        name: "Tapa dura",
        priceAmount: 25_000,
        productId: "prod_1",
      })
    ).toEqual({
      action: "seed-variant",
      name: "Tapa dura",
      priceAmount: 25_000,
      productId: "prod_1",
    });

    expect(
      e2eSeedActionSchema.parse({
        action: "seed-stock",
        quantity: 3,
        variantId: "var_1",
      })
    ).toEqual({
      action: "seed-stock",
      quantity: 3,
      reason: "received",
      variantId: "var_1",
    });

    expect(
      e2eSeedActionSchema.parse({
        action: "seed-order",
        createdAt: 1_700_000_000_000,
        customerEmail: "customer@e2e.patche.test",
        items: [
          {
            grant: "active",
            kind: "digital",
            productName: "Planner",
            quantity: 1,
            unitAmount: 9900,
            variantId: "var_1",
            variantName: "PDF",
          },
        ],
        paymentStatus: "succeeded",
        shippingAmount: 0,
      })
    ).toMatchObject({
      action: "seed-order",
      fulfillmentStatus: "unfulfilled",
    });
  });

  test("rejects unknown actions and invalid inputs", () => {
    expect(
      e2eSeedActionSchema.safeParse({ action: "drop-database" }).success
    ).toBe(false);
    expect(
      e2eSeedActionSchema.safeParse({
        action: "seed-stock",
        quantity: 0,
        variantId: "var_1",
      }).success
    ).toBe(false);
    expect(
      e2eSeedActionSchema.safeParse({
        action: "seed-order",
        createdAt: 1_700_000_000_000,
        customerEmail: "not-an-email",
        items: [],
        paymentStatus: "succeeded",
        shippingAmount: 0,
      }).success
    ).toBe(false);
  });
});
