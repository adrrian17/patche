import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/another-page")({
  component: AnotherPage,
});

function AnotherPage() {
  const { data: collections } = useSuspenseQuery(
    convexQuery(api.collections.list, { activeOnly: true })
  );

  return (
    <main className="flex flex-col gap-16 p-8">
      <h1 className="text-center font-bold text-4xl">Otra Página</h1>
      <div className="mx-auto flex max-w-lg flex-col gap-8">
        <p>Colecciones activas: {collections.length}</p>
        <p>
          <Link className="text-blue-600 underline hover:no-underline" to="/">
            Regresar
          </Link>
        </p>
      </div>
    </main>
  );
}
