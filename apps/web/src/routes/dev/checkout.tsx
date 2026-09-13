import { Button } from "@patche/ui/components/button";
import { Input } from "@patche/ui/components/input";
import { Label } from "@patche/ui/components/label";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { createCheckoutSession } from "@/functions/create-checkout-session";
import { getUser } from "@/functions/get-user";
import { isDevCheckoutEnabled } from "@/functions/is-dev-checkout-enabled";

export const Route = createFileRoute("/dev/checkout")({
  beforeLoad: async () => {
    if (!(await isDevCheckoutEnabled())) {
      throw notFound();
    }
    if (!(await getUser())) {
      throw redirect({ to: "/login" });
    }
  },
  component: DevCheckoutPage,
});

function DevCheckoutPage() {
  const [errorMessage, setErrorMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(undefined);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const variantId = String(form.get("variantId") ?? "").trim();
    const quantity = Number(form.get("quantity"));

    try {
      const session = await createCheckoutSession({
        data: { items: [{ quantity, variantId }] },
      });
      window.location.assign(session.url);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo iniciar Checkout"
      );
      setPending(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          Solo desarrollo
        </p>
        <h1 className="text-2xl font-semibold">Probar Stripe Checkout</h1>
        <p className="text-muted-foreground text-sm">
          Usa el ID de una Variant activa. El precio y el stock se consultan en
          el servidor.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="variantId">Variant ID</Label>
          <Input id="variantId" name="variantId" required autoComplete="off" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Cantidad</Label>
          <Input
            defaultValue="1"
            id="quantity"
            max="99"
            min="1"
            name="quantity"
            required
            type="number"
          />
        </div>

        {errorMessage ? (
          <p className="text-destructive text-sm" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <Button disabled={pending} type="submit">
          {pending ? "Creando sesión…" : "Ir a Stripe Checkout"}
        </Button>
      </form>
    </main>
  );
}
