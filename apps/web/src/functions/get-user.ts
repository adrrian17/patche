import { createServerFn } from "@tanstack/react-start";

import { toPublicSession } from "@/lib/public-session";
import { authMiddleware } from "@/middleware/auth";

export const getUser = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(({ context }) =>
    context.session ? toPublicSession(context.session) : null
  );
