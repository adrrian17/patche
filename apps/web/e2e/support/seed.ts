import { z } from "zod";

import { e2eSeedTokenHeader } from "../../src/lib/e2e-seed";
import type {
  E2eSeedAction,
  e2eSeedActionSchema,
} from "../../src/lib/e2e-seed";
import { baseURL } from "./env";

function seedToken(): string {
  const token = process.env.E2E_SEED_TOKEN;
  if (!token) {
    throw new Error("E2E_SEED_TOKEN is not set");
  }
  return token;
}

async function postSeed<T>(
  payload: E2eSeedAction,
  schema: z.ZodType<T>
): Promise<T> {
  const response = await fetch(`${baseURL}/api/e2e/seed`, {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
      [e2eSeedTokenHeader]: seedToken(),
    },
    method: "POST",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `E2E seed ${payload.action} failed (${response.status}): ${body}`
    );
  }
  return schema.parse(await response.json());
}

const idResponseSchema = z.object({ id: z.string() });
const userIdResponseSchema = z.object({ userId: z.string() });
const orderResponseSchema = z.object({
  grantIds: z.array(z.string()),
  orderId: z.string(),
});

export async function promoteToAdmin(email: string): Promise<void> {
  await postSeed({ action: "promote-admin", email }, userIdResponseSchema);
}

export async function removeCredential(email: string): Promise<string> {
  const { userId } = await postSeed(
    { action: "remove-credential", email },
    userIdResponseSchema
  );
  return userId;
}

export async function seedProduct(
  name: string,
  status: "active" | "draft" = "draft"
): Promise<string> {
  const { id } = await postSeed(
    { action: "seed-product", name, status },
    idResponseSchema
  );
  return id;
}

export async function seedVariant(variant: {
  name: string;
  priceAmount: number;
  productId: string;
  kind?: "digital" | "physical";
  digitalFile?: { key: string; name: string };
}): Promise<string> {
  const { id } = await postSeed(
    { action: "seed-variant", ...variant },
    idResponseSchema
  );
  return id;
}

export async function seedStock(
  variantId: string,
  quantity: number,
  reason: "adjusted" | "received" = "received"
): Promise<void> {
  await postSeed(
    { action: "seed-stock", quantity, reason, variantId },
    idResponseSchema
  );
}

type SeedOrderInput = Omit<
  Extract<z.input<typeof e2eSeedActionSchema>, { action: "seed-order" }>,
  "action" | "createdAt" | "customerEmail"
> & { createdAt: Date };

export async function seedOrder(
  customerEmail: string,
  seed: SeedOrderInput
): Promise<{ grantIds: string[]; orderId: string }> {
  return await postSeed(
    {
      action: "seed-order",
      createdAt: seed.createdAt.getTime(),
      customerEmail,
      fulfillmentStatus: seed.fulfillmentStatus ?? "unfulfilled",
      items: seed.items,
      paymentStatus: seed.paymentStatus,
      shipping: seed.shipping,
      shippingAmount: seed.shippingAmount,
    },
    orderResponseSchema
  );
}
