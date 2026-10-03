import { Link } from "@tanstack/react-router";

import { handleNewsletterSubmit } from "@/lib/newsletter";

const shopLinks = [
  { label: "Planners digitales", search: { kind: "digital" } },
  { label: "Libretas y agendas", search: { kind: "physical" } },
  { label: "Lo más nuevo", search: { sort: "newest" } },
  { label: "Todo el catálogo", search: {} },
] as const;

const helpTopics = [
  "Envíos a todo México",
  "Devoluciones",
  "Descargas digitales",
  "Contacto",
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-100/70">
      <div className="container mx-auto px-4 pt-16 pb-8">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-4">
          <div>
            <img alt="Patche" className="mb-6 h-12 w-auto" src="/logo.png" />
            <p className="leading-relaxed text-slate-500">
              Herramientas creativas para una vida organizada. Te ayudamos a
              ordenar tu mundo, una página a la vez.
            </p>
          </div>
          <div>
            <h2 className="mb-6 font-bold text-slate-900">Tienda</h2>
            <ul className="space-y-4 text-slate-500">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    className="hover:text-brand transition-colors"
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
            <h2 className="mb-6 font-bold text-slate-900">Ayuda</h2>
            <ul className="space-y-4 text-slate-500">
              {helpTopics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-6 font-bold text-slate-900">Boletín</h2>
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
