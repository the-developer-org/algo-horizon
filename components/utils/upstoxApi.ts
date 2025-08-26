import axios from 'axios';
import { Candle } from '../types/candle';
import { Timeframe, convertToUpstoxTimeframe } from './timeframeUtils';

// Interface for Upstox API v3 historical data response
interface UpstoxHistoricalDataResponse {
  status: string;
  data: {
    candles: [string, number, number, number, number, number, number][]; // [timestamp, open, high, low, close, volume, open_interest]
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
 * Maps our app's timeframe format to Upstox API v3 unit and interval format
 * @param timeframe Our app's timeframe
 * @returns Object with unit and interval for Upstox API v3
 */
export const mapTimeframeToUpstoxV3 = (timeframe: string): { unit: string; interval: string } => {
  return convertToUpstoxTimeframe(timeframe as Timeframe);
};

/**
 * Fetches historical data from Upstox API v3
 * @param instrumentKey The instrument key to fetch data for
 * @param unit The unit for candles (minutes, hours, days, weeks, months)
 * @param interval The interval for candles
 * @param toDate End date (format: YYYY-MM-DD)
 * @param fromDate Start date (format: YYYY-MM-DD) - optional
 * @param apiKey Your Upstox API key
 * @returns Processed candle data
 */
export const fetchUpstoxHistoricalData = async (
  instrumentKey: string,
  unit: string = 'days',
  interval: string = '1',
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

  // Build the API URL according to V3 structure
  // GET /v3/historical-candle/:instrument_key/:unit/:interval/:to_date/:from_date
  const today = new Date().toISOString().split('T')[0];
  const defaultToDate = toDate || today;
  
  // Validate date format and range
  if (fromDate && toDate) {
    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);
    const daysDiff = Math.abs((toDateObj.getTime() - fromDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log(`Date range validation: ${fromDate} to ${toDate} (${daysDiff} days)`);
    
    // Limit the range to prevent API errors
    if (daysDiff > 365) {
      console.warn('Date range exceeds 1 year, API might reject the request');
    }
  }
  
  // URL encode the instrument key to handle special characters like |
  const encodedInstrumentKey = encodeURIComponent(instrumentKey);
  
  let url = `https://api.upstox.com/v3/historical-candle/${encodedInstrumentKey}/${unit}/${interval}/${defaultToDate}`;
  
  // Add from_date if provided
  if (fromDate) {
    url += `/${fromDate}`;
  }

  console.log('Upstox API URL:', url); // Debug log

  try {
    const response = await axios.get<UpstoxHistoricalDataResponse>(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    // Check for successful response
    if (response.status !== 200 || response.data.status !== 'success') {
      console.error('API Response Error:', response.data);
      throw new Error(`API request failed: ${response.data.status || 'Unknown error'}`);
    }

    // Transform Upstox candle format to our app's Candle format
    const candles: Candle[] = response.data.data.candles.map(candleData => {
      const [timestamp, open, high, low, close, volume, openInterest] = candleData;
      return {
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        openInterest: openInterest || 0,
      };
    });

    // For V3 API, we need to determine if there's more data based on response length
    // and implement our own pagination logic
    const hasMoreCandles = candles.length > 0; // Assume more data exists if we got results
    const oldestCandleTime = candles.length > 0 ? candles[0].timestamp : undefined;
    const newestCandleTime = candles.length > 0 ? candles[candles.length - 1].timestamp : undefined;

    return {
      candles,
      hasMoreCandles,
      oldestCandleTime,
      newestCandleTime
    };
  } catch (error) {
    console.error('Error fetching Upstox historical data:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      console.error('Response headers:', error.response?.headers);
      throw new Error(`Upstox API Error (${error.response?.status}): ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
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
  
  const { unit, interval } = mapTimeframeToUpstoxV3(timeframe);
  
  try {
    // Extract date parts for the API call
    const toDate = to ? new Date(to).toISOString().split('T')[0] : undefined;
    const fromDate = from ? new Date(from).toISOString().split('T')[0] : undefined;
    
    const result = await fetchUpstoxHistoricalData(
      instrumentKey,
      unit,
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
  const { unit, interval } = mapTimeframeToUpstoxV3(timeframe);
  let allCandles: Candle[] = [];
  let currentToDate = toDate || new Date().toISOString().split('T')[0]; // Use today if not specified
  let hasMoreCandles = true;
  let fetchedPages = 0;

  while (hasMoreCandles && fetchedPages < pages) {
    try {
      const result = await fetchUpstoxHistoricalData(
        instrumentKey,
        unit,
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
