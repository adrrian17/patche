import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { startCustomerCheckout } from "@/lib/payments.server";
import { authenticatedMiddleware } from "@/middleware/authenticated";

const checkoutItemsSchema = z
  .array(
    z.object({
      quantity: z.number().int().min(1).max(99),
      variantId: z.string().min(1).max(32),
    })
  )
  .min(1)
  .max(10)
  .refine(
    (items) =>
      new Set(items.map((item) => item.variantId)).size === items.length,
    "Cada Variant debe aparecer una sola vez"
  );

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .validator(z.object({ items: checkoutItemsSchema }))
  .handler(async ({ context, data }) => {
    const session = await startCustomerCheckout(
      context.session.user.id,
      data.items
    );
    if (!session.url) {
      throw new Error("Stripe no devolvió una URL de Checkout");
    }

    return { id: session.id, url: session.url };
  });
