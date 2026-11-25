import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@patche/ui/components/sheet";
import { Link } from "@tanstack/react-router";
import {
  MenuIcon,
  SearchIcon,
  ShoppingBagIcon,
  UserRoundIcon,
} from "lucide-react";

import type { StoreCategory } from "@/functions/storefront";
import { cartCount, useCart } from "@/lib/cart";
import type { PublicUser } from "@/lib/public-session";

const focusRing =
  "focus-visible:outline-brand focus-visible:outline-2 focus-visible:outline-offset-2";

function CartLink() {
  const count = cartCount(useCart());

  return (
    <Link
      aria-label={`Carrito, ${count} ${count === 1 ? "artículo" : "artículos"}`}
      className={`relative flex size-11 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
      to="/cart"
    >
      <ShoppingBagIcon aria-hidden className="size-[1.35rem]" />
      {count > 0 ? (
        <span className="bg-mustard absolute top-1 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.7rem] font-bold text-slate-900 tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

function AccountLink({ user }: { user: PublicUser | null }) {
  const label = user ? "Mi cuenta" : "Iniciar sesión";
  let destination: "/admin" | "/dashboard" | "/login" = "/login";
  if (user) {
    destination = user.role === "admin" ? "/admin" : "/dashboard";
  }

  return (
    <Link
      className={`flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
      to={destination}
    >
      <UserRoundIcon aria-hidden className="size-5" />
      <span className="sr-only 2xl:not-sr-only">{label}</span>
    </Link>
  );
}

function SearchForm({ id }: { id: string }) {
  return (
    <form action="/products" className="relative w-full">
      <label className="sr-only" htmlFor={id}>
        Buscar
      </label>
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500"
      />
      <input
        className="focus:border-brand focus:ring-brand/20 border-field h-11 w-full rounded-full border bg-white pr-4 pl-11 text-sm text-slate-900 transition-colors outline-none placeholder:text-slate-500 focus:ring-4"
        id={id}
        name="q"
        placeholder="Buscar"
        type="search"
      />
    </form>
  );
}

function MobileMenu({ categories }: { categories: StoreCategory[] }) {
  const linkClass =
    "flex min-h-12 items-center rounded-xl px-3 text-base font-medium text-slate-800 transition-colors hover:bg-slate-100";

  return (
    <Sheet>
      <SheetTrigger
        aria-label="Abrir menú"
        className={`flex size-11 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 lg:hidden ${focusRing}`}
      >
        <MenuIcon aria-hidden className="size-6" />
      </SheetTrigger>
      <SheetContent
        className="storefront bg-paper font-body w-[88%] gap-0 overflow-y-auto"
        side="left"
      >
        <div className="border-b border-slate-200 px-5 pt-5 pb-4">
          <SheetTitle className="font-display text-lg font-semibold text-slate-900">
            Menú
          </SheetTitle>
        </div>
        <div className="px-5 py-4">
          <SearchForm id="mobile-search" />
        </div>
        <nav aria-label="Categorías" className="px-2 pb-6">
          <ul>
            <li>
              <SheetClose
                nativeButton={false}
                render={<Link className={linkClass} to="/products" />}
              >
                Todo el catálogo
              </SheetClose>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <SheetClose
                  nativeButton={false}
                  render={
                    <Link
                      className={linkClass}
                      search={{ category: category.slug }}
                      to="/products"
                    />
                  }
                >
                  {category.name}
                </SheetClose>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function CategoryNav({
  categories,
  className,
  linkClassName,
}: {
  categories: StoreCategory[];
  className: string;
  linkClassName: string;
}) {
  const link = `relative flex items-center whitespace-nowrap transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full hover:text-slate-900 ${focusRing} ${linkClassName}`;

  return (
    // Scrolls sideways instead of overlapping the search when the categories do not fit.
    <nav
      aria-label="Principal"
      className={`[scrollbar-width:none] overflow-x-auto ${className}`}
    >
      <ul className="flex h-full items-center gap-4 text-sm font-medium text-slate-600 2xl:gap-6 2xl:text-[0.95rem]">
        <li className="h-full">
          <Link
            activeOptions={{ exact: true, includeSearch: true }}
            activeProps={{ className: "text-slate-900 after:bg-brand" }}
            className={link}
            search={{}}
            to="/products"
          >
            Todo
          </Link>
        </li>
        {categories.map((category) => (
          <li className="h-full" key={category.slug}>
            <Link
              activeOptions={{ includeSearch: true }}
              activeProps={{ className: "text-slate-900 after:bg-brand" }}
              className={link}
              search={{ category: category.slug }}
              to="/products"
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteHeader({
  categories,
  user,
}: {
  categories: StoreCategory[];
  user: PublicUser | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/85">
      <p className="bg-brand-ink px-4 py-1.5 text-center text-xs font-medium text-white">
        Envío a todo México con tarifa fija.{" "}
        <span className="hidden sm:inline">
          Tus descargas digitales quedan listas al pagar.
        </span>
      </p>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-2 sm:px-6 lg:gap-6 lg:px-8">
        <MobileMenu categories={categories} />
        <Link
          className={`flex shrink-0 items-center rounded-lg max-lg:absolute max-lg:left-1/2 max-lg:-translate-x-1/2 ${focusRing}`}
          to="/"
        >
          <img
            alt="Patche, inicio"
            className="h-9 w-auto object-contain lg:h-10"
            height={150}
            src="/logo.png"
            width={466}
          />
        </Link>
        <CategoryNav
          categories={categories}
          className="hidden h-full min-w-0 xl:block"
          linkClassName="h-full"
        />
        <div className="ml-auto hidden w-56 shrink-0 lg:block xl:w-44 2xl:w-64">
          <SearchForm id="header-search" />
        </div>
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <AccountLink user={user} />
          <CartLink />
        </div>
      </div>
      <CategoryNav
        categories={categories}
        className="mx-auto hidden h-11 w-full max-w-7xl border-t border-slate-100 px-8 lg:block xl:hidden"
        linkClassName="h-11"
      />
    </header>
  );
}
