"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, EyeOff } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HiddenCardsManager } from "./HiddenCardsManager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const getRandomGradient = () => {
  const colors = [
    "from-blue-200",
    "from-green-200",
    "from-yellow-200",
    "from-pink-200",
    "from-purple-200",
    "from-indigo-200",
    "via-red-200",
    "via-orange-200",
    "via-teal-200",
    "via-cyan-200",
    "to-rose-200",
    "to-fuchsia-200",
    "to-violet-200",
    "to-sky-200",
    "to-emerald-200",
  ];
  const randomColors = colors.sort(() => 0.5 - Math.random()).slice(0, 3);
  return `bg-gradient-to-br ${randomColors.join(" ")}`;
};

export function HistoricalInsights() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({ key: "name", direction: "asc" });
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [numericFilters, setNumericFilters] = useState({
    ema: { value: null as number | null, type: 'above' as 'above' | 'below' },
    rsi: { value: null as number | null, type: 'above' as 'above' | 'below' },
  });
  const [hiddenCards, setHiddenCards] = useState<string[]>([]);

  const unhideCard = (cardId: string) => {
    setHiddenCards((prevHiddenCards) =>
      prevHiddenCards.filter((id) => id !== cardId)
    );
  };

  const hideCard = (cardId: string) => {
    setHiddenCards((prev) => [...prev, cardId]);
  };

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

  const setNumericFilter = (filterType: 'ema' | 'rsi', value: number | null, type: 'above' | 'below') => {
    setNumericFilters(prev => ({
      ...prev,
      [filterType]: { value, type },
    }));
  };

  const filterData = (data: any[]) => {
    return data.filter((item) => {
      // Handle EMA filter
      if (numericFilters.ema.value !== null) {
        if (numericFilters.ema.type === 'above' && item.currentEMA <= numericFilters.ema.value) {
          return false;
        }
        if (numericFilters.ema.type === 'below' && item.currentEMA >= numericFilters.ema.value) {
          return false;
        }
      }

      // Handle RSI filter
      if (numericFilters.rsi.value !== null) {
        if (numericFilters.rsi.type === 'above' && item.currentRSI <= numericFilters.rsi.value) {
          return false;
        }
        if (numericFilters.rsi.type === 'below' && item.currentRSI >= numericFilters.rsi.value) {
          return false;
        }
      }

      return true; // Include if all numeric filters pass
    });
  };

  const applyFilters = (data: ApiResponse["sortedHistoricalResponses"]) => {
    return Object.fromEntries(
      Object.entries(data)
        .map(([companyName, responses]) => [
          companyName,
          responses.filter((response) => {
            const cardId = `${companyName}-${response.formattedLastBoomDataUpdatedAt}`;
            if (hiddenCards.includes(cardId)) return false;
            const hasActiveModel = !activeFilters.some(
              (filter) =>
                filter.startsWith("Model_") &&
                response.formattedBoomDayDatesMap[filter]
            );
            const meetsEmaFilter =
              !activeFilters.includes("EMA") ||
              numericFilters.ema.value === null ||
              (response.currentEMA !== null &&
                (numericFilters.ema.type === 'above' ? response.currentEMA >= numericFilters.ema.value : response.currentEMA <= numericFilters.ema.value));
            const meetsRsiFilter =
              !activeFilters.includes("RSI") ||
              numericFilters.rsi.value === null ||
              (response.currentRSI !== null &&
                (numericFilters.rsi.type === 'above' ? response.currentRSI >= numericFilters.rsi.value : response.currentRSI <= numericFilters.rsi.value));
            return hasActiveModel && meetsEmaFilter && meetsRsiFilter;
          }),
        ])
        .filter(([, responses]) => responses.length > 0)
    );
  };

  const sortData = (data: { [key: string]: HistoricalResponse[] }) => {
    const sortedEntries = Object.entries(data).sort(
      ([aName, aResponses], [bName, bResponses]) => {
        if (sortConfig.key === "name") {
          return sortConfig.direction === "asc"
            ? aName.localeCompare(bName)
            : bName.localeCompare(aName);
        }
        const aValue =
          aResponses[0]?.[sortConfig.key as keyof HistoricalResponse] ?? null;
        const bValue =
          bResponses[0]?.[sortConfig.key as keyof HistoricalResponse] ?? null;
        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;
        return sortConfig.direction === "asc"
          ? aValue < bValue
            ? -1
            : 1
          : bValue < aValue
          ? -1
          : 1;
      }
    );
    return Object.fromEntries(sortedEntries);
  };

  const sortedData = data?.sortedHistoricalResponses
    ? sortData(applyFilters(data.sortedHistoricalResponses))
    : null;

  const totalCompanies = sortedData ? Object.keys(sortedData).length : 0;

  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  if (error) return <div className="text-center text-red-600">{error}</div>;

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold" style={{ color: "#f5f5dc" }}>
          Historical Insights
        </h2>
        <div className="flex space-x-2">
          <Button
            onClick={handleRefresh}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300 flex items-center"
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            onClick={() => handleSort("name")}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded transition duration-300"
          >
            Sort by Name{" "}
            {sortConfig.key === "name"
              ? sortConfig.direction === "asc"
                ? "↓"
                : "↑"
              : ""}
          </Button>
          <Button
            onClick={() => handleSort("currentEMA")}
            className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded transition duration-300"
          >
            Sort by EMA{" "}
            {sortConfig.key === "currentEMA"
              ? sortConfig.direction === "asc"
                ? "↓"
                : "↑"
              : ""}
          </Button>
          <Button
            onClick={() => handleSort("currentRSI")}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded transition duration-300"
          >
            Sort by RSI{" "}
            {sortConfig.key === "currentRSI"
              ? sortConfig.direction === "asc"
                ? "↓"
                : "↑"
              : ""}
          </Button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <span style={{ color: "#f5f5dc" }}>
          Total Companies: {totalCompanies}
        </span>
        {["Model_1", "Model_2", "Model_3"].map((model) => (
          <Button
            key={model}
            onClick={() => toggleFilter(model)}
            className={`relative bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-3 px-6 rounded-md transition duration-300`}
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
          </Button>
        ))}
        <div className="flex items-center gap-4">
          <Input
            type="number"
            placeholder="EMA"
            className="w-20 bg-white"
            value={numericFilters.ema.value ?? ''}
            onChange={(e) => setNumericFilter('ema', e.target.value ? Number(e.target.value) : null, numericFilters.ema.type)}
          />
          <Select
            value={numericFilters.ema.type}
            onValueChange={(value) => setNumericFilter('ema', numericFilters.ema.value, value as 'above' | 'below')}
          >
            <SelectTrigger className="w-[100px] bg-[#f5f5dc]">
              <SelectValue placeholder="Filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="above">Above</SelectItem>
              <SelectItem value="below">Below</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => toggleFilter("EMA")}
            className={`relative bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold py-3 px-6 rounded-md transition duration-300`}
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
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <Input
            type="number"
            placeholder="RSI"
            className="w-20 bg-white"
            value={numericFilters.rsi.value ?? ''}
            onChange={(e) => setNumericFilter('rsi', e.target.value ? Number(e.target.value) : null, numericFilters.rsi.type)}
          />
          <Select
            value={numericFilters.rsi.type}
            onValueChange={(value) => setNumericFilter('rsi', numericFilters.rsi.value, value as 'above' | 'below')}
          >
            <SelectTrigger className="w-[100px] bg-[#f5f5dc]">
              <SelectValue placeholder="Filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="above">Above</SelectItem>
              <SelectItem value="below">Below</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => toggleFilter("RSI")}
            className={`relative bg-pink-100 hover:bg-pink-200 text-pink-800 font-bold py-3 px-6 rounded-md transition duration-300`}
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
          </Button>
        </div>
      </div>
      <div className="mb-4">
        <HiddenCardsManager hiddenCards={hiddenCards} unhideCard={unhideCard} />
      </div>
      {loading && !data ? (
        <div className="text-center text-gray-600">Loading...</div>
      ) : !sortedData ? (
        <div className="text-center text-gray-600">No data available</div>
      ) : (
        <div className="relative overflow-hidden rounded-lg p-4 bg-gradient-to-br from-gray-100 to-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            {Object.entries(sortedData).flatMap(([companyName, responses]) => {
              if (!Array.isArray(responses)) {
                console.error(
                  `Expected an array for responses, but got:`,
                  responses
                );
                return [];
              }

              return responses.map((response, index) => {
                const cardGradient = getRandomGradient();
                return (
                  <div
                    key={`${companyName}-${index}`}
                    className="relative group transform transition-all duration-300 hover:-translate-y-1"
                  >
                    <div
                      className={`rounded-lg shadow-lg overflow-hidden ${cardGradient}`}
                    >
                      <div className="relative p-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() =>
                            hideCard(
                              `${companyName}-${response.formattedLastBoomDataUpdatedAt}`
                            )
                          }
                        >
                          <EyeOff className="h-4 w-4 text-blue-600" />
                        </Button>
                        <h3 className="text-lg font-semibold text-blue-800 mb-2">
                          {companyName}
                        </h3>
                        <p className="text-sm text-blue-600 mb-4">
                          Last Updated:{" "}
                          {response?.formattedLastBoomDataUpdatedAt || "N/A"}
                        </p>
                        {Object.entries(
                          response?.formattedBoomDayDatesMap || {}
                        ).map(([model, date]) => {
                          const isBelowPar = response?.isBelowParLevel?.[model];
                          return (
                            <div
                              key={model}
                              className={`text-sm p-2 rounded-md mb-2 bg-white/50 backdrop-blur-sm border-2 ${
                                isBelowPar
                                  ? "border-red-500"
                                  : "border-green-500"
                              }`}
                            >
                              <span className="font-medium text-blue-700">
                                {model}:
                              </span>{" "}
                              <span
                                className={`${
                                  isBelowPar
                                    ? "text-red-500 font-bold"
                                    : "text-green-500 font-bold"
                                }`}
                              >
                                {date?.toString() || "N/A"}
                                <span className="ml-2 font-bold">
                                  {isBelowPar === undefined
                                    ? "?"
                                    : isBelowPar
                                    ? "↓"
                                    : "↑"}
                                </span>
                              </span>
                            </div>
                          );
                        })}

                        <div className="mt-4 space-y-1">
                          <p className="text-sm">
                            <span className="text-blue-600">EMA:</span>{" "}
                            <span className="text-blue-800 font-medium">
                              {response.currentEMA?.toFixed(2) ?? "N/A"}
                            </span>
                          </p>
                          <p className="text-sm">
                            <span className="text-blue-600">RSI:</span>{" "}
                            <span className="text-blue-800 font-medium">
                              {response.currentRSI?.toFixed(2) ?? "N/A"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })}
          </div>
        </div>
      )}
    </div>
  );
}

