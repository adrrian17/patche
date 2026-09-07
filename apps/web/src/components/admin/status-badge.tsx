import { Badge } from "@patche/ui/components/badge";

const labels = new Map([
  ["active", "Activo"],
  ["archived", "Archivado"],
  ["canceled", "Cancelado"],
  ["delivered", "Entregado"],
  ["draft", "Borrador"],
  ["failed", "Fallido"],
  ["pending", "Pendiente"],
  ["refunded", "Reembolsado"],
  ["shipped", "Enviado"],
  ["succeeded", "Pagado"],
  ["unfulfilled", "Por preparar"],
]);

export function StatusBadge({ status }: { status: string }) {
  let variant: "default" | "destructive" | "secondary" = "secondary";
  if (status === "failed" || status === "canceled") {
    variant = "destructive";
  } else if (
    status === "active" ||
    status === "succeeded" ||
    status === "delivered"
  ) {
    variant = "default";
  }
  return <Badge variant={variant}>{labels.get(status) ?? status}</Badge>;
}
