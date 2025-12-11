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
  apiKey?: string;
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
 * Get maximum duration limits for different timeframes based on Upstox API constraints
 * @param unit The unit for candles (minutes, hours, days, weeks, months)
 * @param interval The interval for candles
 * @returns Maximum duration in days for the given timeframe
 */
export const getMaxDurationForTimeframe = (unit: string, interval: string): number => {
  const timeframeKey = `${unit}_${interval}`;

  // Based on Upstox API documentation and real-world testing
  // These limits prevent API errors for different timeframes
  const maxDurations: Record<string, number> = {
    // Minutes timeframes - shorter duration limits
    'minutes_1': 7,     // 1m: 7 days max
    'minutes_5': 30,    // 5m: 30 days max
    'minutes_15': 30,   // 15m: 30 days max
    'minutes_30': 90,   // 30m: 90 days max

    // Hours timeframes - medium duration limits
    'hours_1': 90,      // 1h: ~3 months max (based on your example: May 28 to Aug 27)
    'hours_4': 180,     // 4h: ~6 months max

    // Days and larger timeframes - longer duration limits
    'days_1': 365,      // 1d: 1 year max
    'weeks_1': 1825,    // 1w: 5 years max
    'months_1': 1825,   // 1M: 5 years max
  };

  return maxDurations[timeframeKey] || 365; // Default to 1 year if not found
};

/**
 * Calculate appropriate date range for a given timeframe
 * @param timeframe The timeframe (e.g., '1h', '1d')
 * @param toDate Optional end date (defaults to today)
 * @param requestedDays Optional number of days requested (will be capped to max allowed)
 * @returns Object with fromDate and toDate strings
 */
export const calculateOptimalDateRange = (
  timeframe: Timeframe,
  toDate?: string,
  requestedDays?: number
): { fromDate: string; toDate: string; actualDays: number; maxDays: number } => {
  const { unit, interval } = convertToUpstoxTimeframe(timeframe);
  const maxDuration = getMaxDurationForTimeframe(unit, interval);

  // Use provided toDate or default to today
  const endDate = toDate ? new Date(toDate) : new Date();
  const endDateString = endDate.toISOString().split('T')[0];

  // Determine how many days to go back
  let daysToGoBack: number;

  if (requestedDays) {
    // Use requested days but cap it to the maximum allowed
    daysToGoBack = Math.min(requestedDays, maxDuration);
  } else {
    // Use reasonable defaults based on timeframe
    const defaultDays: Record<string, number> = {
      '1m': 3,     // 3 days for 1-minute data
      '5m': 7,     // 1 week for 5-minute data
      '15m': 14,   // 2 weeks for 15-minute data
      '30m': 30,   // 1 month for 30-minute data
      '1h': 60,    // 2 months for 1-hour data
      '4h': 90,    // 3 months for 4-hour data
      '1d': 180,   // 6 months for daily data
      '1w': 365,   // 1 year for weekly data
    };

    daysToGoBack = Math.min(defaultDays[timeframe] || 30, maxDuration);
  }

  // Calculate fromDate
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - daysToGoBack);
  const fromDateString = startDate.toISOString().split('T')[0];

  return {
    fromDate: fromDateString,
    toDate: endDateString,
    actualDays: daysToGoBack,
    maxDays: maxDuration
  };
};

/**
 * Helper to check if an error is a retryable "Invalid date range" error
 */
const isRetryableInvalidDateRangeError = (error: unknown): boolean => {
  return axios.isAxiosError(error) &&
    error.response?.status === 400 &&
    error.response?.data?.message === "Invalid date range";
};

/**
 * Helper to adjust fromDate by reducing range by specified days
 */
const adjustFromDateByDays = (fromDate: string, daysToReduce: number): string => {
  const fromDateObj = new Date(fromDate);
  fromDateObj.setDate(fromDateObj.getDate() + daysToReduce);
  return fromDateObj.toISOString().split('T')[0];
};

/**
 * Helper to rebuild URL with new fromDate
 */
const rebuildUrlWithFromDate = (
  instrumentKey: string,
  unit: string,
  interval: string,
  toDate: string,
  fromDate: string
): string => {
  const encodedInstrumentKey = encodeURIComponent(instrumentKey);
  return `https://api.upstox.com/v3/historical-candle/${encodedInstrumentKey}/${unit}/${interval}/${toDate}/${fromDate}`;
};

/**
 * Helper to handle retry attempt for invalid date range error
 */
