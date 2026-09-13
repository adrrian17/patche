import { createDb } from "@patche/db";
import { product, variant } from "@patche/db/schema/catalog";
import { stockMovement } from "@patche/db/schema/inventory";
import {
  downloadGrant,
  order,
  orderItem,
  stripeEvent,
} from "@patche/db/schema/orders";
import { storeSetting } from "@patche/db/schema/settings";
import { env } from "@patche/env/server";
import { createStripeClient, startCheckout } from "@patche/payments";
import type {
  CheckoutItem,
  Stripe,
  WebhookStore,
  WebhookTransaction,
} from "@patche/payments";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

const checkoutMetadataSchema = z.array(
  z.object({
    qty: z.number().int().positive(),
    variantId: z.string().min(1),
  })
);

type Database = ReturnType<typeof createDb>;
type BatchQuery = Parameters<Database["batch"]>[0][number];

function getExpandableId(value: string | { id: string } | null): string | null {
  // Stripe models expandable fields as a documented string-or-object union.
  // oxlint-disable-next-line anti-slop/no-runtime-typeof
  if (typeof value === "string") {
    return value;
  }
  return value?.id ?? null;
}

function readCheckoutItems(session: Stripe.Checkout.Session): CheckoutItem[] {
  const rawItems = session.metadata?.items;
  if (!rawItems) {
    throw new Error("Checkout Session sin Items");
  }

  return checkoutMetadataSchema.parse(JSON.parse(rawItems)).map((item) => ({
    quantity: item.qty,
    variantId: item.variantId,
  }));
}

function getShippingAddress(
  session: Stripe.Checkout.Session
): typeof order.$inferInsert.shippingAddress {
  const details = session.collected_information?.shipping_details;
  if (!details) {
    return null;
  }

  return {
    city: details.address.city,
    country: details.address.country,
    line1: details.address.line1,
    line2: details.address.line2,
    postalCode: details.address.postal_code,
    state: details.address.state,
  };
}

function requireCheckoutSessionData(session: Stripe.Checkout.Session) {
  const customerId = session.client_reference_id;
  const paymentIntentId = getExpandableId(session.payment_intent);
  if (!(customerId && paymentIntentId)) {
    throw new Error("Checkout Session sin Customer o Payment Intent");
  }
  if (session.currency !== "mxn") {
    throw new Error("Checkout Session con moneda inválida");
  }

  return { customerId, items: readCheckoutItems(session), paymentIntentId };
}

async function loadOrderVariants(db: Database, items: CheckoutItem[]) {
  const variants = await db
    .select({
      id: variant.id,
      kind: variant.kind,
      name: variant.name,
      productName: product.name,
    })
    .from(variant)
    .innerJoin(product, eq(variant.productId, product.id))
    .where(
      inArray(
        variant.id,
        items.map((item) => item.variantId)
      )
    );
  const variantsById = new Map(
    variants.map((entry) => [entry.id, entry] as const)
  );
  if (variantsById.size !== items.length) {
    throw new Error("Checkout Session contiene Variants desconocidas");
  }

  return { variants, variantsById };
}

interface PurchasedLineItem {
  productName: string | null;
  unitAmount: number;
  variantName: string | null;
}

async function loadPurchasedLineItems(
  stripe: Stripe,
  sessionId: string,
  items: CheckoutItem[]
) {
  const response = await stripe.checkout.sessions.listLineItems(sessionId, {
    limit: 100,
  });
  const expectedItems = new Map(
    items.map((item) => [item.variantId, item] as const)
  );
  const purchasedItems = new Map<string, PurchasedLineItem>();

  for (const lineItem of response.data) {
    const variantId = lineItem.metadata?.variantId;
    if (!variantId) {
      throw new Error("Checkout Session contiene una Line Item sin Variant");
    }
    const expectedItem = expectedItems.get(variantId);
    if (!(expectedItem && lineItem.price)) {
      throw new Error("Checkout Session contiene una Line Item inválida");
    }
    const unitAmount = lineItem.price.unit_amount;
    if (
      lineItem.quantity !== expectedItem.quantity ||
      lineItem.currency !== "mxn" ||
      unitAmount === null ||
      !Number.isInteger(unitAmount)
    ) {
      throw new Error("Checkout Session no coincide con sus Items");
    }
    if (purchasedItems.has(variantId)) {
      throw new Error(`Checkout Session repite la Variant: ${variantId}`);
    }

    purchasedItems.set(variantId, {
      productName: lineItem.description,
      unitAmount,
      variantName: lineItem.price.nickname,
    });
  }

  if (purchasedItems.size !== items.length) {
    throw new Error("Checkout Session no contiene todas sus Items");
  }

  return purchasedItems;
}

