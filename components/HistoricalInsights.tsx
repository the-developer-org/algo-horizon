"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

interface HistoricalResponse {
  companyName: string;
  formattedLastBoomDataUpdatedAt: string;
  formattedBoomDayDatesMap: {
    [key: string]: string;
  };
  isBelowParLevel: {
    [key: string]: boolean;
  };
  currentEMA: number | null;
  currentRSI: number | null;
}

interface ApiResponse {
  message: string;
  sortedHistoricalResponses: {
    [key: string]: HistoricalResponse[]; 
  };
}


const getModelColor = (model: string, isBelowPar: boolean | undefined) => {
  const baseColors = {
    Model_1: ["from-red-500 to-red-300", "text-red-800"],
    Model_2: ["from-orange-500 to-orange-300", "text-orange-800"],
    Model_3: ["from-green-500 to-green-300", "text-green-800"],
    default: ["from-gray-500 to-gray-300", "text-gray-800"],
  };

  const [bgGradient, textColor] =
    baseColors[model as keyof typeof baseColors] || baseColors.default;
  const opacity =
    isBelowPar === undefined
      ? "bg-opacity-50"
      : isBelowPar
      ? "bg-opacity-30"
      : "bg-opacity-70";

  return `bg-gradient-to-r ${bgGradient} ${opacity} ${textColor}`;
};

export function HistoricalInsights() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [emaSortOrder, setEMASortOrder] = useState<"asc" | "desc">("asc");
  const [rsiSortOrder, setRSISortOrder] = useState<"asc" | "desc">("asc");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [emaFilter, setEmaFilter] = useState<number | null>(null);
  const [rsiFilter, setRsiFilter] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "http://localhost:8050/api/historical-data/fetch-previous-insights"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      const result: ApiResponse = await response.json();
      setData(result);
    } catch (err) {
      setError("An error occurred while fetching data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  const applyFilters = (data: ApiResponse['sortedHistoricalResponses']) => {
    return Object.fromEntries(
      Object.entries(data).map(([companyName, responses]) => [
          companyName,
        responses.filter(response => {
          const hasActiveModel = !activeFilters.some(filter => 
            filter.startsWith('Model_') && response.formattedBoomDayDatesMap[filter]
          )
          const meetsEmaFilter = emaFilter === null || (response.currentEMA !== null && response.currentEMA >= emaFilter)
          const meetsRsiFilter = rsiFilter === null || (response.currentRSI !== null && response.currentRSI >= rsiFilter)
          return hasActiveModel && meetsEmaFilter && meetsRsiFilter
        })
      ]).filter(([, responses]) => responses.length > 0)
    )
  }

  const sortedData = data?.sortedHistoricalResponses ? Object.fromEntries(
    Object.entries(applyFilters(data.sortedHistoricalResponses)).sort(([a], [b]) => 
      sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
    )
  ) : null

  const totalCompanies = sortedData ? Object.keys(sortedData).length : 0

  if (error) return <div className="text-center text-red-300">{error}</div>

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Historical Insights</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-300 flex items-center"
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300"
          >
            Sort by Name {sortOrder === "asc" ? "↓" : "↑"}
          </button>
          <button
            onClick={() => setEMASortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300"
          >
            Sort by EMA {sortOrder === "asc" ? "↓" : "↑"}
          </button>
          <button
            onClick={() => setRSISortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300"
          >
            Sort by RSI {sortOrder === "asc" ? "↓" : "↑"}
          </button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
  <span className="text-white">Total Companies: {totalCompanies}</span>
  {["Model_1", "Model_2", "Model_3"].map((model) => (
    <button
      key={model}
      onClick={() => toggleFilter(model)}
      className={`relative bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-md transition duration-300`}
    >
      {model}
      <span
        className={`absolute top-0 right-0 w-5 h-3 rounded-md ${
          activeFilters.includes(model) ? "bg-red-500" : "bg-green-500"
        }`}
        style={{
          borderTopRightRadius: "0.375rem",
          borderBottomLeftRadius: "0.375rem",
          transform: "translate(0%, 0%)",
        }}
      ></span>
    </button>
  ))}
  <div className="flex items-center gap-4">
    <Input
      type="number"
      placeholder="EMA"
      className="w-20 bg-white"
      value={emaFilter ?? ""}
      onChange={(e) =>
        setEmaFilter(e.target.value ? Number(e.target.value) : null)
      }
    />
    <button
      onClick={() => toggleFilter("EMA")}
      className={`relative bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-md transition duration-300`}
    >
      EMA Filter
      <span
        className={`absolute top-0 right-0 w-5 h-3 rounded-md ${
          activeFilters.includes("EMA") ? "bg-green-500" : "bg-red-500"
        }`}
        style={{
          borderTopRightRadius: "0.375rem",
          borderBottomLeftRadius: "0.375rem",
          transform: "translate(0%, 0%)",
        }}
      ></span>
    </button>
  </div>
  <div className="flex items-center gap-4">
    <Input
      type="number"
      placeholder="RSI"
        className="w-20 bg-white"
      value={rsiFilter ?? ""}
      onChange={(e) =>
        setRsiFilter(e.target.value ? Number(e.target.value) : null)
      }
    />
    <button
      onClick={() => toggleFilter("RSI")}
      className={`relative bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-md transition duration-300`}
    >
      RSI Filter
      <span
        className={`absolute top-0 right-0 w-5 h-3 rounded-md ${
          activeFilters.includes("RSI") ? "bg-green-500" : "bg-red-500"
        }`}
        style={{
          borderTopRightRadius: "0.375rem",
          borderBottomLeftRadius: "0.375rem",
          transform: "translate(0%, 0%)",
        }}
      ></span>
    </button>
  </div>
</div>

      {loading && !data ? (
        <div className="text-center text-white">Loading...</div>
      ) : !sortedData ? (
        <div className="text-center text-white">No data available</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(sortedData).flatMap(([companyName, responses]) => {
            if (!Array.isArray(responses)) {
              console.error(
                `Expected an array for responses, but got:`,
                responses
              );
              return [];
            }

            return responses.map((response, index) => (
              <Card
                key={`${companyName}-${index}`}
                className="border border-blue-200 overflow-hidden bg-white bg-opacity-90"
              >
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-400 h-24 flex items-center justify-center">
                  <CardTitle className="text-white text-center">
                    {companyName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-sm mb-2 text-gray-700">
                    Last Updated:{" "}
                    {response?.formattedLastBoomDataUpdatedAt || "N/A"}
                  </p>
                  {Object.entries(response?.formattedBoomDayDatesMap || {}).map(
                    ([model, date]) => {
                      const isBelowPar = response?.isBelowParLevel?.[model];
                      return (
                        <div
                          key={model}
                          className={`text-sm p-2 rounded-md mb-2 ${getModelColor(
                            model,
                            isBelowPar
                          )}`}
                        >
                          <span className="font-semibold">{model}:</span>{" "}
                          {date?.toString() || "N/A"}
                          <span className="ml-2 font-semibold">
                            {isBelowPar === undefined
                              ? "?"
                              : isBelowPar
                              ? "↓"
                              : "↑"}
                          </span>
                        </div>
                      );
                    }
                  )}
                  <p className="text-sm text-gray-700">
                    EMA: {response.currentEMA?.toFixed(2) ?? "N/A"}
                  </p>
                  <p className="text-sm text-gray-700">
                    RSI: {response.currentRSI?.toFixed(2) ?? "N/A"}
                  </p>
                </CardContent>
              </Card>
            ));
          })}
        </div>
      )}
    </div>
  );
}
