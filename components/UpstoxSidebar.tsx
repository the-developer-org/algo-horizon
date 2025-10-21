"use client";

import * as React from "react";
import UpstoxIcon from "@/components/icons/UpstoxIcon";
import { ArrowLeft } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

// Minimal, empty sidebar for Upstox area. Add your items later.
export function UpstoxSidebar(props: Readonly<React.ComponentProps<typeof Sidebar>>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/" title="Back to Home">
                <ArrowLeft />
                <span>Back</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/upstox">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <UpstoxIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Upstox</span>
                  <span className="truncate text-xs">Workspace</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Upstox</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 py-1 text-xs text-muted-foreground">
              This sidebar is empty for now. Add tools and links here.
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="text-xs text-muted-foreground px-3 py-2">© {new Date().getFullYear()} Algo Horizon</div>
      </SidebarFooter>
    </Sidebar>
  );
}
