"use client";

import * as React from "react";
import {
  Calendar,
  Home,
  Search,
  Settings,
  BarChart3,
  Database,
  Activity,
  Shield,
  Users,
  FileText,
  TrendingUp,
  DollarSign,
  Globe,
  Zap,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

// Menu items for the admin panel
const adminMenuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Trading",
    url: "/chart",
    icon: TrendingUp,
  },
  {
    title: "Portfolio",
    url: "/portfolio",
    icon: DollarSign,
  },
  {
    title: "Admin actions",
    url: "/admin/actions",
    icon: Settings,
  }
];

const managementItems = [
  {
    title: "Data Management",
    icon: Database,
    items: [
      {
        title: "Data Sources",
        url: "/admin/data-management",
      },
      {
        title: "Data Quality",
        url: "#",
      },
      {
        title: "Data Sync",
        url: "#",
      },
    ],
  },
  {
    title: "Cache Control",
    icon: Zap,
    items: [
      {
        title: "Cache Statistics",
        url: "#",
      },
      {
        title: "Clear Cache",
        url: "#",
      },
      {
        title: "Cache Settings",
        url: "#",
      },
    ],
  },
  {
    title: "System Monitoring",
    icon: Activity,
    items: [
      {
        title: "Performance",
        url: "#",
      },
      {
        title: "Health Checks",
        url: "#",
      },
      {
        title: "Logs",
        url: "#",
      },
    ],
  },
];

const toolsItems = [
  {
    title: "Analytics",
    url: "#",
    icon: BarChart3,
  },
  {
    title: "Backtest Stats",
    url: "/backtest-stats",
    icon: FileText,
  },
  {
    title: "Strike Analysis",
    url: "/strike-analysis",
    icon: Search,
  },
  {
    title: "Boom Days",
    url: "/boom-days",
    icon: Calendar,
  },
];

const settingsItems = [
  {
    title: "API Settings",
    url: "#",
    icon: Globe,
  },
  {
    title: "User Management",
    url: "#",
    icon: Users,
  },
  {
    title: "Security",
    url: "#",
    icon: Shield,
  },
  {
    title: "General Settings",
    url: "#",
    icon: Settings,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <TrendingUp className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Algo Horizon</span>
                  <span className="truncate text-xs">Admin Panel</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Management Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <div className="flex items-center gap-2 cursor-pointer">
                      <item.icon />
                      <span>{item.title}</span>
                    </div>
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild>
                          <a href={subItem.url}>
                            <span>{subItem.title}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Tools Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Settings Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Users />
              <span>Support</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
