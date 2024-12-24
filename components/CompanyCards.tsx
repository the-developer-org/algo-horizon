import { Button } from "@/components/ui/button";
import { EyeOff } from "lucide-react";
import getGradient from "./utils/gradients";
import { HistoricalResponse } from "./types/historical-insights";
import getRandomGradient from "./utils/gradients";

interface CompanyCardsProps {
  sortedData: { [key: string]: HistoricalResponse[] };
  hideCard: (id: string) => void;
}

export default function CompanyCards({
  sortedData,
  hideCard,
}: CompanyCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Object.entries(sortedData).flatMap(([companyName, responses]) => {
        if (!Array.isArray(responses)) {
          console.error(`Expected an array for responses, but got:`, responses);
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
                className={`${cardGradient} rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl h-full`}
              >
                <div className="relative">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-blue-800 truncate max-w-[calc(100%-2rem)]">
                      {companyName}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() =>
                        hideCard(
                          `${companyName}-${response.formattedLastBoomDataUpdatedAt}`
                        )
                      }
                    >
                      <EyeOff className="h-4 w-4 text-blue-600" />
                    </Button>
                  </div>
                  <p className="text-sm text-blue-600 mb-4">
                    Last Updated:{" "}
                    {response?.formattedLastBoomDataUpdatedAt || "N/A"}
                  </p>
                  <div className="space-y-2">
                    {Object.entries(
                      response?.formattedBoomDayDatesMap || {}
                    ).map(([model, date]) => {
                      const isBelowPar = response?.isBelowParLevel?.[model];
                      return (
                        <div
                          key={model}
                          className={`text-sm p-2 rounded-md bg-white/50 backdrop-blur-sm border-2 ${
                            isBelowPar ? "border-green-500" : "border-red-500"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-blue-700 truncate max-w-[40%]">
                              {model}:
                            </span>
                            <span
                              className={`${
                                isBelowPar ? "text-green-500" : "text-red-500"
                              } font-bold truncate max-w-[60%]`}
                            >
                              {date?.toString() || "N/A"}
                              <span className="ml-2">
                                {isBelowPar === undefined
                                  ? "?"
                                  : isBelowPar
                                  ? "↓ DRY"
                                  : "↑"}
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 space-y-1">
                    <p className="text-sm flex justify-between">
                      <span className="text-blue-600">EMA:</span>
                      <span className="text-blue-800 font-medium">
                        {response.currentEMA?.toFixed(2) ?? "N/A"}
                      </span>
                    </p>
                    <p className="text-sm flex justify-between">
                      <span className="text-blue-600">RSI:</span>
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
  );
}