function queueOrderRecord(
  db: Database,
  queries: BatchQuery[],
  session: Stripe.Checkout.Session,
  customerId: string,
  paymentIntentId: string,
  onlyDigital: boolean
) {
  const paymentStatus =
    session.payment_status === "paid" ? "succeeded" : "pending";
  const orderId = nanoid();
  queries.push(
    db.insert(order).values({
      currency: "mxn",
      customerId,
      fulfillmentStatus:
        onlyDigital && paymentStatus === "succeeded"
          ? "delivered"
          : "unfulfilled",
      id: orderId,
      paymentMethodType: session.payment_method_types?.[0] ?? null,
      paymentStatus,
      shippingAddress: getShippingAddress(session),
      shippingAmount: session.total_details?.amount_shipping ?? 0,
      shippingName:
        session.collected_information?.shipping_details?.name ?? null,
      stripeCheckoutSessionId: session.id,
      stripeCustomerId: getExpandableId(session.customer),
      stripePaymentIntentId: paymentIntentId,
      subtotalAmount: session.amount_subtotal ?? 0,
      totalAmount: session.amount_total ?? 0,
    })
  );

  return orderId;
}

function queueOrderEffects(
  db: Database,
  queries: BatchQuery[],
  orderId: string,
  customerId: string,
  items: CheckoutItem[],
  variantsById: Awaited<ReturnType<typeof loadOrderVariants>>["variantsById"],
  purchasedItems: Awaited<ReturnType<typeof loadPurchasedLineItems>>
) {
  const itemValues = items.map((item) => {
    const itemVariant = variantsById.get(item.variantId);
    const purchasedItem = purchasedItems.get(item.variantId);
    if (!(itemVariant && purchasedItem)) {
      throw new Error(`Variant desconocida: ${item.variantId}`);
    }

    return {
      id: nanoid(),
      kind: itemVariant.kind,
      orderId,
      productName: purchasedItem.productName ?? itemVariant.productName,
      quantity: item.quantity,
      unitAmount: purchasedItem.unitAmount,
      variantId: itemVariant.id,
      variantName: purchasedItem.variantName ?? itemVariant.name,
    };
  });
  const itemIdsByVariant = new Map(
    itemValues.map((item) => [item.variantId, item.id] as const)
  );
  const digitalGrants: (typeof downloadGrant.$inferInsert)[] = [];
  const physicalMovements: (typeof stockMovement.$inferInsert)[] = [];
  for (const item of itemValues) {
    if (item.kind === "physical") {
      physicalMovements.push({
        orderId,
        quantity: -item.quantity,
        reason: "sold",
        variantId: item.variantId,
      });
      continue;
    }

    const orderItemId = itemIdsByVariant.get(item.variantId);
    if (!orderItemId) {
      throw new Error("No se pudo relacionar el Download Grant");
    }
    digitalGrants.push({
      customerId,
      orderItemId,
      variantId: item.variantId,
    });
  }

  queries.push(db.insert(orderItem).values(itemValues));
  if (physicalMovements.length > 0) {
    queries.push(db.insert(stockMovement).values(physicalMovements));
  }
  if (digitalGrants.length > 0) {
    queries.push(db.insert(downloadGrant).values(digitalGrants));
  }
}

async function createOrderFromSession(
  db: Database,
  queries: BatchQuery[],
  session: Stripe.Checkout.Session,
  stripe: Stripe
) {
  const existingOrder = await db
    .select({ id: order.id })
    .from(order)
    .where(eq(order.stripeCheckoutSessionId, session.id))
    .get();
  if (existingOrder) {
    return;
  }

  const { customerId, items, paymentIntentId } =
    requireCheckoutSessionData(session);
  const [{ variants, variantsById }, purchasedItems] = await Promise.all([
    loadOrderVariants(db, items),
    loadPurchasedLineItems(stripe, session.id, items),
  ]);
  const orderId = queueOrderRecord(
    db,
    queries,
    session,
    customerId,
    paymentIntentId,
    variants.every((entry) => entry.kind === "digital")
  );
  queueOrderEffects(
    db,
    queries,
    orderId,
    customerId,
    items,
    variantsById,
    purchasedItems
  );
}

