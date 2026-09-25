import { createServerFn } from "@tanstack/react-start";

export const isDevCheckoutEnabled = createServerFn({ method: "GET" }).handler(
  () => import.meta.env.DEV
);
