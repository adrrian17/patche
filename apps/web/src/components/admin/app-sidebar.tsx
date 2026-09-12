import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@patche/ui/components/sidebar";
import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

import { NavMain } from "@/components/admin/nav-main";
import { NavUser } from "@/components/admin/nav-user";

interface AppSidebarProps extends ComponentProps<typeof Sidebar> {
  user: { email: string; name: string };
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-auto data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link to="/admin" />}
            >
              <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-xl text-base font-bold">
                P
              </span>
              <span className="grid leading-tight">
                <span className="text-base font-bold tracking-tight">
                  Patche
                </span>
                <span className="text-muted-foreground text-xs">
                  Administración
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
