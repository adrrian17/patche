import { env } from "@patche/env/web";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import {
  ProductCard,
  ProductImage,
} from "@/components/storefront/product-card";
import { getHomeImages } from "@/functions/home-images";
import { listStoreCategories, listStoreProducts } from "@/functions/storefront";
import type { StoreImage } from "@/functions/storefront";
import { handleNewsletterSubmit } from "@/lib/newsletter";

export const Route = createFileRoute("/_store/")({
  component: HomePage,
  loader: async () => {
    const [products, categories, homeImages] = await Promise.all([
      listStoreProducts({ data: { limit: 100 } }),
      listStoreCategories(),
      getHomeImages(),
    ]);
    // Newest in-stock physical Products, one per category so the row shows range.
    const newest: typeof products = [];
    const seen = new Set<string | null>();
    for (const item of products) {
      const available = item.kinds.includes("physical") && !item.soldOut;
      if (available && !seen.has(item.category) && newest.length < 4) {
        seen.add(item.category);
        newest.push(item);
      }
    }
    const digital = products
      .filter(({ kinds }) => kinds.length === 1 && kinds[0] === "digital")
      .slice(0, 4);
    // Each category tile borrows the image of its newest Product.
    const categoryTiles = categories.flatMap((category) => {
      const inCategory = products.filter(
        (item) => item.category === category.name
      );
      const image = inCategory.find((item) => item.image)?.image ?? null;
      return inCategory.length > 0
        ? [{ ...category, count: inCategory.length, image }]
        : [];
    });
    return { categoryTiles, digital, homeImages, newest };
  },
});

const container = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

const collections = [
  {
    cta: "Ver washi tapes",
    description: "Patrones para decorar páginas, sobres y cajas.",
    q: "washi",
    slot: "washi",
    title: "Washi tapes",
  },
  {
    cta: "Ver plumas",
    description: "Tinta que se desliza y no mancha la hoja.",
    q: "plumas",
    slot: "pens",
    title: "Escritura fina",
  },
] as const;

// An empty slot (a fresh stage before the Admin uploads) shows a tinted panel instead of a broken image.
// Decorative: an uploaded photo can show anything, and the adjacent copy already names each block.
function HomeImage({
  className,
  src,
}: {
  className: string;
  src: string | null;
}) {
  return src ? (
    <img alt="" className={`object-cover ${className}`} src={src} />
  ) : (
    <div aria-hidden className={`bg-mint ${className}`} />
  );
}

function SectionHeading({
  action,
  description,
  id,
  title,
}: {
  action?: { label: string; search: Record<string, string> };
  description?: string;
  id: string;
  title: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 md:mb-10">
      <div className="max-w-xl space-y-2">
        <h2
          className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl"
          id={id}
        >
          {title}
        </h2>
        {description ? <p className="text-slate-600">{description}</p> : null}
      </div>
      {action ? (
        <Link
          className="text-brand-ink group inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline"
          search={action.search}
          to="/products"
        >
          {action.label}
          <ArrowRightIcon
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      ) : null}
    </div>
  );
}

function CategoryTile({
  count,
  image,
  name,
  slug,
}: {
  count: number;
  image: StoreImage | null;
  name: string;
  slug: string;
}) {
  return (
    <Link
      className="group focus-visible:outline-brand block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4"
      search={{ category: slug }}
      to="/products"
    >
      <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100 sm:aspect-[4/3]">
        <ProductImage
          className="size-full transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
          image={image ? { alt: "", url: image.url } : null}
        />
      </div>
      <p className="mt-3 text-base font-semibold text-slate-900 group-hover:underline group-hover:underline-offset-4 md:text-lg">
        {name}
      </p>
      <p className="text-sm text-slate-500">
        {count === 1 ? "1 producto" : `${count} productos`}
      </p>
    </Link>
  );
}

