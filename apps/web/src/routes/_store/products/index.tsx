import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { ChevronDownIcon, SearchXIcon } from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod";

import { ProductCard } from "@/components/storefront/product-card";
import { listStoreCategories, listStoreProducts } from "@/functions/storefront";
import { catalogSorts, storeKinds } from "@/lib/catalog";
import type { CatalogSort, VariantKind } from "@/lib/catalog";

const searchSchema = z.object({
  category: z.string().max(160).optional(),
  kind: z.enum(storeKinds).optional(),
  q: z.string().trim().max(160).optional(),
  sort: z.enum(catalogSorts).optional(),
});

export const Route = createFileRoute("/_store/products/")({
  component: CatalogPage,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [products, categories] = await Promise.all([
      listStoreProducts({ data: deps }),
      listStoreCategories(),
    ]);
    return { categories, products };
  },
  head: () => ({ meta: [{ title: "Catálogo · Patche" }] }),
});

type CatalogSearch = z.infer<typeof searchSchema>;

function omitFilter(
  search: CatalogSearch,
  filter: keyof CatalogSearch
): CatalogSearch {
  return Object.fromEntries(
    Object.entries(search).filter(([key]) => key !== filter)
  );
}

const sortLabels = {
  newest: "Recientes",
  "price-asc": "Menor precio",
  "price-desc": "Mayor precio",
} satisfies Record<CatalogSort, string>;

const kindFilterLabels = {
  digital: "Digitales",
  physical: "Físicos",
} satisfies Record<VariantKind, string>;

const kindDescriptions = {
  digital:
    "Planners y plantillas para tablet. Los descargas desde tu cuenta al pagar.",
  physical: "Agendas, libretas y accesorios que te enviamos a casa.",
} satisfies Record<VariantKind, string>;

function Chip({
  active,
  children,
  search,
}: {
  active: boolean;
  children: ReactNode;
  search: CatalogSearch;
}) {
  return (
    <Link
      aria-current={active ? "true" : undefined}
      className={cn(
        "focus-visible:outline-brand inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        active
          ? "border-brand-ink bg-brand-ink text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900"
      )}
      search={search}
      to="/products"
    >
      {children}
    </Link>
  );
}

function CatalogPage() {
  const { categories, products } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const activeCategory = categories.find(
    (category) => category.slug === search.category
  );
  let title = activeCategory?.name ?? "Todo el catálogo";
  if (search.q) {
    title = `Resultados para “${search.q}”`;
  }
  const description = search.kind
    ? kindDescriptions[search.kind]
    : "Papelería para planear, escribir y crear, física y digital.";
  const hasFilters = Boolean(search.category || search.kind || search.q);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-8 pb-16 sm:px-6 md:pt-12 md:pb-24 lg:px-8">
      <header className="mb-5 space-y-2 md:mb-8">
        <h1
          className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl"
          id="catalog-title"
        >
          {title}
        </h1>
        <p className="hidden max-w-2xl text-slate-600 sm:block">
          {description}
        </p>
      </header>

      <nav aria-label="Categorías" className="mb-4">
        <ul className="-mx-4 flex gap-2 overflow-x-auto [mask-image:linear-gradient(to_right,black_85%,transparent)] px-4 pb-1 sm:mx-0 sm:px-0 lg:flex-wrap lg:overflow-visible lg:[mask-image:none]">
          <li>
            <Chip
              active={!search.category}
              search={omitFilter(search, "category")}
            >
              Todo
            </Chip>
          </li>
          {categories.map((category) => (
            <li key={category.slug}>
              <Chip
                active={search.category === category.slug}
                search={{ ...search, category: category.slug }}
              >
                {category.name}
              </Chip>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-3 md:mb-10">
        <fieldset className="flex rounded-full border border-slate-200 bg-white p-1">
          <legend className="sr-only">Tipo de producto</legend>
          {[undefined, ...storeKinds].map((kind) => {
            const active = search.kind === kind;
            return (
              <Link
                aria-current={active ? "true" : undefined}
                className={cn(
                  "focus-visible:outline-brand inline-flex h-9 items-center rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-4",
                  active
                    ? "bg-brand-ink text-white"
                    : "text-slate-600 hover:text-slate-900"
                )}
                key={kind ?? "all"}
                search={kind ? { ...search, kind } : omitFilter(search, "kind")}
                to="/products"
              >
                {kind ? kindFilterLabels[kind] : "Todos"}
              </Link>
            );
          })}
        </fieldset>
        <div className="flex items-center gap-4">
          <p
            aria-live="polite"
            className="hidden text-sm text-slate-600 tabular-nums sm:block"
          >
            {products.length === 1
              ? "1 producto"
              : `${products.length} productos`}
          </p>
          <label className="relative block">
            <span className="sr-only">Ordenar por</span>
            <select
              className="focus:border-brand focus:ring-brand/20 border-field h-10 appearance-none rounded-full border bg-white pr-9 pl-4 text-sm font-medium text-slate-900 outline-none focus:ring-4"
              onChange={(event) => {
                const sort = catalogSorts.find(
                  (value) => value === event.target.value
                );
                navigate({ search: { ...search, sort } });
              }}
              value={search.sort ?? "newest"}
            >
              {catalogSorts.map((sort) => (
                <option key={sort} value={sort}>
                  {sortLabels[sort]}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500"
            />
          </label>
        </div>
      </div>

      <section aria-labelledby="catalog-title">
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                headingLevel="h2"
                key={product.slug}
                product={product}
                showCategory={!search.category}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center md:py-20">
            <SearchXIcon aria-hidden className="mb-4 size-9 text-slate-400" />
            <p className="text-lg font-semibold text-slate-900">
              No encontramos productos con estos filtros.
            </p>
            <p className="mt-1 max-w-sm text-slate-600">
              Prueba con otra palabra o quita algún filtro para ver más
              opciones.
            </p>
            {hasFilters ? (
              <Link
                className="bg-brand-ink mt-6 inline-flex h-11 items-center rounded-full px-6 font-semibold text-white transition-colors hover:bg-slate-900"
                to="/products"
              >
                Ver todo el catálogo
              </Link>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
