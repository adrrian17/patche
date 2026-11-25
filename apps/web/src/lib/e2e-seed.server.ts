import { createDb } from "@patche/db";
import { account, user } from "@patche/db/schema/auth";
import { product, variant } from "@patche/db/schema/catalog";
import { stockMovement } from "@patche/db/schema/inventory";
import { downloadGrant, order, orderItem } from "@patche/db/schema/orders";
import { and, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { nanoid } from "nanoid";

import type { E2eSeedAction } from "./e2e-seed";

export type E2eSeedPayload =
  | { userId: string }
  | { id: string; slug: string }
  | { id: string }
  | { grantIds: string[]; orderId: string };

export type E2eSeedResult =
  | { data: E2eSeedPayload; ok: true }
  | { message: string; ok: false; status: number };

async function promoteAdmin(email: string): Promise<E2eSeedResult> {
  const updated = await createDb()
    .update(user)
    .set({ role: "admin" })
    .where(eq(user.email, email))
    .returning({ id: user.id })
    .get();
  if (!updated) {
    return {
      message: `No user with email ${email}`,
      ok: false,
      status: 404,
    };
  }
  return { data: { userId: updated.id }, ok: true };
}

async function removeCredential(email: string): Promise<E2eSeedResult> {
  const db = createDb();
  const customer = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .get();
  if (!customer) {
    return {
      message: `No user with email ${email}`,
      ok: false,
      status: 404,
    };
  }
  await db
    .delete(account)
    .where(
      and(eq(account.userId, customer.id), eq(account.providerId, "credential"))
    );
  return { data: { userId: customer.id }, ok: true };
}

async function seedProduct(
  action: Extract<E2eSeedAction, { action: "seed-product" }>
): Promise<E2eSeedResult> {
  const id = nanoid();
  const slug = `e2e-${id}`;
  await createDb().insert(product).values({
    id,
    name: action.name,
    slug,
    status: action.status,
  });
  return { data: { id, slug }, ok: true };
}

async function seedVariant(
  action: Extract<E2eSeedAction, { action: "seed-variant" }>
): Promise<E2eSeedResult> {
  const id = nanoid();
  await createDb()
    .insert(variant)
    .values({
      digitalFileKey: action.digitalFile?.key ?? null,
      digitalFileName: action.digitalFile?.name ?? null,
      id,
      kind: action.kind ?? (action.digitalFile ? "digital" : "physical"),
      name: action.name,
      priceAmount: action.priceAmount,
      productId: action.productId,
      sku: `E2E-${id}`,
    });
  return { data: { id }, ok: true };
}

async function seedStock(
  action: Extract<E2eSeedAction, { action: "seed-stock" }>
): Promise<E2eSeedResult> {
  const id = nanoid();
  await createDb().insert(stockMovement).values({
    id,
    note: "E2E",
    quantity: action.quantity,
    reason: action.reason,
    variantId: action.variantId,
  });
  return { data: { id }, ok: true };
}

async function seedOrder(
  action: Extract<E2eSeedAction, { action: "seed-order" }>
): Promise<E2eSeedResult> {
  const db = createDb();
  const customer = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, action.customerEmail))
    .get();
  if (!customer) {
    return {
      message: `No user with email ${action.customerEmail}`,
      ok: false,
      status: 404,
    };
  }

  const orderId = nanoid();
  const subtotalAmount = action.items.reduce(
    (sum, item) => sum + item.unitAmount * item.quantity,
    0
  );
  const createdAt = new Date(action.createdAt);
  const grantIds: string[] = [];
  const orderInsert = db.insert(order).values({
    createdAt,
    customerId: customer.id,
    fulfillmentStatus: action.fulfillmentStatus,
    id: orderId,
    paymentStatus: action.paymentStatus,
    shippingAddress: action.shipping?.address ?? null,
    shippingAmount: action.shippingAmount,
    shippingName: action.shipping?.name ?? null,
    stripeCheckoutSessionId: `cs_test_e2e_${orderId}`,
    subtotalAmount,
    totalAmount: subtotalAmount + action.shippingAmount,
    updatedAt: createdAt,
  });
  const itemStatements: BatchItem<"sqlite">[] = [];

  for (const item of action.items) {
    const orderItemId = nanoid();
    itemStatements.push(
      db.insert(orderItem).values({
        id: orderItemId,
        kind: item.kind,
        orderId,
        productName: item.productName,
        quantity: item.quantity,
        unitAmount: item.unitAmount,
        variantId: item.variantId,
        variantName: item.variantName,
      })
    );
    if (item.grant) {
      const grantId = nanoid();
      grantIds.push(grantId);
      itemStatements.push(
        db.insert(downloadGrant).values({
          customerId: customer.id,
          id: grantId,
          orderItemId,
          revokedAt: item.grant === "revoked" ? new Date() : null,
          variantId: item.variantId,
        })
      );
    }
  }

  await db.batch([orderInsert, ...itemStatements]);
  return { data: { grantIds, orderId }, ok: true };
}

export async function runE2eSeedAction(
  action: E2eSeedAction
): Promise<E2eSeedResult> {
  switch (action.action) {
    case "promote-admin": {
      return await promoteAdmin(action.email);
    }
    case "remove-credential": {
      return await removeCredential(action.email);
    }
    case "seed-product": {
      return await seedProduct(action);
    }
    case "seed-variant": {
      return await seedVariant(action);
    }
    case "seed-stock": {
      return await seedStock(action);
    }
    case "seed-order": {
      return await seedOrder(action);
    }
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
