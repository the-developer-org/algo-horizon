import { Candle } from '../types/candle';

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export interface UpstoxTimeframe {
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  interval: string;
}

/**
 * Converts internal timeframe format to Upstox API format
 * @param timeframe Internal timeframe (e.g., '5m', '1h', '1d')
 * @returns Object with unit and interval for Upstox API
 */
export const convertToUpstoxTimeframe = (timeframe: Timeframe): UpstoxTimeframe => {
  switch (timeframe) {
    case '1m':
      return { unit: 'minutes', interval: '1' };
    case '5m':
      return { unit: 'minutes', interval: '5' };
    case '15m':
      return { unit: 'minutes', interval: '15' };
    case '30m':
      return { unit: 'minutes', interval: '30' };
    case '1h':
      return { unit: 'hours', interval: '1' };
    case '4h':
      return { unit: 'hours', interval: '4' };
    case '1d':
      return { unit: 'days', interval: '1' };
    case '1w':
      return { unit: 'weeks', interval: '1' };
    default:
      return { unit: 'days', interval: '1' }; // Default to daily
  }
};


/**
 * Processes candles to the desired timeframe - uses direct API data
 * @param candles Candles from API (already in correct timeframe)
 * @param timeframe Target timeframe (for reference only)
 * @returns Candles as-is since they're already in the correct timeframe
 */
export const processTimeframeData = (candles: Candle[], timeframe: Timeframe): Candle[] => {
  if (!candles.length) return [];
  
  // Since we're getting data from different APIs for different timeframes,
  // we can return the candles directly without any consolidation
  console.log(`📊 Processing ${candles.length} candles for ${timeframe} - using direct API data`);
  return candles;
};
