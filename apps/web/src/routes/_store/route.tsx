import { Outlet, createFileRoute } from "@tanstack/react-router";

import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { getUser } from "@/functions/get-user";
import { listStoreCategories } from "@/functions/storefront";
import type { StoreCategory } from "@/functions/storefront";

export const Route = createFileRoute("/_store")({
  beforeLoad: async () => {
    const session = await getUser();
    return { user: session?.user ?? null };
  },
  component: StoreLayout,
  // The header links are optional; a failure must never take the page down.
  loader: async (): Promise<StoreCategory[]> => {
    try {
      return await listStoreCategories();
    } catch {
      return [];
    }
  },
});

function StoreLayout() {
  const { user } = Route.useRouteContext();
  const categories = Route.useLoaderData();

  return (
    <div className="storefront bg-paper font-body flex min-h-svh flex-col text-slate-800">
      <SiteHeader categories={categories} user={user} />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
