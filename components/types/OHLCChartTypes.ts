import { Candle } from "./candle";

export interface CandleAnalysis {
    clickedCandle: Candle;
    clickedIndex: number;
    trendReversalIndex: number;
    trendReversalCandle: Candle;
    maxProfitPrice: number;
    maxLossPrice: number;
    maxProfitPercent: number;
    maxLossPercent: number;
    finalProfitLoss: number;
    finalProfitLossPercent: number;
    candlesAnalyzed: number;
    trendDirection: 'bullish' | 'bearish' | 'sideways' | 'neutral' | 'consolidated';
    startDate: string;
    endDate: string;
    swingPointLabel: string;
}

export interface OHLCChartProps {
    candles: Candle[];
    instrumentKey?: string;
    companyName?: string;
    timeframe?: string;
    title?: string;
    height?: number | string;
    width?: number;
    showVolume?: boolean;
    showEMA?: boolean;
    showRSI?: boolean;
    showSwingPoints?: boolean;
    analysisList?: { timestamp: string; swingLabel?: string; entryTime?: string; entryCandleClose?: number; target?: number; stopLoss?: number; }[];
    supportLevel?: number;
    resistanceLevel?: number;
    avgVolume?: number;
    entryDates?: string[];
    strykeDates?: string[];
    algoDates?: string[];
    realTimeDates?: string[];
    zoneStartDates?: string[];
    entryPrice?: number;
    targetPrice?: number;
    stopLossPrice?: number;
    onLoadMoreData?: (direction: 'older' | 'newer') => Promise<void>;
    hasMoreOlderData?: boolean;
    hasMoreNewerData?: boolean;
    isLoadingMoreData?: boolean;
}

export type FetchMode = 'initial' | 'pagination' | 'timeframe-change';

export interface FetchCandlesOptions {
    mode: FetchMode;
    timeframe?: string;
    resetState?: boolean;
    showLoadingToast?: boolean;
    loadingMessage?: string;
}

export interface SwingStatsRequest{
    instrumentKey : string;
    fromDate : string;
    toDate : string;
    timeframe : string;
    companyName : string;
}

export interface SwingPoints {
    timeStamp: string;
    price: number;
    label: 'HH' | 'HL' | 'LH' | 'LL';
}

export interface SwingPointsApiResponse  {
    swingPoints: SwingPoints[];
    statusText: string;
}