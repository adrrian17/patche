import {
  BoxesIcon,
  LayoutDashboardIcon,
  ListTreeIcon,
  NotebookTabsIcon,
  PackageSearchIcon,
  Settings2Icon,
} from "lucide-react";

export const adminLinks = [
  { icon: LayoutDashboardIcon, label: "Resumen", to: "/admin" },
  { icon: NotebookTabsIcon, label: "Productos", to: "/admin/products" },
  { icon: BoxesIcon, label: "Inventario", to: "/admin/inventory" },
  { icon: PackageSearchIcon, label: "Órdenes", to: "/admin/orders" },
  { icon: ListTreeIcon, label: "Categorías", to: "/admin/categories" },
  { icon: Settings2Icon, label: "Ajustes", to: "/admin/settings" },
] as const;

export function isAdminLinkActive(pathname: string, to: string) {
  return to === "/admin" ? pathname === "/admin" : pathname.startsWith(to);
}
