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
    aboveEMA: boolean;
    support : number;
    resistance : number;
    latestOpen : number;
    latestClose : number;
    latestHigh : number;
    latestLow : number;
    latestVolume : number;
    didR1Occur : boolean;
    didR2Occur : boolean;
    beingWatched : boolean;
    addedOn : Date;
  }
  
  export interface ApiResponse {
    sortedHistoricalResponses: {
      [key: string]: HistoricalResponse;
    };
  }

  export interface WatchListResponse {
    message: string;
    watchLists: WatchList[];
  }


  
  export interface NumericFilters {
    ema: { value: number | null; type: "above" | "below" };
    rsi: { min: number; max: number };
  }
  
  export interface Candle {
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    openInterest: number;
    ema: number;
    rsi: number;
  }
  
  export interface WatchList {
    instrumentKey: string;
    companyName: string;
    entryDayValue: number;
    futureEntryDayValue:number;
    overAllProfitPercentage: number;
    overAllLossPercentage: number;
    watchListTag: string;
    inProfit: boolean;
    inLoss: boolean;  
    currentCandle: Candle;
    entryDayCandle: Candle;
    dayWiseCandles: Candle[];
    dayWiseHighReturns: Record<string, number>;
    dayWiseClosingReturns: Record<string, number>;
    beingWatched: boolean;
    highestProfitPercentage : number;
    highestLossPercentage : number;
    highestProfitDay : number;
    highestLossDay : number;
    forFuture : boolean;
    retired : boolean;
    stockCount : number;
    reCalculatedOn : string;
    [key: string]: any; 
  }
  
  export interface WebSocketData {
    [key: string]: Candle; 
  }