import { Badge } from "@patche/ui/components/badge";

import type {
  FulfillmentStatus,
  PaymentStatus,
} from "@/functions/customer-orders";

const paymentStatusCopy: Record<
  PaymentStatus,
  { label: string; variant: "default" | "destructive" | "secondary" }
> = {
  canceled: { label: "Pago cancelado", variant: "secondary" },
  failed: { label: "Pago fallido", variant: "destructive" },
  pending: { label: "Pago pendiente", variant: "secondary" },
  refund_pending: { label: "Reembolso pendiente", variant: "secondary" },
  refunded: { label: "Reembolsado", variant: "secondary" },
  succeeded: { label: "Pagado", variant: "default" },
};

const fulfillmentStatusCopy: Record<
  FulfillmentStatus,
  { label: string; variant: "default" | "secondary" }
> = {
  delivered: { label: "Entregado", variant: "default" },
  shipped: { label: "Enviado", variant: "secondary" },
  unfulfilled: { label: "Por preparar", variant: "secondary" },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const copy = paymentStatusCopy[status];
  return <Badge variant={copy.variant}>{copy.label}</Badge>;
}

export function FulfillmentStatusBadge({
  status,
}: {
  status: FulfillmentStatus;
}) {
  const copy = fulfillmentStatusCopy[status];
  return <Badge variant={copy.variant}>{copy.label}</Badge>;
}
