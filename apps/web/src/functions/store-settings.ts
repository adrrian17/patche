import { createDb } from "@patche/db";
import { storeSetting } from "@patche/db/schema/settings";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { adminMiddleware } from "@/middleware/admin";

const shippingRateKey = "shipping_rate_amount";

export const getStoreSettings = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const setting = await createDb()
      .select({ value: storeSetting.value })
      .from(storeSetting)
      .where(eq(storeSetting.key, shippingRateKey))
      .get();
    return { shippingRateAmount: Number(setting?.value ?? 0) };
  });

export const updateShippingRate = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({ shippingRateAmount: z.number().int().min(0).max(100_000_000) })
  )
  .handler(async ({ data }) => {
    await createDb()
      .insert(storeSetting)
      .values({
        key: shippingRateKey,
        value: String(data.shippingRateAmount),
      })
      .onConflictDoUpdate({
        set: { value: String(data.shippingRateAmount) },
        target: storeSetting.key,
      });
    return data;
  });
