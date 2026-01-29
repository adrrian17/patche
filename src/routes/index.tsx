import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { data: categories } = useSuspenseQuery(
    convexQuery(api.categories.list, {})
  );

  return (
    <main className="flex flex-col gap-16 p-8">
      <h1 className="text-center font-bold text-4xl">Patche.mx</h1>
      <div className="mx-auto flex max-w-lg flex-col gap-8">
        <p>Bienvenido a la tienda de Patche!</p>
        <p>Categorías disponibles: {categories.length}</p>
        <p>
          <Link
            className="text-blue-600 underline hover:no-underline"
            to="/another-page"
          >
            Ver otra página
          </Link>
        </p>
        <div className="flex flex-col">
          <p className="font-bold text-lg">Recursos útiles:</p>
          <div className="flex gap-2">
            <div className="flex w-1/2 flex-col gap-2">
              <ResourceCard
                description="Lee la documentación completa de Convex."
                href="https://docs.convex.dev/home"
                title="Convex docs"
              />
              <ResourceCard
                description="Documentación de TypeScript."
                href="https://www.typescriptlang.org/docs/handbook/2/basic-types.html"
                title="TypeScript"
              />
            </div>
            <div className="flex w-1/2 flex-col gap-2">
              <ResourceCard
                description="Explora plantillas de Convex."
                href="https://www.convex.dev/templates"
                title="Templates"
              />
              <ResourceCard
                description="Únete a la comunidad de Convex."
                href="https://www.convex.dev/community"
                title="Discord"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function ResourceCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="flex h-28 flex-col gap-2 overflow-auto rounded-md bg-slate-200 p-4 dark:bg-slate-800">
      <a className="text-sm underline hover:no-underline" href={href}>
        {title}
      </a>
      <p className="text-xs">{description}</p>
    </div>
  );
}
