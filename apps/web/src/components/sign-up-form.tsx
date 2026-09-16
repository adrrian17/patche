import { Button } from "@patche/ui/components/button";
import { Input } from "@patche/ui/components/input";
import { Label } from "@patche/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { MagicLinkConfirmation } from "@/components/magic-link-confirmation";
import { requestMagicLink } from "@/functions/request-magic-link";

function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const [sentDetails, setSentDetails] = useState<{
    email: string;
    name: string;
  } | null>(null);
  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await requestMagicLink({
          data: {
            email: value.email,
            mode: "register",
            name: value.name,
          },
        });
        setSentDetails({ email: value.email, name: value.name });
      } catch {
        toast.error("No pudimos enviar el correo. Inténtalo de nuevo.");
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
      }),
    },
  });

  if (sentDetails) {
    return (
      <MagicLinkConfirmation
        email={sentDetails.email}
        onBack={() => setSentDetails(null)}
        onResend={async () => {
          try {
            await requestMagicLink({
              data: {
                email: sentDetails.email,
                mode: "register",
                name: sentDetails.name,
              },
            });
            return true;
          } catch {
            toast.error("No pudimos reenviar el correo. Inténtalo de nuevo.");
            return false;
          }
        }}
      />
    );
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      <h1 className="mb-2 text-center text-3xl font-bold">Crear cuenta</h1>
      <p className="text-muted-foreground mb-6 text-center text-sm">
        Regístrate con tu correo y recibe un enlace para entrar.
      </p>

      <form
        className="space-y-4"
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
                autoComplete="name"
                id={field.name}
                name={field.name}
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
              {isSubmitting ? "Enviando..." : "Enviar enlace"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-4 text-center">
        <Button
          className="text-teal-700 hover:text-teal-800"
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
