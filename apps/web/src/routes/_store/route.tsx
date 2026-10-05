import { Outlet, createFileRoute } from "@tanstack/react-router";

import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/_store")({
  beforeLoad: async () => {
    const session = await getUser();
    return { user: session?.user ?? null };
  },
  component: StoreLayout,
});

function StoreLayout() {
  const { user } = Route.useRouteContext();

  return (
    <div className="storefront bg-paper font-body flex min-h-svh flex-col text-slate-800">
      <SiteHeader user={user} />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
