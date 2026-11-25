import { timingSafeEqual } from "node:crypto";

import { z } from "zod";

export const e2eSeedTokenHeader = "x-e2e-token";
const minTokenLength = 16;
const encoder = new TextEncoder();

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  if (leftBytes.byteLength !== rightBytes.byteLength) {
    return false;
  }
  return timingSafeEqual(leftBytes, rightBytes);
}

export function isAuthorizedE2eSeedRequest({
  appEnv,
  expectedToken,
  providedToken,
}: {
  appEnv: string | undefined;
  expectedToken: string | undefined;
  providedToken: string | null | undefined;
}): boolean {
  if (appEnv !== "e2e") {
    return false;
  }
  if (!expectedToken || expectedToken.length < minTokenLength) {
    return false;
  }
  if (!providedToken) {
    return false;
  }
  return constantTimeEqual(expectedToken, providedToken);
}

const seedOrderItemSchema = z.object({
  grant: z.enum(["active", "revoked"]).optional(),
  kind: z.enum(["digital", "physical"]),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitAmount: z.number().int().min(0),
  variantId: z.string().min(1),
  variantName: z.string().min(1),
});

const seedOrderShippingSchema = z.object({
  address: z.object({
    city: z.string(),
    country: z.string(),
    line1: z.string(),
    line2: z.string().nullable(),
    postalCode: z.string(),
    state: z.string(),
  }),
  name: z.string().min(1),
});

export const e2eSeedActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("promote-admin"),
    email: z.email(),
  }),
  z.object({
    action: z.literal("remove-credential"),
    email: z.email(),
  }),
  z.object({
    action: z.literal("seed-product"),
    name: z.string().min(1),
    status: z.enum(["active", "draft"]).default("draft"),
  }),
  z.object({
    action: z.literal("seed-variant"),
    digitalFile: z
      .object({
        key: z.string().min(1),
        name: z.string().min(1),
      })
      .optional(),
    kind: z.enum(["digital", "physical"]).optional(),
    name: z.string().min(1),
    priceAmount: z.number().int().min(0),
    productId: z.string().min(1),
  }),
  z.object({
    action: z.literal("seed-stock"),
    quantity: z
      .number()
      .int()
      .refine((value) => value !== 0),
    reason: z.enum(["adjusted", "received"]).default("received"),
    variantId: z.string().min(1),
  }),
  z.object({
    action: z.literal("seed-order"),
    createdAt: z.number().int(),
    customerEmail: z.email(),
    fulfillmentStatus: z
      .enum(["delivered", "shipped", "unfulfilled"])
      .default("unfulfilled"),
    items: z.array(seedOrderItemSchema).min(1),
    paymentStatus: z.enum(["pending", "succeeded"]),
    shipping: seedOrderShippingSchema.optional(),
    shippingAmount: z.number().int().min(0),
  }),
]);

export type E2eSeedAction = z.infer<typeof e2eSeedActionSchema>;