function createWebhookTransaction(
  db: Database,
  queries: BatchQuery[],
  stripe: Stripe
): WebhookTransaction {
  return {
    async createOrder(session) {
      await createOrderFromSession(db, queries, session, stripe);
    },
    async markPaymentFailed(paymentIntentId) {
      const matchingOrder = await db
        .select({ id: order.id })
        .from(order)
        .where(eq(order.stripePaymentIntentId, paymentIntentId))
        .get();
      if (!matchingOrder) {
        throw new Error("Order pendiente para Payment Intent fallido");
      }

      queries.push(
        db
          .update(order)
          .set({ paymentStatus: "failed" })
          .where(
            and(
              eq(order.id, matchingOrder.id),
              ne(order.paymentStatus, "refunded")
            )
          )
      );
    },
    async markRefunded(paymentIntentId) {
      const matchingOrder = await db
        .select({ id: order.id })
        .from(order)
        .where(eq(order.stripePaymentIntentId, paymentIntentId))
        .get();
      if (!matchingOrder) {
        throw new Error("Order pendiente para Charge reembolsado");
      }

      queries.push(
        db
          .update(order)
          .set({ paymentStatus: "refunded" })
          .where(eq(order.id, matchingOrder.id))
      );
      const itemIds = await db
        .select({ id: orderItem.id })
        .from(orderItem)
        .where(eq(orderItem.orderId, matchingOrder.id));
      if (itemIds.length === 0) {
        return;
      }
      queries.push(
        db
          .update(downloadGrant)
          .set({ revokedAt: new Date() })
          .where(
            and(
              inArray(
                downloadGrant.orderItemId,
                itemIds.map((item) => item.id)
              ),
              isNull(downloadGrant.revokedAt)
            )
          )
      );
    },
  };
}

export function getStripeClient(): Stripe {
  return createStripeClient(env.STRIPE_SECRET_KEY);
}

export function createWebhookStore(): WebhookStore {
  const db = createDb();
  const stripe = getStripeClient();

  return {
    async runOnce(eventId, eventType, effect) {
      const existingEvent = await db
        .select({ id: stripeEvent.id })
        .from(stripeEvent)
        .where(eq(stripeEvent.id, eventId))
        .get();
      if (existingEvent) {
        return false;
      }

      const queries: BatchQuery[] = [];
      await effect(createWebhookTransaction(db, queries, stripe));
      const eventQuery = db
        .insert(stripeEvent)
        .values({ id: eventId, type: eventType });
      // SAFETY: eventQuery guarantees the tuple has the first item required by db.batch.
      const batch = [eventQuery, ...queries] as [BatchQuery, ...BatchQuery[]];
      try {
        await db.batch(batch);
        return true;
      } catch (error) {
        const concurrentlyProcessed = await db
          .select({ id: stripeEvent.id })
          .from(stripeEvent)
          .where(eq(stripeEvent.id, eventId))
          .get();
        if (concurrentlyProcessed) {
          return false;
        }
        throw error;
      }
    },
  };
}

export async function startCustomerCheckout(
  customerId: string,
  items: CheckoutItem[]
) {
  const db = createDb();
  const stripe = getStripeClient();

  return await startCheckout(
    {
      customerId,
      items,
      origin: env.BETTER_AUTH_URL,
    },
    {
      createSession: (params, options) =>
        stripe.checkout.sessions.create(params, options),
      async getShippingRateAmount() {
        const setting = await db
          .select({ value: storeSetting.value })
          .from(storeSetting)
          .where(eq(storeSetting.key, "shipping_rate_amount"))
          .get();
        const amount = Number(setting?.value ?? 0);
        if (!(Number.isInteger(amount) && amount >= 0)) {
          throw new Error("Shipping Rate inválido");
        }
        return amount;
      },
      async getVariants(variantIds) {
        if (variantIds.length === 0) {
          return [];
        }
        return await db
          .select({
            id: variant.id,
            kind: variant.kind,
            priceAmount: variant.priceAmount,
            stock: sql<number>`coalesce(sum(${stockMovement.quantity}), 0)`,
            stripePriceId: variant.stripePriceId,
          })
          .from(variant)
          .innerJoin(product, eq(variant.productId, product.id))
          .leftJoin(stockMovement, eq(stockMovement.variantId, variant.id))
          .where(
            and(
              inArray(variant.id, variantIds),
              eq(product.status, "active"),
              isNull(variant.archivedAt)
            )
          )
          .groupBy(variant.id);
      },
    }
  );
}
