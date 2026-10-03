import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { ListFilterIcon, PackageSearchIcon } from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod";

import { CatalogProductCard } from "@/components/storefront/product-card";
import { listStoreCategories, listStoreProducts } from "@/functions/storefront";
import { catalogSorts, kindLabels, storeKinds } from "@/lib/catalog";
import type { CatalogSort } from "@/lib/catalog";

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
  newest: "Más recientes",
  "price-asc": "Precio: menor a mayor",
  "price-desc": "Precio: mayor a menor",
} satisfies Record<CatalogSort, string>;

function FilterOption({
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
      className="group flex items-center gap-3 py-1.5 text-slate-600 transition-colors hover:text-slate-900"
      search={search}
      to="/products"
    >
      <span
        aria-hidden
        className={cn(
          "flex size-4 items-center justify-center rounded-full border border-slate-300 transition-colors",
          active && "border-brand bg-brand"
        )}
      >
        {active ? <span className="size-1.5 rounded-full bg-white" /> : null}
      </span>
      {children}
    </Link>
  );
}

function FilterGroup({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}

function CatalogPage() {
  const { categories, products } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const title = search.q ? `Resultados para “${search.q}”` : "Catálogo";

  return (
    <div className="container mx-auto flex flex-col gap-10 px-4 py-10 lg:flex-row">
      <aside className="shrink-0 space-y-8 lg:w-64">
        <h2 className="flex items-center gap-3 text-lg font-semibold text-slate-900">
          <ListFilterIcon aria-hidden className="text-brand size-5" />
          Filtros
        </h2>
        <FilterGroup title="Tipo de producto">
          {storeKinds.map((kind) => (
            <FilterOption
              active={search.kind === kind}
              key={kind}
              search={
                search.kind === kind
                  ? omitFilter(search, "kind")
                  : { ...search, kind }
              }
            >
              {kind === "digital" ? "Productos digitales" : "Productos físicos"}
            </FilterOption>
          ))}
        </FilterGroup>
        {categories.length > 0 ? (
          <FilterGroup title="Categoría">
            <FilterOption
              active={!search.category}
              search={omitFilter(search, "category")}
            >
              Todos los productos
            </FilterOption>
            {categories.map((category) => (
              <FilterOption
                active={search.category === category.slug}
                key={category.slug}
                search={{ ...search, category: category.slug }}
              >
                {category.name}
              </FilterOption>
            ))}
          </FilterGroup>
        ) : null}
        <Link
          className="border-brand text-brand hover:bg-brand flex w-full items-center justify-center rounded-full border-2 px-4 py-2.5 font-medium transition-colors hover:text-white"
          to="/products"
        >
          Restablecer filtros
        </Link>
      </aside>

      <section aria-labelledby="catalog-title" className="min-w-0 flex-1">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-semibold text-slate-900 md:text-3xl"
              id="catalog-title"
            >
              {title}
            </h1>
            {search.kind ? (
              <p className="mt-1 text-sm text-slate-500">
                {kindLabels[search.kind]}
              </p>
            ) : null}
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-500">
            Ordenar por
            <select
              className="focus:border-brand rounded-full border border-slate-200 bg-white py-2 pr-8 pl-4 font-medium text-slate-900 outline-none"
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
          </label>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <CatalogProductCard key={product.slug} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
            <PackageSearchIcon
              aria-hidden
              className="mb-4 size-10 text-slate-300"
            />
            <p className="font-medium text-slate-900">
              No encontramos productos con estos filtros.
            </p>
            <Link className="text-brand mt-2 hover:underline" to="/products">
              Ver todo el catálogo
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
