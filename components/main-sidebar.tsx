"use client";
import * as React from "react";
import { Home, TrendingUp, Search, Calendar, FileText, Settings, Shield, Layers, ListChecks, Activity, PlugZap, Signal } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
} from "@/components/ui/sidebar";

// Lightweight public (non-admin) sidebar for the main dashboard
const primaryItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Strike Analysis Form", url: "/strike-analysis", icon: Search },
  { title: "OHLC Chart", url: "/chart", icon: TrendingUp },
  { title: "Boom Days", url: "/boom-days", icon: Calendar },
  { title: "Backtest Stats", url: "/backtest-stats", icon: FileText },
  { title: "Portfolio", url: "/portfolio", icon: Layers },
];

const utilityItems = [
  { title: "Watchlists", url: "/#watchlists", icon: ListChecks },
  { title: "Insights", url: "/#insights", icon: Activity },
  { title: "Google Meet", url: "https://meet.google.com/cho-wpms-pbk", icon: PlugZap },
  { title: "Upstox Connect", url: "/auth", icon: Signal },
  { title: "Admin Panel", url: "/admin", icon: Settings },
  { title: "Security", url: "#", icon: Shield },
];

interface MainSidebarProps extends Readonly<React.ComponentProps<typeof Sidebar>> {
  readonly onShowInsights?: () => void;
}

export function MainSidebar({ onShowInsights, ...props }: MainSidebarProps) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <TrendingUp className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Algo Horizon X Upstox</span>
                  <span className="truncate text-xs">Dashboard</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryItems.map(item => {
                if (item.title === 'Boom Days') {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <button
                          type="button"
                          onClick={() => {
                            onShowInsights?.();
                          }}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Utilities</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {utilityItems.map(item => (
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
        <div className="text-xs text-muted-foreground px-3 py-2">© {new Date().getFullYear()} Algo Horizon</div>
      </SidebarFooter>
    </Sidebar>
  );
}
