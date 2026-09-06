import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";

import { authMiddleware } from "@/middleware/auth";

export const adminMiddleware = createMiddleware()
  .middleware([authMiddleware])
  .server(({ context, next }) => {
    if (!context.session) {
      throw redirect({ to: "/login" });
    }

    const isAdmin =
      "role" in context.session.user && context.session.user.role === "admin";

    if (!isAdmin) {
      throw redirect({ to: "/dashboard" });
    }

    return next({
      context: {
        session: context.session,
      },
    });
  });
