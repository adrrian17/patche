import { Link, useRouterState } from "@tanstack/react-router";

import UserMenu from "./user-menu";

const links = [
  { label: "Home", to: "/" },
  { label: "Dashboard", to: "/dashboard" },
] as const;

function Header() {
  const isAdmin = useRouterState({
    select: (state) => state.location.pathname.startsWith("/admin"),
  });
  if (isAdmin) {
    return null;
  }
  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          {links.map(({ to, label }) => (
            <Link key={to} to={to}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
      <div className="border-b" />
    </div>
  );
}

export default Header;
