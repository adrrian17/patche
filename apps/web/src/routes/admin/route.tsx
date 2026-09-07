import { Button } from "@patche/ui/components/button";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import {
  BoxesIcon,
  LayoutDashboardIcon,
  ListTreeIcon,
  NotebookTabsIcon,
  PackageSearchIcon,
  Settings2Icon,
  StoreIcon,
} from "lucide-react";

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
    <div className="admin-shell bg-background text-foreground min-h-svh">
      <aside className="border-border/70 bg-card/75 border-b px-4 py-3 backdrop-blur md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-r md:border-b-0 md:px-5 md:py-7">
        <div className="flex items-center justify-between md:flex-col md:items-stretch md:gap-8">
          <Link className="flex items-center gap-3" to="/admin">
            <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full">
              <StoreIcon aria-hidden="true" />
            </span>
            <span>
              <span className="block font-serif text-xl leading-none">
                Patche
              </span>
              <span className="text-muted-foreground font-mono text-[0.58rem] tracking-[0.2em] uppercase">
                Administración
              </span>
            </span>
          </Link>
          <nav
            aria-label="Administración"
            className="hidden flex-col gap-1 md:flex"
          >
            {adminLinks.map(({ icon: Icon, label, to }) => (
              <Button
                className="data-[active=true]:bg-accent justify-start"
                key={to}
                render={
                  <Link
                    activeOptions={{ exact: to === "/admin" }}
                    activeProps={{ "data-active": true }}
                    to={to}
                  />
                }
                variant="ghost"
              >
                <Icon data-icon="inline-start" />
                {label}
              </Button>
            ))}
          </nav>
          <div className="border-border/70 hidden border-t pt-5 md:block">
            <p className="truncate text-sm font-medium">{session.user.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {session.user.email}
            </p>
          </div>
        </div>
        <nav
          aria-label="Administración móvil"
          className="mt-3 flex gap-1 overflow-x-auto pb-1 md:hidden"
        >
          {adminLinks.map(({ icon: Icon, label, to }) => (
            <Button
              className="data-[active=true]:bg-accent shrink-0"
              key={to}
              render={
                <Link
                  activeOptions={{ exact: to === "/admin" }}
                  activeProps={{ "data-active": true }}
                  to={to}
                />
              }
              size="sm"
              variant="ghost"
            >
              <Icon data-icon="inline-start" />
              {label}
            </Button>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 px-5 py-8 sm:px-8 md:ml-64 md:px-10 md:py-10 lg:px-14">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

const adminLinks = [
  { icon: LayoutDashboardIcon, label: "Resumen", to: "/admin" },
  { icon: NotebookTabsIcon, label: "Productos", to: "/admin/products" },
  { icon: BoxesIcon, label: "Inventario", to: "/admin/inventory" },
  { icon: PackageSearchIcon, label: "Órdenes", to: "/admin/orders" },
  { icon: ListTreeIcon, label: "Categorías", to: "/admin/categories" },
  { icon: Settings2Icon, label: "Ajustes", to: "/admin/settings" },
] as const;
