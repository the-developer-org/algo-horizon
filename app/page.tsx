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
      <div className="min-h-screen bg-black bg-opacity-60 flex flex-col items-center justify-center px-4 py-6">
        {/* Title and Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full max-w-3xl">
          <div
            className="text-xl sm:text-3xl font-bold text-center text-white uppercase bg-purple-200 p-3 sm:p-4 rounded-lg w-full sm:w-auto"
            style={{
              backgroundColor: "rgba(19, 191, 73, 0.42)",
            }}
          >
            <span style={{ letterSpacing: "0.2em" }}>AlgoHorizon</span>
          </div>

          {/* Toggle WatchLists Button */}
          <Button
            variant="orange"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => setShowWatchLists(!showWatchLists)}
          >
            {showWatchLists ? "Hide Watchlists" : "Show Watchlists"}
          </Button>

          {/* Toggle HistoricalInsights Button */}
          <Button
            variant="orange"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => setShowHistoricalInsights(!showHistoricalInsights)}
          >
            {showHistoricalInsights ? "Hide Insights" : "Show Insights"}
          </Button>
        </div>

        {/* Conditionally Render Components */}
        <div className="w-full max-w-4xl mt-6">
          {showWatchLists && <WatchLists />}
          {showHistoricalInsights && <HistoricalInsights />}
        </div>
      </div>
    </div>
  );
}
