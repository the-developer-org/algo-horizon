/**
 * Dynamic Date Range Calculation for Different Timeframes
 * 
 * This document explains the rationale behind the date range calculations
 * used in OHLCChartDemo to fetch approximately 100 candles for each timeframe.
 * 
 * The goal is to balance:
 * 1. Having enough data for meaningful analysis
 * 2. Not overwhelming the API with too many requests
 * 3. Keeping chart rendering performant
 * 
 * TIMEFRAME CALCULATIONS:
 * 
 * 1m (1-minute):
 *    - Range: 3 days
 *    - Calculation: 3 days × 6.5 hours × 60 minutes = ~1,170 minutes
 *    - Expected candles: ~100-200 (considering market hours)
 * 
 * 5m (5-minute):
 *    - Range: 7 days
 *    - Calculation: 7 days × 6.5 hours × 12 intervals/hour = ~546 intervals
 *    - Expected candles: ~100-150
 * 
 * 15m (15-minute):
 *    - Range: 21 days (3 weeks)
 *    - Calculation: 21 days × 6.5 hours × 4 intervals/hour = ~546 intervals
 *    - Expected candles: ~100-120
 * 
 * 30m (30-minute):
 *    - Range: 1 month
 *    - Calculation: ~22 trading days × 6.5 hours × 2 intervals/hour = ~286 intervals
 *    - Expected candles: ~80-100
 * 
 * 1h (1-hour):
 *    - Range: 2 months
 *    - Calculation: ~44 trading days × 6.5 intervals/day = ~286 intervals
 *    - Expected candles: ~80-120
 * 
 * 4h (4-hour):
 *    - Range: 6 months
 *    - Calculation: ~130 trading days × 1.6 intervals/day = ~208 intervals
 *    - Expected candles: ~100-150
 * 
 * 1d (1-day):
 *    - Range: 2 years
 *    - Calculation: ~520 trading days
 *    - Expected candles: ~400-520
 * 
 * 1w (1-week):
 *    - Range: 3 years
 *    - Calculation: ~156 weeks
 *    - Expected candles: ~150-156
 * 
 * NOTES:
 * - Market hours assumed as 6.5 hours per trading day (9:30 AM - 4:00 PM)
 * - Trading days assumed as ~22 days per month, ~260 days per year
 * - Actual candle count may vary based on holidays, weekends, and market closures
 * - The function ensures we don't fetch excessive data for minute-level timeframes
 * - For daily and weekly data, we fetch more candles for better long-term analysis
 */

export const TIMEFRAME_INFO = {
  '1m': { range: '3 days', expectedCandles: '100-200' },
  '5m': { range: '1 week', expectedCandles: '100-150' },
  '15m': { range: '3 weeks', expectedCandles: '100-120' },
  '30m': { range: '1 month', expectedCandles: '80-100' },
  '1h': { range: '2 months', expectedCandles: '80-120' },
  '4h': { range: '6 months', expectedCandles: '100-150' },
  '1d': { range: '2 years', expectedCandles: '400-520' },
  '1w': { range: '3 years', expectedCandles: '150-156' }
} as const;
