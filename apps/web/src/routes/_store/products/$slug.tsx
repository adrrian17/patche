import {
  Link,
  createFileRoute,
  notFound,
  useHydrated,
} from "@tanstack/react-router";
import { cn } from "cn";
import {
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  TruckIcon,
} from "lucide-react";
import { useState } from "react";

import { KindBadge, ProductImage } from "@/components/storefront/product-card";
import { getStoreProduct, listStoreProducts } from "@/functions/storefront";
import type { StoreProduct } from "@/functions/storefront";
import { addToCart, notifyAddedToCart } from "@/lib/cart";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_store/products/$slug")({
  component: ProductPage,
  loader: async ({ params }) => {
    const product = await getStoreProduct({ data: { slug: params.slug } });
    if (!product) {
      throw notFound();
    }
    const related = await listStoreProducts({
      data: {
        category: product.category?.slug,
        excludeSlug: product.slug,
        limit: 4,
      },
    });
    return { product, related };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${loaderData.product.name} · Patche` }] : [],
  }),
  notFoundComponent: ProductNotFound,
});

function ProductNotFound() {
  return (
    <div className="container mx-auto flex flex-col items-center px-4 py-24 text-center">
      <h1 className="text-3xl font-bold text-slate-900">
        Este producto no está disponible
      </h1>
      <Link
        className="text-brand mt-4 font-medium hover:underline"
        to="/products"
      >
        Volver al catálogo
      </Link>
    </div>
  );
}

function Gallery({ product }: { product: StoreProduct }) {
  const [selected, setSelected] = useState(0);
  const image = product.images[selected] ?? null;

  return (
    <div className="space-y-4">
      <ProductImage
        className="aspect-square w-full rounded-3xl bg-slate-100"
        image={image}
      />
      {product.images.length > 1 ? (
        <div className="grid grid-cols-4 gap-4">
          {product.images.map((item, index) => (
            <button
              aria-label={`Ver imagen ${index + 1}`}
              aria-pressed={index === selected}
              className={cn(
                "overflow-hidden rounded-2xl border-2 border-transparent bg-slate-100 transition-colors",
                index === selected ? "border-brand" : "hover:border-slate-200"
              )}
              key={item.url}
              onClick={() => setSelected(index)}
              type="button"
            >
              <img
                alt=""
                className="aspect-square w-full object-cover"
                src={item.url}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function QuantityStepper({
  max,
  onChange,
  value,
}: {
  max: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div className="flex items-center rounded-2xl bg-slate-100 p-1">
      <button
        aria-label="Disminuir cantidad"
        className="flex size-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-white disabled:opacity-40"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        type="button"
      >
        <MinusIcon aria-hidden className="size-4" />
      </button>
      <output aria-label="Cantidad" className="w-8 text-center font-semibold">
        {value}
      </output>
      <button
        aria-label="Aumentar cantidad"
        className="flex size-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-white disabled:opacity-40"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        type="button"
      >
        <PlusIcon aria-hidden className="size-4" />
      </button>
    </div>
  );
}

function PurchasePanel({ product }: { product: StoreProduct }) {
  const hydrated = useHydrated();
  const [selectedId, setSelectedId] = useState(
    () =>
      (
        product.variants.find(({ maxQuantity }) => maxQuantity > 0) ??
        product.variants[0]
      )?.id
  );
  const [quantity, setQuantity] = useState(1);
  const selected =
    product.variants.find(({ id }) => id === selectedId) ?? product.variants[0];
  const soldOut = selected.maxQuantity === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-slate-900">
          {formatMoney(selected.priceAmount)}
        </p>
        <span className="text-sm text-slate-400">MXN</span>
      </div>

      {product.description ? (
        <p className="leading-relaxed whitespace-pre-line text-slate-600">
          {product.description}
        </p>
      ) : null}

      {product.variants.length > 1 ? (
        <fieldset>
          <legend className="sr-only">Opciones</legend>
          <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
            {product.variants.map((item) => (
              <label
                className={cn(
                  "has-focus-visible:ring-brand cursor-pointer rounded-xl px-5 py-2.5 text-sm font-medium text-slate-500 transition-all has-focus-visible:ring-2",
                  item.id === selected.id && "bg-white text-slate-900 shadow-sm"
                )}
                key={item.id}
              >
                <input
                  checked={item.id === selected.id}
                  className="sr-only"
                  name="variant"
                  onChange={() => {
                    setSelectedId(item.id);
                    setQuantity(1);
                  }}
                  type="radio"
                  value={item.id}
                />
                {item.name}
                {item.maxQuantity === 0 ? " (agotado)" : null}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="flex gap-4">
        {selected.kind === "physical" && !soldOut ? (
          <QuantityStepper
            max={selected.maxQuantity}
            onChange={setQuantity}
            value={quantity}
          />
        ) : null}
        <button
          className="bg-brand shadow-brand/20 hover:bg-brand/90 flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl font-semibold text-white shadow-lg transition-colors disabled:opacity-50 disabled:shadow-none"
          disabled={!hydrated || soldOut}
          onClick={() =>
            notifyAddedToCart(
              addToCart(selected.id, quantity, selected.maxQuantity)
            )
          }
          type="button"
        >
          <ShoppingBagIcon aria-hidden className="size-5" />
          {soldOut ? "Agotado" : "Agregar al carrito"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
        <div className="flex items-center gap-3">
          <span className="bg-brand/10 text-brand flex size-9 items-center justify-center rounded-full">
            <TruckIcon aria-hidden className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-900">
              Envío a todo México
            </p>
            <p className="text-xs text-slate-500">Tarifa fija por pedido</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-mustard/15 text-mustard flex size-9 items-center justify-center rounded-full">
            <ShieldCheckIcon aria-hidden className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-900">Pago seguro</p>
            <p className="text-xs text-slate-500">Procesado por Stripe</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductPage() {
  const { product, related } = Route.useLoaderData();
  const kinds = [...new Set(product.variants.map(({ kind }) => kind))];

  return (
    <div className="container mx-auto px-4 py-8">
      <nav
        aria-label="Ruta de navegación"
        className="mb-8 text-sm text-slate-500"
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link className="hover:text-brand" to="/">
              Inicio
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <ChevronRightIcon aria-hidden className="size-3.5" />
            <Link
              className="hover:text-brand"
              search={
                product.category ? { category: product.category.slug } : {}
              }
              to="/products"
            >
              {product.category?.name ?? "Catálogo"}
            </Link>
          </li>
          <li className="flex items-center gap-1.5 text-slate-900">
            <ChevronRightIcon aria-hidden className="size-3.5 text-slate-500" />
            <span aria-current="page">{product.name}</span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-12 lg:grid-cols-2">
        <Gallery product={product} />
        <div className="space-y-4">
          <div className="flex gap-2">
            {kinds.map((kind) => (
              <KindBadge key={kind} kind={kind} />
            ))}
          </div>
          <h1 className="text-4xl font-bold text-slate-900">{product.name}</h1>
          {/* Remount when the slug changes so selection and quantity reset. */}
          <PurchasePanel key={product.slug} product={product} />
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-20 border-t border-slate-100 pt-16">
          <h2 className="mb-8 text-2xl font-bold text-slate-900">
            También te puede gustar
          </h2>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {related.map((item) => (
              <Link
                className="group"
                key={item.slug}
                params={{ slug: item.slug }}
                to="/products/$slug"
              >
                <ProductImage
                  className="mb-3 aspect-[4/5] w-full rounded-2xl bg-slate-100 transition-shadow group-hover:shadow-lg"
                  image={item.image}
                />
                <p className="group-hover:text-brand font-medium text-slate-900">
                  {item.name}
                </p>
                <p className="text-sm text-slate-500">
                  {formatMoney(item.fromPrice)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
