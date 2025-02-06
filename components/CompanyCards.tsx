import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EyeOff } from "lucide-react"
import getRandomGradient from "./utils/gradients"
import type { HistoricalResponse } from "./types/historical-insights"
import { FaStar, FaRegStar } from "react-icons/fa"
import { ModelDates } from "./ModelDates"
import R2Icon from "../app/images/R2.png"
import R1Icon from "../app/images/R1.png"
import Image from "next/image";


interface CompanyCardsProps {
  sortedData: { [key: string]: HistoricalResponse[] }
  hideCard: (id: string) => void
  updateFavorites: (instrumentKey: string, companyName: string) => void
}

export default function CompanyCards({ sortedData, hideCard, updateFavorites }: CompanyCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {Object.entries(sortedData).flatMap(([companyName, responses]) => {
        if (!Array.isArray(responses)) {
          console.error(`Expected an array for responses, but got:`, responses)
          return []
        }

        return responses.map((response, index) => {
          const cardGradient = getRandomGradient()
          return (
            <div
              key={`${companyName}-${index}`}
              className="relative group transform transition-all duration-300 hover:-translate-y-1"
            >
              <div
                className={`${cardGradient} rounded-lg shadow-md p-3 sm:p-4 transition-all duration-300 hover:shadow-lg h-full`}
              >
                <div className="relative">
                  <div className="flex justify-between items-start mb-1 sm:mb-2">
                    <h3 className="text-sm sm:text-base font-semibold text-blue-800 truncate max-w-[calc(100%-3rem)]">
                      {companyName}
                    </h3>

                    <div className="flex items-center space-x-1">
                      <h3 className="text-sm sm:text-base font-semibold text-blue-800">
                        {response.currTrend === "Downtrend (Bearish)" ? (
                          <img
                            width="20"
                            height="20"
                            src="https://img.icons8.com/ios-filled/50/40C057/bull.png"
                            alt="bull"
                          />
                        ) : (
                          <img
                            width="20"
                            height="20"
                            src="https://img.icons8.com/ios-filled/50/FA5252/bear-footprint.png"
                            alt="bear"
                          />
                        )}
                      </h3>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        onClick={() => hideCard(`${companyName}-${response.formattedLastBoomDataUpdatedAt}`)}
                      >
                        <EyeOff className="h-3 w-3 text-blue-600" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="p-1"
                        onClick={() => updateFavorites(response.instrumentKey, companyName)}
                      >
                        {response?.isFavorite ? (
                          <FaStar className="h-3 w-3 text-yellow-500" />
                        ) : (
                          <FaRegStar className="h-3 w-3 text-yellow-500" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between items-start mb-1 sm:mb-2">

                  <div className="flex items-center space-x-1">
                      <h3 className="text-sm sm:text-base font-semibold text-blue-800">
                        {response.didR1Occur  ? (
                          <Image
                            width="30"
                            height="30"
                            src={R1Icon}
                            alt="bull"
                          />
                        ) : ""}
                      </h3>

                      <h3 className="text-sm sm:text-base font-semibold text-blue-800">
                        {response.didR2Occur  ? (
                          <Image
                            width="30"
                            height="30"
                            src={R2Icon}
                            alt="bull"
                          />
                        ) : ""}
                      </h3>

                      </div>
                    </div>
                  <p className="text-xs text-blue-600 mb-1">
                    Last Boom Date: {response?.formattedLastBoomDataUpdatedAt || "N/A"}
                  </p>
                  <p className="text-xs text-blue-600 mb-1">
                    Last Candle: {response?.formattedLastCandleDate || "N/A"}
                  </p>
                  <p className="text-xs text-blue-600 mb-1">
                    Avg Vol: {response?.avgVolume ? response.avgVolume.toLocaleString() : "N/A"}
                  </p>

                  <div className="space-y-1">
                    {Object.entries(response?.formattedBoomDayDatesMap || {}).map(([model, dates]) => (
                      <ModelDates
                        key={model}
                        model={model}
                        dates={dates}
                        isBelowPar={response?.isBelowParLevel?.[model]}
                      />
                    ))}
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs flex justify-between">
                      <span className="text-blue-600">EMA:</span>
                      <span className="text-blue-800 font-medium">{response.currentEMA?.toFixed(2) ?? "N/A"}</span>
                    </p>
                    <p className="text-xs flex justify-between">
                      <span className="text-red-600">RSI:</span>
                      <span className="text-red-800 font-medium">{response.currentRSI?.toFixed(2) ?? "N/A"}</span>
                    </p>
                    <p className="text-xs flex justify-between">
                      <span className="text-blue-600">Support:</span>
                      <span className="text-blue-800 font-medium">{response.support?.toFixed(2) ?? "N/A"}</span>
                    </p>
                    <p className="text-xs flex justify-between">
                      <span className="text-red-600">Resistance:</span>
                      <span className="text-red-800 font-medium">{response.resistance?.toFixed(2) ?? "N/A"}</span>
                    </p>
                    <p className="text-xs flex justify-between">
                      <span className="text-blue-600">Latest High:</span>
                      <span className="text-blue-800 font-medium">{response.latestHigh?.toFixed(2) ?? "N/A"}</span>
                    </p>
                    <p className="text-xs flex justify-between">
                      <span className="text-red-600">Latest Close:</span>
                      <span className="text-red-800 font-medium">{response.latestClose?.toFixed(2) ?? "N/A"}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })
      })}
    </div>
  )
}

