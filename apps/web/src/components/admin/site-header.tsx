import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@patche/ui/components/breadcrumb";
import { Separator } from "@patche/ui/components/separator";
import { SidebarTrigger } from "@patche/ui/components/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";

import { adminLinks, isAdminLinkActive } from "@/components/admin/nav-links";

export function SiteHeader() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const current = adminLinks.find(
    (link) => link.to !== "/admin" && isAdminLinkActive(pathname, link.to)
  );

  return (
    <header className="bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b backdrop-blur">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          className="mx-2 h-4 data-vertical:self-auto"
          orientation="vertical"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {current ? (
                <BreadcrumbLink render={<Link to="/admin" />}>
                  Administración
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>Administración</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {current ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{current.label}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
