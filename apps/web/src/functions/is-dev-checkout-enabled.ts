import { env } from "@patche/env/server";
import { createServerFn } from "@tanstack/react-start";

export const isDevCheckoutEnabled = createServerFn({ method: "GET" }).handler(
  () => env.ALCHEMY_STAGE.startsWith("dev_")
);
