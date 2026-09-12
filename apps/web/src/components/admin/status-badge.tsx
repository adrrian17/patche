import { Badge } from "@patche/ui/components/badge";
import { cn } from "cn";

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

export function StatusBadge({
  className,
  status,
}: {
  className?: string;
  status: string;
}) {
  let variant: "default" | "destructive" | "secondary" = "secondary";
  let colorClassName = "";
  if (status === "failed" || status === "canceled") {
    variant = "destructive";
  } else if (
    status === "active" ||
    status === "succeeded" ||
    status === "delivered"
  ) {
    variant = "default";
  } else if (status === "draft") {
    colorClassName =
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
  }
  return (
    <Badge className={cn(colorClassName, className)} variant={variant}>
      {labels.get(status) ?? status}
    </Badge>
  );
}
