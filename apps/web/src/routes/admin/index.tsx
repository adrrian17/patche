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
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangleIcon,
  PackageCheckIcon,
  ReceiptTextIcon,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { getAdminDashboard } from "@/functions/admin-dashboard";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const dashboard = useQuery({
    queryFn: () => getAdminDashboard(),
    queryKey: ["admin", "dashboard"],
  });
  return (
    <>
      <AdminPageHeader
        description="Una lectura rápida del trabajo que requiere atención hoy."
        eyebrow="Mesa de trabajo"
        title="Buenos días"
      />
      <section
        aria-label="Indicadores"
        className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card grid gap-4 *:data-[slot=card]:bg-linear-to-t sm:grid-cols-2 lg:grid-cols-3"
      >
        <MetricCard
          icon={ReceiptTextIcon}
          label="Órdenes de hoy"
          value={dashboard.data?.todayOrders}
        />
        <MetricCard
          icon={PackageCheckIcon}
          label="Por preparar"
          value={dashboard.data?.pendingOrders}
        />
        <MetricCard
          icon={AlertTriangleIcon}
          label="Stock bajo"
          value={dashboard.data?.lowStockVariants.length}
        />
      </section>
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangleIcon
              aria-hidden="true"
              className="text-primary size-4"
            />
            Stock que pide atención
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.data?.lowStockVariants.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Existencia</TableHead>
                  <TableHead className="text-right">Umbral</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.data.lowStockVariants.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-muted-foreground block text-xs">
                        {item.variantName}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.sku}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.stock}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.lowStockThreshold}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Inventario en orden</EmptyTitle>
                <EmptyDescription>
                  No hay variantes físicas debajo de su umbral.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </>
  );
}

interface MetricCardProps {
  icon: typeof ReceiptTextIcon;
  label: string;
  value: number | undefined;
}

function MetricCard({ icon: Icon, label, value }: MetricCardProps) {
  return (
    <Card className="@container/card rounded-xl shadow-sm">
      <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
        <CardDescription>{label}</CardDescription>
        <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value ?? "—"}
        </p>
      </CardContent>
    </Card>
  );
}
