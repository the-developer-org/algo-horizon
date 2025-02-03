export interface HistoricalResponse {
    companyName: string;
    instrumentKey: string;
    formattedLastBoomDataUpdatedAt: string;
    formattedLastCandleDate: string;
    formattedBoomDayDatesMap: {
      [key: string]: string[]
    }
    avgVolume: number;
  
    isBelowParLevel: {
      [key: string]: boolean;
    };
    currentEMA: number | null;
    currentRSI: number | null;
    isFavorite : boolean;
    currTrend : string;
  }
  
  export interface ApiResponse {
    sortedHistoricalResponses: {
      [key: string]: HistoricalResponse;
    };
  }


  
  export interface NumericFilters {
    ema: { value: number | null; type: "above" | "below" };
    rsi: { min: number; max: number };
  }
  
  