const handleRetryAttempt = (params: {
  currentAttempt: number;
  maxRetries: number;
  currentFromDate: string;
  instrumentKey: string;
  unit: string;
  interval: string;
  toDate: string;
  originalFromDate?: string;
}): { shouldRetry: boolean; newFromDate: string; newUrl: string } => {
  const { currentAttempt, maxRetries, currentFromDate, instrumentKey, unit, interval, toDate, originalFromDate } = params;

  if (currentAttempt > maxRetries || !currentFromDate) {
    return { shouldRetry: false, newFromDate: currentFromDate, newUrl: '' };
  }

  console.warn(`⚠️ Attempt ${currentAttempt}: Invalid date range error detected`);

  // Reduce the date range by 10 days for retry
  const newFromDate = adjustFromDateByDays(currentFromDate, 10);
  const newUrl = rebuildUrlWithFromDate(instrumentKey, unit, interval, toDate, newFromDate);

  const originalDays = originalFromDate
    ? Math.abs((new Date(toDate).getTime() - new Date(originalFromDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const newDays = Math.abs((new Date(toDate).getTime() - new Date(newFromDate).getTime()) / (1000 * 60 * 60 * 24));

  console.log(`🔄 Retry ${currentAttempt}: Reducing range by 10 days`);
  console.log(`   Original range: ${originalFromDate} to ${toDate} (${Math.round(originalDays)} days)`);
  console.log(`   New range: ${newFromDate} to ${toDate} (${Math.round(newDays)} days)`);

  return { shouldRetry: true, newFromDate, newUrl };
};

/**
 * Retry helper for Upstox API calls with automatic date range reduction
 */
const retryUpstoxApiCall = async (
  url: string,
  token: string,
  instrumentKey: string,
  unit: string,
  interval: string,
  toDate: string,
  fromDate?: string
): Promise<UpstoxHistoricalDataResponse> => {
  const maxRetries = 3;
  let currentAttempt = 0;
  let currentFromDate = fromDate;
  let currentUrl = url;

  while (currentAttempt <= maxRetries) {
    try {
     
      const response = await axios.get<UpstoxHistoricalDataResponse>(currentUrl, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Referer': ''
        }
      });

   

      if (response.status !== 200 || response.data.status !== 'success') {
        throw new Error(`API request failed: ${response.data.status || 'Unknown error'}`);
      }
      return response.data;

    } catch (error) {
      currentAttempt++;

      if (isRetryableInvalidDateRangeError(error) && currentAttempt <= maxRetries) {
        const retryResult = handleRetryAttempt({
          currentAttempt,
          maxRetries,
          currentFromDate: currentFromDate || '',
          instrumentKey,
          unit,
          interval,
          toDate,
          originalFromDate: fromDate
        });

        if (retryResult.shouldRetry) {
          currentFromDate = retryResult.newFromDate;
          currentUrl = retryResult.newUrl;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
      }

      // Handle final error
      if (currentAttempt > maxRetries) {
        console.error(`❌ All ${maxRetries + 1} attempts failed`);
        if (isRetryableInvalidDateRangeError(error)) {
          console.error(`💡 Try a smaller date range. Reduced by ${maxRetries * 10} days but still too large.`);
        }
      }

      if (axios.isAxiosError(error)) {
        throw new Error(`Upstox API Error (${error.response?.status}): ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  throw new Error('Unexpected end of retry logic');
};

/**
 * Validate if a date range is acceptable for a given timeframe
 * @param timeframe The timeframe to validate against
 * @param fromDate Start date string
 * @param toDate End date string
 * @returns Validation result with details
 */
export const validateDateRangeForTimeframe = (
  timeframe: Timeframe,
  fromDate: string,
  toDate: string
): {
  isValid: boolean;
  daysDiff: number;
  maxAllowed: number;
  errorMessage?: string;
  suggestedFromDate?: string;
} => {
  const { unit, interval } = convertToUpstoxTimeframe(timeframe);
  const maxDuration = getMaxDurationForTimeframe(unit, interval);

  const fromDateObj = new Date(fromDate);
  const toDateObj = new Date(toDate);
  const daysDiff = Math.abs((toDateObj.getTime() - fromDateObj.getTime()) / (1000 * 60 * 60 * 24));

  // Check date order
  if (fromDateObj > toDateObj) {
    return {
      isValid: false,
      daysDiff: 0,
      maxAllowed: maxDuration,
      errorMessage: `fromDate (${fromDate}) must be earlier than toDate (${toDate})`
    };
  }

  // Check duration limit
  if (daysDiff > maxDuration) {
    const suggestedFromDate = new Date(toDateObj);
    suggestedFromDate.setDate(suggestedFromDate.getDate() - maxDuration);

    return {
      isValid: false,
      daysDiff: Math.round(daysDiff),
      maxAllowed: maxDuration,
      errorMessage: `Date range (${Math.round(daysDiff)} days) exceeds maximum for ${timeframe} timeframe (${maxDuration} days)`,
      suggestedFromDate: suggestedFromDate.toISOString().split('T')[0]
    };
  }

  return {
    isValid: true,
    daysDiff: Math.round(daysDiff),
    maxAllowed: maxDuration
  };
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
  isFirstTimeCall?: boolean;
}> => {
  // Use environment variable or passed apiKey
  const token = apiKey || process.env.NEXT_PUBLIC_UPSTOX_API_KEY;

  if (!token) {
    throw new Error('Upstox API key not provided');
  }

  // Build the API URL according to V3 structure
  // GET /v3/historical-candle/:instrument_key/:unit/:interval/:to_date/:from_date
  const today = new Date();
  // Use today's date in YYYY-MM-DD format, ensure it's not in the future
  const todayString = today.toISOString().split('T')[0];
  const defaultToDate = toDate || todayString;

  

  // Get the maximum duration for this specific timeframe
  const maxDuration = getMaxDurationForTimeframe(unit, interval);

  // Validate date format and range
  if (fromDate && toDate) {
    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);
    const daysDiff = Math.abs((toDateObj.getTime() - fromDateObj.getTime()) / (1000 * 60 * 60 * 24));

    

    // Check against timeframe-specific limits
    if (daysDiff > maxDuration) {
   

      // Optionally auto-adjust the fromDate to fit within limits
      const adjustedFromDate = new Date(toDateObj);
      adjustedFromDate.setDate(adjustedFromDate.getDate() - maxDuration);
      const adjustedFromDateString = adjustedFromDate.toISOString().split('T')[0];

   
    }
  } else if (!fromDate && toDate) {
    // If only toDate is provided, we might want to auto-set a reasonable fromDate
    const toDateObj = new Date(toDate);
    const suggestedFromDate = new Date(toDateObj);
    suggestedFromDate.setDate(suggestedFromDate.getDate() - Math.min(maxDuration, 30)); // Use smaller of max duration or 30 days


  }

  // URL encode the instrument key to handle special characters like |
  const encodedInstrumentKey = encodeURIComponent(instrumentKey);

  let url = `https://api.upstox.com/v3/historical-candle/${encodedInstrumentKey}/${unit}/${interval}/${defaultToDate}`;

  // Add from_date if provided
  if (fromDate) {
    url += `/${fromDate}`;
  }



  try {
    // Use retry helper for API call with automatic date range reduction
    const responseData = await retryUpstoxApiCall(
      url,
      token,
      instrumentKey,
      unit,
      interval,
      defaultToDate,
      fromDate
    );

    // Transform Upstox candle format to our app's Candle format
    const candles: Candle[] = responseData.data.candles.map((candleData: [string, number, number, number, number, number, number]) => {
      const [timestamp, open, high, low, close, volume, openInterest] = candleData;

      // Remove timezone information from timestamps to avoid date shifting issues
      // Upstox returns timestamps like "2025-08-26T00:00:00+05:30"
      // We want to treat this as local time: "2025-08-26T00:00:00"
      let processedTimestamp: string;


      if (typeof timestamp === 'string') {
        // Remove timezone offset (+05:30, +00:00, Z, etc.) to treat as local time
        processedTimestamp = timestamp.replace(/([+-]\d{2}:\d{2}|Z)$/, '');
      } else {
        processedTimestamp = timestamp;
      }

      return {
        timestamp: processedTimestamp,
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
    const hasMoreCandles = true;// Assume more data exists if we got results

    const oldestCandleTime = candles.length > 0 ? candles[0].timestamp : undefined;
    const newestCandleTime = candles.length > 0 ? candles[candles.length - 1].timestamp : undefined;

    return {
      candles,
      hasMoreCandles : true,
      oldestCandleTime,
      newestCandleTime
    };
  } catch (error) {
    
    if (axios.isAxiosError(error)) {
      throw new Error(`Upstox API Error (${error.response?.status}): ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
};

/**
 * Fetches intraday candle data from Upstox API v3 (simplified version without retry logic)
 * @param instrumentKey The instrument key to fetch data for
 * @param unit The unit for candles (minutes, hours)
 * @param interval The interval for candles
 * @param apiKey Your Upstox API key
 * @returns Processed intraday candle data
 */
export const fetchUpstoxIntradayData = async (
  instrumentKey: string,
  apiKey?: string,
  unit: string = 'days',
  interval: string = '1'
): Promise<Candle[]> => {
  const token = apiKey || process.env.NEXT_PUBLIC_UPSTOX_API_KEY;

  if (!token) {
    throw new Error('Upstox API key not provided');
  }

  // URL encode the instrument key
  const encodedInstrumentKey = encodeURIComponent(instrumentKey);

  // Intraday API endpoint
  const url = `https://api.upstox.com/v3/historical-candle/intraday/${encodedInstrumentKey}/${unit}/${interval}`;

  

  try {
    const response = await axios.get<UpstoxHistoricalDataResponse>(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Referer': ''
      }
    });

    if (response.status !== 200 || response.data.status !== 'success') {
      throw new Error(`Intraday API request failed: ${response.data.status || 'Unknown error'}`);
    }

   

    // Transform Upstox candle format to our app's Candle format
    const candles: Candle[] = response.data.data.candles.map((candleData: [string, number, number, number, number, number, number]) => {
      const [timestamp, open, high, low, close, volume, openInterest] = candleData;

      let processedTimestamp: string;
      if (typeof timestamp === 'string') {
        // Remove timezone offset to treat as local time
        processedTimestamp = timestamp.replace(/([+-]\d{2}:\d{2}|Z)$/, '');
      } else {
        processedTimestamp = timestamp;
      }

      return {
        timestamp: processedTimestamp,
        open,
        high,
        low,
        close,
        volume,
        openInterest: openInterest || 0,
      };
    });

    return candles;
  } catch (error) {
    console.error('Error fetching Upstox intraday data:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Upstox Intraday API Error (${error.response?.status}): ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
};

/**
 * Fetches combined intraday and historical data from Upstox API v3
 * Intraday data is fetched first and combined with historical data
 * @param instrumentKey The instrument key to fetch data for
 * @param unit The unit for candles (minutes, hours, days, weeks, months)
 * @param interval The interval for candles
 * @param toDate End date (format: YYYY-MM-DD)
 * @param fromDate Start date (format: YYYY-MM-DD) - optional
 * @param apiKey Your Upstox API key
 * @returns Combined candle data with metadata
 */

export const fetchUpstoxCombinedData = async (
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
  intradayCandles?: number;
  historicalCandles?: number;
}> => {
  

  let intradayCandles: Candle[] = [];
  let historicalCandles: Candle[] = [];

  try {

    // Step 1: Fetch intraday data (only for intraday timeframes)
    if (unit === 'minutes' || unit === 'hours' || unit === 'days') {
  

      try {
        intradayCandles = await fetchUpstoxIntradayData(instrumentKey, apiKey);
      
      } catch (intradayError) {
      
        // Continue with historical data even if intraday fails
      }
    }

    // Step 2: Always fetch historical data
    

    const historicalResult = await fetchUpstoxHistoricalData(
      instrumentKey,
      unit,
      interval,
      toDate,
      fromDate,
      apiKey
    );

    historicalCandles = historicalResult.candles;
    

    // Step 3: Combine intraday and historical candles (intraday first, then historical)
    const combinedCandles = [...intradayCandles, ...historicalCandles];

    // Sort by timestamp to ensure proper order
    combinedCandles.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Remove duplicates based on timestamp
    const uniqueCandles = combinedCandles.filter((candle, index, self) =>
      index === self.findIndex(c => c.timestamp === candle.timestamp)
    );

    

    const hasMoreCandles = historicalResult.hasMoreCandles;

    const oldestCandleTime = uniqueCandles.length > 0 ? uniqueCandles[0].timestamp : undefined;
    const newestCandleTime = uniqueCandles.length > 0 ? uniqueCandles[uniqueCandles.length - 1].timestamp : undefined;

    return {
      candles: uniqueCandles,
      hasMoreCandles : true,
      oldestCandleTime,
      newestCandleTime,
      intradayCandles: intradayCandles.length,
      historicalCandles: historicalCandles.length
    };
  } catch (error) {
    console.error('Error fetching combined Upstox data:', error);
    throw error;
  }
};

/**
 * Fetches paginated historical data from Upstox with the new interface
 * @param params UpstoxPaginationParams object with request parameters
 * @returns UpstoxPaginationResult object with candles and pagination info
 */
export const fetchPaginatedUpstoxData = async (
  params: UpstoxPaginationParams,
  shouldFetchIntraDay: boolean
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
    let processedFromDate: string | undefined;
    let processedToDate: string;

    if (from && to) {
      // Both dates provided - validate against timeframe limits
      const fromDateObj = new Date(from);
      const toDateObj = new Date(to);
      const daysDiff = Math.abs((toDateObj.getTime() - fromDateObj.getTime()) / (1000 * 60 * 60 * 24));
      const maxDuration = getMaxDurationForTimeframe(unit, interval);

      if (daysDiff > maxDuration) {
        
        
        const allCandles: Candle[] = [];
        let currentFromDate = new Date(from);
        const originalToDate = new Date(to);
        
        while (currentFromDate < originalToDate) {
          // Calculate chunk end date
          let chunkToDate = new Date(currentFromDate);
          chunkToDate.setDate(chunkToDate.getDate() + maxDuration);
          
          // Don't exceed the original to date
          if (chunkToDate > originalToDate) {
            chunkToDate = originalToDate;
          }
          
          const chunkFromDateStr = currentFromDate.toISOString().split('T')[0];
          const chunkToDateStr = chunkToDate.toISOString().split('T')[0];
          
        
          
          try {
            const chunkResult = shouldFetchIntraDay
              ? await fetchUpstoxCombinedData(
                  instrumentKey,
                  unit,
                  interval,
                  chunkToDateStr,
                  chunkFromDateStr,
                  apiKey
                )
              : await fetchUpstoxHistoricalData(
                  instrumentKey,
                  unit,
                  interval,
                  chunkToDateStr,
                  chunkFromDateStr,
                  apiKey
                );
            
            allCandles.push(...chunkResult.candles);
            console.log(`✅ Fetched ${chunkResult.candles.length} candles for chunk`);
            
            // Add delay between API calls to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (chunkError) {
            console.error(`❌ Error fetching chunk ${chunkFromDateStr} to ${chunkToDateStr}:`, chunkError);
          }
          
          // Move to next chunk: start from chunkToDate + 1 day
          currentFromDate = new Date(chunkToDate);
          currentFromDate.setDate(currentFromDate.getDate() + 1);
        }
        
        // Sort all candles by timestamp and remove duplicates
        const sortedCandles = allCandles
          .filter((candle, index, self) =>
            index === self.findIndex((c) => c.timestamp === candle.timestamp)
          )
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        console.log(`🎉 Successfully fetched ${sortedCandles.length} total candles across multiple chunks`);
        
        return {
          candles: sortedCandles,
          hasMore: true, // We've fetched the complete requested range
          oldestTimestamp: sortedCandles.length > 0 ? sortedCandles[0].timestamp : undefined,
          newestTimestamp: sortedCandles.length > 0 ? sortedCandles[sortedCandles.length - 1].timestamp : undefined
        };
      } else {
        processedFromDate = fromDateObj.toISOString().split('T')[0];
        processedToDate = toDateObj.toISOString().split('T')[0];
      }
    } else {
      // Use optimal date range calculation
      const optimalRange = calculateOptimalDateRange(
        timeframe,
        to,
        from ? undefined : 30 // Default to 30 days if no specific range requested
      );

      processedFromDate = optimalRange.fromDate;
      processedToDate = optimalRange.toDate;

      console.log(`📅 Using optimal date range for ${timeframe}:`, {
        fromDate: processedFromDate,
        toDate: processedToDate,
        actualDays: optimalRange.actualDays,
        maxAllowed: optimalRange.maxDays
      });
    }

    // Validate date order - fromDate should be earlier than toDate
    if (processedFromDate && processedToDate) {
      const fromDateObj = new Date(processedFromDate);
      const toDateObj = new Date(processedToDate);

      if (fromDateObj > toDateObj) {
        console.error(`❌ Date order issue: fromDate (${processedFromDate}) is after toDate (${processedToDate})`);
        throw new Error(`Invalid date range: fromDate must be earlier than toDate`);
      }
    }


    // Choose the appropriate fetch function based on shouldFetchIntraDay flag
    const result = shouldFetchIntraDay
      ? await fetchUpstoxCombinedData(
        instrumentKey,
        unit,
        interval,
        processedToDate,
        processedFromDate,
        apiKey
      )
      : await fetchUpstoxHistoricalData(
        instrumentKey,
        unit,
        interval,
        processedToDate,
        processedFromDate,
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
