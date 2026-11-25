import { createFileRoute, useHydrated } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { getHomeImages } from "@/functions/home-images";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    error: z.string().optional(),
    next: z.literal("/cart").optional(),
  }),
  loader: () => getHomeImages(),
  head: () => ({ meta: [{ title: "Iniciar sesión · Patche" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const hydrated = useHydrated();
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "forgot-password">(
    "sign-in"
  );
  const { error, next } = Route.useSearch();
  const homeImages = Route.useLoaderData();
  const errorMessage = error
    ? "No pudimos verificar tu correo. Inicia sesión para solicitar un nuevo enlace."
    : null;

  return (
    <AuthShell image={homeImages.hero}>
      <fieldset disabled={!hydrated}>
        <legend className="sr-only">Acceso a Patche</legend>
        {errorMessage ? (
          <p
            aria-live="assertive"
            className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
        {mode === "sign-in" && (
          <SignInForm
            next={next}
            onForgotPassword={() => setMode("forgot-password")}
            onSwitchToSignUp={() => setMode("sign-up")}
          />
        )}
        {mode === "sign-up" && (
          <SignUpForm onSwitchToSignIn={() => setMode("sign-in")} />
        )}
        {mode === "forgot-password" && (
          <ForgotPasswordForm onBack={() => setMode("sign-in")} />
        )}
      </fieldset>
    </AuthShell>
  );
}
