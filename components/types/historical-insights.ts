export interface HistoricalResponse {
    companyName: string;
    instrumentKey: string;
    formattedLastBoomDataUpdatedAt: string;
    formattedLastCandleDate: string;
    formattedBoomDayDatesMap: {
      [key: string]: string;
    };
    maxVolumeChange:{
      [key: string]: number;
    }
    isBelowParLevel: {
      [key: string]: boolean;
    };
    currentEMA: number | null;
    currentRSI: number | null;
    isFavorite : boolean;
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
  
  