import { Button } from "@patche/ui/components/button";
import { Input } from "@patche/ui/components/input";
import { Label } from "@patche/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PasswordInput } from "@/components/password-input";
import { authClient } from "@/lib/auth-client";

function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const [sent, setSent] = useState(false);
  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const { error } = await authClient.signUp.email({
          callbackURL: new URL("/auth/continue", window.location.origin).href,
          email: value.email.trim().toLowerCase(),
          name: value.name.trim(),
          password: value.password,
        });
        if (error) {
          toast.error(
            "No pudimos crear la cuenta. Si ya tienes una, inicia sesión o recupera tu contraseña."
          );
          return;
        }
        setSent(true);
      } catch {
        toast.error("No pudimos crear la cuenta. Inténtalo de nuevo.");
      }
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Escribe un correo válido"),
        name: z
          .string()
          .trim()
          .min(2, "Escribe tu nombre")
          .max(120, "El nombre es demasiado largo"),
        password: z
          .string()
          .min(8, "Usa al menos 8 caracteres")
          .max(128, "Usa como máximo 128 caracteres"),
      }),
    },
  });

  if (sent) {
    return (
      <div className="w-full space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Verifica tu correo
        </h1>
        <output className="block" aria-live="polite">
          Revisa tu correo y abre el enlace para verificar tu cuenta. Si ya
          tienes una cuenta, inicia sesión o recupera tu contraseña.
        </output>
        <Button onClick={onSwitchToSignIn} variant="link">
          Volver a iniciar sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">
        Crear cuenta
      </h1>
      <p className="mb-8 text-slate-600">
        Regístrate con tu correo y una contraseña.
      </p>

      <form
        method="post"
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field name="name">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Nombre</Label>
              <Input
                className="border-field h-11 rounded-xl bg-white px-3.5"
                autoComplete="name"
                id={field.name}
                name={field.name}
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

        <form.Field name="email">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Correo electrónico</Label>
              <Input
                className="border-field h-11 rounded-xl bg-white px-3.5"
                autoComplete="email"
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
              <Label htmlFor={field.name}>Contraseña</Label>
              <PasswordInput
                autoComplete="new-password"
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
              {isSubmitting ? "Creando..." : "Crear cuenta"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-6 flex flex-col items-center gap-1 border-t border-slate-200 pt-6">
        <Button
          className="text-brand-ink"
          onClick={onSwitchToSignIn}
          variant="link"
        >
          ¿Ya tienes cuenta? Inicia sesión
        </Button>
      </div>
    </div>
  );
}

export default SignUpForm;
