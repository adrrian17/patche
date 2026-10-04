import { useQuery } from "@tanstack/react-query";
import {
  Link,
  createFileRoute,
  useHydrated,
  useNavigate,
} from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  Trash2Icon,
  TruckIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { KindBadge, ProductImage } from "@/components/storefront/product-card";
import { createCheckoutSession } from "@/functions/create-checkout-session";
import { getCartDetails } from "@/functions/storefront";
import type { CartLineDetail } from "@/functions/storefront";
import {
  cartCount,
  clearCart,
  reconcileCart,
  removeFromCart,
  setCartQuantity,
  useCart,
} from "@/lib/cart";
import { errorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_store/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Carrito · Patche" }] }),
});

function CartLineCard({
  detail,
  quantity,
}: {
  detail: CartLineDetail;
  quantity: number;
}) {
  const { variant } = detail;

  return (
    <li className="flex gap-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <Link
        className="relative shrink-0"
        params={{ slug: detail.productSlug }}
        tabIndex={-1}
        to="/products/$slug"
      >
        <ProductImage
          className="size-28 rounded-2xl bg-slate-100 sm:size-40"
          image={detail.image}
        />
        <KindBadge className="absolute bottom-2 left-2" kind={variant.kind} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-slate-900">
              <Link
                className="hover:text-brand"
                params={{ slug: detail.productSlug }}
                to="/products/$slug"
              >
                {detail.productName}
              </Link>
            </h2>
            <p className="text-slate-500">{variant.name}</p>
          </div>
          <button
            aria-label={`Quitar ${detail.productName} del carrito`}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            onClick={() => removeFromCart(variant.id)}
            type="button"
          >
            <Trash2Icon aria-hidden className="size-5" />
          </button>
        </div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-4">
          <div className="flex items-center rounded-xl bg-slate-50 shadow-sm">
            <button
              aria-label="Disminuir cantidad"
              className="flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              disabled={quantity <= 1}
              onClick={() => setCartQuantity(variant.id, quantity - 1)}
              type="button"
            >
              <MinusIcon aria-hidden className="size-4" />
            </button>
            <output
              aria-label="Cantidad"
              className="w-10 text-center font-medium"
            >
              {quantity}
            </output>
            <button
              aria-label="Aumentar cantidad"
              className="flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              disabled={quantity >= variant.maxQuantity}
              onClick={() => setCartQuantity(variant.id, quantity + 1)}
              type="button"
            >
              <PlusIcon aria-hidden className="size-4" />
            </button>
          </div>
          <p className="text-2xl font-semibold text-slate-900">
            {formatMoney(variant.priceAmount * quantity)}
          </p>
        </div>
      </div>
    </li>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
      <ShoppingCartIcon aria-hidden className="mb-4 size-10 text-slate-300" />
      <p className="font-medium text-slate-900">Tu carrito está vacío.</p>
      <Link className="text-brand mt-2 hover:underline" to="/products">
        Explorar el catálogo
      </Link>
    </div>
  );
}

function CartPage() {
  const hydrated = useHydrated();
  const lines = useCart();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const variantIds = lines.map((line) => line.variantId);
  const details = useQuery({
    enabled: hydrated && variantIds.length > 0,
    placeholderData: (previous) => previous,
    queryFn: () => getCartDetails({ data: { variantIds } }),
    queryKey: ["cart-details", variantIds],
  });

  useEffect(() => {
    if (details.data && !details.isPlaceholderData) {
      reconcileCart(
        new Map(
          details.data.lines.map(({ variant }) => [
            variant.id,
            variant.maxQuantity,
          ])
        )
      );
    }
  }, [details.data, details.isPlaceholderData]);

  const detailById = new Map(
    details.data?.lines.map((detail) => [detail.variant.id, detail])
  );
  const visibleLines = lines.flatMap((line) => {
    const detail = detailById.get(line.variantId);
    return detail ? [{ detail, quantity: line.quantity }] : [];
  });
  const subtotal = visibleLines.reduce(
    (total, { detail, quantity }) =>
      total + detail.variant.priceAmount * quantity,
    0
  );
  const hasPhysical = visibleLines.some(
    ({ detail }) => detail.variant.kind === "physical"
  );
  const shipping = hasPhysical ? (details.data?.shippingRateAmount ?? 0) : 0;
  const count = cartCount(lines);
  const loading = !hydrated || (lines.length > 0 && !details.data);

  async function handleCheckout() {
    if (!user) {
      toast.info("Inicia sesión para completar tu compra.");
      await navigate({ search: { next: "/cart" }, to: "/login" });
      return;
    }
    setPending(true);
    try {
      const session = await createCheckoutSession({
        data: {
          items: visibleLines.map(({ detail, quantity }) => ({
            quantity,
            variantId: detail.variant.id,
          })),
        },
      });
      // ponytail: Stripe returns to /dashboard, so the cart empties before leaving; keep it until a confirmation page exists.
      clearCart();
      window.location.assign(session.url);
    } catch (error) {
      toast.error(
        errorMessage(
          error instanceof Error ? error : null,
          "No pudimos iniciar el pago"
        )
      );
      setPending(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-slate-900">Carrito de compras</h1>
      <p className="mt-2 mb-10 text-lg text-slate-500">
        {count === 1
          ? "Tienes 1 artículo en tu carrito"
          : `Tienes ${count} artículos en tu carrito`}
      </p>

      {!loading && visibleLines.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_28rem]">
          <div>
            <ul aria-busy={loading} className="space-y-6">
              {visibleLines.map(({ detail, quantity }) => (
                <CartLineCard
                  detail={detail}
                  key={detail.variant.id}
                  quantity={quantity}
                />
              ))}
            </ul>
            <Link
              className="text-brand mt-10 inline-flex items-center gap-3 text-lg font-medium hover:underline"
              to="/products"
            >
              <ArrowLeftIcon aria-hidden className="size-5" />
              Seguir comprando
            </Link>
          </div>

          <aside className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50 lg:sticky lg:top-28">
            <h2 className="mb-8 text-2xl font-semibold text-slate-900">
              Resumen del pedido
            </h2>
            <dl className="space-y-5 text-lg text-slate-600">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="text-slate-900">{formatMoney(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Envío</dt>
                <dd className="text-slate-900">
                  {hasPhysical ? formatMoney(shipping) : "No aplica"}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-8">
                <dt className="text-xl font-semibold text-slate-900">Total</dt>
                <dd className="text-brand text-3xl font-semibold">
                  {formatMoney(subtotal + shipping)}
                </dd>
              </div>
            </dl>
            <button
              className="bg-brand shadow-brand/30 hover:bg-brand/90 mt-8 flex h-16 w-full items-center justify-center gap-3 rounded-2xl text-xl font-semibold text-white shadow-lg transition-colors disabled:opacity-60"
              disabled={loading || pending || visibleLines.length === 0}
              onClick={handleCheckout}
              type="button"
            >
              {pending ? "Redirigiendo..." : "Proceder al pago"}
              <ArrowRightIcon aria-hidden className="size-5" />
            </button>
            <div className="mt-6 flex gap-4 rounded-2xl bg-slate-50 p-5">
              <TruckIcon
                aria-hidden
                className="text-mustard mt-0.5 size-5 shrink-0"
              />
              <div className="text-sm">
                <p className="font-semibold text-slate-900">
                  Envío con tarifa fija
                </p>
                <p className="text-slate-500">
                  Los productos digitales no pagan envío.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
