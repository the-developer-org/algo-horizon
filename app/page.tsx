"use client";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { UpstoxConnection } from "./components/UpstoxConnection";
import { MainSidebar } from "../components/main-sidebar";
import { WatchLists } from "../components/WatchLists";
import { HistoricalInsights } from "../components/HistoricalInsights";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showWatchLists, setShowWatchLists] = useState(false);
  const [showHistoricalInsights, setShowHistoricalInsights] = useState(false);
  // Root now directly shows the simplified dashboard (formerly new-home)

  useEffect(() => {
    const isAuthorized = sessionStorage.getItem('isUserAuthorised');
    if (isAuthorized === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50">
        <MainSidebar
          onShowInsights={() => {
            // Toggle both watchlists and insights like original combined section
            setShowWatchLists(prev => !prev);
            setShowHistoricalInsights(prev => !prev);
          }}
        />
        <main className="flex-1 flex flex-col items-center p-8 overflow-y-auto">
         
      
          {/* Empty dashboard - add widgets/components here as needed */}
          {/* Previous verbose home implementation removed from render for clarity (was background image + watchlists + insights). */}
          {/**
   * LEGACY HOME IMPLEMENTATION (Commented Out)
   * --------------------------------------------------------------
   * Preserved for future reference. This block contained:
   * - Background hero with image overlay
   * - ALGOHORIZON title banner
   * - Buttons: Login, Watchlists toggle, Insights toggle, Chart, Strike Analysis,
   *   Admin Panel, Google Meet, Server status indicator
   * - Conditional rendering of <WatchLists /> and <HistoricalInsights />
   * - WebSocket connection status display
   */}
  {/**
  <main
    className="min-h-screen bg-cover bg-center bg-fixed"
    style={{
      backgroundImage: `url('https://images.pexels.com/photos/730547/pexels-photo-730547.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')`,
    }}
  >
    <div className="min-h-screen bg-black bg-opacity-60 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-6xl flex flex-col items-center gap-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white uppercase bg-green-600 bg-opacity-40 px-8 py-4 rounded-lg text-center tracking-widest min-w-[300px]">
          ALGOHORIZON
        </h1>
        <div className="flex flex-wrap justify-center gap-4">
          <LoginButton />
          <Button
            onClick={() => {
              setShowWatchLists(!showWatchLists);
              setShowHistoricalInsights(!showHistoricalInsights);
            }}
            className={`${buttonClass} bg-orange-500 hover:bg-orange-600`}
          >
            {showWatchLists ? "Hide Watchlists" : "Show Watchlists"}
          </Button>
          <Button
            onClick={() => {
              setShowHistoricalInsights(!showHistoricalInsights);
              setShowWatchLists(!showWatchLists);
            }}
            className={`${buttonClass} bg-orange-500 hover:bg-orange-600`}
          >
            {showHistoricalInsights ? "Hide Insights" : "Show Insights"}
          </Button>
          <Button onClick={() => router.push('/chart')} className={`${buttonClass} bg-blue-500 hover:bg-blue-600`}>
            View OHLC Chart
          </Button>
          <Button onClick={() => router.push('/strike-analysis')} className={`${buttonClass} bg-purple-500 hover:bg-purple-600`}>
            Strike Analysis
          </Button>
          <Button
            onClick={() => {
              localStorage.setItem('isAdmin', 'true');
              router.push('/admin');
            }}
            className={`${buttonClass} bg-teal-500 hover:bg-teal-600`}
          >
            Admin Panel
          </Button>
          <Button
            onClick={() => {
              window.open('https://meet.google.com/cho-wpms-pbk', '_blank');
            }}
            className={`${buttonClass} bg-yellow-500 hover:bg-amber-600`}
          >
            Algo Google Meet
          </Button>
          <div className={`${buttonClass} ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
            Server is {isConnected ? 'ON' : 'OFF'}
          </div>
        </div>
      </div>
      <div className="w-full max-w-7xl space-y-4 mt-8">
        {showWatchLists && (
          <div className="bg-gray-500 bg-opacity-75 rounded-lg p-6">
            <WatchLists liveData={liveData} />
          </div>
        )}
        {showHistoricalInsights && (
          <div className="bg-gray-500 bg-opacity-75 rounded-lg p-6">
            <HistoricalInsights liveData={liveData} />
          </div>
        )}
      </div>
    </div>
  </main>
  */}
          {/* Combined WatchLists + Insights section triggered from Boom Days sidebar item */}
          {(showWatchLists || showHistoricalInsights) && (
            <div className="w-full max-w-7xl space-y-4 mt-4">
              {showWatchLists && (
                <div className="bg-gray-500/75 rounded-lg p-6">
                  <WatchLists liveData={{}} />
                </div>
              )}
              {showHistoricalInsights && (
                <div className="bg-gray-500/75 rounded-lg p-6">
                  <HistoricalInsights liveData={{}} />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}
