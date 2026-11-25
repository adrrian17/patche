import type { ShippingAddress as ShippingAddressData } from "@patche/db/schema/orders";
import { Button, buttonVariants } from "@patche/ui/components/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { cn } from "cn";
import {
  ArrowLeftIcon,
  CheckIcon,
  CircleAlertIcon,
  DownloadIcon,
  TruckIcon,
} from "lucide-react";
import { useState } from "react";

import {
  FulfillmentStatusBadge,
  PaymentStatusBadge,
} from "@/components/customer/order-status";
import { ProductImage } from "@/components/storefront/product-card";
import { createDownloadUrl } from "@/functions/create-download-url";
import type {
  CustomerOrderDetail,
  CustomerOrderItem,
  DigitalDownload,
} from "@/functions/customer-orders";
import { getCustomerOrder } from "@/functions/customer-orders";
import { errorMessage } from "@/lib/errors";
import { formatDay, formatMoney, formatOrderReference } from "@/lib/format";

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
  const steps = progressSteps({
    fulfillmentStatus: order.fulfillmentStatus,
    hasPhysicalItems,
    paymentStatus: order.paymentStatus,
  });

  return (
    <section aria-labelledby="order-title" className="space-y-8">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        to="/dashboard"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Mis pedidos
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1
            className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl"
            id="order-title"
          >
            Pedido {formatOrderReference(order.id)}
          </h1>
          <p className="text-sm text-slate-600">
            Realizado el {formatDay(order.createdAt)}
          </p>
          <p className="text-xs break-all text-slate-600">
            Referencia completa: {order.id}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PaymentStatusBadge status={order.paymentStatus} />
          {steps ? null : (
            <FulfillmentStatusBadge status={order.fulfillmentStatus} />
          )}
        </div>
      </header>

      {steps ? <OrderProgress steps={steps} /> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section
          aria-labelledby="order-items-title"
          className="rounded-2xl border border-slate-200 bg-white"
        >
          <h2
            className="border-b border-slate-200 px-5 py-4 text-lg font-bold tracking-tight text-slate-900 sm:px-6"
            id="order-items-title"
          >
            Artículos
          </h2>
          <ul className="divide-y divide-slate-200">
            {order.items.map((item) => (
              <li
                className="grid gap-3 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-6 sm:px-6"
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
        </section>

        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="order-summary-title"
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
          >
            <h2
              className="mb-4 text-lg font-bold tracking-tight text-slate-900"
              id="order-summary-title"
            >
              Resumen
            </h2>
            <div className="space-y-3 text-sm">
              <MoneyRow label="Subtotal" value={order.subtotalAmount} />
              <MoneyRow label="Envío" value={order.shippingAmount} />
              <div className="flex items-baseline justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatMoney(order.totalAmount)}
                </span>
              </div>
            </div>
          </section>

          {hasPhysicalItems && (
            <section
              aria-labelledby="order-shipping-title"
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
            >
              <h2
                className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900"
                id="order-shipping-title"
              >
                <TruckIcon
                  aria-hidden="true"
                  className="text-brand-ink size-5"
                />
                Envío
              </h2>
              <div className="space-y-2 text-sm">
                {order.shippingName && (
                  <p className="font-medium text-slate-900">
                    {order.shippingName}
                  </p>
                )}
                {order.shippingAddress ? (
                  <ShippingAddress address={order.shippingAddress} />
                ) : (
                  <p className="text-slate-600">
                    No hay datos de envío disponibles.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}

interface ProgressStep {
  label: string;
  state: "current" | "done" | "todo";
}

function progressSteps({
  fulfillmentStatus,
  hasPhysicalItems,
  paymentStatus,
}: {
  fulfillmentStatus: CustomerOrderDetail["fulfillmentStatus"];
  hasPhysicalItems: boolean;
  paymentStatus: CustomerOrderDetail["paymentStatus"];
}): ProgressStep[] | null {
  if (paymentStatus !== "pending" && paymentStatus !== "succeeded") {
    return null;
  }
  const labels = hasPhysicalItems
    ? ["Pago confirmado", "Preparando", "Enviado", "Entregado"]
    : ["Pago confirmado", "Descargas listas"];
  // How many steps are complete; the next one is in progress.
  let done = 0;
  if (paymentStatus === "succeeded") {
    if (!hasPhysicalItems || fulfillmentStatus === "delivered") {
      done = labels.length;
    } else if (fulfillmentStatus === "shipped") {
      done = 3;
    } else {
      done = 1;
    }
  }
  return labels.map((label, index) => {
    let state: ProgressStep["state"] = "todo";
    if (index < done) {
      state = "done";
    } else if (index === done) {
      state = "current";
    }
    return { label, state };
  });
}

function OrderProgress({ steps }: { steps: ProgressStep[] }) {
  const last = steps.at(-1);
  // A finished Order needs one line, not a row of identical ticks.
  if (last && steps.every(({ state }) => state === "done")) {
    return (
      <p className="bg-mint text-brand-ink flex items-center gap-3 rounded-2xl px-5 py-4 font-semibold sm:px-6">
        <span className="bg-brand-ink flex size-7 items-center justify-center rounded-full text-white">
          <CheckIcon aria-hidden className="size-4" />
        </span>
        {last.label}
      </p>
    );
  }

  return (
    <ol
      aria-label="Progreso del pedido"
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:auto-cols-fr sm:grid-flow-col sm:gap-0 sm:p-6"
    >
      {steps.map((step, index) => (
        <li
          aria-current={step.state === "current" ? "step" : undefined}
          className="relative flex items-center gap-3 sm:flex-col sm:items-start sm:gap-3"
          key={step.label}
        >
          <div className="flex items-center sm:w-full">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                step.state === "done" && "bg-brand-ink text-white",
                step.state === "current" &&
                  "border-brand-ink text-brand-ink border-2 bg-white",
                step.state === "todo" &&
                  "border-2 border-slate-200 bg-white text-slate-400"
              )}
            >
              {step.state === "done" ? (
                <CheckIcon aria-hidden className="size-4" />
              ) : null}
            </span>
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "mx-2 hidden h-0.5 flex-1 rounded-full sm:block",
                  step.state === "done" ? "bg-brand-ink" : "bg-slate-200"
                )}
              />
            ) : null}
          </div>
          <span
            className={cn(
              "text-sm font-medium",
              step.state === "todo" ? "text-slate-500" : "text-slate-900"
            )}
          >
            {step.label}
            <span className="sr-only">
              {step.state === "done" ? " (completado)" : ""}
              {step.state === "current" ? " (en curso)" : ""}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function PurchasedItemDetails({ item }: { item: CustomerOrderItem }) {
  const image = (
    <ProductImage
      className="size-16 shrink-0 rounded-xl bg-slate-100 sm:size-20"
      image={item.image ? { alt: "", url: item.image.url } : null}
    />
  );

  return (
    <div className="flex min-w-0 items-center gap-4">
      {item.productSlug ? (
        <Link
          aria-hidden
          className="shrink-0"
          params={{ slug: item.productSlug }}
          tabIndex={-1}
          to="/products/$slug"
        >
          {image}
        </Link>
      ) : (
        image
      )}
      <div className="min-w-0 space-y-1">
        <p className="font-semibold text-slate-900">
          {item.productSlug ? (
            <Link
              className="underline-offset-4 hover:underline"
              params={{ slug: item.productSlug }}
              to="/products/$slug"
            >
              {item.productName}
            </Link>
          ) : (
            item.productName
          )}
        </p>
        <p className="text-sm text-slate-600">
          {item.variantName} · {item.kind === "digital" ? "Digital" : "Físico"}
        </p>
        <p className="text-sm text-slate-600 tabular-nums">
          {item.quantity} × {formatMoney(item.unitAmount)}
          {item.quantity > 1 ? (
            <span className="text-slate-900">
              {" "}
              · {formatMoney(item.unitAmount * item.quantity)}
            </span>
          ) : null}
        </p>
      </div>
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
      <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 sm:col-span-2">
        <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
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
      <Button
        className="h-10 rounded-full px-4"
        disabled={isPending}
        onClick={download}
      >
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
