import { Button } from "@patche/ui/components/button";
import { Label } from "@patche/ui/components/label";
import {
  createFileRoute,
  Link,
  useHydrated,
  useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AuthShell } from "@/components/auth-shell";
import { PasswordInput } from "@/components/password-input";
import { getHomeImages } from "@/functions/home-images";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({
    error: z.string().optional(),
    token: z.string().min(1).optional(),
  }),
  loader: () => getHomeImages(),
  component: ResetPassword,
});

function ResetPassword() {
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const { token, error: linkError } = Route.useSearch();
  const homeImages = Route.useLoaderData();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalidLink = !token || Boolean(linkError);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || pending) {
      return;
    }
    const newPassword = String(
      new FormData(event.currentTarget).get("password")
    );
    setPending(true);
    setError(null);
    try {
      const { error: authError } = await authClient.resetPassword({
        newPassword,
        token,
      });
      if (authError) {
        setError(
          authError.code === "INVALID_TOKEN"
            ? "El enlace ya no es válido. Solicita una nueva recuperación."
            : "No pudimos guardar la contraseña. Inténtalo de nuevo más tarde."
        );
      } else {
        toast.success(
          "Contraseña guardada. Inicia sesión con tu nueva contraseña."
        );
        await navigate({ to: "/login" });
      }
    } catch {
      setError("No pudimos guardar la contraseña. Inténtalo de nuevo.");
    }
    setPending(false);
  }

  return (
    <AuthShell image={homeImages.hero}>
      <fieldset className="space-y-5" disabled={!hydrated}>
        <legend className="sr-only">Nueva contraseña</legend>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Restablecer contraseña
        </h1>
        {invalidLink ? (
          <p
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            El enlace ya no es válido. Solicita una nueva recuperación.
          </p>
        ) : (
          <form method="post" className="space-y-4" onSubmit={handleSubmit}>
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <PasswordInput
              autoComplete="new-password"
              id="new-password"
              maxLength={128}
              minLength={8}
              name="password"
              required
            />
            <p className="text-muted-foreground text-sm">
              Usa entre 8 y 128 caracteres.
            </p>
            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              className="h-11 w-full rounded-full text-base"
              disabled={pending}
              type="submit"
            >
              {pending ? "Guardando..." : "Guardar contraseña"}
            </Button>
          </form>
        )}
        <Link
          className="text-brand-ink block text-sm font-semibold underline-offset-4 hover:underline"
          to="/login"
        >
          Volver a iniciar sesión
        </Link>
      </fieldset>
    </AuthShell>
  );
}
