import { Link, useHydrated } from "@tanstack/react-router";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";

import type { StoreImage, StoreProductCard } from "@/functions/storefront";
import { addToCart, notifyAddedToCart } from "@/lib/cart";
import { kindLabels } from "@/lib/catalog";
import type { VariantKind } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";

const kindBadgeStyles = {
  digital: "bg-brand-ink text-white",
  physical: "bg-white text-slate-800 ring-1 ring-slate-200",
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
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold",
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
  loading = "lazy",
}: {
  className?: string;
  image: StoreImage | null;
  loading?: "eager" | "lazy";
}) {
  if (!image) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-slate-100",
          className
        )}
      >
        <img
          alt=""
          className="w-1/4 max-w-20 opacity-30 grayscale"
          src="/logo-icon.png"
        />
      </div>
    );
  }
  return (
    <img
      alt={image.alt}
      className={cn("object-cover", className)}
      decoding="async"
      loading={loading}
      src={image.url}
    />
  );
}

export function PriceLabel({ product }: { product: StoreProductCard }) {
  return (
    <>
      {product.hasPriceRange ? (
        <span className="font-normal text-slate-600">Desde </span>
      ) : null}
      {formatMoney(product.fromPrice)}
    </>
  );
}

const badgeBase =
  "inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold";

// One badge slot per card, most urgent first: sold out, low stock, then format.
function CardBadge({ product }: { product: StoreProductCard }) {
  if (product.soldOut) {
    return (
      <span className={cn(badgeBase, "bg-slate-900 text-white")}>Agotado</span>
    );
  }
  if (product.lowStock !== null) {
    return (
      <span className={cn(badgeBase, "bg-amber-100 text-amber-950")}>
        {product.lowStock === 1
          ? "Última pieza"
          : `Últimas ${product.lowStock}`}
      </span>
    );
  }
  if (product.kinds.length > 1) {
    return (
      <span className={cn(badgeBase, "bg-white text-slate-800")}>
        Físico y digital
      </span>
    );
  }
  if (product.kinds[0] === "digital") {
    return (
      <span className={cn(badgeBase, "bg-brand-ink text-white")}>Digital</span>
    );
  }
  return null;
}

function QuickAddButton({ product }: { product: StoreProductCard }) {
  const hydrated = useHydrated();
  const variant = product.onlyVariant;
  const className =
    "flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-900 hover:text-white hover:ring-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

  // Products with options go through their page; only a single Variant adds straight away.
  if (!variant) {
    return null;
  }
  if (variant.maxQuantity === 0) {
    return null;
  }
  return (
    <button
      aria-label={`Agregar ${product.name} al carrito`}
      className={cn(className, "disabled:opacity-40")}
      disabled={!hydrated}
      onClick={() =>
        notifyAddedToCart(addToCart(variant.id, 1, variant.maxQuantity))
      }
      type="button"
    >
      <PlusIcon aria-hidden className="size-5" />
    </button>
  );
}

// One quiet line under the price for Products sold in several options.
function CardDetail({ product }: { product: StoreProductCard }) {
  let text = "";
  if (product.soldOut) {
    text = "Sin existencias por ahora";
  } else if (product.variantCount > 1) {
    text = `${product.variantCount} opciones`;
  }
  // Always one line tall so cards in a row stay aligned.
  return <p className="min-h-5 text-sm text-slate-600">{text}</p>;
}

export function ProductCard({
  headingLevel = "h3",
  product,
  showCategory = true,
}: {
  headingLevel?: "h2" | "h3";
  product: StoreProductCard;
  showCategory?: boolean;
}) {
  const Heading = headingLevel;
  const { soldOut } = product;

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100">
        <ProductImage
          className={cn(
            "size-full transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none",
            soldOut && "opacity-55 grayscale-[30%]"
          )}
          image={product.image}
        />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <CardBadge product={product} />
        </div>
        {soldOut ? null : (
          <div className="absolute right-3 bottom-3 z-10">
            <QuickAddButton product={product} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 pt-3">
        {showCategory && product.category ? (
          <p className="text-sm text-slate-600">{product.category}</p>
        ) : null}
        <Heading className="text-base leading-snug font-semibold text-slate-900">
          <Link
            className="focus-visible:after:outline-brand decoration-slate-400 underline-offset-4 group-hover:underline after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4"
            params={{ slug: product.slug }}
            to="/products/$slug"
          >
            {product.name}
          </Link>
        </Heading>
        <p className="text-base font-semibold text-slate-900 tabular-nums">
          <PriceLabel product={product} />
        </p>
        <CardDetail product={product} />
      </div>
    </article>
  );
}
