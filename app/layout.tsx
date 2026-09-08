"use client";

import localFont from "next/font/local";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Link from "next/link";
import { Home, LogOut } from "lucide-react";
import { AppNavigationGrid } from "@/components/app-navigation-grid";
import { DeepDiveProvider } from "@/context/DeepDiveContext";
import { MarketDataProvider } from "@/context/MarketDataContext";
import StoreProvider from "@/lib/store/StoreProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

function LayoutContent({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  // Exclude upstox-management from being treated as a regular auth page
  const isAuthPage = (pathname?.startsWith('/auth') && pathname !== '/auth/upstox-management') ?? false;

  useEffect(() => {
    const checkAuth = () => {
      try {
        const isAuthorised = sessionStorage.getItem('isUserAuthorised');
        const currentUser = sessionStorage.getItem('currentUser');

        // Allow access to auth page without authentication
        if (isAuthPage) {
          setAuthStatus('authenticated');
          return;
        }

        // Check if user is authenticated
        if (isAuthorised === 'true' && currentUser) {
          setAuthStatus('authenticated');
        } else {
          // Not authenticated - redirect
          setAuthStatus('unauthenticated');
          router.replace('/auth');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthStatus('unauthenticated');
        router.replace('/auth');
      }
    };

    checkAuth();
  }, [router, isAuthPage]);

  // Show loading spinner while checking authentication
  if (authStatus === 'checking') {
    return (
      <div className="app-loading-shell">
        <div className="app-loading-spinner" aria-label="Loading" />
      </div>
    );
  }

  // For auth page, render without sidebar
  if (isAuthPage) {
    return (
      <div className="app-shell w-full">
        {children}
      </div>
    );
  }

  // If not authenticated, show a clear message instead of a blank loading state
  if (authStatus === 'unauthenticated') {
    return (
      <div className="app-loading-shell p-6">
        <div className="app-empty-surface w-full max-w-md p-6 text-center">
          <div className="mb-3 text-3xl">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900">Authentication required</h2>
          <p className="mt-2 text-sm text-gray-600">
            Your session is missing or expired. Please log in again to access the app.
          </p>
          <button
            type="button"
            onClick={() => router.replace('/auth')}
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  // Only render main app for authenticated users
  return (
    <DeepDiveProvider>
      <MarketDataProvider>
        <Toaster position="top-right" />
        <div className="app-shell">
          <header className="app-topbar">
            <Link href="/" className="app-brand" aria-label="Go to Algo Horizon home">
              <span className="app-brand-mark"><TrendingMark /></span>
              <span><strong>Algo Horizon</strong></span>
            </Link>
            <div className="app-topbar-actions">
              <Link href="/" className="app-home-link"><Home className="size-4" /> Home</Link>
              <button type="button" className="app-logout-link" onClick={() => { sessionStorage.clear(); localStorage.removeItem("isUserAuthorised"); localStorage.removeItem("currentUser"); router.replace("/auth"); }}>
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          </header>
          {pathname === "/" && <AppNavigationGrid />}
          <main className="app-content">{children}</main>
        </div>
      </MarketDataProvider>
    </DeepDiveProvider>
  );
}

function TrendingMark() {
  return <span className="app-brand-glyph" aria-hidden="true">↗</span>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <StoreProvider>
          <LayoutContent>
            {/* Global Toaster with colorful defaults for success/error/loading */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: '8px',
                  fontWeight: 600,
                  boxShadow: '0 6px 18px rgba(0,0,0,0.12)'
                },
                success: {
                  style: {
                    background: '#059669', // emerald-600
                    color: '#ffffff'
                  }
                },
                error: {
                  style: {
                    background: '#dc2626', // red-600
                    color: '#ffffff'
                  }
                },
                loading: {
                  style: {
                    background: '#2563eb', // blue-600
                    color: '#ffffff'
                  }
                }
              }}
            />
            {children}
          </LayoutContent>
        </StoreProvider>
      </body>
    </html>
  );
}
