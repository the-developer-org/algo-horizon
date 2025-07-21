import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EyeOff } from "lucide-react"
import getRandomGradient from "./utils/gradients"
import type { HistoricalResponse } from "./types/historical-insights"
import { FaStar, FaRegStar } from "react-icons/fa"
import { ModelDates } from "./ModelDates"
import R2Icon from "../app/images/R2.png"
import R1Icon from "../app/images/R1.png"
import WLIcon from "../app/images/wl.png"
import Image from "next/image";
import { WatchListModal } from "./WatchListModal"
import { ConsentModal } from "@/components/ConsentModal"
import { ConsentRevokeModal } from "./ConsentRevokeModal"

import {
  WebSocketData
} from "./types/historical-insights";


interface CompanyCardsProps {
  sortedData: { [key: string]: HistoricalResponse[] }
  hideCard: (id: string) => void
  updateFavorites: (instrumentKey: string, companyName: string) => void
  fetchHistoricalData: () => void
  liveClose: WebSocketData
  liveSet : string[]
  updateLiveSet : () => void
}

export default function CompanyCards({ sortedData, hideCard, updateFavorites, fetchHistoricalData, liveClose, liveSet, updateLiveSet }: CompanyCardsProps) {

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false)
  const [isConsentRevokeModalOpen, setIsConsentRevokeModalOpen] = useState(false)
  const [activeInstrumentKey, setActiveInstrumentKey] = useState<string | null>(null);

  const [liveInstrumentKey, setLiveInstrumentKey] = useState<string | null>(null);




  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                  <div className="flex justify-between items-center mb-1 sm:mb-2">
                    {/* Left: Company Name */}
                    <h3 className="text-sm sm:text-base font-semibold text-blue-800 truncate max-w-[60%]">
                      {companyName}
                    </h3>

                    {/* Right: Trend Icons & Buttons */}
                    <div className="flex items-center space-x-2">
                      {(liveClose !== null) && <img
                        width="40"
                        height="40"
                        src={
                          liveClose[(response?.instrumentKey)]
                            ? "https://img.icons8.com/dotty/80/FA5252/last-60-sec.png"
                            : "https://img.icons8.com/dotty/80/40C057/last-60-sec.png"
                        }
                        alt={liveClose?.[response.instrumentKey] ? "bull" : "bear"}
                        onClick={(e) => {
                          if (  liveClose[(response?.instrumentKey)]) {
                            e.stopPropagation()
                            if (!isConsentModalOpen) setIsConsentModalOpen(true)
                            setLiveInstrumentKey(response.instrumentKey)
                         //   updateLiveSet()
                          } else {
                            e.stopPropagation()
                            if (!isConsentModalOpen) setIsConsentModalOpen(true)
                            setLiveInstrumentKey(response.instrumentKey)
                           // updateLiveSet()
                          }
                        }}
                      />}


                      {/* Consent Icon */}
                      {isConsentModalOpen && liveInstrumentKey === response.instrumentKey && (
                        <ConsentModal
                          isOpen={isConsentModalOpen}
                          instrumentKey={response.instrumentKey}
                          onClose={() => setIsConsentModalOpen(false)}
                        />
                      )}
                      {/* Revoke Consent Icon */}
                      {isConsentRevokeModalOpen && liveInstrumentKey === response.instrumentKey && (
                        <ConsentRevokeModal
                          isOpen={isConsentRevokeModalOpen}
                          instrumentKey={response.instrumentKey}
                          onClose={() => setIsConsentRevokeModalOpen(false)}
                        />
                      )}
                      {/* Watch List Icon */}

                      {!response.beingWatched &&
                        <Image
                          width="30"
                          height="30"
                          src={WLIcon}
                          onClick={(e) => {
                            e.stopPropagation(); // ✅ Prevents event bubbling
                            if (!isModalOpen) {
                              setIsModalOpen(true);
                            }
                            setActiveInstrumentKey(response.instrumentKey)

                          }}
                          alt="Watch List"
                        />}
                      {isModalOpen && activeInstrumentKey === response.instrumentKey && (
                        <WatchListModal
                          isOpen={isModalOpen}
                          fetchHistoricalData={fetchHistoricalData}
                          instrumentKey={response.instrumentKey}
                          onClose={() => setIsModalOpen(false)}
                        />
                      )}
                      {/* Trend Icon (Bull/Bear) */}
                      {response.currTrend === "Downtrend (Bearish)" ? (
                        <img width="20" height="20" src="https://img.icons8.com/ios-filled/50/40C057/bull.png" alt="bull" />
                      ) : (
                        <img width="20" height="20" src="https://img.icons8.com/ios-filled/50/FA5252/bear-footprint.png" alt="bear" />
                      )}

                      {/* Hide Card Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        onClick={() => hideCard(`${companyName}-${response.formattedLastBoomDataUpdatedAt}`)}
                      >
                        <EyeOff className="h-3 w-3 text-blue-600" />
                      </Button>

                      {/* Favorite Button */}
                      <Button variant="outline" size="sm" className="p-1" onClick={() => updateFavorites(response.instrumentKey, companyName)}>
                        {response?.isFavorite ? (
                          <FaStar className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <FaRegStar className="h-4 w-4 text-yellow-500" />
                        )}
                      </Button>
                    </div>
                  </div>


                  <div className="flex justify-between items-start mb-1 sm:mb-2">

                    <div className="flex items-center space-x-1">
                      <h3 className="text-sm sm:text-base font-semibold text-blue-800">
                        {response.didR1Occur ? (
                          <Image
                            width="30"
                            height="30"
                            src={R1Icon}
                            alt="bull"
                          />
                        ) : ""}
                      </h3>

                      <h3 className="text-sm sm:text-base font-semibold text-blue-800">
                        {response.didR2Occur ? (
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
                  {liveClose[response.instrumentKey] && <span style={{ fontWeight: 'bold', marginRight: '8px', color: 'green' }}>
                    {`Live - `}{liveClose[response.instrumentKey]?.close?.toFixed(2)}

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

