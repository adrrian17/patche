import { cn } from "cn";

import type {
  FulfillmentStatus,
  PaymentStatus,
} from "@/functions/customer-orders";

type Tone = "danger" | "done" | "neutral" | "progress" | "waiting";

const toneStyles = {
  danger: "bg-red-50 text-red-700 ring-red-200",
  done: "bg-mint text-brand-ink ring-brand/30",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  progress: "bg-sky-50 text-sky-800 ring-sky-200",
  waiting: "bg-amber-50 text-amber-800 ring-amber-200",
} satisfies Record<Tone, string>;

const paymentStatusCopy: Record<PaymentStatus, { label: string; tone: Tone }> =
  {
    canceled: { label: "Pago cancelado", tone: "neutral" },
    failed: { label: "Pago fallido", tone: "danger" },
    pending: { label: "Pago pendiente", tone: "waiting" },
    refund_pending: { label: "Reembolso pendiente", tone: "waiting" },
    refunded: { label: "Reembolsado", tone: "neutral" },
    succeeded: { label: "Pagado", tone: "done" },
  };

const fulfillmentStatusCopy: Record<
  FulfillmentStatus,
  { label: string; tone: Tone }
> = {
  delivered: { label: "Entregado", tone: "done" },
  shipped: { label: "Enviado", tone: "progress" },
  unfulfilled: { label: "Por preparar", tone: "waiting" },
};

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        toneStyles[tone]
      )}
    >
      {label}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <StatusPill {...paymentStatusCopy[status]} />;
}

export function FulfillmentStatusBadge({
  status,
}: {
  status: FulfillmentStatus;
}) {
  return <StatusPill {...fulfillmentStatusCopy[status]} />;
}
