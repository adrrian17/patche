import { SidebarInset, SidebarProvider } from "@patche/ui/components/sidebar";
import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AppSidebar } from "@/components/admin/app-sidebar";
import { SiteHeader } from "@/components/admin/site-header";
import { requireAdmin } from "@/functions/require-admin";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await requireAdmin();

    return { session };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { session } = Route.useRouteContext();

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
