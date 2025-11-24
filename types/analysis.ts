export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: string;
  volume?: number;
}

export interface SwingDTO {
  timestamp: string;
  candles: Candle[];
  price: number;
  label: string;
  time: number;
}

export interface EMADTO {
  ema8?: number | null;
  ema30?: number | null;
  ema200?: number | null;
}

export interface SwingAnalysis {
  minSwingProfits?: number;
  maxSwingProfits?: number;
  daysTakenForMaxSwingProfits?: number;
  maxProfitCandle?: Candle;
  algoEntryCandle?: Candle;
  supportTouchCandle?: Candle;
  resistanceTouchCandle?: Candle;
  daysTakenForSupportTouch?: number;
  daysTakenForResistanceTouch?: number;
  algoSupport?: number;
  algoResistance?: number;
  currentSwing?: SwingDTO | null;
  previousSwing?: SwingDTO | null;
  emacross: EMACROSS;
}

export interface EMACROSS {
  emaDataDay?: EMADTO | null;
  emaData4H?: EMADTO | null;
  emaData1H?: EMADTO | null;
  emaData15M?: EMADTO | null;
  emaCrossoverList1H?: string[] | null;
  emaCrossoverList15M?: string[] | null;
  emaCrossoverList4H?: string[] | null;
  emaCrossoverListDay?: string[] | null;
}

export interface FibAnalysis {
  uuid: string;
  companyName: string;
  instrumentKey: string;
  fibLevels: FibLevels;
}

export interface FibLevels {
  fibHealthyCandle?: Candle | null;
  fib61Candle?: Candle | null;
  fib78Candle?: Candle | null;
  fib100Candle?: Candle | null;
  fib161Candle?: Candle | null;
  fib261Candle?: Candle | null;
  fib423Candle?: Candle | null;
  maxProfitCandle?: Candle | null;
  maxLossCandle?: Candle | null;
  fibHealthy?: number | null;
  fib61?: number | null;
  fib78?: number | null;
  fib100?: number | null;
  fib161?: number | null;
  fib261?: number | null;
  fib423?: number | null;
  maxProfit?: number | null;
  maxLoss?: number | null;
}

export interface Stryke {
  id: string;
  instrumentKey: string;
  companyName: string;
  entryAt: string;
  preEntryTrend: string;
  postEntryTrend: string;
  entryTimeZone: number;
  callType: string;
  entryTime: string;
  preEntryMinuteCandles: Candle[];
  postEntryMinuteCandles: Candle[];
  preEntryDayCandles: Candle[];
  postEntryDayCandles: Candle[];
  entryDaysCandle: Candle;
  entryCandle: Candle;
  entryDayMinutesCandle: Candle;
  rsi: number;
  stopLoss: number;
  target: number;
  dipAfterEntry20M: boolean;
  hitStopLoss: boolean;
  hitTarget: boolean;
  isInResistanceZone: boolean;
  support: number;
  resistance: number;
  peakIn30M: number;
  dipIn30M: number;
  profit: number;
  daysTakenToProfit: number;
  loss: number;
  daysTakenToLoss: number;
  highestPrice: number;
  lowestPrice: number;
  maxDrawDownPercentage: number;
  highestPriceTime: string;
  lowestPriceTime: string;
  remarks: string;
  stockUuid: string;
  lastClosingValue: number;
  avgVolume: number;
  dayStatsMap: { [key: string]: DayStats };
  lastClosingValueDate: string;
  inResistanceZone?: boolean;
  onePercChangeMap: { [dateKey: string]: string };
  strykeSwingAnalysis?: SwingAnalysis;
  algoSwingAnalysis?: SwingAnalysis;
}

export interface DayStats {
  peak: number;
  dip: number;
}

export interface StrykeListResponse {
  swingStatsList: { [key: string]: AnalysisResponse[] };
  statusText: string;
}

export interface AnalysisResponse {
  objectId: string;
  uuid: string;
  label: string;
  companyName: string;
  instrumentKey: string;
  entryTime: string;
  entryCandleClose: number;
  stopLoss: number;
  target: number;
  prevSwingLabel: string;
  currentSwingLabel: string;
  minSwingProfits: number;
  maxSwingProfits: number;
  daysTakenForMaxSwingProfits: number;
  daysTakenForSupportTouch: number;
  daysTakenForResistanceTouch: number;
  daysTakenForAbsoluteProfits: number;
  absoluteProfitsPercentage: number;
  emacross: EMACROSS;
  strykeType: string;
  analysisDeepDive?: {
    swingLabels1?: string | null;
    prelude1?: boolean;
    passing1?: boolean;
    swingLabels2?: string | null;
    prelude2?: boolean;
    passing2?: boolean;
    commentsS1?: string | null;
    commentsS2?: string | null;
  } | null;
}

export interface metricsData {
  minProfitsAchieved: number;
  maxProfitsAchieved: number;
  lessThanMinProfits: number;
  supportsTouched: number;
  resistancesTouched: number;
  avgTimeTakenForProfits: number;
  ErGap_L3: number;
  ErGap_G3: number;
  ER_Gap_AR: number;
  minProfitValue: number;
  maxProfitValue: number;
  avgProfitValue: number;
}

export type FilterOrder = 'asc' | 'desc' | null;
export type TrendFilter = 'BULLISH' | 'BEARISH' | null;