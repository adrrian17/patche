import { Button } from "@patche/ui/components/button";
import { Input } from "@patche/ui/components/input";
import { Label } from "@patche/ui/components/label";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    setPending(true);
    setError(null);
    try {
      const { error: authError } = await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: new URL("/reset-password", window.location.origin).href,
      });
      if (authError) {
        setError("No pudimos enviar el correo. Inténtalo de nuevo más tarde.");
      } else {
        setSent(true);
      }
    } catch {
      setError("No pudimos enviar el correo. Inténtalo de nuevo.");
    }
    setPending(false);
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-4">
      <h1 className="text-center text-3xl font-bold">Cambiar contraseña</h1>
      <p className="text-muted-foreground text-sm">
        Escribe tu correo y te enviaremos un enlace para cambiar tu contraseña.
      </p>
      {sent ? (
        <output className="block" aria-live="polite">
          Si existe una cuenta con ese correo, recibirás un enlace para crear o
          restablecer tu contraseña. Revisa también spam.
        </output>
      ) : (
        <form method="post" className="space-y-4" onSubmit={submit}>
          <Label htmlFor="recovery-email">Correo electrónico</Label>
          <Input
            autoComplete="email"
            id="recovery-email"
            name="email"
            required
            type="email"
          />
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <Button className="w-full" disabled={pending} type="submit">
            {pending ? "Enviando..." : "Enviar"}
          </Button>
        </form>
      )}
      <Button className="w-full" onClick={onBack} variant="link">
        Volver a iniciar sesión
      </Button>
    </div>
  );
}
