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
 * Simulates generating smaller timeframes from daily candles (for demo purposes)
 * In a real app, these would come from a separate API endpoint
 * 
 * @param dailyCandles Daily candles from API
 * @param timeframe Target smaller timeframe
 * @returns Simulated intraday candles
 */
export const simulateIntradayData = (dailyCandles: Candle[], timeframe: Timeframe): Candle[] => {
  if (!dailyCandles.length) return [];
  if (timeframe === '1d') return dailyCandles;
  
  const getIntervalsPerDay = (tf: Timeframe): number => {
    switch (tf) {
      case '1m': return 390; // Typical trading day minutes (6.5 hours)
      case '5m': return 78;
      case '15m': return 26;
      case '30m': return 13;
      case '1h': return 7;
      case '4h': return 2;
      case '1d': return 1;
      case '1w': return 1/5; // One per week
      default: return 1;
    }
  };
  
  const intervalsPerDay = getIntervalsPerDay(timeframe);
  const intradayCandles: Candle[] = [];
  
  // For each daily candle, create intraday candles
  dailyCandles.forEach(dailyCandle => {
    const date = new Date(dailyCandle.timestamp);
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    // Standard market hours: 9:30 AM to 4:00 PM
    const marketOpen = new Date(year, month, day, 9, 30);
    
    // Distribute the daily movement across intraday candles
    const dailyRange = dailyCandle.high - dailyCandle.low;
    const dailyMove = dailyCandle.close - dailyCandle.open;
    const volumePerInterval = dailyCandle.volume / intervalsPerDay;
    
    // Generate a "reasonable" intraday pattern
    for (let i = 0; i < intervalsPerDay; i++) {
      // Time for this interval
      let intervalMinutes;
      switch (timeframe) {
        case '1m': intervalMinutes = i; break;
        case '5m': intervalMinutes = i * 5; break;
        case '15m': intervalMinutes = i * 15; break;
        case '30m': intervalMinutes = i * 30; break;
        case '1h': intervalMinutes = i * 60; break;
        case '4h': intervalMinutes = i * 240; break;
        default: intervalMinutes = 0;
      }
      
      const intervalTime = new Date(marketOpen);
      intervalTime.setMinutes(marketOpen.getMinutes() + intervalMinutes);
      
      // Progress through the day (0 to 1)
      const progress = i / intervalsPerDay;
      
      // Generate realistic OHLC data with some randomness
      // We'll use a simple random walk with a bias toward the daily direction
      const randomFactor = Math.random() * 0.4 - 0.2; // -0.2 to 0.2
      const trendFactor = progress * dailyMove + randomFactor * dailyRange;
      
      const open = i === 0 ? dailyCandle.open : intradayCandles[i-1].close;
      const intervalRange = dailyRange * 0.2 * Math.random();
      const close = open + trendFactor / intervalsPerDay;
      const high = Math.max(open, close) + intervalRange * 0.5;
      const low = Math.min(open, close) - intervalRange * 0.5;
      
      // More volume at open and close
      let volumeFactor = 1;
      if (i < intervalsPerDay * 0.1 || i > intervalsPerDay * 0.9) {
        volumeFactor = 1.5; // 50% more volume at open/close
      }
      
      intradayCandles.push({
        timestamp: intervalTime.toISOString(),
        open,
        high,
        low,
        close,
        volume: volumePerInterval * volumeFactor,
        openInterest: dailyCandle.openInterest,
      });
    }
  });
  
  return intradayCandles;
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
