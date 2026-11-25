import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { listStoreCategories } from "@/functions/storefront";

export const Route = createFileRoute("/_auth/dashboard")({
  beforeLoad: ({ context }) => {
    if (context.session.user.role === "admin") {
      throw redirect({ to: "/admin" });
    }
  },
  loader: () => listStoreCategories(),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { session } = Route.useRouteContext();
  const categories = Route.useLoaderData();

  return (
    <div className="storefront bg-paper font-body flex min-h-svh flex-col text-slate-800">
      <SiteHeader categories={categories} user={session.user} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 pt-8 pb-16 sm:px-6 md:pt-12 md:pb-24 lg:px-8">
          <Outlet />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
