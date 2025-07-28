export interface BackTestStats {
  companyName: string;
  totalBoomDaysFound: number;
  profitCount: number;
  lossCount: number;
  volumeExceptionsCount: number;
  isInDownTrend: number;
  percCandleMissing: number;
  avgTimeTakenForProfit: number;
}

export interface BackTestStatsResponse {
  statusText: string;
  backTestStats: {
    [companyName: string]: BackTestStats[];
  };
}
