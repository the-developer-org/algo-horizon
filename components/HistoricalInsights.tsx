"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
// Constants
const MODELS = ["model1", "model2", "model3", "model4"];
const SORT_KEYS = {
  NAME: "name",
  CURRENT_EMA: "currentEMA",
  CURRENT_RSI: "currentRSI",
  MAX_VOLUME_CHANGE: "maxVolumeChange",
};

export function HistoricalInsights() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({ key: "name", direction: "asc" });
  const [activeFilters, setActiveFilters] = useState<string[]>(MODELS);
  const [numericFilters, setNumericFilters] = useState<NumericFilters>({
    ema: { value: 200, type: "above" },
    rsi: { min: 30, max: 70 },
  });
  const [hiddenCards, setHiddenCards] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [activeAlphabet, setActiveAlphabet] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>(MODELS);
  const [activateDryMode, setActivateDryMode] = useState(false);

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

      const url = "https://algo-horizon-be.onrender.com/api/historical-data/fetch-previous-insights";
      const devUrl = "http://localhost:8080/api/historical-data/fetch-previous-insights";

      const response = await fetch(
        devUrl
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
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  const handleCandleUpdate = async () => {
    setUpdating(true)
    try {


      const url = "https://algo-horizon-be.onrender.com/api/historical-data/fetch-latest-data";
      const devUrl = "http://localhost:8080/api/historical-data/fetch-latest-data";

      const response = await fetch(
        devUrl
      );
      setUpdating(false)
    } catch (err) {
      console.error("Error updating candle data:", err);
      setError("Failed to update candle data. Please try again.");
      setUpdating(false);
    } finally {
      setUpdating(false);
    }
  };


  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  const toggleModelFilter = (model: string) => {
    setSelectedModels((prevSelectedModels) =>
      prevSelectedModels.includes(model)
        ? prevSelectedModels.filter((item) => item !== model)
        : [...prevSelectedModels, model]
    );
  };

  const setNumericFilter = (
    filterType: "ema" | "rsi",
    value: number | null,
    type: "above" | "below" | "min" | "max"
  ) => {
    setNumericFilters((prev) => ({
      ...prev,
      [filterType]:
        filterType === "ema"
          ? { ...prev.ema, value: value ?? prev.ema.value, type }
          : {
            ...prev.rsi,
            [type]: value ?? prev.rsi[type as "min" | "max"],
          },
    }));
  };

  const sortDryData = (data: { [key: string]: HistoricalResponse[] }) => {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([companyName]) => {
          const searchMatches = activeAlphabet
            ? companyName.toLowerCase().startsWith(activeAlphabet.toLowerCase())
            : companyName.toLowerCase().includes(searchTerm.toLowerCase());
          return searchMatches;
        })
        .map(([companyName, responses]) => [
          companyName,
          responses.filter((response) => {
            const selectedModel = selectedModels[0];
            let isDryValid = false;
            if (
              response.isBelowParLevel.hasOwnProperty(selectedModel) &&
              response.isBelowParLevel[selectedModel] === true
            ) {
              isDryValid = true;
            }
            return isDryValid;
          }),
        ])
        .filter(([, responses]) => responses.length > 0)
    );
  };
  const applyFilters = (data: ApiResponse) => {
    const activeModelFilters = activeFilters.filter((filter) =>
      MODELS.includes(filter)
    );

    return Object.fromEntries(
      Object.entries(data.sortedHistoricalResponses)
        .filter(([companyName, responses]) => {
          const searchMatches = activeAlphabet
            ? companyName.toLowerCase().startsWith(activeAlphabet.toLowerCase())
            : companyName.toLowerCase().includes(searchTerm.toLowerCase());
          return searchMatches;
        })
        .map(([companyName, responses]) => [
          companyName,
          Array.isArray(responses) // Check if responses is an array
            ? responses.filter((response: HistoricalResponse) => {
              const cardId = `${companyName}-${response.formattedLastBoomDataUpdatedAt}`;
              const isHidden = hiddenCards.includes(cardId);
              const isFavoriteFiltered =
                activeFilters.includes("Favorites") && !response.isFavorite;
              const modelsValid =
                Object.keys(response.formattedBoomDayDatesMap).some((model) =>
                  activeModelFilters.includes(model)
                );
              const isRsiFiltered =
                activeFilters.includes("RSI") && response.currentRSI &&
                (response.currentRSI < numericFilters.rsi.min ||
                  response.currentRSI > numericFilters.rsi.max);

              console.log('RSI Filter:', {
                isActive: activeFilters.includes("RSI"),
                currentRSI: response.currentRSI,
                min: numericFilters.rsi.min,
                max: numericFilters.rsi.max,
                isFiltered: isRsiFiltered
              });

              return (
                !isHidden &&
                !isFavoriteFiltered &&
                modelsValid &&
                !isRsiFiltered
              );
            })
            : [responses].filter((response: HistoricalResponse) => { // Handle single object case
              const cardId = `${companyName}-${responses.formattedLastBoomDataUpdatedAt}`;
              const isHidden = hiddenCards.includes(cardId);
              const isFavoriteFiltered =
                activeFilters.includes("Favorites") && !responses.isFavorite;
              const modelsValid =
                Object.keys(responses.formattedBoomDayDatesMap).some((model) =>
                  activeModelFilters.includes(model)
                );
              const isRsiFiltered =
                activeFilters.includes("RSI") && responses.currentRSI &&
                (responses.currentRSI < numericFilters.rsi.min ||
                  responses.currentRSI > numericFilters.rsi.max);

              const isAboveEMAFiltered =
                activeFilters.includes("200EMA") && responses.aboveEMA !== undefined &&
                !responses.aboveEMA;

                const isR1Selected = activeFilters.includes("R1")
                const isR2Selected = activeFilters.includes("R2")
                
                const isR1R2Filtered =
                  (isR1Selected || isR2Selected) && !((isR1Selected && responses.didR1Occur) || (isR2Selected && responses.didR2Occur))
                
                return (
                  !isHidden &&
                  !isFavoriteFiltered &&
                  modelsValid &&
                  !isRsiFiltered &&
                  !isAboveEMAFiltered &&
                  !isR1R2Filtered
                );
            })
        ])
        .filter(([, responses]) => responses.length > 0)
    );
  };

  const sortData = (data: { [key: string]: HistoricalResponse[] }) => {
    const sortedEntries = Object.entries(data).sort(
      ([aName, aResponses], [bName, bResponses]) => {
        const aResponse = aResponses[0];
        const bResponse = bResponses[0];

        switch (sortConfig.key) {
          case SORT_KEYS.NAME:
            return sortConfig.direction === "asc"
              ? aName.localeCompare(bName)
              : bName.localeCompare(aName);
          case SORT_KEYS.CURRENT_RSI:
            return sortConfig.direction === "asc"
              ? (aResponse?.currentRSI ?? -Infinity) -
              (bResponse?.currentRSI ?? -Infinity)
              : (bResponse?.currentRSI ?? -Infinity) -
              (aResponse?.currentRSI ?? -Infinity);
          default:
            return 0;
        }
      }
    );
    return Object.fromEntries(sortedEntries);
  };

  const updateFavorites = async (
    instrumentKey: string,
    companyName: string
  ) => {
    try {

      const url = "https://algo-horizon-be.onrender.com/api/historical-data/update-favourites/NSE"

      const devUrl = "http://localhost:8080/api/historical-data/update-favourites/NSE"

      const response = await fetch(
        devUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instrumentKey }),
        }
      );
      if (!response.ok) throw new Error("Failed to update favorite status");

      setData((prev) =>
        prev
          ? {
            ...prev,
            sortedHistoricalResponses: {
              ...prev.sortedHistoricalResponses,
              [companyName]: prev.sortedHistoricalResponses[companyName]
                ? {
                  ...prev.sortedHistoricalResponses[companyName],
                  isFavorite: prev.sortedHistoricalResponses[companyName].instrumentKey === instrumentKey
                    ? !prev.sortedHistoricalResponses[companyName].isFavorite
                    : prev.sortedHistoricalResponses[companyName].isFavorite,
                }
                : prev.sortedHistoricalResponses[companyName], // Keep the existing value if companyName doesn't exist
            },
          }
          : prev
      );

    } catch (err) {
      console.error("Error updating favorite status:", err);
      setError("Failed to update favorite status. Please try again.");
    }
  };

  const filteredData = data
    ? applyFilters(data)
    : null;

  const handleDryData = filteredData ? sortDryData(filteredData) : null;

  let finalData = activateDryMode ? handleDryData : filteredData;

  let sortedData = filteredData ? sortData(finalData) : null;

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

  const handleDryButtonClick = () => {
    setActivateDryMode(!activateDryMode);
  };

  if (error) return <div className="text-center text-red-600">{error}</div>;


  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "#f5f5dc" }}>
          Historical Insights
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleCandleUpdate}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 sm:py-2 sm:px-4 rounded transition duration-300 flex items-center text-xs sm:text-sm"
            disabled={updating}
          >
            <RefreshCw className="mr-1 h-3 w-3 sm:h-5 sm:w-5" />
            {updating ? "Updating..." : "Update Candle Data"}
          </Button>
          <Button
            onClick={handleRefresh}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 sm:py-2 sm:px-4 rounded transition duration-300 flex items-center text-xs sm:text-sm"
            disabled={loading}
          >
            <RefreshCw className="mr-1 h-3 w-3 sm:h-5 sm:w-5" />
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            onClick={() => handleSort("name")}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-1 px-2 sm:py-2 sm:px-4 rounded transition duration-300 text-xs sm:text-sm"
          >
            Sort by Name {sortConfig.key === "name" ? (sortConfig.direction === "asc" ? "↓" : "↑") : ""}
          </Button>
          <Button
            onClick={() => handleSort("currentRSI")}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 px-2 sm:py-2 sm:px-4 rounded transition duration-300 text-xs sm:text-sm"
          >
            Sort by RSI {sortConfig.key === "currentRSI" ? (sortConfig.direction === "asc" ? "↓" : "↑") : ""}
          </Button>
          <Button
            onClick={() => handleSort("maxVolumeChange")}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 sm:py-2 sm:px-4 rounded transition duration-300 text-xs sm:text-sm"
          >
            Sort by Max Volume Change{" "}
            {sortConfig.key === "maxVolumeChange" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
          </Button>

        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-start sm:items-center gap-2 sm:gap-4">
        <span className="w-full sm:w-auto text-sm sm:text-base mb-2 sm:mb-0" style={{ color: "#f5f5dc" }}>
          Total Companies: {totalCompanies}
        </span>
        <div className="flex flex-wrap gap-2">
          {MODELS.map((model) => (
            <Button
              key={model}
              onClick={() => {
                toggleFilter(model)
                toggleModelFilter(model)
              }}
              className={`relative bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-1 px-2 sm:py-3 sm:px-6 rounded-md transition duration-300 text-xs sm:text-sm`}
            >
              {`Model - ${model.charAt(model.length - 1).toUpperCase()}`}
              <span
                className={`absolute top-0 right-0 w-3 h-2 sm:w-5 sm:h-3 rounded-md ${activeFilters.includes(model) ? "bg-green-500" : "bg-red-500"
                  }`}
                style={{
                  borderTopRightRadius: "0.375rem",
                  borderBottomLeftRadius: "0.375rem",
                  transform: "translate(0%, 0%)",
                }}
              ></span>
            </Button>
          ))}
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min RSI"
            className="w-16 sm:w-20 bg-white text-xs sm:text-sm"
            value={numericFilters.rsi.min}
            onChange={(e) => setNumericFilter("rsi", e.target.value ? Number(e.target.value) : null, "min")}
          />
          <Input
            type="number"
            placeholder="Max RSI"
            className="w-16 sm:w-20 bg-white text-xs sm:text-sm"
            value={numericFilters.rsi.max}
            onChange={(e) => setNumericFilter("rsi", e.target.value ? Number(e.target.value) : null, "max")}
          />
        </div>
        <Button
          onClick={() => toggleFilter("RSI")}
          className={`relative bg-pink-100 hover:bg-pink-200 text-pink-800 font-bold py-1 px-2 sm:py-3 sm:px-6 rounded-md transition duration-300 text-xs sm:text-sm`}
        >
          RSI Filter
          <span
            className={`absolute top-0 right-0 w-3 h-2 sm:w-5 sm:h-3 rounded-md ${activeFilters.includes("RSI") ? "bg-green-500" : "bg-red-500"
              }`}
            style={{
              borderTopRightRadius: "0.375rem",
              borderBottomLeftRadius: "0.375rem",
              transform: "translate(0%, 0%)",
            }}
          ></span>
        </Button>
        <Button
          onClick={() => toggleFilter("200EMA")}
          className={`relative bg-pink-100 hover:bg-pink-200 text-pink-800 font-bold py-1 px-2 sm:py-3 sm:px-6 rounded-md transition duration-300 text-xs sm:text-sm`}
        >
          200 EMA
          <span
            className={`absolute top-0 right-0 w-3 h-2 sm:w-5 sm:h-3 rounded-md ${activeFilters.includes("200EMA") ? "bg-green-500" : "bg-red-500"
              }`}
            style={{
              borderTopRightRadius: "0.375rem",
              borderBottomLeftRadius: "0.375rem",
              transform: "translate(0%, 0%)",
            }}
          ></span>
        </Button>
        <Button
          onClick={() => toggleFilter("R1")}
          className={`relative bg-gradient-to-r from-orange-400 to-yellow-300 hover:from-orange-500 hover:to-yellow-400 text-white font-bold py-1 px-2 sm:py-3 sm:px-6 rounded-md transition duration-300 text-xs sm:text-sm`}
        >
          R1
          <span
            className={`absolute top-0 right-0 w-3 h-2 sm:w-5 sm:h-3 rounded-md ${activeFilters.includes("R1") ? "bg-green-500" : "bg-red-500"
              }`}
            style={{
              borderTopRightRadius: "0.375rem",
              borderBottomLeftRadius: "0.375rem",
              transform: "translate(0%, 0%)",
            }}
          ></span>
        </Button>

        <Button
          onClick={() => toggleFilter("R2")}
          className={`relative bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-600 hover:to-purple-600 text-white font-bold py-1 px-2 sm:py-3 sm:px-6 rounded-md transition duration-300 text-xs sm:text-sm`}
        >
          R2
          <span
            className={`absolute top-0 right-0 w-3 h-2 sm:w-5 sm:h-3 rounded-md ${activeFilters.includes("R2") ? "bg-green-500" : "bg-red-500"
              }`}
            style={{
              borderTopRightRadius: "0.375rem",
              borderBottomLeftRadius: "0.375rem",
              transform: "translate(0%, 0%)",
            }}
          ></span>
        </Button>


        <Button
          onClick={() => toggleFilter("Favorites")}
          className={`relative bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold py-1 px-2 sm:py-3 sm:px-6 rounded-md transition duration-300 text-xs sm:text-sm`}
        >
          {"Show Favorites"}
          <span
            className={`absolute top-0 right-0 w-3 h-2 sm:w-5 sm:h-3 rounded-md ${activeFilters.includes("Favorites") ? "bg-green-500" : "bg-red-500"
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
          className="w-full max-w-xs bg-gray-800 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-md text-xs sm:text-sm"
          style={{ color: "#f5f5dc" }}
        />
      </div>
      <div className="mb-4 flex flex-wrap gap-1 sm:gap-2">
        {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((letter) => (
          <Button
            key={letter}
            onClick={() => handleAlphabetFilter(letter)}
            className={`px-1 sm:px-3 py-1 text-xs sm:text-sm ${activeAlphabet === letter ? "bg-blue-500 text-white" : "bg-purple-200 text-gray-700"
              }`}
          >
            {letter}
          </Button>
        ))}
      </div>
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm" style={{ color: "#f5f5dc" }}>
            Items per page:
          </span>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[80px] sm:w-[100px]" style={{ color: "#f5f5dc" }}>
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
            className="text-xs sm:text-sm py-1 px-2 sm:py-2 sm:px-4"
          >
            Previous
          </Button>
          <span className="text-xs sm:text-sm" style={{ color: "#f5f5dc" }}>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="text-xs sm:text-sm py-1 px-2 sm:py-2 sm:px-4"
          >
            Next
          </Button>
        </div>
      </div>
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <HiddenCardsManager hiddenCards={hiddenCards} unhideCard={unhideCard} />
        {selectedModels.length === 1 && (
          <Button
            className={`relative font-bold py-1 px-2 sm:py-3 sm:px-6 rounded-md transition duration-300 ${activateDryMode ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
              } text-white text-xs sm:text-sm`}
            onClick={handleDryButtonClick}
          >
            DRY MODE
          </Button>
        )}
      </div>

      {loading && !data ? (
        <div className="text-center text-gray-600">Loading...</div>
      ) : !paginatedData ? (
        <div className="text-center text-gray-600">No data available</div>
      ) : (
        <div className="relative overflow-hidden rounded-lg p-2 sm:p-4 bg-gradient-to-br from-gray-100 to-gray-200">
          <CompanyCards fetchHistoricalData={fetchData} sortedData={paginatedData} hideCard={hideCard} updateFavorites={updateFavorites} />
        </div>
      )}

      <div className="flex items-center justify-center sm:justify-end mt-4 sm:mt-10 gap-2">
        <Button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="text-xs sm:text-sm py-1 px-2 sm:py-2 sm:px-4"
        >
          Previous
        </Button>
        <span className="text-xs sm:text-sm" style={{ color: "#f5f5dc" }}>
          Page {currentPage} of {totalPages}
        </span>
        <Button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="text-xs sm:text-sm py-1 px-2 sm:py-2 sm:px-4"
        >
          Next
        </Button>
      </div>
    </div>
  )
}
