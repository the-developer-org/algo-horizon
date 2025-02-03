import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EyeOff } from "lucide-react"
import getRandomGradient from "./utils/gradients"
import type { HistoricalResponse } from "./types/historical-insights"
import { FaStar, FaRegStar } from "react-icons/fa"
import { ModelDates } from "./ModelDates"

interface CompanyCardsProps {
  sortedData: { [key: string]: HistoricalResponse[] }
  hideCard: (id: string) => void
  updateFavorites: (instrumentKey: string, companyName: string) => void
}

export default function CompanyCards({ sortedData, hideCard, updateFavorites }: CompanyCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                className={`${cardGradient} rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl h-full`}
              >
                <div className="relative">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-blue-800 truncate max-w-[calc(100%-2rem)]">
                      {companyName}
                    </h3>

                    <h3 className="text-lg font-semibold text-blue-800 truncate max-w-[calc(100%-2rem)]">
                      {response.currTrend === "Downtrend (Bearish)" ? (
                    <img width="30" height="30" src="https://img.icons8.com/ios-filled/50/40C057/bull.png" alt="bull"/>    
                      ) : (
                        <img width="30" height="30" src="https://img.icons8.com/ios-filled/50/FA5252/bear-footprint.png" alt="bear"/>
                    
                      )}
                    </h3>


                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => hideCard(`${companyName}-${response.formattedLastBoomDataUpdatedAt}`)}
                    >
                      <EyeOff className="h-4 w-4 text-blue-600" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className=""
                      onClick={() => updateFavorites(response.instrumentKey, companyName)}
                    >
                      {response?.isFavorite ? (
                        <FaStar className="h-6 w-6 text-yellow-500" />
                      ) : (
                        <FaRegStar className="h-6 w-6 text-yellow-500" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-blue-600 mb-4">
                    Last Boom Date Updated: {response?.formattedLastBoomDataUpdatedAt || "N/A"}
                  </p>
                  <p className="text-sm text-blue-600 mb-4">
                    Last Candle Date: {response?.formattedLastCandleDate || "N/A"}
                  </p>
                  <p className="text-sm text-blue-600 mb-4">
                    Avg Volume: {response?.avgVolume ? response.avgVolume.toLocaleString() : "N/A"}
                  </p>

                  <div className="space-y-2">
                    {Object.entries(response?.formattedBoomDayDatesMap || {}).map(([model, dates]) => (
                      <ModelDates
                        key={model}
                        model={model}
                        dates={dates}
                        isBelowPar={response?.isBelowParLevel?.[model]}
                      />
                    ))}
                  </div>
                  <div className="mt-4 space-y-1">
                    <p className="text-sm flex justify-between">
                      <span className="text-blue-600">EMA:</span>
                      <span className="text-blue-800 font-medium">{response.currentEMA?.toFixed(2) ?? "N/A"}</span>
                    </p>
                    <p className="text-sm flex justify-between">
                      <span className="text-blue-600">RSI:</span>
                      <span className="text-blue-800 font-medium">{response.currentRSI?.toFixed(2) ?? "N/A"}</span>
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