function HomePage() {
  const { categoryTiles, digital, homeImages, newest } = Route.useLoaderData();

  return (
    <>
      <section className={`${container} pt-6 pb-16 md:pt-10 md:pb-24`}>
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:gap-14">
          <div className="order-2 space-y-6 lg:order-1">
            <h1 className="text-4xl leading-[1.08] font-bold tracking-tight text-balance text-slate-900 sm:text-5xl lg:text-6xl">
              Papelería para planear, escribir y crear
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-slate-600">
              Agendas, libretas y planners digitales con papel que se disfruta
              usar. Todo listo para tu escritorio, en cualquier lugar de México.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="bg-brand-ink focus-visible:outline-brand inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 font-semibold text-white transition-colors hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2"
                to="/products"
              >
                Explorar la tienda
                <ArrowRightIcon aria-hidden className="size-4" />
              </Link>
              <Link
                className="focus-visible:outline-brand inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-7 font-semibold text-slate-900 transition-colors hover:border-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2"
                search={{ kind: "digital" }}
                to="/products"
              >
                Ver planners digitales
              </Link>
            </div>
          </div>
          {/* On wide screens the image runs to the viewport edge, like a printed spread. */}
          <div className="order-1 lg:order-2 lg:-mr-[max(2rem,calc((100vw-80rem)/2+2rem))]">
            <HomeImage
              className="aspect-[4/3] w-full rounded-2xl lg:aspect-[16/11] lg:rounded-r-none"
              src={homeImages.hero}
            />
          </div>
        </div>
      </section>

      {categoryTiles.length > 0 ? (
        <section
          aria-labelledby="home-categories"
          className={`${container} pb-16 md:pb-24`}
        >
          <SectionHeading
            action={{ label: "Ver todo el catálogo", search: {} }}
            id="home-categories"
            title="Compra por categoría"
          />
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {categoryTiles.map((tile) => (
              <li key={tile.slug}>
                <CategoryTile {...tile} />
              </li>
            ))}
            <li>
              <Link
                className="group bg-brand-ink focus-visible:outline-brand flex aspect-square flex-col justify-end rounded-2xl p-5 text-white focus-visible:outline-2 focus-visible:outline-offset-4 sm:aspect-[4/3]"
                to="/products"
              >
                <span className="font-display text-xl leading-tight font-bold md:text-2xl">
                  Todo el catálogo
                </span>
                <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-white/90">
                  Ver todo
                  <ArrowRightIcon
                    aria-hidden
                    className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  />
                </span>
              </Link>
            </li>
          </ul>
        </section>
      ) : null}

      {newest.length > 0 ? (
        <section
          aria-labelledby="home-newest"
          className={`${container} pb-16 md:pb-24`}
        >
          <SectionHeading
            action={{ label: "Ver novedades", search: { sort: "newest" } }}
            description="Lo último que llegó al taller: agendas, libretas y accesorios para tu escritorio."
            id="home-newest"
            title="Recién llegados"
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-4">
            {newest.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </section>
      ) : null}

      <section
        aria-label="Colecciones"
        className={`${container} pb-16 md:pb-24`}
      >
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          {collections.map((collection) => (
            <Link
              className="group focus-visible:outline-brand block overflow-hidden rounded-2xl border border-slate-200 bg-white focus-visible:outline-2 focus-visible:outline-offset-4"
              key={collection.title}
              search={{ q: collection.q }}
              to="/products"
            >
              <div className="overflow-hidden">
                <HomeImage
                  className="aspect-[16/10] w-full transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
                  src={homeImages[collection.slot]}
                />
              </div>
              <div className="flex flex-wrap items-end justify-between gap-4 p-6 md:p-8">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                    {collection.title}
                  </h2>
                  <p className="max-w-sm text-slate-600">
                    {collection.description}
                  </p>
                </div>
                <span className="text-brand-ink inline-flex items-center gap-1.5 font-semibold underline-offset-4 group-hover:underline">
                  {collection.cta}
                  <ArrowRightIcon
                    aria-hidden
                    className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {digital.length > 0 ? (
        <section aria-labelledby="home-digital" className="bg-mint paper-dots">
          <div className={`${container} py-16 md:py-24`}>
            <SectionHeading
              action={{
                label: "Ver todos los digitales",
                search: { kind: "digital" },
              }}
              description="Plantillas para iPad y tablet. Las descargas desde tu cuenta en cuanto se confirma el pago."
              id="home-digital"
              title="Planners digitales"
            />
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-4">
              {digital.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {env.VITE_NEWSLETTER_ENABLED ? (
        <section className={`${container} py-16 md:py-24`}>
          <div className="bg-brand-ink flex flex-col items-start gap-8 rounded-2xl p-8 text-white md:flex-row md:items-center md:justify-between md:p-12">
            <div className="max-w-xl space-y-2">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Únete a la comunidad Patche
              </h2>
              <p className="text-white/85">
                Obtén 10% de descuento en tu primera compra y entérate de nuevos
                productos y descargables.
              </p>
            </div>
            <form
              className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
              onSubmit={handleNewsletterSubmit}
            >
              <label className="sr-only" htmlFor="home-newsletter-email">
                Correo electrónico
              </label>
              <input
                autoComplete="email"
                className="h-12 flex-1 rounded-full border-none bg-white px-5 text-slate-900 outline-none focus:ring-4 focus:ring-white/40"
                id="home-newsletter-email"
                placeholder="Escribe tu correo"
                required
                type="email"
              />
              <button
                className="bg-mustard h-12 rounded-full px-6 font-semibold text-slate-900 transition-colors hover:bg-white"
                type="submit"
              >
                Suscribirme
              </button>
            </form>
          </div>
        </section>
      ) : null}
    </>
  );
}
