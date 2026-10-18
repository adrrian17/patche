import { Button } from "@patche/ui/components/button";
import {
  createFileRoute,
  Outlet,
  redirect,
  useHydrated,
  useNavigate,
} from "@tanstack/react-router";
import { LogOutIcon } from "lucide-react";

import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth/dashboard")({
  beforeLoad: ({ context }) => {
    if (context.session.user.role === "admin") {
      throw redirect({ to: "/admin" });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const hydrated = useHydrated();
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();

  return (
    <div className="storefront bg-paper font-body flex min-h-svh flex-col text-slate-800">
      <SiteHeader user={session.user} />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-10 sm:py-14">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <p className="font-heading text-xl font-semibold text-slate-950">
                  Bienvenido, {session.user.name}
                </p>
                <p className="text-brand text-sm font-semibold tracking-wide uppercase">
                  Mi cuenta
                </p>
                <p className="text-sm text-slate-600">{session.user.email}</p>
              </div>
              <Button
                disabled={!hydrated}
                onClick={() => {
                  authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => navigate({ to: "/login" }),
                    },
                  });
                }}
                size="sm"
                variant="outline"
              >
                <LogOutIcon data-icon="inline-start" />
                Cerrar sesión
              </Button>
            </div>
            <Outlet />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
