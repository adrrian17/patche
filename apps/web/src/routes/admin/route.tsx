import { SidebarInset, SidebarProvider } from "@patche/ui/components/sidebar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppSidebar } from "@/components/admin/app-sidebar";
import { SiteHeader } from "@/components/admin/site-header";
import { getUser } from "@/functions/get-user";
import { requireAdmin } from "@/functions/require-admin";
import { clearAdminQueries } from "@/lib/admin-session";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await requireAdmin();

    return { session };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentSession = useQuery({
    initialData: session,
    queryFn: () => getUser(),
    queryKey: ["auth", "session"],
    refetchInterval: 15_000,
    retry: false,
  });

  useEffect(() => {
    document.body.classList.add("admin-shell");
    return () => document.body.classList.remove("admin-shell");
  }, []);

  useEffect(() => {
    if (!currentSession.isError && currentSession.data?.user.role === "admin") {
      return;
    }
    clearAdminQueries(queryClient);
    navigate({ to: "/login" });
  }, [currentSession.data, currentSession.isError, navigate, queryClient]);

  if (currentSession.isError || currentSession.data?.user.role !== "admin") {
    return null;
  }

  return (
    <div className="admin-shell bg-background text-foreground min-h-svh min-w-0">
      <SidebarProvider>
        <AppSidebar collapsible="icon" user={session.user} />
        <SidebarInset className="min-w-0">
          <SiteHeader />
          <div className="min-w-0 px-5 py-8 sm:px-8 lg:px-10">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
              <Outlet />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
