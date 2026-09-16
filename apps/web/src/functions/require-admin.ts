import { createServerFn } from "@tanstack/react-start";

import { toPublicSession } from "@/lib/public-session";
import { adminMiddleware } from "@/middleware/admin";

export const requireAdmin = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(({ context }) => toPublicSession(context.session));
