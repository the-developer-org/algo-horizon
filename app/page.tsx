"use client";
import { useState } from "react";
import { HistoricalInsights } from "../components/HistoricalInsights";
import { WatchLists } from "../components/WatchLists";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [showWatchLists, setShowWatchLists] = useState(false);
  const [showHistoricalInsights, setShowHistoricalInsights] = useState(true);

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `url('https://images.pexels.com/photos/730547/pexels-photo-730547.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')`,
      }}
    >
      {/* Dark overlay to improve readability */}
      <div className="min-h-screen bg-black bg-opacity-60 flex flex-col items-center justify-center px-6 sm:px-8 md:px-12 py-8">

        {/* Title and Buttons Container */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full max-w-5xl">
          <div
            className="text-xl sm:text-3xl font-bold text-center text-white uppercase bg-purple-200 px-4 py-3 sm:px-6 sm:py-4 rounded-lg w-full sm:w-auto"
            style={{ backgroundColor: "rgba(19, 191, 73, 0.42)" }}
          >
            <span style={{ letterSpacing: "0.2em" }}>AlgoHorizon</span>
          </div>

          {/* Toggle WatchLists Button */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-2 w-full">
            <Button
              variant="orange"
              className="flex-1 sm:flex-none text-sm sm:text-base px-3 py-2 sm:px-5 sm:py-3"
              onClick={() => {setShowHistoricalInsights(!showHistoricalInsights)
                setShowWatchLists(!showWatchLists)

              }}
            >
              {showWatchLists ? "Hide Watchlists" : "Show Watchlists"}
            </Button>

            <Button
              variant="orange"
              className="flex-1 sm:flex-none text-sm sm:text-base px-3 py-2 sm:px-5 sm:py-3"
              onClick={() => {setShowHistoricalInsights(!showHistoricalInsights)
                setShowWatchLists(!showWatchLists)

              }}
            >
              {showHistoricalInsights ? "Hide Insights" : "Show Insights"}
            </Button>
          </div>


        </div>

        {/* Parent container for WatchLists & HistoricalInsights */}
        <div className="w-full sm:w-11/12 md:w-5/6 lg:w-4/5 xl:w-11/12 max-w-25xl mt-8">
          {showWatchLists && (
            <div className="w-full bg-gray-500 bg-opacity-75 rounded-lg p-6 sm:p-8">
              <WatchLists />
            </div>
          )}
          {showHistoricalInsights && (
            <div className="w-full bg-gray-500 bg-opacity-75 rounded-lg p-6 sm:p-8 mt-4">
              <HistoricalInsights />
            </div>
          )}
        </div>

      </div>
    </div>

  );
}
