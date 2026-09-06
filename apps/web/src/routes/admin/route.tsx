import { Outlet, createFileRoute } from "@tanstack/react-router";

import { requireAdmin } from "@/functions/require-admin";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await requireAdmin();

    return { session };
  },
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}
