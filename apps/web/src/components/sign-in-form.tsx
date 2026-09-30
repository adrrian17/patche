import { Button } from "@patche/ui/components/button";
import { Input } from "@patche/ui/components/input";
import { Label } from "@patche/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

function SignInForm({
  onSwitchToSignUp,
  onForgotPassword,
}: {
  onSwitchToSignUp: () => void;
  onForgotPassword: () => void;
}) {
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setAuthMessage(null);
      try {
        const { error: authError } = await authClient.signIn.email({
          callbackURL: new URL("/auth/continue", window.location.origin).href,
          email: value.email.trim().toLowerCase(),
          password: value.password,
        });
        if (authError) {
          setAuthMessage(
            authError.code === "EMAIL_NOT_VERIFIED"
              ? "Verifica tu correo para entrar. Te enviamos un nuevo enlace."
              : "Correo o contraseña incorrectos. Inténtalo de nuevo."
          );
          return;
        }
        window.location.assign("/auth/continue");
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
    <div className="mx-auto mt-2 w-full max-w-md p-4">
      <h1 className="mb-2 text-center text-3xl font-bold">Iniciar sesión</h1>
      <p className="text-muted-foreground mb-6 text-center text-sm">
        Entra con tu correo y contraseña.
      </p>

      {authMessage ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {authMessage}
        </p>
      ) : null}
      <form
        method="post"
        className="space-y-4"
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
                autoComplete="email"
                id={field.name}
                name={field.name}
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
              {field.state.meta.errors.map((error) => (
                <p className="text-sm text-red-500" key={error?.message}>
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Contraseña</Label>
              <Input
                autoComplete="current-password"
                id={field.name}
                name={field.name}
                type="password"
                required
                maxLength={128}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
              {field.state.meta.errors.map((error) => (
                <p className="text-sm text-red-500" key={error?.message}>
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
              className="w-full"
              disabled={!canSubmit || isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Entrando..." : "Iniciar sesión"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-4 text-center">
        <Button onClick={onForgotPassword} variant="link">
          Olvidé mi contraseña
        </Button>
        <Button
          className="text-teal-700 hover:text-teal-800"
          onClick={onSwitchToSignUp}
          variant="link"
        >
          ¿Aún no tienes cuenta? Regístrate
        </Button>
      </div>
    </div>
  );
}

export default SignInForm;
