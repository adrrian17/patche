import { createFileRoute, redirect } from "@tanstack/react-router";

import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/auth/continue")({
  beforeLoad: async () => {
    const session = await getUser();

    if (!session) {
      throw redirect({ to: "/login" });
    }

    throw redirect({
      to: session.user.role === "admin" ? "/admin" : "/dashboard",
    });
  },
});
