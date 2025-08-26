/**
 * Example usage of Upstox timeframe conversion utilities
 * This shows how to properly format timeframes for the Upstox V3 API
 */

import { 
  convertToUpstoxTimeframe, 
  Timeframe
} from '../components/utils/timeframeUtils';

import { 
  fetchUpstoxHistoricalData,
  fetchPaginatedUpstoxData 
} from '../components/utils/upstoxApi';

// Example 1: Converting internal timeframes to Upstox format
console.log('=== Timeframe Conversion Examples ===');

const timeframes: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

timeframes.forEach(tf => {
  const upstoxFormat = convertToUpstoxTimeframe(tf);
  console.log(`${tf} -> unit: "${upstoxFormat.unit}", interval: "${upstoxFormat.interval}"`);
});

// Example 2: Using the API functions
console.log('\n=== API Usage Examples ===');

async function exampleApiUsage() {
  try {
    // Example instrument key (NSE:RELIANCE-EQ)
    const instrumentKey = 'NSE_EQ|INE002A01018';
    const apiKey = 'your-upstox-api-key';
    
    // Method 1: Direct API call with converted timeframe
    const timeframe: Timeframe = '5m';
    const { unit, interval } = convertToUpstoxTimeframe(timeframe);
    
    console.log(`Fetching ${timeframe} data using unit: ${unit}, interval: ${interval}`);
    
    const result = await fetchUpstoxHistoricalData(
      instrumentKey,
      unit,
      interval,
      '2024-12-31', // to_date
      '2024-12-01', // from_date (optional)
      apiKey
    );
    
    console.log(`Received ${result.candles.length} candles`);
    
    // Method 2: Using the paginated API helper
    const paginatedResult = await fetchPaginatedUpstoxData({
      instrumentKey,
      timeframe: '1h',
      apiKey,
      from: '2024-12-01',
      to: '2024-12-31',
      limit: 100
    });
    
    console.log(`Paginated result: ${paginatedResult.candles.length} candles, hasMore: ${paginatedResult.hasMore}`);
    
  } catch (error) {
    console.error('API call failed:', error);
  }
}

// Example 3: URL construction for Upstox V3 API
console.log('\n=== URL Construction Example ===');

function constructUpstoxUrl(
  instrumentKey: string, 
  timeframe: Timeframe, 
  toDate: string, 
  fromDate?: string
): string {
  const { unit, interval } = convertToUpstoxTimeframe(timeframe);
  
  let url = `https://api.upstox.com/v3/historical-candle/${instrumentKey}/${unit}/${interval}/${toDate}`;
  
  if (fromDate) {
    url += `/${fromDate}`;
  }
  
  return url;
}

// Example URLs
const instrumentKey = 'NSE_EQ|INE002A01018';
const toDate = '2024-12-31';
const fromDate = '2024-12-01';

console.log('5-minute data URL:');
console.log(constructUpstoxUrl(instrumentKey, '5m', toDate, fromDate));

console.log('\nDaily data URL:');
console.log(constructUpstoxUrl(instrumentKey, '1d', toDate, fromDate));

console.log('\nHourly data URL (without from_date):');
console.log(constructUpstoxUrl(instrumentKey, '1h', toDate));

// Example 4: Valid parameter combinations for Upstox V3 API
console.log('\n=== Valid Upstox V3 API Parameters ===');

const validCombinations = [
  { unit: 'minutes', validIntervals: ['1', '2', '3', '5', '10', '15', '30', '60'] },
  { unit: 'hours', validIntervals: ['1', '2', '3', '4'] },
  { unit: 'days', validIntervals: ['1'] },
  { unit: 'weeks', validIntervals: ['1'] },
  { unit: 'months', validIntervals: ['1'] }
];

console.log('Valid combinations supported by Upstox V3 API:');
validCombinations.forEach(({ unit, validIntervals }) => {
  console.log(`${unit}: ${validIntervals.join(', ')}`);
});

// Export the example function for potential use
export { exampleApiUsage };
