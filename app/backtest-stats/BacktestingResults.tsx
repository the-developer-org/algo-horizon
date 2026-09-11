"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { BackTestStats } from "../../components/types/backtest-stats";
import { BackTestStatsTable } from "../../components/BackTestStatsTable";

export default function BackTestStatsPage() {
  const [stats, setStats] = useState<Record<string, BackTestStats[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBackTestStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chart-historical-data/back-test-stats`);
        if (response.data.backTestStats) {
          setStats(response.data.backTestStats);
          toast.success("Backtest stats loaded successfully");
        } else {
          setError("API returned empty response");
          toast.error("Failed to load backtest stats");
        }
      } catch (fetchError) {
        console.error("Error fetching backtest stats:", fetchError);
        setError("Failed to fetch backtest stats data");
        toast.error("Failed to load backtest stats");
      } finally {
        setLoading(false);
      }
    };

    void fetchBackTestStats();
  }, []);

  const statsArray = Object.values(stats).flat();

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      {loading && <div className="flex h-64 items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500" /></div>}
      {error && <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700"><p>{error}</p></div>}
      {!loading && !error && statsArray.length === 0 && <div className="rounded border border-yellow-400 bg-yellow-100 px-4 py-3 text-yellow-700"><p className="font-medium">No backtest statistics available.</p><p className="mt-2 text-sm">The API returned successfully, but no data was found.</p></div>}
      {!loading && !error && statsArray.length > 0 && <BackTestStatsTable stats={statsArray} />}
    </div>
  );
}
