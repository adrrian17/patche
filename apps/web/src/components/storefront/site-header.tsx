import { Link } from "@tanstack/react-router";
import { SearchIcon, ShoppingCartIcon } from "lucide-react";

import { cartCount, useCart } from "@/lib/cart";
import type { PublicUser } from "@/lib/public-session";

const navLinks = [
  { label: "Digital", search: { kind: "digital" } },
  { label: "Físico", search: { kind: "physical" } },
  { label: "Todo el catálogo", search: {} },
] as const;

export function SiteHeader({ user }: { user: PublicUser | null }) {
  const count = cartCount(useCart());

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-20 items-center justify-between gap-6 px-4">
        <Link className="flex shrink-0 items-center" to="/">
          <img
            alt="Patche"
            className="h-14 w-auto object-contain"
            src="/logo.png"
          />
        </Link>
        <nav
          aria-label="Principal"
          className="hidden items-center gap-8 font-medium text-slate-600 md:flex"
        >
          {navLinks.map((link) => (
            <Link
              activeOptions={{ includeSearch: true }}
              activeProps={{ className: "text-brand" }}
              className="hover:text-brand transition-colors"
              key={link.label}
              search={link.search}
              to="/products"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <form action="/products" className="relative hidden lg:block">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            />
            <input
              aria-label="Buscar"
              className="focus:border-brand w-64 rounded-full border border-transparent bg-slate-100 py-2 pr-4 pl-10 text-sm transition-colors outline-none placeholder:text-slate-400"
              name="q"
              placeholder="Encuentra tu próxima agenda..."
              type="search"
            />
          </form>
          <Link
            aria-label={`Carrito, ${count} ${count === 1 ? "artículo" : "artículos"}`}
            className="relative rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100"
            to="/cart"
          >
            <ShoppingCartIcon aria-hidden className="size-6" />
            {count > 0 ? (
              <span className="bg-mustard absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full text-xs font-bold text-white">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
          {user ? (
            <Link
              className="rounded-full px-4 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-100"
              to={user.role === "admin" ? "/admin" : "/dashboard"}
            >
              Mi cuenta
            </Link>
          ) : (
            <Link
              className="bg-brand hover:bg-brand/90 rounded-full px-5 py-2.5 font-medium text-white shadow-sm transition-colors"
              to="/login"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
