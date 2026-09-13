import type Stripe from "stripe";

const stripeMetadataValueMaxLength = 500;

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
  createSession: (
    params: Stripe.Checkout.SessionCreateParams,
    options: Stripe.RequestOptions
  ) => Promise<CheckoutSessionResult>;
  getShippingRateAmount: () => Promise<number>;
  getVariants: (variantIds: string[]) => Promise<CheckoutVariant[]>;
}

export interface StartCheckoutInput {
  customerId: string;
  items: CheckoutItem[];
  origin: string;
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
  let hasPhysicalItem = false;
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
      hasPhysicalItem = true;
      if (variant.stock < item.quantity) {
        throw new Error(`Stock insuficiente para ${variant.id}`);
      }
    }
  }

  const shippingRateAmount = hasPhysicalItem
    ? await dependencies.getShippingRateAmount()
    : 0;
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    cancel_url: `${input.origin}/dashboard`,
    client_reference_id: input.customerId,
    line_items: input.items.map((item) => ({
      metadata: { variantId: item.variantId },
      price: requireVariant(item.variantId).stripePriceId,
      quantity: item.quantity,
    })),
    metadata: {
      items: metadataItems,
    },
    mode: "payment",
    payment_method_types: ["card"],
    success_url: `${input.origin}/dashboard`,
  };

  if (hasPhysicalItem) {
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

  return await dependencies.createSession(sessionParams, {
    idempotencyKey: `checkout:${input.customerId}:${crypto.randomUUID()}`,
  });
}
