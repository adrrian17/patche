import type { ShippingAddress as ShippingAddressData } from "@patche/db/schema/orders";
import { Button, buttonVariants } from "@patche/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@patche/ui/components/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  DownloadIcon,
  PackageIcon,
  TruckIcon,
} from "lucide-react";
import { useState } from "react";

import {
  FulfillmentStatusBadge,
  PaymentStatusBadge,
} from "@/components/customer/order-status";
import { createDownloadUrl } from "@/functions/create-download-url";
import type {
  CustomerOrderItem,
  DigitalDownload,
} from "@/functions/customer-orders";
import { getCustomerOrder } from "@/functions/customer-orders";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_auth/dashboard/orders/$orderId")({
  component: CustomerOrderPage,
});

function CustomerOrderPage() {
  const { orderId } = Route.useParams();
  const orderQuery = useQuery({
    queryFn: () => getCustomerOrder({ data: { id: orderId } }),
    queryKey: ["customer", "orders", orderId],
  });

  if (orderQuery.isPending) {
    return (
      <p aria-live="polite" className="text-sm text-slate-600">
        Cargando el pedido…
      </p>
    );
  }

  if (orderQuery.isError) {
    return (
      <section aria-labelledby="order-load-error-title" className="space-y-4">
        <p className="text-destructive text-sm" id="order-load-error-title">
          No se pudo cargar este pedido.
        </p>
        <Button
          onClick={() => orderQuery.refetch()}
          size="sm"
          variant="outline"
        >
          Reintentar
        </Button>
      </section>
    );
  }

  if (!orderQuery.data) {
    return (
      <section aria-labelledby="order-not-found-title" className="space-y-4">
        <h1
          className="font-heading text-2xl font-semibold text-slate-950"
          id="order-not-found-title"
        >
          No encontramos ese pedido
        </h1>
        <p className="text-sm text-slate-600">
          Puede que el enlace no sea válido o que el pedido ya no esté
          disponible.
        </p>
        <Link
          className={buttonVariants({ variant: "outline" })}
          to="/dashboard"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Volver a mis pedidos
        </Link>
      </section>
    );
  }

  const order = orderQuery.data;
  const hasPhysicalItems = order.items.some((item) => item.kind === "physical");

  return (
    <section aria-labelledby="order-title" className="space-y-6">
      <Link
        className="hover:text-brand inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors"
        to="/dashboard"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Mis pedidos
      </Link>

      <header className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-slate-500">
            {formatDate(order.createdAt)}
          </p>
          <h1
            className="font-heading text-2xl font-semibold tracking-tight break-all text-slate-950 sm:text-3xl"
            id="order-title"
          >
            Pedido {order.id}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <PaymentStatusBadge status={order.paymentStatus} />
          <FulfillmentStatusBadge status={order.fulfillmentStatus} />
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="rounded-3xl bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-950">
              <PackageIcon aria-hidden="true" className="text-brand size-5" />
              Artículos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <li
                  className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  key={item.id}
                >
                  <PurchasedItemDetails item={item} />
                  {item.kind === "digital" && (
                    <DigitalDownloadControl
                      download={item.download}
                      orderId={order.id}
                    />
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="rounded-3xl bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-950">
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <MoneyRow label="Subtotal" value={order.subtotalAmount} />
              <MoneyRow label="Envío" value={order.shippingAmount} />
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 font-semibold text-slate-950">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatMoney(order.totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {hasPhysicalItems && (
            <Card className="rounded-3xl bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950">
                  <TruckIcon aria-hidden="true" className="text-brand size-4" />
                  Envío
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {order.shippingName && (
                  <p className="font-medium text-slate-900">
                    {order.shippingName}
                  </p>
                )}
                {order.shippingAddress ? (
                  <ShippingAddress address={order.shippingAddress} />
                ) : (
                  <p className="text-slate-500">
                    No hay datos de envío disponibles.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}

function PurchasedItemDetails({ item }: { item: CustomerOrderItem }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="font-medium text-slate-950">{item.productName}</p>
      <p className="text-sm text-slate-500">
        {item.variantName} · {item.kind === "digital" ? "Digital" : "Físico"}
      </p>
      <p className="text-sm text-slate-600">
        {item.quantity} × {formatMoney(item.unitAmount)}
      </p>
    </div>
  );
}

function DigitalDownloadControl({
  download,
  orderId,
}: {
  download: DigitalDownload;
  orderId: string;
}) {
  if (download.state === "unavailable") {
    return (
      <p className="max-w-xs text-sm text-slate-500">
        Este archivo no está disponible para descarga.
      </p>
    );
  }

  return <DownloadButton grantId={download.grantId} orderId={orderId} />;
}

async function downloadOrderFile({
  grantId,
  onError,
  onPendingChange,
  invalidateOrder,
}: {
  grantId: string;
  onError: (error: string | null) => void;
  onPendingChange: (isPending: boolean) => void;
  invalidateOrder: () => Promise<void>;
}): Promise<void> {
  onPendingChange(true);
  onError(null);
  try {
    const result = await createDownloadUrl({ data: { grantId } });
    window.location.assign(result.url);
  } catch (caughtError) {
    onError(
      errorMessage(
        caughtError instanceof Error ? caughtError : null,
        "No se pudo iniciar la descarga. Inténtalo de nuevo."
      )
    );
    await invalidateOrder();
  } finally {
    onPendingChange(false);
  }
}

function DownloadButton({
  grantId,
  orderId,
}: {
  grantId: string;
  orderId: string;
}) {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download(): Promise<void> {
    await downloadOrderFile({
      grantId,
      invalidateOrder: () =>
        queryClient.invalidateQueries({
          queryKey: ["customer", "orders", orderId],
        }),
      onError: setError,
      onPendingChange: setIsPending,
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
      <Button disabled={isPending} onClick={download} size="sm">
        <DownloadIcon data-icon="inline-start" />
        {isPending ? "Preparando…" : "Descargar"}
      </Button>
      {error && (
        <p className="text-destructive max-w-xs text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function MoneyRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <span>{label}</span>
      <span className="tabular-nums">{formatMoney(value)}</span>
    </div>
  );
}

function ShippingAddress({ address }: { address: ShippingAddressData }) {
  const lines = [
    address.line1,
    address.line2,
    [address.postalCode, address.city].filter(Boolean).join(" "),
    [address.state, address.country].filter(Boolean).join(", "),
  ].filter((line): line is string => Boolean(line));

  return (
    <address className="space-y-1 text-slate-600 not-italic">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </address>
  );
}
