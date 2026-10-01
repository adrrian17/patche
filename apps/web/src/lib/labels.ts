import type { stockMovementReasons } from "@patche/db/schema/inventory";

export const productStatusLabels = {
  active: "Activo",
  draft: "Borrador",
} satisfies Record<string, string>;

type StockMovementReason = (typeof stockMovementReasons)[number];

export const movementReasonLabels = {
  adjusted: "Ajuste",
  received: "Recepción",
  released: "Liberación",
  reserved: "Reserva",
  returned: "Devolución",
  sold: "Venta",
} satisfies Record<StockMovementReason, string>;
