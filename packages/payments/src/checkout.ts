import type Stripe from "stripe";

const stripeMetadataValueMaxLength = 500;
const stripeCheckoutSeconds = 35 * 60;
const checkoutReservationSeconds = 36 * 60;

export interface CheckoutItem {
  quantity: number;
  variantId: string;
}

export interface CheckoutVariant {
  id: string;
  kind: "physical" | "digital";
  priceAmount: number;
  stock: number;
  stripePriceId: string;
}

export interface CheckoutSessionResult {
  id: string;
  url: string | null;
}

export interface CheckoutDependencies {
  activateInventoryReservation: (
    reservationId: string,
    checkoutSessionId: string
  ) => Promise<void>;
  createSession: (
    params: Stripe.Checkout.SessionCreateParams,
    options: Stripe.RequestOptions
  ) => Promise<CheckoutSessionResult>;
  getShippingRateAmount: () => Promise<number>;
  getVariants: (variantIds: string[]) => Promise<CheckoutVariant[]>;
  releaseInventoryReservation: (reservationId: string) => Promise<void>;
  reserveInventory: (
    customerId: string,
    items: CheckoutItem[],
    expiresAt: Date
  ) => Promise<{ expiresAt: Date; id: string }>;
  expireSession: (checkoutSessionId: string) => Promise<void>;
}

export interface StartCheckoutInput {
  customerId: string;
  items: CheckoutItem[];
  origin: string;
}

async function createSessionWithRecovery(
  dependencies: CheckoutDependencies,
  params: Stripe.Checkout.SessionCreateParams,
  idempotencyKey: string
): Promise<CheckoutSessionResult> {
  try {
    return await dependencies.createSession(params, { idempotencyKey });
  } catch {
    // Repeating the exact request with the same key recovers a Session when
    // Stripe accepted the first request but its response was lost.
    return dependencies.createSession(params, { idempotencyKey });
  }
}

export async function startCheckout(
  input: StartCheckoutInput,
  dependencies: CheckoutDependencies
): Promise<CheckoutSessionResult> {
  const metadataItems = JSON.stringify(
    input.items.map((item) => ({
      qty: item.quantity,
      variantId: item.variantId,
    }))
  );
  if (metadataItems.length > stripeMetadataValueMaxLength) {
    throw new Error("El carrito excede el límite permitido");
  }

  const variants = await dependencies.getVariants(
    input.items.map((item) => item.variantId)
  );
  const variantsById = new Map(
    variants.map((variant) => [variant.id, variant] as const)
  );
  const physicalItems: CheckoutItem[] = [];
  function requireVariant(variantId: string) {
    const variant = variantsById.get(variantId);
    if (!variant) {
      throw new Error(`Variant no disponible: ${variantId}`);
    }
    return variant;
  }

  for (const item of input.items) {
    const variant = requireVariant(item.variantId);
    if (variant.kind === "physical") {
      physicalItems.push(item);
      if (variant.stock < item.quantity) {
        throw new Error(`Stock insuficiente para ${variant.id}`);
      }
    }
  }

  const hasPhysicalItem = physicalItems.length > 0;
  const shippingRateAmount = hasPhysicalItem
    ? await dependencies.getShippingRateAmount()
    : 0;
  const stripeExpiresAt = new Date(Date.now() + stripeCheckoutSeconds * 1000);
  const reservationExpiresAt = new Date(
    Date.now() + checkoutReservationSeconds * 1000
  );
  const reservation = hasPhysicalItem
    ? await dependencies.reserveInventory(
        input.customerId,
        physicalItems,
        reservationExpiresAt
      )
    : null;
  const metadata: Stripe.MetadataParam = {
    items: metadataItems,
  };
  if (reservation) {
    metadata.reservationId = reservation.id;
  }
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    cancel_url: `${input.origin}/dashboard`,
    client_reference_id: input.customerId,
    line_items: input.items.map((item) => ({
      metadata: { variantId: item.variantId },
      price: requireVariant(item.variantId).stripePriceId,
      quantity: item.quantity,
    })),
    metadata,
    mode: "payment",
    payment_method_types: ["card"],
    success_url: `${input.origin}/dashboard`,
  };

  if (hasPhysicalItem) {
    sessionParams.expires_at = Math.floor(stripeExpiresAt.getTime() / 1000);
    sessionParams.payment_intent_data = {
      metadata: { reservationId: reservation?.id ?? "" },
    };
    sessionParams.shipping_address_collection = { allowed_countries: ["MX"] };
    sessionParams.shipping_options = [
      {
        shipping_rate_data: {
          display_name: "Envío",
          fixed_amount: { amount: shippingRateAmount, currency: "mxn" },
          type: "fixed_amount",
        },
      },
    ];
  }

  const idempotencyKey = reservation
    ? `checkout:${reservation.id}`
    : `checkout:${input.customerId}:${crypto.randomUUID()}`;
  let session: CheckoutSessionResult | null = null;
  try {
    session = await createSessionWithRecovery(
      dependencies,
      sessionParams,
      idempotencyKey
    );
    if (reservation) {
      await dependencies.activateInventoryReservation(
        reservation.id,
        session.id
      );
    }
    return session;
  } catch (error) {
    if (session && reservation) {
      try {
        await dependencies.expireSession(session.id);
        await dependencies.releaseInventoryReservation(reservation.id);
      } catch {
        // Keep the reservation until its deadline if Stripe expiration cannot
        // be confirmed; releasing it could allow an active Session to oversell.
      }
    }
    throw error;
  }
}
