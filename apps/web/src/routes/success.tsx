import { createFileRoute, useSearch } from "@tanstack/react-router";

export const Route = createFileRoute("/success")({
  component: SuccessPage,
  validateSearch: (search) => ({
    // SAFETY: TanStack Router supplies checkout_id as a string query parameter.
    checkout_id: search.checkout_id as string,
  }),
});

function SuccessPage() {
  const { checkout_id } = useSearch({ from: "/success" });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1>Payment Successful!</h1>
      {checkout_id && <p>Checkout ID: {checkout_id}</p>}
    </div>
  );
}
