import { Button } from "@patche/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRightIcon, ReceiptTextIcon } from "lucide-react";

import { AccountHeader } from "@/components/customer/account-header";
import {
  FulfillmentStatusBadge,
  PaymentStatusBadge,
} from "@/components/customer/order-status";
import { ProductImage } from "@/components/storefront/product-card";
import { listCustomerOrders } from "@/functions/customer-orders";
import type { CustomerOrderListEntry } from "@/functions/customer-orders";
import { formatDay, formatMoney, formatOrderReference } from "@/lib/format";

export const Route = createFileRoute("/_auth/dashboard/")({
  head: () => ({ meta: [{ title: "Mis pedidos · Patche" }] }),
  component: CustomerOrdersPage,
});

function itemSummary(order: CustomerOrderListEntry) {
  const [first] = order.preview;
  if (!first) {
    return "";
  }
  const others = order.lineCount - 1;
  if (others <= 0) {
    return first.productName;
  }
  return `${first.productName} y ${others} ${others === 1 ? "artículo más" : "artículos más"}`;
}

function OrderThumbnail({ order }: { order: CustomerOrderListEntry }) {
  const [first] = order.preview;
  const more = order.lineCount - 1;

  return (
    <div aria-hidden className="relative shrink-0">
      <ProductImage
        className="size-16 rounded-xl bg-slate-100 sm:size-[4.5rem]"
        image={first?.image ? { alt: "", url: first.image.url } : null}
      />
      {more > 0 ? (
        <span className="absolute -right-1.5 -bottom-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-1.5 text-xs font-semibold text-white tabular-nums ring-2 ring-white">
          +{more}
        </span>
      ) : null}
    </div>
  );
}

function OrderRow({ order }: { order: CustomerOrderListEntry }) {
  return (
    <Link
      className="group focus-visible:outline-brand flex items-center gap-4 px-4 py-4 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:gap-5 sm:px-6 sm:py-5"
      params={{ orderId: order.id }}
      to="/dashboard/orders/$orderId"
    >
      <OrderThumbnail order={order} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <p className="font-semibold text-slate-900">
            Pedido {formatOrderReference(order.id)}
          </p>
          <p className="font-semibold text-slate-900 tabular-nums">
            {formatMoney(order.totalAmount)}
          </p>
        </div>
        <p className="truncate text-sm text-slate-600">{itemSummary(order)}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-sm text-slate-600">
            {formatDay(order.createdAt)}
          </span>
          {/* A paid Order shows only where the goods are; any other payment state is what matters. */}
          {order.paymentStatus === "succeeded" ? (
            <FulfillmentStatusBadge status={order.fulfillmentStatus} />
          ) : (
            <PaymentStatusBadge status={order.paymentStatus} />
          )}
        </div>
      </div>
      <ChevronRightIcon
        aria-hidden="true"
        className="hidden size-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700 sm:block"
      />
    </Link>
  );
}

function CustomerOrdersPage() {
  const { session } = Route.useRouteContext();
  const orders = useQuery({
    queryFn: () => listCustomerOrders(),
    queryKey: ["customer", "orders"],
  });

  return (
    <div className="space-y-10">
      <AccountHeader user={session.user} />
      <section aria-labelledby="customer-orders-title" className="space-y-6">
        <header className="space-y-2 border-t border-slate-200 pt-8">
          <h1
            className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl"
            id="customer-orders-title"
          >
            Mis pedidos
          </h1>
          <p className="max-w-2xl text-slate-600">
            Revisa el estado de tus envíos y descarga tus archivos digitales.
          </p>
        </header>

        {orders.isPending && (
          <ul
            aria-busy="true"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            {["a", "b"].map((key) => (
              <li className="flex items-center gap-5 px-6 py-5" key={key}>
                <span className="size-16 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
                <span className="h-4 w-1/2 animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
              </li>
            ))}
            <li className="sr-only" aria-live="polite">
              Cargando tus pedidos…
            </li>
          </ul>
        )}

        {orders.isError && (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm text-red-700">
              No se pudieron cargar tus pedidos.
            </p>
            <Button
              className="rounded-full bg-white"
              onClick={() => orders.refetch()}
              size="sm"
              variant="outline"
            >
              Reintentar
            </Button>
          </div>
        )}

        {orders.isSuccess && orders.data.length === 0 && (
          <div className="bg-mint paper-dots flex flex-col items-center rounded-2xl px-6 py-14 text-center">
            <span className="text-brand-ink mb-5 flex size-14 items-center justify-center rounded-full bg-white">
              <ReceiptTextIcon aria-hidden className="size-6" />
            </span>
            <p className="text-xl font-semibold text-slate-900">
              Aún no tienes pedidos
            </p>
            <p className="mt-1 max-w-sm text-slate-600">
              Cuando completes una compra, aparecerá aquí con su estado y tus
              descargas.
            </p>
            <Link
              className="bg-brand-ink focus-visible:outline-brand mt-6 inline-flex h-12 items-center rounded-full px-7 font-semibold text-white transition-colors hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2"
              to="/products"
            >
              Explorar la tienda
            </Link>
          </div>
        )}

        {orders.isSuccess && orders.data.length > 0 && (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {orders.data.map((order) => (
              <li key={order.id}>
                <OrderRow order={order} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
