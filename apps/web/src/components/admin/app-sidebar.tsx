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
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-auto w-full hover:bg-transparent data-[slot=sidebar-menu-button]:p-0!"
              render={<Link to="/admin" />}
            >
              <img
                alt="Patche"
                className="h-16 w-full object-cover group-data-[collapsible=icon]:hidden"
                src="/logo.png"
              />
              <img
                alt="Patche"
                className="hidden size-8 object-contain group-data-[collapsible=icon]:block"
                src="/logo-icon.png"
              />
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
