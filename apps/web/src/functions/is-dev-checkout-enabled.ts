import { env } from "@patche/env/server";
import { createServerFn } from "@tanstack/react-start";

export const isDevCheckoutEnabled = createServerFn({ method: "GET" }).handler(
  () => env.DEV_CHECKOUT_ENABLED === "true"
);
