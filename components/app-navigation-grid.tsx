"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle,
  CircleDollarSign,
  Database,
  ExternalLink,
  FileText,
  Gauge,
  Link2,
  LineChart,
  Search,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import UpstoxIcon from "@/components/icons/UpstoxIcon";

type NavigationItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
};

type NavigationGroup = {
  label: string;
  eyebrow: string;
  color: string;
  items: NavigationItem[];
};

const navigationGroups: NavigationGroup[] = [
  {
    label: "Workspace",
    eyebrow: "Start here",
    color: "from-cyan-500 to-blue-600",
    items: [
      { title: "Home", href: "/", icon: TrendingUp },
      { title: "Stock Monitoring", href: "/stock-monitoring", icon: Activity },
      { title: "Alerts", href: "/alerts", icon: Bell },
    ],
  },
  {
    label: "Analysis",
    eyebrow: "Read the market",
    color: "from-violet-500 to-fuchsia-600",
    items: [
      { title: "Strike Analysis", href: "/strike-analysis", icon: Search },
      { title: "Swing Stats", href: "/strike-analysis?tab=swing", icon: BarChart3 },
      { title: "Deep Dive", href: "/deep-dive", icon: Target },
      { title: "Boom Days", href: "/boom-days", icon: Calendar },
    ],
  },
  {
    label: "Trading",
    eyebrow: "Make a plan",
    color: "from-emerald-500 to-teal-600",
    items: [
      { title: "OHLC Chart", href: "/chart", icon: LineChart },
      { title: "Paper Trading", href: "/paper-trading", icon: CircleDollarSign },
      { title: "Scalping", href: "/scalping", icon: Zap },
      { title: "Upstox", href: "/upstox", icon: UpstoxIcon },
    ],
  },
  {
    label: "Intelligence",
    eyebrow: "Measure decisions",
    color: "from-amber-500 to-orange-600",
    items: [
      { title: "Confidence Meter", href: "/confidence-meter", icon: Gauge },
      { title: "Backtest Stats", href: "/backtest-stats", icon: FileText },
      { title: "Buffer Check", href: "/buffer-check", icon: CheckCircle },
      { title: "Stock Buffers", href: "/stock-buffers", icon: ShieldCheck },
    ],
  },
  {
    label: "Utilities",
    eyebrow: "Keep things moving",
    color: "from-slate-600 to-slate-800",
    items: [
      { title: "Tick Data", href: "/tick-data", icon: Database },
      { title: "Portfolio", href: "/portfolio", icon: CircleDollarSign },
      { title: "Admin Panel", href: "/admin", icon: Settings },
      { title: "Upstox Management", href: "/auth/upstox-management", icon: Link2 },
      { title: "Google Meet", href: "https://meet.google.com/cho-wpms-pbk", icon: Users, external: true },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  const cleanHref = href.split("?")[0];
  return cleanHref === "/" ? pathname === "/" : pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
}

export function AppNavigationGrid() {
  const pathname = usePathname() ?? "/";

  return (
    <section className="nav-grid-shell" aria-label="Application navigation">
      <div className="nav-grid-heading">
        <div>
          <p className="nav-grid-kicker">Algo Horizon workspace</p>
        </div>
      </div>
      <div className="nav-grid-columns">
        {navigationGroups.map((group) => (
          <section className="nav-grid-column" key={group.label}>
            <div className="nav-grid-column-heading">
              <span className={`nav-grid-dot bg-gradient-to-br ${group.color}`} aria-hidden="true" />
              <div>
                <p>{group.eyebrow}</p>
                <h3>{group.label}</h3>
              </div>
            </div>
            <div className="nav-grid-items">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = !item.external && isActivePath(pathname, item.href);
                const className = `nav-grid-card${active ? " nav-grid-card-active" : ""}`;
                const content = (
                  <>
                    <span className="nav-grid-icon"><Icon className="size-[18px]" /></span>
                    <span className="nav-grid-card-copy">
                      <span className="nav-grid-card-title">{item.title}</span>
                    </span>
                    {item.external ? <ExternalLink className="nav-grid-external size-4" /> : <span className="nav-grid-arrow" aria-hidden="true">↗</span>}
                  </>
                );

                return item.external ? (
                  <a className={className} href={item.href} key={item.title} target="_blank" rel="noreferrer">
                    {content}
                  </a>
                ) : (
                  <Link className={className} href={item.href} key={item.title}>
                    {content}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
