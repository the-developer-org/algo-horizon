"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Home, TrendingUp, Search, Calendar, FileText, Settings, Layers, Link, LucidePersonStanding, DollarSign, Bell } from "lucide-react";
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
  { title: "Paper Trading", url: "/paper-trading", icon: DollarSign },
  { title: "Boom Days & Watch Lists", url: "/boom-days", icon: Calendar },
  { title: "Backtest Stats", url: "/backtest-stats", icon: FileText },
  { title: "Portfolio", url: "/portfolio", icon: Layers },
  { title: "Alerts", url: "/alerts", icon: Bell },
];

const utilityItems = [
  { title: "Algo Google Meet", url: "https://meet.google.com/cho-wpms-pbk", icon: LucidePersonStanding },
  { title: "Upstox Conn. Management", url: "/auth/upstox-management", icon: Link },
  { title: "Admin Panel", url: "/admin", icon: Settings },
];

interface MainSidebarProps extends Readonly<React.ComponentProps<typeof Sidebar>> {
  readonly onShowInsights?: () => void;
}

export function MainSidebar({ onShowInsights, ...props }: MainSidebarProps) {
  const router = useRouter();
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
                const isBoomDays = item.title.includes('Boom Days') || item.url === '/boom-days';
                if (isBoomDays) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <button
                          type="button"
                          onClick={() => {
                            onShowInsights?.();
                            // Ensure we navigate to home where the combined section lives
                            router.push('/');
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
