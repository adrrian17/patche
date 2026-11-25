import { useQuery } from "@tanstack/react-query";
import {
  Link,
  createFileRoute,
  useHydrated,
  useNavigate,
} from "@tanstack/react-router";
import { cn } from "cn";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  ShieldCheckIcon,
  Trash2Icon,
  TruckIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  KindBadge,
  ProductCard,
  ProductImage,
} from "@/components/storefront/product-card";
import { createCheckoutSession } from "@/functions/create-checkout-session";
import { getCartDetails, listStoreProducts } from "@/functions/storefront";
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
  loader: () => listStoreProducts({ data: { limit: 8 } }),
  head: () => ({ meta: [{ title: "Carrito · Patche" }] }),
  component: CartPage,
});

function Suggestions({
  exclude,
  title,
}: {
  exclude: Set<string>;
  title: string;
}) {
  const products = Route.useLoaderData()
    .filter((product) => !exclude.has(product.slug) && !product.soldOut)
    .slice(0, 4);
  if (products.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="cart-suggestions-title"
      className="mt-16 border-t border-slate-200 pt-12 md:mt-20"
    >
      <h2
        className="mb-8 text-2xl font-bold tracking-tight text-slate-900"
        id="cart-suggestions-title"
      >
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}

function CartLineCard({
  detail,
  quantity,
}: {
  detail: CartLineDetail;
  quantity: number;
}) {
  const { variant } = detail;

  return (
    <li className="flex gap-4 py-6 first:pt-0 sm:gap-6">
      <Link
        aria-hidden
        className="relative shrink-0"
        params={{ slug: detail.productSlug }}
        tabIndex={-1}
        to="/products/$slug"
      >
        <ProductImage
          className="size-24 rounded-xl bg-slate-100 sm:size-32"
          image={detail.image}
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base leading-snug font-semibold text-slate-900 sm:text-lg">
              <Link
                className="underline-offset-4 hover:underline"
                params={{ slug: detail.productSlug }}
                to="/products/$slug"
              >
                {detail.productName}
              </Link>
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              {variant.name}
              <KindBadge kind={variant.kind} />
            </p>
          </div>
          <button
            aria-label={`Quitar ${detail.productName} del carrito`}
            className="focus-visible:outline-brand -mt-2 -mr-2 flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2"
            onClick={() => removeFromCart(variant.id)}
            type="button"
          >
            <Trash2Icon aria-hidden className="size-4" />
            <span aria-hidden>Quitar</span>
          </button>
        </div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-4">
          {variant.kind === "digital" ? (
            <p className="text-sm text-slate-600">Descarga digital</p>
          ) : (
            <div className="flex h-11 items-center rounded-full border border-slate-300 bg-white">
              <button
                aria-label="Disminuir cantidad"
                className="flex size-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                disabled={quantity <= 1}
                onClick={() => setCartQuantity(variant.id, quantity - 1)}
                type="button"
              >
                <MinusIcon aria-hidden className="size-4" />
              </button>
              <output
                aria-label="Cantidad"
                className="w-8 text-center font-semibold tabular-nums"
              >
                {quantity}
              </output>
              <button
                aria-label="Aumentar cantidad"
                className="flex size-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                disabled={quantity >= variant.maxQuantity}
                onClick={() => setCartQuantity(variant.id, quantity + 1)}
                type="button"
              >
                <PlusIcon aria-hidden className="size-4" />
              </button>
            </div>
          )}
          <div className="text-right">
            <p className="text-lg font-semibold text-slate-900 tabular-nums">
              {formatMoney(variant.priceAmount * quantity)}
            </p>
            {quantity > 1 ? (
              <p className="text-sm text-slate-500 tabular-nums">
                {formatMoney(variant.priceAmount)} c/u
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyCart() {
  return (
    <div className="bg-mint paper-dots mt-8 flex flex-col items-center rounded-2xl px-6 py-12 text-center md:mt-10 md:py-16">
      <span className="text-brand-ink mb-5 flex size-14 items-center justify-center rounded-full bg-white">
        <ShoppingBagIcon aria-hidden className="size-6" />
      </span>
      <p className="text-xl font-semibold text-slate-900">
        Tu carrito está vacío.
      </p>
      <p className="mt-1 max-w-sm text-slate-600">
        Encuentra una agenda para el año, una libreta nueva o el planner digital
        que te falta.
      </p>
      <Link
        className="bg-brand-ink focus-visible:outline-brand mt-6 inline-flex h-12 items-center rounded-full px-7 font-semibold text-white transition-colors hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2"
        to="/products"
      >
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
    <div className="mx-auto w-full max-w-7xl px-4 pt-8 pb-28 sm:px-6 md:pt-12 lg:px-8 lg:pb-24">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
        Carrito de compras
      </h1>
      <p
        className={cn(
          "mt-2 mb-8 text-slate-600 md:mb-10",
          count === 0 && "sr-only"
        )}
      >
        {count === 1
          ? "Tienes 1 artículo en tu carrito"
          : `Tienes ${count} artículos en tu carrito`}
      </p>

      {!loading && visibleLines.length === 0 ? (
        <>
          <EmptyCart />
          <Suggestions exclude={new Set()} title="Te puede gustar" />
        </>
      ) : (
        <>
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-14">
            <div>
              <ul
                aria-busy={loading}
                className="divide-y divide-slate-200 border-y border-slate-200 pt-6"
              >
                {visibleLines.map(({ detail, quantity }) => (
                  <CartLineCard
                    detail={detail}
                    key={detail.variant.id}
                    quantity={quantity}
                  />
                ))}
              </ul>
              <Link
                className="text-brand-ink mt-6 inline-flex items-center gap-2 font-semibold underline-offset-4 hover:underline"
                to="/products"
              >
                <ArrowLeftIcon aria-hidden className="size-4" />
                Seguir comprando
              </Link>
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 lg:sticky lg:top-40 xl:top-28">
              <h2 className="mb-6 text-xl font-bold tracking-tight text-slate-900">
                Resumen del pedido
              </h2>
              <dl className="space-y-3 text-slate-600">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="text-slate-900 tabular-nums">
                    {formatMoney(subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Envío</dt>
                  <dd className="text-slate-900 tabular-nums">
                    {hasPhysical ? formatMoney(shipping) : "No aplica"}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-slate-200 pt-4">
                  <dt className="font-semibold text-slate-900">Total</dt>
                  <dd className="text-2xl font-semibold text-slate-900 tabular-nums">
                    {formatMoney(subtotal + shipping)}
                  </dd>
                </div>
              </dl>
              <button
                className="bg-brand-ink focus-visible:outline-brand mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full font-semibold text-white transition-colors hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:bg-slate-300 disabled:text-slate-600"
                disabled={loading || pending || visibleLines.length === 0}
                onClick={handleCheckout}
                type="button"
              >
                {pending ? "Redirigiendo..." : "Proceder al pago"}
                <ArrowRightIcon aria-hidden className="size-4" />
              </button>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <TruckIcon
                    aria-hidden
                    className="text-brand-ink mt-0.5 size-4 shrink-0"
                  />
                  Envío con tarifa fija. Los productos digitales no pagan envío.
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheckIcon
                    aria-hidden
                    className="text-brand-ink mt-0.5 size-4 shrink-0"
                  />
                  Pagas en la página segura de Stripe.
                </li>
              </ul>
            </aside>
          </div>
          <Suggestions
            exclude={
              new Set(visibleLines.map(({ detail }) => detail.productSlug))
            }
            title="Completa tu pedido"
          />
          {visibleLines.length > 0 ? (
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
              <div className="mx-auto flex max-w-xl items-center gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-slate-600">Total</p>
                  <p className="text-lg leading-tight font-semibold text-slate-900 tabular-nums">
                    {formatMoney(subtotal + shipping)}
                  </p>
                </div>
                <button
                  className="bg-brand-ink focus-visible:outline-brand ml-auto flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 font-semibold text-white transition-colors hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:bg-slate-300 disabled:text-slate-600"
                  disabled={loading || pending}
                  onClick={handleCheckout}
                  type="button"
                >
                  {pending ? "Redirigiendo..." : "Pagar ahora"}
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
