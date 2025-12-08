"use client";

import localFont from "next/font/local";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MainSidebar } from "../components/main-sidebar";
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
  const isUpstoxPage = pathname?.startsWith('/upstox') ?? false;
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  useEffect(() => {
    const checkAuth = () => {
      try {
        const isAuthorised = localStorage.getItem('isUserAuthorised');
        const currentUser = localStorage.getItem('currentUser');

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
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // For auth page, render without sidebar
  if (isAuthPage) {
    return (
      <div className="min-h-screen w-full bg-gray-50">
        {children}
      </div>
    );
  }

  // If not authenticated, show loading (should redirect)
  if (authStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Only render main app for authenticated users
  return (
    <DeepDiveProvider>
      <MarketDataProvider>
        <SidebarProvider>
          <Toaster position="top-right" />
          <div className="flex min-h-screen w-full bg-gray-50">
            {!isUpstoxPage && (
              <MainSidebar isVisible={sidebarVisible} onToggleVisibility={toggleSidebar} />
            )}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </div>
        </SidebarProvider>
      </MarketDataProvider>
    </DeepDiveProvider>
  );
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
