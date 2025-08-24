import axios from 'axios';
import { Candle } from '../types/candle';
import { Timeframe } from './timeframeUtils';

// Interface for Upstox API v3 historical data response
interface UpstoxHistoricalDataResponse {
  status: string;
  data: {
    candles: [string, number, number, number, number, number][]; // [timestamp, open, high, low, close, volume]
    more_candles_available?: boolean;
    oldest_candle_time?: string;
    newest_candle_time?: string;
  };
}

// Interface for pagination request params
export interface UpstoxPaginationParams {
  instrumentKey: string;
  timeframe: Timeframe;
  apiKey: string;
  from?: string;
  to?: string;
  limit?: number;
}

// Interface for pagination response
export interface UpstoxPaginationResult {
  candles: Candle[];
  hasMore: boolean;
  oldestTimestamp?: string;
  newestTimestamp?: string;
}

/**
 * Fetches historical data from Upstox API v3
 * @param instrumentKey The instrument key to fetch data for
 * @param interval The candle interval (1minute, 5minute, 15minute, 30minute, 60minute, 1day, 1week)
 * @param toDate End date (format: YYYY-MM-DD)
 * @param fromDate Start date (format: YYYY-MM-DD)
 * @param apiKey Your Upstox API key
 * @returns Processed candle data
 */
export const fetchUpstoxHistoricalData = async (
  instrumentKey: string,
  interval: string = '1day',
  toDate?: string,
  fromDate?: string,
  apiKey?: string
): Promise<{
  candles: Candle[];
  hasMoreCandles: boolean;
  oldestCandleTime?: string;
  newestCandleTime?: string;
}> => {
  // Use environment variable or passed apiKey
  const token = apiKey || process.env.NEXT_PUBLIC_UPSTOX_API_KEY;
  
  if (!token) {
    throw new Error('Upstox API key not provided');
  }

  // Build the API URL with query parameters
  let url = `https://api.upstox.com/v3/historical-candle/${instrumentKey}/${interval}`;
  
  // Add date parameters if provided
  const params: Record<string, string> = {};
  if (toDate) params.to = toDate;
  if (fromDate) params.from = fromDate;

  try {
    const response = await axios.get<UpstoxHistoricalDataResponse>(url, {
      params,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    // Check for successful response
    if (response.status !== 200 || response.data.status !== 'success') {
      throw new Error(`API request failed: ${response.data.status}`);
    }

    // Transform Upstox candle format to our app's Candle format
    const candles: Candle[] = response.data.data.candles.map(candleData => {
      const [timestamp, open, high, low, close, volume] = candleData;
      return {
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        openInterest: 0, // Upstox might not provide this directly
      };
    });

    return {
      candles,
      hasMoreCandles: response.data.data.more_candles_available || false,
      oldestCandleTime: response.data.data.oldest_candle_time,
      newestCandleTime: response.data.data.newest_candle_time
    };
  } catch (error) {
    console.error('Error fetching Upstox historical data:', error);
    throw error;
  }
};

/**
 * Maps our app's timeframe format to Upstox API interval format
 * @param timeframe Our app's timeframe
 * @returns Upstox API interval string
 */
export const mapTimeframeToUpstoxInterval = (timeframe: string): string => {
  const mapping: Record<string, string> = {
    '1m': '1minute',
    '5m': '5minute',
    '15m': '15minute',
    '30m': '30minute',
    '1h': '60minute',
    '4h': '240minute', // Note: Check if Upstox supports 4h candles
    '1d': '1day',
    '1w': '1week'
  };
  
  return mapping[timeframe] || '1day'; // Default to 1day if unknown
};

/**
 * Fetches paginated historical data from Upstox with the new interface
 * @param params UpstoxPaginationParams object with request parameters
 * @returns UpstoxPaginationResult object with candles and pagination info
 */
export const fetchPaginatedUpstoxData = async (
  params: UpstoxPaginationParams
): Promise<UpstoxPaginationResult> => {
  const { 
    instrumentKey, 
    timeframe, 
    apiKey, 
    from, 
    to, 
    limit = 200 
  } = params;
  
  const interval = mapTimeframeToUpstoxInterval(timeframe);
  
  try {
    // Extract date parts for the API call
    const toDate = to ? new Date(to).toISOString().split('T')[0] : undefined;
    const fromDate = from ? new Date(from).toISOString().split('T')[0] : undefined;
    
    const result = await fetchUpstoxHistoricalData(
      instrumentKey,
      interval,
      toDate,
      fromDate,
      apiKey
    );
    
    return {
      candles: result.candles,
      hasMore: result.hasMoreCandles,
      oldestTimestamp: result.oldestCandleTime,
      newestTimestamp: result.newestCandleTime
    };
  } catch (error) {
    console.error('Error fetching paginated Upstox data:', error);
    throw error;
  }
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use the new fetchPaginatedUpstoxData with params object instead
 */
export const fetchPaginatedUpstoxDataLegacy = async (
  instrumentKey: string,
  timeframe: string,
  pages: number = 1,
  toDate?: string,
  apiKey?: string
): Promise<Candle[]> => {
  const interval = mapTimeframeToUpstoxInterval(timeframe);
  let allCandles: Candle[] = [];
  let currentToDate = toDate || new Date().toISOString().split('T')[0]; // Use today if not specified
  let hasMoreCandles = true;
  let fetchedPages = 0;

  while (hasMoreCandles && fetchedPages < pages) {
    try {
      const result = await fetchUpstoxHistoricalData(
        instrumentKey,
        interval,
        currentToDate,
        undefined, // fromDate - we'll use pagination instead
        apiKey
      );

      // Add the fetched candles to our collection
      allCandles = [...result.candles, ...allCandles];
      
      // Update pagination variables
      hasMoreCandles = result.hasMoreCandles;
      fetchedPages++;
      
      // If there's more data and we have an oldest candle time, use it for the next page
      if (hasMoreCandles && result.oldestCandleTime) {
        // Set the toDate to one day before the oldest candle for the next request
        const oldestDate = new Date(result.oldestCandleTime);
        oldestDate.setDate(oldestDate.getDate() - 1); // Go back one day
        currentToDate = oldestDate.toISOString().split('T')[0];
      } else {
        break; // No more data or no oldest date to paginate from
      }
    } catch (error) {
      console.error(`Error fetching page ${fetchedPages + 1}:`, error);
      break; // Stop on error
    }
  }

  // Sort candles by timestamp (oldest to newest)
  return allCandles.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};
