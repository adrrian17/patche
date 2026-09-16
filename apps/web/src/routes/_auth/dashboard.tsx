import { Button } from "@patche/ui/components/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOutIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();

  return (
    <main className="flex min-h-svh items-center justify-center bg-white px-6 text-center text-slate-900">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-slate-600">Bienvenido, {session.user.name}</p>
          <p className="text-sm text-slate-500">{session.user.email}</p>
        </div>
        <Button
          onClick={() => {
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => navigate({ to: "/login" }),
              },
            });
          }}
          variant="destructive"
        >
          <LogOutIcon data-icon="inline-start" />
          Cerrar sesión
        </Button>
      </div>
    </main>
  );
}
