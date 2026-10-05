import { Link, useHydrated } from "@tanstack/react-router";
import { cn } from "cn";
import { ShoppingCartIcon } from "lucide-react";

import type { StoreImage, StoreProductCard } from "@/functions/storefront";
import { addToCart, notifyAddedToCart } from "@/lib/cart";
import { kindLabels } from "@/lib/catalog";
import type { VariantKind } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";

const kindBadgeStyles = {
  digital: "bg-brand",
  physical: "bg-mustard",
} satisfies Record<VariantKind, string>;

export function KindBadge({
  className,
  kind,
}: {
  className?: string;
  kind: VariantKind;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm",
        kindBadgeStyles[kind],
        className
      )}
    >
      {kindLabels[kind]}
    </span>
  );
}

export function ProductImage({
  className,
  image,
}: {
  className?: string;
  image: StoreImage | null;
}) {
  if (!image) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[#f6efe6]",
          className
        )}
      >
        <img
          alt=""
          className="w-1/3 max-w-24 opacity-40 grayscale"
          src="/logo-icon.png"
        />
      </div>
    );
  }
  return (
    <img
      alt={image.alt}
      className={cn("object-cover", className)}
      loading="lazy"
      src={image.url}
    />
  );
}

function PriceLabel({ product }: { product: StoreProductCard }) {
  return (
    <>
      {product.hasPriceRange ? "Desde " : null}
      {formatMoney(product.fromPrice)}
    </>
  );
}

export function FeaturedProductCard({
  product,
}: {
  product: StoreProductCard;
}) {
  return (
    <Link
      className="group block"
      params={{ slug: product.slug }}
      to="/products/$slug"
    >
      <div className="relative mb-4 aspect-[3/4] overflow-hidden rounded-[2rem] bg-slate-100 transition-shadow group-hover:shadow-xl">
        <ProductImage
          className="size-full transition-transform duration-500 group-hover:scale-105"
          image={product.image}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <span className="text-brand absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold backdrop-blur">
          {product.category ?? kindLabels[product.kinds[0] ?? "digital"]}
        </span>
      </div>
      <h3 className="group-hover:text-brand text-lg font-bold text-slate-800 transition-colors">
        {product.name}
      </h3>
      {product.summary ? (
        <p className="mb-2 line-clamp-1 text-sm text-slate-500">
          {product.summary}
        </p>
      ) : null}
      <p className="text-xl font-bold text-slate-900">
        <PriceLabel product={product} />
      </p>
    </Link>
  );
}

function QuickAddButton({ product }: { product: StoreProductCard }) {
  const hydrated = useHydrated();
  const variant = product.onlyVariant;
  const className =
    "flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-700 transition-colors hover:bg-brand hover:text-white";

  if (!variant) {
    return (
      <Link
        aria-label={`Elegir opciones de ${product.name}`}
        className={className}
        params={{ slug: product.slug }}
        to="/products/$slug"
      >
        <ShoppingCartIcon aria-hidden className="size-5" />
      </Link>
    );
  }
  return (
    <button
      aria-label={`Agregar ${product.name} al carrito`}
      className={cn(className, "disabled:opacity-40")}
      disabled={!hydrated || variant.maxQuantity === 0}
      onClick={() =>
        notifyAddedToCart(addToCart(variant.id, 1, variant.maxQuantity))
      }
      type="button"
    >
      <ShoppingCartIcon aria-hidden className="size-5" />
    </button>
  );
}

export function CatalogProductCard({ product }: { product: StoreProductCard }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <ProductImage
          className="size-full transition-transform duration-500 group-hover:scale-105"
          image={product.image}
        />
        <div className="absolute top-4 left-4 flex gap-2">
          {product.kinds.map((kind) => (
            <KindBadge key={kind} kind={kind} />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-semibold text-slate-900">
          <Link
            className="after:absolute after:inset-0"
            params={{ slug: product.slug }}
            to="/products/$slug"
          >
            {product.name}
          </Link>
        </h3>
        {product.summary ? (
          <p className="mt-1 line-clamp-1 text-sm text-slate-500">
            {product.summary}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-5">
          <p className="text-xl font-semibold text-slate-900">
            <PriceLabel product={product} />
          </p>
          <div className="relative z-10">
            <QuickAddButton product={product} />
          </div>
        </div>
      </div>
    </article>
  );
}
