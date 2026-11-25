import { Button } from "@patche/ui/components/button";
import { Input } from "@patche/ui/components/input";
import { Label } from "@patche/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";

import { PasswordInput } from "@/components/password-input";
import { authClient } from "@/lib/auth-client";

function SignInForm({
  next,
  onSwitchToSignUp,
  onForgotPassword,
}: {
  next?: "/cart";
  onSwitchToSignUp: () => void;
  onForgotPassword: () => void;
}) {
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const continuePath = next ? `/auth/continue?next=${next}` : "/auth/continue";
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setAuthMessage(null);
      try {
        const { error: authError } = await authClient.signIn.email({
          callbackURL: new URL(continuePath, window.location.origin).href,
          email: value.email.trim().toLowerCase(),
          password: value.password,
        });
        if (authError) {
          if (authError.code === "EMAIL_NOT_VERIFIED") {
            setAuthMessage(
              "Verifica tu correo para entrar. Te enviamos un nuevo enlace."
            );
          } else if (authError.status === 401) {
            setAuthMessage(
              "Correo o contraseña incorrectos. Inténtalo de nuevo."
            );
          } else {
            setAuthMessage("No pudimos iniciar sesión. Inténtalo de nuevo.");
          }
          return;
        }
        window.location.assign(continuePath);
      } catch {
        setAuthMessage("No pudimos iniciar sesión. Inténtalo de nuevo.");
      }
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Escribe un correo válido"),
        password: z
          .string()
          .min(1, "Escribe tu contraseña")
          .max(128, "Usa como máximo 128 caracteres"),
      }),
    },
  });

  return (
    <div className="w-full">
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">
        Iniciar sesión
      </h1>
      <p className="mb-8 text-slate-600">
        Entra para ver tus pedidos y descargar tus archivos digitales.
      </p>

      {authMessage ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {authMessage}
        </p>
      ) : null}
      <form
        method="post"
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field name="email">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Correo electrónico</Label>
              <Input
                className="border-field h-11 rounded-xl bg-white px-3.5"
                autoComplete="email"
                placeholder="tu@correo.com"
                id={field.name}
                name={field.name}
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
              {field.state.meta.errors.map((error) => (
                <p className="text-sm text-red-700" key={error?.message}>
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor={field.name}>Contraseña</Label>
                <button
                  className="text-brand-ink text-sm font-medium underline-offset-4 hover:underline"
                  onClick={onForgotPassword}
                  type="button"
                >
                  Olvidé mi contraseña
                </button>
              </div>
              <PasswordInput
                autoComplete="current-password"
                id={field.name}
                name={field.name}
                required
                maxLength={128}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
              {field.state.meta.errors.map((error) => (
                <p className="text-sm text-red-700" key={error?.message}>
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              className="h-11 w-full rounded-full text-base"
              disabled={!canSubmit || isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Entrando..." : "Iniciar sesión"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-8 border-t border-slate-200 pt-6 text-center">
        <button
          className="text-slate-600 underline-offset-4 hover:underline"
          onClick={onSwitchToSignUp}
          type="button"
        >
          ¿Aún no tienes cuenta?{" "}
          <span className="text-brand-ink font-semibold">Regístrate</span>
        </button>
      </div>
    </div>
  );
}

export default SignInForm;
