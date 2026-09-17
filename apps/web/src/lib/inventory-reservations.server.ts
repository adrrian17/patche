import { env } from "@patche/env/server";
import type { CheckoutItem } from "@patche/payments";
import { nanoid } from "nanoid";

const reservationNote = "Reserva de Checkout";

export interface InventoryReservation {
  expiresAt: Date;
  id: string;
}

export async function releaseExpiredInventoryReservations(
  now = new Date()
): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO stock_movement (
        id, variant_id, quantity, reason, note, reservation_id
      )
      SELECT
        lower(hex(randomblob(16))), movement.variant_id,
        -movement.quantity, 'released', 'Reserva vencida', movement.reservation_id
      FROM stock_movement AS movement
      INNER JOIN checkout_reservation AS reservation
        ON reservation.id = movement.reservation_id
      WHERE movement.reason = 'reserved'
        AND reservation.status IN ('pending', 'active')
        AND reservation.expires_at <= ?
    `).bind(now.getTime()),
    env.DB.prepare(`
      UPDATE checkout_reservation
      SET status = 'released', updated_at = ?
      WHERE status IN ('pending', 'active') AND expires_at <= ?
    `).bind(now.getTime(), now.getTime()),
  ]);
}

export async function reserveInventory(
  customerId: string,
  items: CheckoutItem[],
  expiresAt: Date
): Promise<InventoryReservation> {
  await releaseExpiredInventoryReservations();

  const reservationId = nanoid();
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(`
      INSERT INTO checkout_reservation (id, customer_id, status, expires_at)
      VALUES (?, ?, 'pending', ?)
    `).bind(reservationId, customerId, expiresAt.getTime()),
    ...items.map((item) =>
      env.DB.prepare(`
        INSERT INTO stock_movement (
          id, variant_id, quantity, reason, note, reservation_id
        ) VALUES (?, ?, ?, 'reserved', ?, ?)
      `).bind(
        nanoid(),
        item.variantId,
        -item.quantity,
        reservationNote,
        reservationId
      )
    ),
  ];

  try {
    await env.DB.batch(statements);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("insufficient_stock")) {
      throw new Error("Stock insuficiente para completar el Checkout", {
        cause: error,
      });
    }
    throw error;
  }

  return { expiresAt, id: reservationId };
}

export async function activateInventoryReservation(
  reservationId: string,
  checkoutSessionId: string
): Promise<void> {
  const result = await env.DB.prepare(`
    UPDATE checkout_reservation
    SET status = 'active', stripe_checkout_session_id = ?, updated_at = ?
    WHERE id = ? AND status = 'pending' AND expires_at > ?
  `)
    .bind(checkoutSessionId, Date.now(), reservationId, Date.now())
    .run();
  if (result.meta.changes !== 1) {
    throw new Error("No se pudo activar la reserva de inventario");
  }
}

export async function reactivateInventoryReservation(
  reservationId: string,
  checkoutSessionId: string
): Promise<void> {
  const result = await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO stock_movement (
        id, variant_id, quantity, reason, note, reservation_id
      )
      SELECT
        lower(hex(randomblob(16))), movement.variant_id,
        movement.quantity, 'reserved', 'Reserva reactivada', movement.reservation_id
      FROM stock_movement AS movement
      INNER JOIN checkout_reservation AS reservation
        ON reservation.id = movement.reservation_id
      WHERE movement.reason = 'reserved'
        AND reservation.id = ?
        AND reservation.status = 'released'
    `).bind(reservationId),
    env.DB.prepare(`
      UPDATE checkout_reservation
      SET status = 'active', updated_at = ?
      WHERE id = ?
        AND stripe_checkout_session_id = ?
        AND status = 'released'
    `).bind(Date.now(), reservationId, checkoutSessionId),
  ]);
  if (result[1].meta.changes !== 1) {
    throw new Error("No se pudo reactivar la reserva de inventario");
  }
}

async function runReservationRelease(
  statements: [D1PreparedStatement, D1PreparedStatement]
): Promise<void> {
  await env.DB.batch(statements);
}

export async function releaseInventoryReservation(
  reservationId: string
): Promise<void> {
  await runReservationRelease([
    env.DB.prepare(`
      INSERT INTO stock_movement (
        id, variant_id, quantity, reason, note, reservation_id
      )
      SELECT
        lower(hex(randomblob(16))), movement.variant_id,
        -movement.quantity, 'released', ?, movement.reservation_id
      FROM stock_movement AS movement
      INNER JOIN checkout_reservation AS reservation
        ON reservation.id = movement.reservation_id
      WHERE movement.reason = 'reserved'
        AND reservation.status IN ('pending', 'active')
        AND reservation.id = ?
    `).bind("Reserva cancelada", reservationId),
    env.DB.prepare(`
      UPDATE checkout_reservation
      SET status = 'released', updated_at = ?
      WHERE id = ? AND status IN ('pending', 'active')
    `).bind(Date.now(), reservationId),
  ]);
}

export async function releaseInventoryReservationBySession(
  checkoutSessionId: string
): Promise<void> {
  await runReservationRelease([
    env.DB.prepare(`
      INSERT INTO stock_movement (
        id, variant_id, quantity, reason, note, reservation_id
      )
      SELECT
        lower(hex(randomblob(16))), movement.variant_id,
        -movement.quantity, 'released', 'Checkout vencido',
        movement.reservation_id
      FROM stock_movement AS movement
      INNER JOIN checkout_reservation AS reservation
        ON reservation.id = movement.reservation_id
      WHERE movement.reason = 'reserved'
        AND reservation.status IN ('pending', 'active')
        AND reservation.stripe_checkout_session_id = ?
    `).bind(checkoutSessionId),
    env.DB.prepare(`
      UPDATE checkout_reservation
      SET status = 'released', updated_at = ?
      WHERE stripe_checkout_session_id = ?
        AND status IN ('pending', 'active')
    `).bind(Date.now(), checkoutSessionId),
  ]);
}
