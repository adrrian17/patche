import { Button } from "@patche/ui/components/button";
import { Input } from "@patche/ui/components/input";
import { Label } from "@patche/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { MagicLinkConfirmation } from "@/components/magic-link-confirmation";
import { requestMagicLink } from "@/functions/request-magic-link";

function SignInForm({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) {
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await requestMagicLink({
          data: {
            email: value.email,
            mode: "sign-in",
          },
        });
        setSentEmail(value.email);
      } catch {
        toast.error("No pudimos enviar el correo. Inténtalo de nuevo.");
      }
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Escribe un correo válido"),
      }),
    },
  });

  if (sentEmail) {
    return (
      <MagicLinkConfirmation
        email={sentEmail}
        onBack={() => setSentEmail(null)}
        onResend={async () => {
          try {
            await requestMagicLink({
              data: { email: sentEmail, mode: "sign-in" },
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
    <div className="mx-auto mt-2 w-full max-w-md p-4">
      <h1 className="mb-2 text-center text-3xl font-bold">Iniciar sesión</h1>
      <p className="text-muted-foreground mb-6 text-center text-sm">
        Te enviaremos un enlace para entrar sin contraseña.
      </p>

      <form
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
