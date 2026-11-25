import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import type { ReactNode } from "react";

// Split layout for sign-in, sign-up and password screens: brand image on wide screens, the form beside it.
export function AuthShell({
  children,
  image,
}: {
  children: ReactNode;
  image: string | null;
}) {
  return (
    <main className="storefront bg-paper font-body grid min-h-svh text-slate-800 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="bg-mint relative hidden overflow-hidden lg:block">
        {image ? (
          <img
            alt=""
            className="absolute inset-0 size-full object-cover"
            src={image}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="font-display max-w-md text-4xl leading-tight font-bold tracking-tight">
            Tu cuenta Patche
          </p>
          <p className="mt-3 max-w-sm text-lg text-white/90">
            Sigue tus envíos y descarga tus planners digitales cuando los
            necesites.
          </p>
        </div>
      </div>
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Link
            className="focus-visible:outline-brand rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"
            to="/"
          >
            <img
              alt="Patche, inicio"
              className="h-9 w-auto"
              height={150}
              src="/logo.png"
              width={466}
            />
          </Link>
          <Link
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            to="/products"
          >
            <ArrowLeftIcon aria-hidden className="size-4" />
            Volver a la tienda
          </Link>
        </div>
        {image ? (
          <img
            alt=""
            className="mt-5 aspect-[16/7] w-full rounded-2xl object-cover sm:aspect-[16/6] lg:hidden"
            src={image}
          />
        ) : null}
        <div className="flex flex-1 items-start justify-center pt-8 pb-10 lg:items-center lg:pt-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </main>
  );
}
