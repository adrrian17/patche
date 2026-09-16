import { Button } from "@patche/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-white px-6">
      <div className="flex flex-col items-center gap-8">
        <img alt="Patche" className="h-auto w-72 max-w-full" src="/logo.png" />
        <Button render={<Link to="/login" />}>Iniciar sesión</Button>
      </div>
    </div>
  );
}
