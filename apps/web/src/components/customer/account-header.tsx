import { Button } from "@patche/ui/components/button";
import { useHydrated, useNavigate } from "@tanstack/react-router";
import { LogOutIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import type { PublicUser } from "@/lib/public-session";

export function AccountHeader({ user }: { user: PublicUser }) {
  const hydrated = useHydrated();
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <span
          aria-hidden
          className="bg-brand-ink font-display flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
        >
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">
            Bienvenido, {user.name}
          </p>
          <p className="truncate text-sm text-slate-600">{user.email}</p>
        </div>
      </div>
      <Button
        className="h-10 rounded-full border-slate-300 bg-white px-4"
        disabled={!hydrated}
        onClick={() => {
          authClient.signOut({
            fetchOptions: {
              onSuccess: () => navigate({ to: "/login" }),
            },
          });
        }}
        variant="outline"
      >
        <LogOutIcon data-icon="inline-start" />
        Cerrar sesión
      </Button>
    </div>
  );
}
