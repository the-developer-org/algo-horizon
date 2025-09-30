"use client";

import localFont from "next/font/local";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MainSidebar } from "../components/main-sidebar";

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthPage = pathname?.startsWith('/auth') ?? false;
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  useEffect(() => {
    const checkAuth = () => {
      try {
        const isAuthorised = sessionStorage.getItem('isUserAuthorised');
        const currentUser = localStorage.getItem('currentUser');

        // Allow access to auth page without authentication
        if (isAuthPage) {
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        // Check if user is authenticated
        if (isAuthorised === 'true' && currentUser) {
          setIsAuthenticated(true);
        } else {
          // Redirect to auth if not authenticated and not already on auth page
          router.replace('/auth');
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/auth');
        return;
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, isAuthPage]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Don't render main app if not authenticated
  if (!isAuthenticated && !isAuthPage) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (isAuthPage) {
    return (
      <div className="min-h-screen w-full bg-gray-50">
        {children}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50">
        <MainSidebar isVisible={sidebarVisible} onToggleVisibility={toggleSidebar} />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </SidebarProvider>
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
        <LayoutContent>
          {children}
        </LayoutContent>
      </body>
    </html>
  );
}
