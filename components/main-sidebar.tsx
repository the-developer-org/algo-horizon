"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Home, TrendingUp, Search, Calendar, FileText, Settings, Layers, Link, LucidePersonStanding, DollarSign, Bell, BarChart3, Target, SquareChevronLeft, Shield, CheckCircle } from "lucide-react";
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

export function MainSidebar({ onShowInsights, isVisible = true, onToggleVisibility, ...props }: MainSidebarProps) {
  const router = useRouter();
  const [internalIsVisible, setInternalIsVisible] = React.useState(isVisible);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isPermanentlyCollapsed, setIsPermanentlyCollapsed] = React.useState(false);
  const autoHideTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const secondTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastInteractionRef = React.useRef<number>(Date.now());

  // Auto-collapse functionality
  const resetAutoCollapseTimer = React.useCallback(() => {
    lastInteractionRef.current = Date.now();
    
    // Clear existing timers
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
    if (secondTimerRef.current) {
      clearTimeout(secondTimerRef.current);
    }
    
    // Reset collapsed states
    setIsCollapsed(false);
    setIsPermanentlyCollapsed(false);
    
    // Set first timer for 5 seconds - collapse to icon-only
    autoHideTimerRef.current = setTimeout(() => {
      if (internalIsVisible && Date.now() - lastInteractionRef.current >= 5000) {
        setIsCollapsed(true);
        
        // Set second timer for another 5 seconds - make it permanent
        secondTimerRef.current = setTimeout(() => {
          if (Date.now() - lastInteractionRef.current >= 10000) {
            setIsPermanentlyCollapsed(true);
          }
        }, 5000);
      }
    }, 5000);
  }, [internalIsVisible]);

  // Handle user interactions
  const handleInteraction = React.useCallback(() => {
    resetAutoCollapseTimer();
  }, [resetAutoCollapseTimer]);

  // Effect to manage auto-collapse timer
  React.useEffect(() => {
    if (internalIsVisible && !isPermanentlyCollapsed) {
      resetAutoCollapseTimer();
    } else {
      // Clear timers when sidebar is hidden or permanently collapsed
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
      if (secondTimerRef.current) {
        clearTimeout(secondTimerRef.current);
      }
    }

    // Cleanup on unmount
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
      if (secondTimerRef.current) {
        clearTimeout(secondTimerRef.current);
      }
    };
  }, [internalIsVisible, isPermanentlyCollapsed, resetAutoCollapseTimer]);

  // Sync with external visibility control
  React.useEffect(() => {
    setInternalIsVisible(isVisible);
  }, [isVisible]);

  // Override the toggle function to also manage internal state
  const handleToggleVisibility = React.useCallback(() => {
    const newVisibility = !internalIsVisible;
    setInternalIsVisible(newVisibility);
    onToggleVisibility?.();
    
    // Reset timer when manually toggling
    if (newVisibility) {
      resetAutoCollapseTimer();
    }
  }, [internalIsVisible, onToggleVisibility, resetAutoCollapseTimer]);

  if (!internalIsVisible) {
    return (
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={handleToggleVisibility}
          className="p-2 bg-sidebar-primary text-sidebar-primary-foreground rounded-lg shadow-lg hover:bg-sidebar-primary/80 transition-colors"
          title="Show Sidebar"
        >
          <TrendingUp className="size-4" />
        </button>
      </div>
    );
  }

  // Collapsed state - show only icons
  if (isCollapsed) {
    return (
      <Sidebar 
        variant="inset" 
        className="bg-slate-500 w-16 transition-all duration-300"
        onMouseEnter={handleInteraction}
        onMouseMove={handleInteraction}
        onClick={handleInteraction}
        {...props}
      >
        <SidebarHeader className="bg-slate-500">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center justify-center w-full p-2" />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="bg-slate-900 text-white">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {primaryItems.map(item => {
                  const isBoomDays = item.title.includes('Boom Days') || item.url === '/boom-days';
                  if (isBoomDays) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild size="lg">
                          <button
                            type="button"
                            onClick={() => {
                              handleInteraction();
                              onShowInsights?.();
                              router.push('/');
                            }}
                            title={item.title}
                          >
                            <item.icon />
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild size="lg">
                        <a 
                          href={item.url}
                          onClick={handleInteraction}
                          title={item.title}
                        >
                          <item.icon />
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
            <SidebarGroupContent>
              <SidebarMenu>
                {utilityItems.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild size="lg">
                      <a 
                        href={item.url}
                        onClick={handleInteraction}
                        title={item.title}
                      >
                        <item.icon />
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="bg-slate-500" />
      </Sidebar>
    );
  }

  return (
    <Sidebar 
      variant="inset" 
      className="bg-slate-500 w-80 transition-all duration-300"
      onMouseEnter={handleInteraction}
      onMouseMove={handleInteraction}
      onClick={handleInteraction}
      {...props}
    >
      <SidebarHeader className="bg-slate-500">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center w-full p-3">
              <a href="/" className="flex flex-1 items-center text-left text-sm leading-tight">
                <span className="font-semibold whitespace-nowrap text-white">Algo Horizon X Upstox</span>
              </a>
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
