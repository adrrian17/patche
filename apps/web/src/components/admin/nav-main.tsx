import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@patche/ui/components/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";

import { adminLinks, isAdminLinkActive } from "@/components/admin/nav-links";

export function NavMain() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {adminLinks.map(({ icon: Icon, label, to }) => (
            <SidebarMenuItem key={to}>
              <SidebarMenuButton
                isActive={isAdminLinkActive(pathname, to)}
                render={<Link to={to} />}
                tooltip={label}
              >
                <Icon />
                <span>{label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
