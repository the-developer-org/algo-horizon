"use client"

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"


import {

    WatchList,
    WebSocketData
} from "./types/historical-insights";
import Image, { StaticImageData } from "next/image";
import R2Icon from "../app/images/R2.png"
import R1Icon from "../app/images/R1.png"
import SQIcon from "../app/images/sq.png"
import { RetireStockModal } from "./RetireStockModal";

interface Props {
    liveData: WebSocketData 
  }

export const WatchLists = ({ liveData }: Props) => {
    const [watchLists, setWatchLists] = useState<WatchList[]>([])
    const [filteredWatchLists, setFilteredWatchLists] = useState<WatchList[]>([])
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [tempValue, setTempValue] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [sortOrderProfit, setSortOrderProfit] = useState<"asc" | "desc" | null>(null);
    const [sortOrderLoss, setSortOrderLoss] = useState<"asc" | "desc" | null>(null);


    const [isModalOpen, setIsModalOpen] = useState(false)
    const [activeInstrumentKey, setActiveInstrumentKey] = useState<string | null>(null);

    useEffect(() => {
        filterAndSortWatchLists();
    }, [searchTerm, activeFilters, sortOrderProfit, sortOrderLoss, watchLists]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            const watchListResponse = await fetch(
                "https://saved-dassie-60359.upstash.io/get/WatchListData",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer AevHAAIjcDE5ZjcwOWVlMmQzNWI0MmE5YTA0NzgxN2VhN2E0MTNjZHAxMA`,
                    },
                }
            );

            const watchListJsonData = await watchListResponse.json();

            const watchListParsedData: WatchList[] = JSON.parse(watchListJsonData.result);

            setWatchLists(watchListParsedData)
        } catch (err) {
            setLoading(false);

            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData()
    }, [fetchData])


    const filterAndSortWatchLists = () => {
        let filtered = [...watchLists]; // Start with original data


        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(watchList =>
                watchList.companyName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply active filters

        if (activeFilters.includes("R1") || activeFilters.includes("R2") || activeFilters.includes("SayQid Watch List")) {
            filtered = filtered.filter(watchList => activeFilters.length === 0 || activeFilters.includes(watchList.watchListTag));
        }

        if (activeFilters.includes("Profit")) {
            filtered = filtered.filter(watchList => watchList?.inProfit && !watchList.retired);
        }

        if (activeFilters.includes("Loss")) {
            filtered = filtered.filter(watchList => watchList?.inLoss && !watchList.retired);
        }

        if (activeFilters.includes("Future")) {
            filtered = filtered.filter(watchList => watchList?.forFuture);
        }

        if (activeFilters.includes("Retired")) {
            filtered = filtered.filter(watchList => watchList?.retired);
        }

        filtered.sort((a, b) => {
            if (a.forFuture && !b.forFuture) return -1; // Future stocks go up
            if (!a.forFuture && b.forFuture) return 1;
            if (a.retired && !b.retired) return 1; // Retired stocks go down
            if (!a.retired && b.retired) return -1;
            return 0; // Keep original order otherwise
        });

        if (sortOrderProfit && activeFilters.includes("Profit")) {
            filtered.sort((a, b) => {
                if (a.inProfit && b.inProfit) {
                    return sortOrderProfit === "asc" ? a.overAllProfitPercentage - b.overAllProfitPercentage
                        : b.overAllProfitPercentage - a.overAllProfitPercentage;
                }
                return 0; // Keep non-matching items unchanged
            });
        }

        if (sortOrderLoss && activeFilters.includes("Loss")) {
            filtered.sort((a, b) => {
                if (a.inLoss && b.inLoss) {
                    return sortOrderLoss === "asc" ? a.overAllLossPercentage - b.overAllLossPercentage
                        : b.overAllLossPercentage - a.overAllLossPercentage;
                }
                return 0; // Keep non-matching items unchanged
            });
        }

        setFilteredWatchLists(filtered);
    };


    const toggleFilter = (tag: string) => {
        setActiveFilters(prevFilters =>
            prevFilters.includes(tag)
                ? prevFilters.filter(f => f !== tag) // Remove filter if selected
                : [...prevFilters, tag] // Add filter if not selected
        );
    };


    const tagIcons: Record<string, StaticImageData> = {
        R1: R1Icon,
        R2: R2Icon,
        "SayQid Watch List": SQIcon,
    };


    const handleRefresh = () => {
        setLoading(true);
        fetchData();
        setLoading(false);
    };

    const handleSave = (instrumentKey: string) => {
        try {
            if (tempValue !== null) {
                updateStockCount(instrumentKey, tempValue);
            }
        } catch (err) {
            console.error("Error updating stock count:", err);
        } finally {
            setEditingId(null); // Exit edit mode
            setTempValue(null);
        }
    };

    const updateStockCount = async (instrumentKey: string, tempValue: number) => {
        try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
            const url = baseUrl + "/api/watchlist/update-stock-count";

            const payload = {
                instrumentKey: instrumentKey,
                stockCount: tempValue
            };

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Failed to update stock count: ${response.statusText}`);
            }

            fetchData();
        } catch (err) {
            console.error("Error updating stock count:", err);
        }
    };

    function formatDateFromSeconds(seconds: number) {
        debugger
        return new Date(seconds * 1000).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }


    return (
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
            <div className="flex justify-between items-center mb-6 w-full">
                <h2 className="text-2xl font-bold text-gray-800">Watch Lists</h2>

                <Button
                    onClick={handleRefresh}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 sm:py-2 sm:px-4 rounded transition duration-300 flex items-center text-xs sm:text-sm"
                    disabled={loading}
                >
                    <RefreshCw className="mr-1 h-3 w-3 sm:h-5 sm:w-5" />
                    {loading ? "Refreshing..." : "Refresh"}
                </Button>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 mb-6 w-full">
                {/* Search Input */}
                <Input
                    type="text"
                    placeholder="Search companies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full lg:w-auto bg-gray-800 text-white px-4 py-2 rounded-md text-sm"
                    style={{ color: "#f5f5dc" }}
                />

                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2 justify-center lg:justify-start w-full">
                    {["R1", "R2", "SayQid Watch List", "Profit", "Loss", "Future", "Retired"].map((tag) => (
                        <Button
                            key={tag}
                            onClick={() => toggleFilter(tag)}
                            className="relative bg-pink-100 hover:bg-pink-200 text-pink-800 font-bold py-2 px-4 rounded-md transition duration-300 text-xs sm:text-sm flex-grow sm:flex-grow-0"
                        >
                            {tag}
                            <span
                                className={`absolute top-0 right-0 w-3 h-2 sm:w-5 sm:h-3 rounded-md ${activeFilters.includes(tag) ? "bg-green-500" : "bg-red-500"
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

                {/* Sorting Options */}
                {(activeFilters.includes("Profit") || activeFilters.includes("Loss")) && (
                    <div className="flex flex-wrap gap-4 justify-center lg:justify-start w-full">
                        {activeFilters.includes("Profit") && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-700 font-semibold">Profit Sort:</span>
                                <Button
                                    onClick={() => setSortOrderProfit("asc")}
                                    className={`bg-green-100 hover:bg-green-200 text-green-800 font-bold py-1 px-3 rounded-md transition duration-300 text-xs sm:text-sm ${sortOrderProfit === "asc" ? "border border-green-500" : ""}`}
                                >
                                    Asc
                                </Button>
                                <Button
                                    onClick={() => setSortOrderProfit("desc")}
                                    className={`bg-green-100 hover:bg-green-200 text-green-800 font-bold py-1 px-3 rounded-md transition duration-300 text-xs sm:text-sm ${sortOrderProfit === "desc" ? "border border-green-500" : ""}`}
                                >
                                    Desc
                                </Button>
                            </div>
                        )}

                        {activeFilters.includes("Loss") && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-700 font-semibold">Loss Sort:</span>
                                <Button
                                    onClick={() => setSortOrderLoss("asc")}
                                    className={`bg-red-100 hover:bg-red-200 text-red-800 font-bold py-1 px-3 rounded-md transition duration-300 text-xs sm:text-sm ${sortOrderLoss === "asc" ? "border border-red-500" : ""}`}
                                >
                                    Asc
                                </Button>
                                <Button
                                    onClick={() => setSortOrderLoss("desc")}
                                    className={`bg-red-100 hover:bg-red-200 text-red-800 font-bold py-1 px-3 rounded-md transition duration-300 text-xs sm:text-sm ${sortOrderLoss === "desc" ? "border border-red-500" : ""}`}
                                >
                                    Desc
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Stats Section */}
            {/* Stats Section */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 w-full">
                {[
                    { label: "Total Stocks", count: filteredWatchLists.length, color: "bg-blue-100 text-blue-800" },
                    { label: "Total in Profit", count: filteredWatchLists.filter(stock => stock.inProfit).length, color: "bg-green-100 text-green-800" },
                    { label: "Total in Loss", count: filteredWatchLists.filter(stock => stock.inLoss).length, color: "bg-red-100 text-red-800" },
                    { label: "Total in R1", count: filteredWatchLists.filter(stock => stock.watchListTag === "R1").length, color: "bg-yellow-100 text-yellow-800" },
                    { label: "Total in R2", count: filteredWatchLists.filter(stock => stock.watchListTag === "R2").length, color: "bg-purple-100 text-purple-800" },
                    { label: "Total in SQ", count: filteredWatchLists.filter(stock => stock.watchListTag === "SayQid Watch List").length, color: "bg-pink-100 text-pink-800" },
                    { label: "Total in Future", count: filteredWatchLists.filter(stock => stock.forFuture).length, color: "bg-indigo-100 text-indigo-800" },
                    { label: "Total Retired", count: filteredWatchLists.filter(stock => stock.retired).length, color: "bg-gray-200 text-gray-700" },
                ].map((stat, index) => (
                    <div key={index} className={`p-2 sm:p-3 rounded-md shadow-sm text-center ${stat.color}`}>
                        <p className="text-xs sm:text-sm font-medium">{stat.label}</p>
                        <p className="text-base sm:text-lg font-bold">{stat.count}</p>
                    </div>
                ))}
            </div>



            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                {filteredWatchLists.length > 0 ? (
                    filteredWatchLists.map((watchList, index) => (
                        <Card key={`${watchList.instrumentKey}-${index}`} className="bg-white bg-opacity-75 w-full">
                            <CardHeader
                                className={`${watchList.retired
                                    ? "bg-gray-400"
                                    : watchList.forFuture
                                        ? "bg-blue-400"
                                        : watchList.inProfit
                                            ? "bg-green-400"
                                            : "bg-red-400"
                                    } p-4`}
                            >
                                <CardTitle className="text-lg font-semibold text-gray-800">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex gap-3 xs:gap-3 sm:gap-3 items-center">
                                            <div className="text-xs xs:text-sm sm:text-base font-semibold w-32 lg:w-72">
                                                {watchList.companyName}
                                            </div>


                                            <Image
                                                className="w-4 h-4 xs:w-5 xs:h-5 sm:w-7 sm:h-7"
                                                src={tagIcons[watchList.watchListTag]}
                                                alt="bull"
                                            />
                                        </div>


                                        <div className="flex gap-2 items-center">
                                            {!watchList.retired && editingId !== watchList.instrumentKey && (
                                                <img
                                                    className="w-5 h-5 sm:w-7 sm:h-7"
                                                    src="https://img.icons8.com/cotton/128/edit--v1.png"
                                                    alt="edit"
                                                    onClick={() => setEditingId(watchList.instrumentKey)}
                                                />
                                            )}

                                            {!watchList.retired && editingId === watchList.instrumentKey && (
                                                <img
                                                    className="w-5 h-5 sm:w-7 sm:h-7"
                                                    src="https://img.icons8.com/keek/50/delete-sign.png"
                                                    alt="close"
                                                    onClick={() => {
                                                        setEditingId(null);
                                                        setTempValue(null);
                                                    }}
                                                />
                                            )}

                                            {!watchList.retired && (
                                                <img
                                                    className="w-5 h-5 sm:w-7 sm:h-7"
                                                    src="https://img.icons8.com/plasticine/100/filled-trash.png"
                                                    alt="trash"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // ✅ Prevents event bubbling
                                                        if (!isModalOpen) {
                                                            setIsModalOpen(true);
                                                        }
                                                        setActiveInstrumentKey(watchList.instrumentKey)

                                                    }}
                                                />
                                            )}

                                            {isModalOpen && activeInstrumentKey === watchList.instrumentKey && (
                                                <RetireStockModal
                                                    isOpen={isModalOpen}
                                                    fetchData={fetchData}
                                                    instrumentKey={watchList.instrumentKey}
                                                    onClose={() => setIsModalOpen(false)}
                                                />
                                            )}
                                        </div>


                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                            {liveData["abc"] && <span style={{ fontWeight: 'bold', marginRight: '8px', color: 'green' }}>
                    {`Live - `}{liveData["abc"]?.close?.toFixed(2)}

                    <>
                      <style>
                        {`
                        @keyframes pulse {
                          0% {
                            transform: scale(1);
                            box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7);
                          }
                          70% {
                            transform: scale(1.3);
                            box-shadow: 0 0 10px 6px rgba(255, 0, 0, 0);
                          }
                          100% {
                            transform: scale(1);
                            box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
                          }
                        }

                        .live-indicator-pulse {
                          width: 10px;
                          height: 10px;
                          background-color: red;
                          border-radius: 50%;
                          display: inline-block;
                          vertical-align: middle;
                          animation: pulse 1.5s ease-in-out infinite;
                          margin-left: 8px;
                        }
                      `}
                      </style>


                      <span className="live-indicator-pulse" style={{ marginBottom: '5px', marginLeft: '8px' }}></span>
                    </>
                  </span>
                  }
                                <p className="text-gray-600">
                                    Added On: {watchList.entryDayCandle.timestamp.slice(0, 10)}
                                </p>
                                {!watchList.forFuture && <p className="text-gray-600">
                                    Re-Calculated On: {watchList?.reCalculatedOn ?? ""}
                                </p>}
                                { (watchList.watchListTag === "SayQid Watch List") && <p className={watchList.retired ? "text-gray-700" : "text-orange-600"}>
                                    {"Entry Marked At :"}{watchList.futureEntryDayValue.toFixed(2)}
                                </p>}
                                {<p className={watchList.retired ? "text-gray-700" : "text-orange-600"}>
                                    {(watchList.watchListTag === "R1" || watchList.watchListTag === "R2") ? "Entry At" : `Actual Entry At:`} {watchList.entryDayValue.toFixed(2)}
                                </p>}
                                {<p className={watchList.retired ? "text-gray-700" : "text-orange-600"}>
                                    Today Closed At: {watchList.currentCandle.close}
                                </p>}
                                {watchList.inProfit && <p className={watchList.retired ? "text-gray-700" : "text-green-600"}>
                                    {watchList.retired ? `Live Profit:` : `Closing Profit:`} {watchList.overAllProfitPercentage.toFixed(2)} {`%`}
                                </p>}
                                {watchList.inLoss && <p className={watchList.retired ? "text-gray-700" : "text-red-600"}>
                                    {watchList.retired ? `Live Loss:` : `Closing Loss :`} {watchList.overAllLossPercentage.toFixed(2)} {`%`}
                                </p>}
                                {watchList.highestProfitPercentage > 0 && <p className={watchList.retired ? "text-gray-700" : "text-green-600"}>
                                    Highest Profit: {`${watchList.highestProfitPercentage.toFixed(2)}% - ${watchList.highestProfitDay}`}
                                </p>}
                                {watchList.highestLossPercentage > 0 && <p className={watchList.retired ? "text-gray-700" : "text-red-600"}>
                                    Highest Loss: {`${watchList.highestLossPercentage.toFixed(2)}% - ${watchList.highestLossDay}`}
                                </p>}
                                {/* <p className="text-green-600">
                                Last Day Returns (H) %: {getLatestReturn(watchList.dayWiseHighReturns)?.toFixed(2)}
                            </p>
                            <p className="text-green-600">
                                Last Day Returns (C) %: {getLatestReturn(watchList.dayWiseClosingReturns)?.toFixed(2)}
                            </p> */}



                                <div className="flex gap-2">
                                    <p className="block text-gray-700">Stock Count:</p>

                                    {editingId === watchList.instrumentKey ? (
                                        <div className="flex gap-1 sm:gap-2 items-center">
                                            <input
                                                type="number"
                                                defaultValue={watchList.stockCount}
                                                onChange={(e) => setTempValue(Number(e.target.value))}
                                                className="border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-400 rounded-md p-1 sm:p-2 
                                                    w-14 sm:w-20 text-center text-gray-900 shadow-sm text-xs sm:text-sm transition-all duration-200"
                                            />

                                            <button
                                                onClick={() => handleSave(watchList.instrumentKey)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 sm:px-4 sm:py-2 
                                                    rounded-md shadow-sm text-xs sm:text-sm transition-all duration-200"
                                            >
                                                Save
                                            </button>
                                        </div>

                                    ) : (
                                        <div
                                            className="bg-white-100 rounded-lg text-gray-600 cursor-pointer hover:bg-gray-200 transition-all duration-200"
                                            onClick={() => {
                                                setTempValue(watchList.stockCount);
                                            }}
                                        >
                                            {watchList.stockCount}
                                        </div>
                                    )}
                                </div>
                                {!watchList.forFuture && <p className={watchList.retired ? "text-gray-700" : "text-green-600"}>
                                    Invested Amount: {(watchList.stockCount * watchList.entryDayValue)?.toFixed(2)}
                                </p>}

                                {!watchList.forFuture && <p className={watchList.retired ? "text-gray-700" : watchList.inProfit ? "text-green-600" : "text-red-600"}>
                                    Current Value: {(watchList.stockCount * watchList.currentCandle.close)?.toFixed(2)}
                                </p>}
                            </CardContent>
                        </Card>
                    ))) : (
                    <div className="flex justify-center items-center h-64">
                        <p className="text-2xl font-bold text-gray-700">NO DATA AVAILABLE</p>
                    </div>

                )}
            </div>
        </div>


    )
}
