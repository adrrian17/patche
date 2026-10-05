import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { z } from "zod";

export interface CartLine {
  quantity: number;
  variantId: string;
}

// Checkout accepts at most ten distinct Variants per session.
export const maxCartLines = 10;

const storageKey = "patche.cart";
const cartSchema = z
  .array(
    z.object({
      quantity: z.number().int().min(1).max(99),
      variantId: z.string().min(1).max(32),
    })
  )
  .max(maxCartLines);
const emptyCart: CartLine[] = [];
const listeners = new Set<() => void>();
let snapshot: CartLine[] | null = null;

function read(): CartLine[] {
  try {
    const parsed = cartSchema.safeParse(
      JSON.parse(localStorage.getItem(storageKey) ?? "[]")
    );
    return parsed.success ? parsed.data : emptyCart;
  } catch {
    return emptyCart;
  }
}

function write(next: CartLine[]) {
  snapshot = next;
  localStorage.setItem(storageKey, JSON.stringify(next));
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === storageKey) {
      snapshot = null;
      listener();
    }
  }
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  snapshot ??= read();
  return snapshot;
}

export function useCart() {
  return useSyncExternalStore(subscribe, getSnapshot, () => emptyCart);
}

export function cartCount(lines: CartLine[]) {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

// Returns false when the cart already holds the maximum number of distinct Variants.
export function addToCart(variantId: string, quantity: number, max: number) {
  const lines = getSnapshot();
  const current = lines.find((line) => line.variantId === variantId);
  if (!current && lines.length >= maxCartLines) {
    return false;
  }
  const nextQuantity = Math.min((current?.quantity ?? 0) + quantity, max);
  write(
    current
      ? lines.map((line) =>
          line === current ? { ...line, quantity: nextQuantity } : line
        )
      : [...lines, { quantity: nextQuantity, variantId }]
  );
  return true;
}

export function notifyAddedToCart(added: boolean) {
  if (added) {
    toast.success("Agregado al carrito");
  } else {
    toast.error("Tu carrito ya tiene 10 productos distintos.");
  }
}

export function setCartQuantity(variantId: string, quantity: number) {
  write(
    getSnapshot().map((line) =>
      line.variantId === variantId ? { ...line, quantity } : line
    )
  );
}

export function removeFromCart(variantId: string) {
  write(getSnapshot().filter((line) => line.variantId !== variantId));
}

// Drops Variants the store no longer sells and clamps quantities to what is in Stock.
export function reconcileCart(available: Map<string, number>) {
  const lines = getSnapshot();
  const next = lines.flatMap((line) => {
    const max = available.get(line.variantId) ?? 0;
    return max > 0 ? [{ ...line, quantity: Math.min(line.quantity, max) }] : [];
  });
  const changed =
    next.length !== lines.length ||
    next.some((line, index) => line.quantity !== lines[index]?.quantity);
  if (changed) {
    write(next);
  }
}

export function clearCart() {
  write(emptyCart);
}
