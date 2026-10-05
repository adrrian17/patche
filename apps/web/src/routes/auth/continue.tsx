import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/auth/continue")({
  validateSearch: z.object({
    error: z.string().optional(),
    next: z.literal("/cart").optional(),
  }),
  beforeLoad: async ({ search }) => {
    if (search.error) {
      throw redirect({ to: "/login", search: { error: search.error } });
    }
    const session = await getUser();

    if (!session) {
      throw redirect({ to: "/login" });
    }

    if (session.user.role === "admin") {
      throw redirect({ to: "/admin" });
    }
    throw redirect({ to: search.next ?? "/dashboard" });
  },
});
