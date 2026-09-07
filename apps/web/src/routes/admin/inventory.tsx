import { Badge } from "@patche/ui/components/badge";
import { Button } from "@patche/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@patche/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@patche/ui/components/field";
import { Input } from "@patche/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@patche/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@patche/ui/components/table";
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownToLineIcon } from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/admin/page-header";
import { createStockMovement, listInventory } from "@/functions/inventory";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";

interface MovementValues {
  note: string;
  quantity: number;
  reason: "adjusted" | "received" | "returned";
  variantId: string;
}
const movementDefaults: MovementValues = {
  note: "",
  quantity: 1,
  reason: "received",
  variantId: "",
};

export const Route = createFileRoute("/admin/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const queryClient = useQueryClient();
  const inventory = useQuery({
    queryFn: () => listInventory(),
    queryKey: ["admin", "inventory"],
  });
  const form = useForm({
    defaultValues: movementDefaults,
    onSubmit: async ({ value }) => {
      try {
        await createStockMovement({ data: value });
        form.reset();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] }),
          queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
        ]);
        toast.success("Movimiento registrado");
      } catch (error) {
        toast.error(
          errorMessage(
            error instanceof Error ? error : null,
            "No se pudo registrar el movimiento"
          )
        );
      }
    },
  });
  return (
    <>
      <AdminPageHeader
        description="La existencia se calcula con el historial de movimientos. Nunca se edita directamente."
        eyebrow="Operación"
        title="Inventario"
      />
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Existencias</CardTitle>
          <CardDescription>Variantes físicas activas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Umbral</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.data?.variants.map((item) => (
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
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        item.stock <= item.lowStockThreshold
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {item.stock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.lowStockThreshold}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">
              Registrar movimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                form.handleSubmit();
              }}
            >
              <FieldGroup>
                <form.Field name="variantId">
                  {(field) => (
                    <Field>
                      <FieldLabel>Variante</FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) =>
                          field.handleChange(value ?? "")
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {inventory.data?.variants.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.productName} · {item.variantName}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </form.Field>
                <form.Field name="reason">
                  {(field) => (
                    <Field>
                      <FieldLabel>Motivo</FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) => {
                          if (value === "adjusted" || value === "returned") {
                            field.handleChange(value);
                          } else {
                            field.handleChange("received");
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="received">Recepción</SelectItem>
                            <SelectItem value="adjusted">Ajuste</SelectItem>
                            <SelectItem value="returned">Devolución</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </form.Field>
                <form.Field name="quantity">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="movement-quantity">
                        Cantidad
                      </FieldLabel>
                      <Input
                        id="movement-quantity"
                        type="number"
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.valueAsNumber)
                        }
                      />
                      <FieldDescription>
                        Los ajustes pueden usar una cantidad negativa.
                      </FieldDescription>
                    </Field>
                  )}
                </form.Field>
                <form.Field name="note">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="movement-note">Nota</FieldLabel>
                      <Input
                        id="movement-note"
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                      />
                    </Field>
                  )}
                </form.Field>
                <Button type="submit">
                  <ArrowDownToLineIcon data-icon="inline-start" />
                  Registrar
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">
              Movimientos recientes
            </CardTitle>
            <CardDescription>Últimos 50 registros</CardDescription>
          </CardHeader>
          <CardContent>
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
                {inventory.data?.movements.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDate(item.createdAt)}</TableCell>
                    <TableCell>
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-muted-foreground block text-xs">
                        {item.variantName} · {item.sku}
                      </span>
                    </TableCell>
                    <TableCell>{item.reason}</TableCell>
                    <TableCell className="text-right font-mono">
                      {item.quantity > 0 ? "+" : ""}
                      {item.quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
