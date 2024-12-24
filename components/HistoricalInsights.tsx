"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HiddenCardsManager } from "./HiddenCardsManager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CompanyCards from "./CompanyCards";
import {
  ApiResponse,
  HistoricalResponse,
  NumericFilters,
} from "./types/historical-insights";

export function HistoricalInsights() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({ key: "name", direction: "asc" });
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [numericFilters, setNumericFilters] = useState<NumericFilters>({
    ema: { value: 200, type: "above" },
    rsi: { value: 70, type: "below" },
  });
  const [hiddenCards, setHiddenCards] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [activeAlphabet, setActiveAlphabet] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  const setNumericFilter = (
    filterType: "ema" | "rsi",
    value: number | null,
    type: "above" | "below"
  ) => {
    setNumericFilters((prev) => ({
      ...prev,
      [filterType]: { value, type },
    }));
  };

  const applyFilters = (data: ApiResponse["sortedHistoricalResponses"]) => {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([companyName]) => {
          if (activeAlphabet) {
            return companyName
              .toLowerCase()
              .startsWith(activeAlphabet.toLowerCase());
          }
          if (searchTerm) {
            return companyName.toLowerCase().includes(searchTerm.toLowerCase());
          }
          return true;
        })
        .map(([companyName, responses]) => [
          companyName,
          responses.filter((response) => {
            const cardId = `${companyName}-${response.formattedLastBoomDataUpdatedAt}`;
            if (hiddenCards.includes(cardId)) return false;
            if (showOnlyFavorites && !response.isFavorite) return false;
            const hasActiveModel = !activeFilters.some(
              (filter) =>
                filter.startsWith("Model_") &&
                response.formattedBoomDayDatesMap[filter]
            );
            const meetsEmaFilter =
              !activeFilters.includes("EMA") ||
              numericFilters.ema.value === null ||
              (response.currentEMA !== null &&
                (numericFilters.ema.type === "above"
                  ? response.currentEMA >= numericFilters.ema.value
                  : response.currentEMA <= numericFilters.ema.value));
            const meetsRsiFilter =
              !activeFilters.includes("RSI") ||
              numericFilters.rsi.value === null ||
              (response.currentRSI !== null &&
                (numericFilters.rsi.type === "above"
                  ? response.currentRSI >= numericFilters.rsi.value
                  : response.currentRSI <= numericFilters.rsi.value));
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

  const updateFavorites = async (
    instrumentKey: string,
    companyName: string
  ) => {
    if (data) {
      try {
        const response = await fetch(
          "http://localhost:8050/api/historical-data/update-favourites/NSE",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ instrumentKey }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update favorite status");
        }

        const updatedData = { ...data.sortedHistoricalResponses };
        if (updatedData[companyName]) {
          updatedData[companyName] = updatedData[companyName].map(
            (response) => {
              if (response.instrumentKey === instrumentKey) {
                return { ...response, isFavorite: !response.isFavorite };
              }
              return response;
            }
          );
        }

        setData({
          ...data,
          sortedHistoricalResponses: updatedData,
          message: data.message || "",
        });
      } catch (err) {
        console.error("Error updating favorite status:", err);
        setError("Failed to update favorite status. Please try again.");
      }
    }
  };

  const filteredData = data?.sortedHistoricalResponses
    ? applyFilters(data.sortedHistoricalResponses)
    : null;

  const sortedData = filteredData ? sortData(filteredData) : null;

  const totalCompanies = sortedData ? Object.keys(sortedData).length : 0;
  const totalPages = Math.ceil(totalCompanies / itemsPerPage);

  const paginatedData = sortedData
    ? Object.fromEntries(
        Object.entries(sortedData).slice(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage
        )
      )
    : null;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const handleAlphabetFilter = (letter: string) => {
    setActiveAlphabet(activeAlphabet === letter ? null : letter);
    setCurrentPage(1);
    setSearchTerm("");
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
    setActiveAlphabet(null);
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
            value={numericFilters.ema.value ?? ""}
            onChange={(e) =>
              setNumericFilter(
                "ema",
                e.target.value ? Number(e.target.value) : null,
                numericFilters.ema.type
              )
            }
          />
          <Select
            value={numericFilters.ema.type}
            onValueChange={(value) =>
              setNumericFilter(
                "ema",
                numericFilters.ema.value,
                value as "above" | "below"
              )
            }
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
            value={numericFilters.rsi.value ?? ""}
            onChange={(e) =>
              setNumericFilter(
                "rsi",
                e.target.value ? Number(e.target.value) : null,
                numericFilters.rsi.type
              )
            }
          />
          <Select
            value={numericFilters.rsi.type}
            onValueChange={(value) =>
              setNumericFilter(
                "rsi",
                numericFilters.rsi.value,
                value as "above" | "below"
              )
            }
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
        <Button
          onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
          className={`relative bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold py-3 px-6 rounded-md transition duration-300`}
        >
          {"Show Favorites"}
          <span
            className={`absolute top-0 right-0 w-5 h-3 rounded-md ${
              showOnlyFavorites ? "bg-green-500" : "bg-red-500"
            }`}
            style={{
              borderTopRightRadius: "0.375rem",
              borderBottomLeftRadius: "0.375rem",
              transform: "translate(0%, 0%)",
            }}
          ></span>
        </Button>
      </div>
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search companies..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full max-w-xs bg-gray-800 text-white px-4 py-2 rounded-md"
          style={{ color: "#f5f5dc" }}
        />
      </div>
      <div className="mb-4 flex flex-wrap gap-6">
        {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map(
          (letter) => (
            <Button
              key={letter}
              onClick={() => handleAlphabetFilter(letter)}
              className={`px-3 py-1 ${
                activeAlphabet === letter
                  ? "bg-blue-500 text-white"
                  : "bg-purple-200 text-gray-700"
              }`}
            >
              {letter}
            </Button>
          )
        )}
      </div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: "#f5f5dc" }}>
            Items per page:
          </span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
          >
            <SelectTrigger className="w-[100px]" style={{ color: "#f5f5dc" }}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100, 500].map((value) => (
                <SelectItem key={value} value={value.toString()}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm" style={{ color: "#f5f5dc" }}>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
      <div className="mb-4">
        <HiddenCardsManager hiddenCards={hiddenCards} unhideCard={unhideCard} />
      </div>
      {loading && !data ? (
        <div className="text-center text-gray-600">Loading...</div>
      ) : !paginatedData ? (
        <div className="text-center text-gray-600">No data available</div>
      ) : (
        <div className="relative overflow-hidden rounded-lg p-4 bg-gradient-to-br from-gray-100 to-gray-200">
          <CompanyCards
            sortedData={paginatedData}
            hideCard={hideCard}
            updateFavorites={updateFavorites}
          />
        </div>
      )}

      <div className="flex items-end justify-end mt-10">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm" style={{ color: "#f5f5dc" }}>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
