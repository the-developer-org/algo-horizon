export interface HistoricalResponse {
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
  
  export interface ApiResponse {
    message: string;
    sortedHistoricalResponses: {
      [key: string]: HistoricalResponse[];
    };
  }
  
  export interface NumericFilters {
    ema: { value: number | null; type: "above" | "below" };
    rsi: { value: number | null; type: "above" | "below" };
  }
  
  