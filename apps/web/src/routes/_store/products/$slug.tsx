import {
  Link,
  createFileRoute,
  notFound,
  useHydrated,
} from "@tanstack/react-router";
import { cn } from "cn";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DownloadIcon,
  MinusIcon,
  PlusIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  ProductCard,
  ProductImage,
} from "@/components/storefront/product-card";
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

const container = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";
const lowStockLimit = 5;

function ProductNotFound() {
  return (
    <div
      className={`${container} flex flex-col items-center py-24 text-center`}
    >
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Este producto no está disponible
      </h1>
      <p className="mt-2 text-slate-600">
        Puede que se haya agotado o que el enlace ya no funcione.
      </p>
      <Link
        className="bg-brand-ink mt-6 inline-flex h-11 items-center rounded-full px-6 font-semibold text-white transition-colors hover:bg-slate-900"
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
    <div className="space-y-3">
      <ProductImage
        className="aspect-square w-full rounded-2xl bg-slate-100"
        image={image}
        loading="eager"
      />
      {product.images.length > 1 ? (
        <div className="grid grid-cols-5 gap-3">
          {product.images.map((item, index) => (
            <button
              aria-label={`Ver imagen ${index + 1}`}
              aria-pressed={index === selected}
              className={cn(
                "focus-visible:outline-brand overflow-hidden rounded-xl bg-slate-100 ring-2 ring-transparent ring-offset-2 ring-offset-white transition focus-visible:outline-2 focus-visible:outline-offset-4",
                index === selected
                  ? "ring-brand-ink"
                  : "opacity-80 hover:opacity-100"
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
  const buttonClass =
    "flex size-11 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-brand";

  return (
    <div className="flex h-12 items-center rounded-full border border-slate-300 bg-white px-0.5">
      <button
        aria-label="Disminuir cantidad"
        className={buttonClass}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        type="button"
      >
        <MinusIcon aria-hidden className="size-4" />
      </button>
      <output
        aria-label="Cantidad"
        className="w-7 text-center font-semibold tabular-nums"
      >
        {value}
      </output>
      <button
        aria-label="Aumentar cantidad"
        className={buttonClass}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        type="button"
      >
        <PlusIcon aria-hidden className="size-4" />
      </button>
    </div>
  );
}

function AvailabilityNote({
  variant,
}: {
  variant: StoreProduct["variants"][number];
}) {
  if (variant.kind === "digital") {
    return (
      <p className="text-brand-ink flex items-center gap-2 text-sm font-medium">
        <DownloadIcon aria-hidden className="size-4" />
        Descarga digital, lista en tu cuenta al pagar
      </p>
    );
  }
  if (variant.maxQuantity === 0) {
    return (
      <p className="text-sm font-medium text-slate-600">
        Agotado por ahora. Vuelve pronto.
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          variant.maxQuantity <= lowStockLimit ? "bg-mustard" : "bg-brand"
        )}
      />
      {variant.maxQuantity <= lowStockLimit
        ? `Solo quedan ${variant.maxQuantity} en existencia`
        : "Disponible, listo para enviar"}
    </p>
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
  const pricesDiffer =
    new Set(product.variants.map(({ priceAmount }) => priceAmount)).size > 1;
  const buttonRef = useRef<HTMLButtonElement>(null);
  // The mobile bar shows only once the main button has scrolled out of view.
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry?.isIntersecting ?? true);
    });
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  function add() {
    notifyAddedToCart(addToCart(selected.id, quantity, selected.maxQuantity));
  }

  return (
    <div className="space-y-6">
      <p className="text-2xl font-semibold text-slate-900 tabular-nums">
        {formatMoney(selected.priceAmount)}
        <span className="ml-1.5 text-sm font-normal text-slate-500">MXN</span>
      </p>

      {product.variants.length > 1 ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-900">
            Opción: <span className="text-slate-600">{selected.name}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((item) => (
              <label
                className={cn(
                  "has-focus-visible:outline-brand flex min-h-11 cursor-pointer items-center rounded-full border px-5 text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
                  item.id === selected.id
                    ? "border-brand-ink bg-brand-ink text-white"
                    : "border-field bg-white text-slate-800 hover:border-slate-600",
                  item.maxQuantity === 0 &&
                    item.id !== selected.id &&
                    "text-slate-500 line-through decoration-slate-400"
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
                {pricesDiffer ? (
                  <span
                    className={cn(
                      "ml-2 tabular-nums",
                      item.id === selected.id
                        ? "text-white/80"
                        : "text-slate-500"
                    )}
                  >
                    {formatMoney(item.priceAmount)}
                  </span>
                ) : null}
                {item.maxQuantity === 0 ? (
                  <span className="sr-only"> (agotado)</span>
                ) : null}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <AvailabilityNote variant={selected} />

      <div className="flex gap-3">
        {selected.kind === "physical" && !soldOut ? (
          <QuantityStepper
            max={selected.maxQuantity}
            onChange={setQuantity}
            value={quantity}
          />
        ) : null}
        <button
          className="bg-brand-ink focus-visible:outline-brand flex h-12 flex-1 items-center justify-center rounded-full px-6 font-semibold text-white transition-colors hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:bg-slate-300 disabled:text-slate-600"
          disabled={!hydrated || soldOut}
          onClick={add}
          ref={buttonRef}
          type="button"
        >
          {soldOut ? "Agotado" : "Agregar al carrito"}
        </button>
      </div>

      {inView || soldOut ? null : (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-600">{selected.name}</p>
              <p className="text-lg leading-tight font-semibold text-slate-900 tabular-nums">
                {formatMoney(selected.priceAmount * quantity)}
              </p>
            </div>
            <button
              className="bg-brand-ink focus-visible:outline-brand ml-auto flex h-12 flex-1 items-center justify-center rounded-full px-6 font-semibold text-white transition-colors hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2"
              disabled={!hydrated}
              onClick={add}
              type="button"
            >
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Details({
  children,
  open = false,
  title,
}: {
  children: ReactNode;
  open?: boolean;
  title: string;
}) {
  return (
    <details className="group border-b border-slate-200" open={open}>
      <summary className="focus-visible:outline-brand flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDownIcon
          aria-hidden
          className="size-5 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="pb-5 leading-relaxed text-slate-600">{children}</div>
    </details>
  );
}

function ProductPage() {
  const { product, related } = Route.useLoaderData();
  const sellsDigital = product.variants.some(({ kind }) => kind === "digital");
  const sellsPhysical = product.variants.some(
    ({ kind }) => kind === "physical"
  );

  return (
    <div className={`${container} pt-5 pb-28 md:pt-8 lg:pb-24`}>
      <nav
        aria-label="Ruta de navegación"
        className="mb-5 text-sm text-slate-500 md:mb-8"
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link className="hover:text-slate-900 hover:underline" to="/">
              Inicio
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <ChevronRightIcon aria-hidden className="size-3.5" />
            <Link
              className="hover:text-slate-900 hover:underline"
              search={
                product.category ? { category: product.category.slug } : {}
              }
              to="/products"
            >
              {product.category?.name ?? "Catálogo"}
            </Link>
          </li>
          <li className="flex min-w-0 items-center gap-1.5 text-slate-900">
            <ChevronRightIcon aria-hidden className="size-3.5 text-slate-500" />
            <span aria-current="page" className="truncate">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
        <Gallery key={product.slug} product={product} />
        <div className="lg:sticky lg:top-40 lg:self-start xl:top-28">
          {product.category ? (
            <Link
              className="text-brand-ink text-sm font-semibold hover:underline"
              search={{ category: product.category.slug }}
              to="/products"
            >
              {product.category.name}
            </Link>
          ) : null}
          <h1 className="mt-2 mb-4 text-3xl leading-tight font-bold tracking-tight text-balance text-slate-900 md:text-4xl">
            {product.name}
          </h1>
          {/* Remount when the slug changes so selection and quantity reset. */}
          <PurchasePanel key={product.slug} product={product} />
          <div className="mt-8 border-t border-slate-200">
            {product.description ? (
              <Details open title="Descripción">
                <p className="whitespace-pre-line">{product.description}</p>
              </Details>
            ) : null}
            <Details open title="Envíos y descargas">
              <div className="space-y-2">
                {sellsPhysical ? (
                  <p>
                    Enviamos a todo México con una sola tarifa fija por pedido,
                    sin importar cuántos productos lleves.
                  </p>
                ) : null}
                {sellsDigital ? (
                  <p>
                    Los productos digitales no pagan envío. En cuanto se
                    confirma el pago, los descargas desde Mis pedidos.
                  </p>
                ) : null}
              </div>
            </Details>
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section
          aria-labelledby="related-title"
          className="mt-16 border-t border-slate-200 pt-12 md:mt-24 md:pt-16"
        >
          <h2
            className="mb-8 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl"
            id="related-title"
          >
            También te puede gustar
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
