import { Button, buttonVariants } from "@patche/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@patche/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@patche/ui/components/empty";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightIcon, ReceiptTextIcon } from "lucide-react";

import {
  FulfillmentStatusBadge,
  PaymentStatusBadge,
} from "@/components/customer/order-status";
import { listCustomerOrders } from "@/functions/customer-orders";
import { formatDate, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_auth/dashboard/")({
  component: CustomerOrdersPage,
});

function CustomerOrdersPage() {
  const orders = useQuery({
    queryFn: () => listCustomerOrders(),
    queryKey: ["customer", "orders"],
  });

  return (
    <section aria-labelledby="customer-orders-title" className="space-y-6">
      <header className="space-y-2">
        <h1
          className="font-heading text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
          id="customer-orders-title"
        >
          Mis pedidos
        </h1>
        <p className="max-w-2xl text-slate-600">
          Consulta tus compras y el estado de tus productos digitales.
        </p>
      </header>

      {orders.isPending && (
        <p aria-live="polite" className="text-sm text-slate-600">
          Cargando tus pedidos…
        </p>
      )}

      {orders.isError && (
        <Card className="border-destructive/30 rounded-3xl shadow-sm">
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-destructive text-sm">
              No se pudieron cargar tus pedidos.
            </p>
            <Button
              onClick={() => orders.refetch()}
              size="sm"
              variant="outline"
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {orders.isSuccess && orders.data.length === 0 && (
        <Card className="rounded-3xl shadow-sm">
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia className="bg-brand/10 text-brand" variant="icon">
                  <ReceiptTextIcon />
                </EmptyMedia>
                <EmptyTitle>Aún no tienes pedidos</EmptyTitle>
                <EmptyDescription>
                  Cuando completes una compra, aparecerá aquí.
                </EmptyDescription>
              </EmptyHeader>
              <Link className={buttonVariants()} to="/">
                Explorar la tienda
              </Link>
            </Empty>
          </CardContent>
        </Card>
      )}

      {orders.isSuccess && orders.data.length > 0 && (
        <ul className="grid gap-4">
          {orders.data.map((order) => (
            <li key={order.id}>
              <Link
                className="group focus-visible:outline-brand block rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-4"
                params={{ orderId: order.id }}
                to="/dashboard/orders/$orderId"
              >
                <Card className="rounded-3xl bg-white shadow-sm transition-shadow group-hover:shadow-md">
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-semibold text-slate-950">
                        Pedido {order.id}
                      </CardTitle>
                      <p className="text-sm text-slate-500">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <span className="font-heading text-lg font-semibold text-slate-950 tabular-nums">
                      {formatMoney(order.totalAmount)}
                    </span>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                      <PaymentStatusBadge status={order.paymentStatus} />
                      <FulfillmentStatusBadge
                        status={order.fulfillmentStatus}
                      />
                    </div>
                    <span className="text-brand inline-flex items-center gap-1 text-sm font-medium">
                      Ver pedido
                      <ArrowRightIcon
                        aria-hidden="true"
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
