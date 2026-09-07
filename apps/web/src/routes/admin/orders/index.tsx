import { buttonVariants } from "@patche/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@patche/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@patche/ui/components/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@patche/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { listAdminOrders } from "@/functions/admin-orders";
import { formatDate, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/admin/orders/")({
  component: OrdersPage,
});

function OrdersPage() {
  const orders = useQuery({
    queryFn: () => listAdminOrders(),
    queryKey: ["admin", "orders"],
  });
  return (
    <>
      <AdminPageHeader
        description="Pagos, preparación y entrega en un solo historial."
        eyebrow="Operación"
        title="Órdenes"
      />
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Historial</CardTitle>
          <CardDescription>{orders.data?.length ?? 0} órdenes</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>
                    <span className="sr-only">Abrir</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="font-medium">{item.customerName}</span>
                      <span className="text-muted-foreground block text-xs">
                        {item.customerEmail}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(item.createdAt)}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.fulfillmentStatus} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(item.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Link
                        className={buttonVariants({
                          size: "icon-sm",
                          variant: "ghost",
                        })}
                        params={{ orderId: item.id }}
                        to="/admin/orders/$orderId"
                      >
                        <ArrowRightIcon />
                        <span className="sr-only">Ver orden {item.id}</span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No hay órdenes</EmptyTitle>
                <EmptyDescription>
                  Las órdenes aparecerán cuando Stripe confirme un checkout.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </>
  );
}
