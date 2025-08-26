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
 * Consolidates candles to the specified timeframe
 * @param sourceCandles Original candles data
 * @param timeframe Target timeframe
 * @returns Consolidated candles in the requested timeframe
 */
export const consolidateCandles = (sourceCandles: Candle[], timeframe: Timeframe): Candle[] => {
  if (!sourceCandles.length) return [];
  if (timeframe === '1d') return sourceCandles; // Original data is usually daily
  
  // Determine the consolidation interval in minutes
  const getMinutes = (tf: Timeframe): number => {
    switch (tf) {
      case '1m': return 1;
      case '5m': return 5;
      case '15m': return 15;
      case '30m': return 30;
      case '1h': return 60;
      case '4h': return 240;
      case '1d': return 1440; // 24 hours
      case '1w': return 10080; // 7 days
      default: return 1440; // Default to daily
    }
  };
  
  // Function to get the interval timestamp for grouping
  const getIntervalTimestamp = (date: Date, tf: Timeframe): string => {
    // Use UTC to avoid timezone issues that can cause chart distortion
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    
    if (tf === '1w') {
      // For weekly, get the start of the week (Sunday) in UTC
      const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
      const startOfWeek = new Date(Date.UTC(year, month, day - dayOfWeek, 0, 0, 0, 0));
      return startOfWeek.toISOString();
    } else if (tf === '1d') {
      // For daily, use the start of the day in UTC
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0)).toISOString();
    } else if (tf === '4h') {
      // For 4-hour, round down to nearest 4-hour block in UTC
      const fourHourBlock = Math.floor(hours / 4) * 4;
      return new Date(Date.UTC(year, month, day, fourHourBlock, 0, 0, 0)).toISOString();
    } else if (tf === '1h') {
      // For hourly, use the start of the hour in UTC
      return new Date(Date.UTC(year, month, day, hours, 0, 0, 0)).toISOString();
    } else {
      // For minute-based timeframes, round down to the nearest interval in UTC
      const minuteInterval = getMinutes(tf);
      const roundedMinutes = Math.floor(minutes / minuteInterval) * minuteInterval;
      return new Date(Date.UTC(year, month, day, hours, roundedMinutes, 0, 0)).toISOString();
    }
  };
  
  // Group candles by interval
  const groupedCandles: { [key: string]: Candle[] } = {};
  
  // First pass: group candles by interval
  sourceCandles.forEach(candle => {
    const date = new Date(candle.timestamp);
    const intervalKey = getIntervalTimestamp(date, timeframe);
    
    if (!groupedCandles[intervalKey]) {
      groupedCandles[intervalKey] = [];
    }
    
    groupedCandles[intervalKey].push(candle);
  });
  
  // Second pass: consolidate each group into a single candle
  const consolidatedCandles: Candle[] = Object.keys(groupedCandles).map(key => {
    const group = groupedCandles[key];
    
    // Use the first candle's open and the last candle's close
    const open = group[0].open;
    const close = group[group.length - 1].close;
    
    // Find the highest high and lowest low in the group
    const high = Math.max(...group.map(c => c.high));
    const low = Math.min(...group.map(c => c.low));
    
    // Sum the volume
    const volume = group.reduce((sum, c) => sum + c.volume, 0);
    
    return {
      timestamp: key,
      open,
      high,
      low,
      close,
      volume,
      openInterest: group[0].openInterest,
    };
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  return consolidatedCandles;
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
 * Processes candles to the desired timeframe - now uses actual API data for all timeframes
 * @param candles Candles from API (can be any timeframe)
 * @param timeframe Target timeframe
 * @returns Processed candles in the requested timeframe
 */
export const processTimeframeData = (candles: Candle[], timeframe: Timeframe): Candle[] => {
  if (!candles.length) return [];
  
  // For direct use of API data - no simulation needed
  // The Upstox API should provide data in the requested timeframe
  // We just need to consolidate if we have higher resolution data
  
  // If we already have the data at the requested timeframe or lower resolution, use as-is
  return consolidateCandles(candles, timeframe);
};
