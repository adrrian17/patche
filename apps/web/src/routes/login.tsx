import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  validateSearch: z.object({
    error: z.string().optional(),
  }),
});

function RouteComponent() {
  const [showSignIn, setShowSignIn] = useState(false);
  const { error } = Route.useSearch();
  const errorMessage = error
    ? "El enlace ya no es válido. Solicita uno nuevo para entrar."
    : null;

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-white px-4 py-10 text-slate-900 sm:px-6">
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center">
        <div className="mb-7 text-center">
          <img
            alt="Patche"
            className="mx-auto h-20 w-auto object-contain"
            src="/logo.png"
          />
          <p className="mt-3 font-mono text-[0.65rem] tracking-[0.28em] text-slate-500 uppercase">
            Papelería para tus ideas
          </p>
        </div>
        <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-2 shadow-[0_24px_80px_rgb(15_23_42_/_0.1)] sm:p-3">
          <div className="rounded-[1.5rem] border border-slate-200/70 bg-white px-2 py-2 sm:px-3">
            {errorMessage ? (
              <p
                aria-live="assertive"
                className="mx-auto mt-4 w-full max-w-md px-6 text-center text-sm text-red-600"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}
            {showSignIn ? (
              <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
            ) : (
              <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
            )}
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          Acceso seguro con enlaces de un solo uso.
        </p>
      </div>
    </main>
  );
}
