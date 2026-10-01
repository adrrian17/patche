import { Button } from "@patche/ui/components/button";
import { Card, CardContent } from "@patche/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
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
import { BoxesIcon, HistoryIcon } from "lucide-react";

import { NewMovementDialog } from "@/components/admin/new-movement-dialog";
import { AdminPageHeader } from "@/components/admin/page-header";
import { listInventory } from "@/functions/inventory";
import { formatDate } from "@/lib/format";
import { movementReasonLabels } from "@/lib/labels";

export const Route = createFileRoute("/admin/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const inventory = useQuery({
    queryFn: () => listInventory(),
    queryKey: ["admin", "inventory"],
  });
  return (
    <>
      <AdminPageHeader
        actions={
          <NewMovementDialog variants={inventory.data?.variants ?? []} />
        }
        icon={BoxesIcon}
        title="Inventario"
      />
      <Card className="rounded-xl shadow-sm">
        <CardContent>
          {inventory.isPending && (
            <p className="text-muted-foreground text-sm">
              Cargando movimientos…
            </p>
          )}
          {inventory.isError && (
            <div className="flex flex-col items-start gap-3">
              <p className="text-destructive text-sm">
                No se pudieron cargar los movimientos.
              </p>
              <Button
                onClick={async () => await inventory.refetch()}
                size="sm"
                variant="outline"
              >
                Reintentar
              </Button>
            </div>
          )}
          {inventory.isSuccess && inventory.data.movements.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia
                  className="bg-primary/10 text-primary"
                  variant="icon"
                >
                  <HistoryIcon />
                </EmptyMedia>
                <EmptyTitle>Aún no hay movimientos</EmptyTitle>
                <EmptyDescription>
                  Usa el botón de arriba para registrar el primero.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {inventory.isSuccess && inventory.data.movements.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Variante</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.data.movements.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDate(item.createdAt)}</TableCell>
                    <TableCell>
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-muted-foreground block text-xs">
                        {item.variantName} · {item.sku}
                      </span>
                    </TableCell>
                    <TableCell>{movementReasonLabels[item.reason]}</TableCell>
                    <TableCell className="text-right font-mono">
                      {item.quantity > 0 ? "+" : ""}
                      {item.quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
