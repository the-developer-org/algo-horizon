"use client";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { HistoricalInsights } from "../components/HistoricalInsights";
import { WatchLists } from "../components/WatchLists";
import { Button } from "@/components/ui/button";
import useSocketConnectionStatus from "../components/useSocketConnectionStatus"; 
import useWebSocket from "../components/WebSocket";// Adjust the import path as necessary
import { LoginButton } from "@/components/LoginButton";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showWatchLists, setShowWatchLists] = useState(false);
  const [showHistoricalInsights, setShowHistoricalInsights] = useState(true);
  
  // Using the useSocketConnectionStatus hook for WebSocket connection status
  const { isConnected } = useSocketConnectionStatus(); // Replace with actual WebSocket URL
  const liveData = useWebSocket();

  const buttonClass = "w-[200px] h-[48px] text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center";

  useEffect(() => {
    // Check if user is authenticated
    const isAuthorized = sessionStorage.getItem('isUserAuthorised');
    if (isAuthorized !== 'true') {
      router.replace('/auth');
    } else {
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
    <main
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `url('https://images.pexels.com/photos/730547/pexels-photo-730547.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')`,
      }}
    >
      <div className="min-h-screen bg-black bg-opacity-60 flex flex-col items-center px-4 py-8">
        {/* Title and Buttons Container */}
        <div className="w-full max-w-6xl flex flex-col items-center gap-8">
          {/* ALGOHORIZON Title */}
          <h1 
            className="text-3xl md:text-4xl font-bold text-white uppercase bg-green-600 bg-opacity-40 px-8 py-4 rounded-lg text-center tracking-widest min-w-[300px]"
          >
            ALGOHORIZON
          </h1>

          {/* Buttons Row */}
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

            <div
              className={`${buttonClass} ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            >
              Server is {isConnected ? "ON" : "OFF"}
            </div>
          </div>
        </div>

        {/* Content Section */}
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
  );
}
