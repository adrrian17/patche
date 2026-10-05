import { createFileRoute, useHydrated } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { ForgotPasswordForm } from "@/components/forgot-password-form";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  validateSearch: z.object({
    error: z.string().optional(),
    next: z.literal("/cart").optional(),
  }),
});

function RouteComponent() {
  const hydrated = useHydrated();
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "forgot-password">(
    "sign-in"
  );
  const { error, next } = Route.useSearch();
  const errorMessage = error
    ? "No pudimos verificar tu correo. Inicia sesión para solicitar un nuevo enlace."
    : null;

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-white px-4 py-10 text-slate-900 [--accent-foreground:oklch(0.48_0.09_182)] [--accent:oklch(0.955_0.028_182)] [--background:oklch(1_0_0)] [--border:oklch(0.91_0.005_240)] [--input:oklch(0.91_0.005_240)] [--muted-foreground:oklch(0.53_0.014_240)] [--primary-foreground:oklch(0.99_0_0)] [--primary:oklch(0.6_0.11_182)] [--ring:oklch(0.6_0.11_182)] sm:px-6">
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center">
        <div className="mb-6 text-center">
          <img
            alt="Patche"
            className="mx-auto h-20 w-auto object-contain sm:h-24"
            src="/logo.png"
          />
        </div>
        <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-2 shadow-[0_24px_80px_rgb(15_23_42_/_0.1)] sm:p-3">
          <fieldset
            disabled={!hydrated}
            className="rounded-[1.5rem] border border-slate-200/70 bg-white px-2 py-2 sm:px-3"
          >
            <legend className="sr-only">Acceso a Patche</legend>
            {errorMessage ? (
              <p
                aria-live="assertive"
                className="mx-auto mt-4 w-full max-w-md px-6 text-center text-sm text-red-600"
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
        </div>
      </div>
    </main>
  );
}
