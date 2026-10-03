import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRightIcon, MailIcon, StarIcon } from "lucide-react";

import { FeaturedProductCard } from "@/components/storefront/product-card";
import { listStoreProducts } from "@/functions/storefront";
import { handleNewsletterSubmit } from "@/lib/newsletter";

export const Route = createFileRoute("/_store/")({
  component: HomePage,
  loader: () => listStoreProducts({ data: { kind: "digital", limit: 4 } }),
});

const collections = [
  {
    alt: "Rollos de washi tape con patrones",
    cta: "Ver colección",
    ctaClassName: "text-brand",
    description: "Patrones que van con tu personalidad",
    image: "/storefront/washi-tapes.jpg",
    overlayClassName: "bg-brand/40",
    title: "Washi tapes",
  },
  {
    alt: "Selección de plumas finas",
    cta: "Ver plumas",
    ctaClassName: "text-mustard",
    description: "Plumas que se deslizan sobre la página",
    image: "/storefront/fine-pens.jpg",
    overlayClassName: "bg-mustard/40",
    title: "Escritura fina",
  },
];

function HomePage() {
  const digitalProducts = Route.useLoaderData();

  return (
    <>
      <section className="container mx-auto px-4 py-12">
        <div className="bg-mint relative flex flex-col items-center gap-12 overflow-hidden rounded-[2rem] p-8 md:flex-row md:rounded-3xl md:p-16">
          <div className="bg-mustard/10 absolute -top-24 -right-24 size-64 rounded-full blur-3xl" />
          <div className="bg-brand/10 absolute -bottom-24 -left-24 size-96 rounded-full blur-3xl" />
          <div className="z-10 flex-1 space-y-6 text-center md:text-left">
            <span className="bg-brand/10 text-brand inline-block rounded-full px-4 py-1 text-sm font-semibold tracking-wide uppercase">
              Novedad
            </span>
            <h1 className="text-4xl leading-tight font-bold text-slate-900 md:text-6xl">
              Organiza tu <br />
              <span className="text-brand italic">flujo creativo</span>
            </h1>
            <p className="mx-auto max-w-md text-lg text-slate-600 md:mx-0">
              Descubre nuestras agendas de tapa dura. Diseñadas para soñadores,
              creadores y quienes aman tener todo en orden.
            </p>
            <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row md:justify-start">
              <Link
                className="bg-brand hover:bg-brand/90 rounded-3xl px-8 py-4 font-bold text-white shadow-lg transition-[translate,background-color] hover:-translate-y-1"
                search={{ kind: "physical" }}
                to="/products"
              >
                Ver agendas físicas
              </Link>
              <Link
                className="rounded-3xl border border-slate-200 bg-white px-8 py-4 font-bold text-slate-900 transition-shadow hover:shadow-md"
                search={{ kind: "digital" }}
                to="/products"
              >
                Ver ediciones digitales
              </Link>
            </div>
          </div>
          <div className="z-10 w-full max-w-md flex-1 md:max-w-none">
            <div className="relative">
              <img
                alt="Agenda verde de tapa dura sobre un escritorio"
                className="aspect-square w-full rotate-2 rounded-[2rem] object-cover shadow-2xl transition-transform duration-500 hover:rotate-0"
                src="/storefront/hero-planner.jpg"
              />
              <div className="animate-float absolute -bottom-6 -left-6 flex items-center gap-3 rounded-3xl bg-white p-4 shadow-xl motion-reduce:animate-none">
                <div className="bg-mustard flex size-10 items-center justify-center rounded-full text-white">
                  <StarIcon aria-hidden className="size-5" />
                </div>
                <div>
                  <p className="text-sm leading-none font-bold">
                    Favorito de la casa
                  </p>
                  <p className="text-xs text-slate-500">Hecho para durar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {digitalProducts.length > 0 ? (
        <section className="container mx-auto px-4 py-16">
          <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-slate-900">
                Descargas digitales destacadas
              </h2>
              <p className="text-slate-500">
                Mejora tu productividad al instante con plantillas para iPad y
                tablet.
              </p>
            </div>
            <Link
              className="text-brand flex items-center gap-1 font-bold hover:underline"
              search={{ kind: "digital" }}
              to="/products"
            >
              Ver todas las plantillas
              <ArrowRightIcon aria-hidden className="size-5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {digitalProducts.map((product) => (
              <FeaturedProductCard key={product.slug} product={product} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {collections.map((collection) => (
            <div
              className="group relative h-64 overflow-hidden rounded-[2rem]"
              key={collection.title}
            >
              <img
                alt={collection.alt}
                className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
                src={collection.image}
              />
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white backdrop-blur-[2px] ${collection.overlayClassName}`}
              >
                <h3 className="mb-2 text-3xl font-bold">{collection.title}</h3>
                <p className="mb-4">{collection.description}</p>
                <Link
                  className={`rounded-full bg-white px-6 py-2 font-bold transition-colors hover:bg-slate-100 ${collection.ctaClassName}`}
                  search={{ kind: "physical" }}
                  to="/products"
                >
                  {collection.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto mb-20 px-4 py-16">
        <div className="bg-brand flex flex-col items-center rounded-3xl p-8 text-center text-white md:p-16">
          <MailIcon aria-hidden className="mb-4 size-12" strokeWidth={1.5} />
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Únete a la comunidad Patche
          </h2>
          <p className="mb-8 max-w-xl text-white/80">
            Obtén 10% de descuento en tu primera compra y entérate de nuevos
            productos, tips de planeación y descargables exclusivos.
          </p>
          <form
            className="flex w-full max-w-lg flex-col gap-4 sm:flex-row"
            onSubmit={handleNewsletterSubmit}
          >
            <label className="sr-only" htmlFor="home-newsletter-email">
              Correo electrónico
            </label>
            <input
              autoComplete="email"
              className="focus:ring-mustard flex-1 rounded-3xl border-none bg-white px-6 py-4 text-slate-900 outline-none focus:ring-2"
              id="home-newsletter-email"
              placeholder="Escribe tu correo"
              required
              type="email"
            />
            <button
              className="bg-mustard hover:bg-mustard/90 rounded-3xl px-8 py-4 font-bold shadow-lg transition-colors"
              type="submit"
            >
              Suscribirme
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
