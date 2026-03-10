"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Home, TrendingUp, Search, Calendar, FileText, Settings, Layers, Link, LucidePersonStanding, DollarSign, Bell, BarChart3, Target, Shield, CheckCircle, X, Menu } from "lucide-react";
import UpstoxIcon from "@/components/icons/UpstoxIcon";
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
   {  title: "Swing Stats", url: "/strike-analysis?tab=swing", icon: BarChart3 },
   { title: "Deep Dive", url: "/deep-dive", icon: Target },
   { title: "OHLC Chart", url: "/chart", icon: TrendingUp },
  { title: "Paper Trading", url: "/paper-trading", icon: DollarSign },
  { title: "Stock Buffers", url: "/stock-buffers", icon: Shield },
  { title: "Buffer Check", url: "/buffer-check", icon: CheckCircle },
  { title: "Upstox", url: "/upstox", icon: UpstoxIcon },
  { title: "Tick Data", url: "/tick-data", icon: TrendingUp },
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
  readonly isVisible?: boolean;
  readonly onToggleVisibility?: () => void;
}

export function MainSidebar({ onShowInsights, isVisible = true, onToggleVisibility, ...props }: Readonly<MainSidebarProps>) {
  const router = useRouter();
  const [internalIsVisible, setInternalIsVisible] = React.useState(isVisible);
  const [hideTimer, setHideTimer] = React.useState<NodeJS.Timeout | null>(null);

  // Reset the auto-hide timer on user interaction
  const resetHideTimer = React.useCallback(() => {
    setHideTimer(prevTimer => {
      if (prevTimer) clearTimeout(prevTimer);
      return setTimeout(() => {
        setInternalIsVisible(false);
      }, 3000);
    });
  }, []);

  // Handle user interactions - reset timer
  const handleInteraction = React.useCallback(() => {
    resetHideTimer();
  }, [resetHideTimer]);

  // Close sidebar button handler
  const handleCloseSidebar = React.useCallback(() => {
    setInternalIsVisible(false);
    setHideTimer(prevTimer => {
      if (prevTimer) clearTimeout(prevTimer);
      return null;
    });
  }, []);

  // Set initial timer when sidebar becomes visible
  React.useEffect(() => {
    if (internalIsVisible) {
      resetHideTimer();
    }
  }, [internalIsVisible, resetHideTimer]);

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      setHideTimer(prevTimer => {
        if (prevTimer) clearTimeout(prevTimer);
        return null;
      });
    };
  }, []);

  if (!internalIsVisible) {
    return (
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setInternalIsVisible(true)}
          className="p-2 bg-sidebar-primary text-sidebar-primary-foreground rounded-lg shadow-lg hover:bg-sidebar-primary/80 transition-colors"
          title="Show Sidebar"
        >
          <Menu className="size-5" />
        </button>
      </div>
    );
  }

  return (
    <Sidebar 
      variant="sidebar" 
      className="bg-slate-500 transition-all duration-300"
      style={{ "--sidebar-width": "20rem" } as React.CSSProperties}
      onMouseEnter={handleInteraction}
      onMouseMove={handleInteraction}
      onClick={handleInteraction}
      {...props}
    >
      <SidebarHeader className="bg-slate-500">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between w-full p-3">
              <a href="/" className="flex flex-1 items-center text-left text-sm leading-tight">
                <span className="font-semibold whitespace-nowrap text-white">Algo Horizon X Upstox</span>
              </a>
              <button
                onClick={handleCloseSidebar}
                className="p-1 text-white hover:bg-slate-600 rounded transition-colors ml-2"
                title="Hide Sidebar (will auto-hide in 3 seconds)"
              >
                <X className="size-5" />
              </button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-slate-900 text-white">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white">Navigation</SidebarGroupLabel>
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
                            handleInteraction();
                            onShowInsights?.();
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
                      <a 
                        href={item.url}
                        onClick={handleInteraction}
                      >
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
          <SidebarGroupLabel className="text-white">Utilities</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {utilityItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a 
                      href={item.url}
                      onClick={handleInteraction}
                    >
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
      <SidebarFooter className="bg-slate-500">
        <div className="text-xs text-muted-foreground px-3 py-2 text-white">© {new Date().getFullYear()} Algo Horizon</div>
      </SidebarFooter>
    </Sidebar>
  );
}
