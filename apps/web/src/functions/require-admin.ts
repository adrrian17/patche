import { createServerFn } from "@tanstack/react-start";

import { adminMiddleware } from "@/middleware/admin";

export const requireAdmin = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(({ context }) => context.session);
