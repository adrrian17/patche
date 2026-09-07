import { Button, buttonVariants } from "@patche/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@patche/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@patche/ui/components/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  PackageCheckIcon,
  RotateCcwIcon,
  TruckIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  getAdminOrder,
  updateOrderFulfillment,
} from "@/functions/admin-orders";
import { createDownloadUrl } from "@/functions/create-download-url";
import { refundOrder } from "@/functions/refund-order";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/admin/orders/$orderId")({
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const queryClient = useQueryClient();
  const orderQuery = useQuery({
    queryFn: () => getAdminOrder({ data: { id: orderId } }),
    queryKey: ["admin", "orders", orderId],
  });
  const { data } = orderQuery;
  if (!data) {
    return <p className="text-muted-foreground text-sm">Cargando orden…</p>;
  }
  async function setFulfillment(status: "delivered" | "shipped") {
    try {
      await updateOrderFulfillment({ data: { id: orderId, status } });
      await queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      toast.success(
        status === "shipped"
          ? "Orden marcada como enviada"
          : "Orden marcada como entregada"
      );
    } catch (error) {
      toast.error(
        errorMessage(
          error instanceof Error ? error : null,
          "No se pudo actualizar la orden"
        )
      );
    }
  }
  async function refund() {
    try {
      await refundOrder({ data: { orderId } });
      toast.success("Reembolso solicitado a Stripe");
    } catch (error) {
      toast.error(
        errorMessage(
          error instanceof Error ? error : null,
          "No se pudo solicitar el reembolso"
        )
      );
    }
  }
  const address = data.order.shippingAddress;
  return (
    <>
      <AdminPageHeader
        actions={
          <Link
            className={buttonVariants({ variant: "outline" })}
            to="/admin/orders"
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Órdenes
          </Link>
        }
        description={`Creada ${formatDate(data.order.createdAt)} por ${data.customerName}.`}
        eyebrow={`Orden ${data.order.id}`}
        title={formatMoney(data.order.totalAmount)}
      />
      <section
        aria-label="Estado"
        className="flex flex-wrap items-center gap-2"
      >
        <StatusBadge status={data.order.paymentStatus} />
        <StatusBadge status={data.order.fulfillmentStatus} />
        {data.order.fulfillmentStatus === "unfulfilled" ? (
          <Button onClick={() => setFulfillment("shipped")} size="sm">
            <TruckIcon data-icon="inline-start" />
            Marcar enviada
          </Button>
        ) : null}
        {data.order.fulfillmentStatus === "delivered" ? null : (
          <Button
            onClick={() => setFulfillment("delivered")}
            size="sm"
            variant="outline"
          >
            <PackageCheckIcon data-icon="inline-start" />
            Marcar entregada
          </Button>
        )}
        {data.order.paymentStatus === "succeeded" ? (
          <Button onClick={refund} size="sm" variant="destructive">
            <RotateCcwIcon data-icon="inline-start" />
            Reembolso total
          </Button>
        ) : null}
      </section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Artículos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artículo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>
                    <span className="sr-only">Descarga</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => {
                  const grant = data.grants.find(
                    (candidate) => candidate.orderItemId === item.id
                  );
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="font-medium">{item.productName}</span>
                        <span className="text-muted-foreground block text-xs">
                          {item.variantName}
                        </span>
                      </TableCell>
                      <TableCell>{item.kind}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(item.unitAmount)}
                      </TableCell>
                      <TableCell>
                        {grant && !grant.revokedAt ? (
                          <Button
                            onClick={() => downloadGrant(grant.id)}
                            size="sm"
                            variant="outline"
                          >
                            Descargar
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">
                Cliente y envío
              </CardTitle>
              <CardDescription>{data.customerEmail}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm leading-6">
              <p className="font-medium">
                {data.order.shippingName ?? data.customerName}
              </p>
              {address ? (
                <address className="text-muted-foreground not-italic">
                  {address.line1}
                  <br />
                  {address.line2 ? (
                    <>
                      {address.line2}
                      <br />
                    </>
                  ) : null}
                  {address.postalCode} {address.city}, {address.state}
                  <br />
                  {address.country}
                </address>
              ) : (
                <p className="text-muted-foreground">Sin dirección de envío</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">Stripe</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 font-mono text-xs">
              <p className="break-all">{data.order.stripeCheckoutSessionId}</p>
              {data.order.stripePaymentIntentId ? (
                <>
                  <p className="text-muted-foreground break-all">
                    {data.order.stripePaymentIntentId}
                  </p>
                  <a
                    className={buttonVariants({ variant: "outline" })}
                    href={`https://dashboard.stripe.com/test/payment_intents/${data.order.stripePaymentIntentId}`}
                    rel="noopener"
                    target="_blank"
                  >
                    <ExternalLinkIcon data-icon="inline-start" />
                    Ver en Stripe
                  </a>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

async function downloadGrant(grantId: string): Promise<void> {
  try {
    const result = await createDownloadUrl({ data: { grantId } });
    window.open(result.url, "_blank", "noopener,noreferrer");
  } catch (error) {
    toast.error(
      errorMessage(
        error instanceof Error ? error : null,
        "No se pudo generar la descarga"
      )
    );
  }
}
