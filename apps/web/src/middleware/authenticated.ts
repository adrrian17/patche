import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";

import { authMiddleware } from "@/middleware/auth";

export const authenticatedMiddleware = createMiddleware()
  .middleware([authMiddleware])
  .server(({ context, next }) => {
    if (!context.session) {
      throw redirect({ to: "/login" });
    }

    return next({ context: { session: context.session } });
  });
