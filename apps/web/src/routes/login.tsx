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
    <>
      {errorMessage ? (
        <p
          aria-live="assertive"
          className="mx-auto mt-6 w-full max-w-md px-6 text-center text-sm text-red-600"
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
    </>
  );
}
