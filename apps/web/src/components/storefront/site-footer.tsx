import { env } from "@patche/env/web";
import { Link } from "@tanstack/react-router";

import { handleNewsletterSubmit } from "@/lib/newsletter";

const shopLinks = [
  { label: "Planners digitales", search: { kind: "digital" } },
  { label: "Libretas y agendas", search: { kind: "physical" } },
  { label: "Lo más nuevo", search: { sort: "newest" } },
  { label: "Todo el catálogo", search: {} },
] as const;

const helpTopics = [
  { detail: "Tarifa fija en todo el país", title: "Envíos a todo México" },
  { detail: "Al pagar, desde tu cuenta", title: "Descargas digitales" },
  { detail: "Procesado por Stripe", title: "Pago seguro" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 pt-14 pb-8 sm:px-6 lg:px-8">
        <div
          className={`mb-12 grid grid-cols-1 gap-10 sm:grid-cols-2 ${
            env.VITE_NEWSLETTER_ENABLED
              ? "lg:grid-cols-4"
              : "lg:grid-cols-[2fr_1fr_1fr]"
          }`}
        >
          <div>
            <img
              alt="Patche"
              className="mb-5 h-10 w-auto"
              height={150}
              src="/logo.png"
              width={466}
            />
            <p className="max-w-xs leading-relaxed text-slate-600">
              Herramientas creativas para una vida organizada. Te ayudamos a
              ordenar tu mundo, una página a la vez.
            </p>
          </div>
          <div>
            <h2 className="mb-4 font-semibold text-slate-900">Tienda</h2>
            <ul className="space-y-3 text-slate-600">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    className="underline-offset-4 transition-colors hover:text-slate-900 hover:underline"
                    search={link.search}
                    to="/products"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-4 font-semibold text-slate-900">Tu compra</h2>
            <ul className="space-y-3">
              {helpTopics.map((topic) => (
                <li key={topic.title}>
                  <p className="text-slate-800">{topic.title}</p>
                  <p className="text-sm text-slate-500">{topic.detail}</p>
                </li>
              ))}
            </ul>
          </div>
          {env.VITE_NEWSLETTER_ENABLED ? (
            <div>
              <h2 className="mb-4 font-semibold text-slate-900">Boletín</h2>
              <p className="mb-4 text-slate-500">
                Recibe 10% de descuento en tu primera compra.
              </p>
              <form className="flex gap-2" onSubmit={handleNewsletterSubmit}>
                <label className="sr-only" htmlFor="footer-newsletter-email">
                  Correo electrónico
                </label>
                <input
                  autoComplete="email"
                  className="focus:border-brand min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none"
                  id="footer-newsletter-email"
                  placeholder="Correo electrónico"
                  required
                  type="email"
                />
                <button
                  className="bg-brand hover:bg-brand/90 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors"
                  type="submit"
                >
                  Unirme
                </button>
              </form>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 text-sm text-slate-500 md:flex-row">
          <p>
            © {new Date().getFullYear()} Patche Papelería. Todos los derechos
            reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
