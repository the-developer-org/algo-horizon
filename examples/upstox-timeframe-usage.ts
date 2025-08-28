/**
 * Example usage of Upstox timeframe conversion utilities with enhanced duration limits
 * This shows how to properly format timeframes for the Upstox V3 API with automatic range validation
 */

import { 
  convertToUpstoxTimeframe, 
  Timeframe
} from '../components/utils/timeframeUtils';

import { 
  fetchPaginatedUpstoxData,
  validateDateRangeForTimeframe,
  getMaxDurationForTimeframe
} from '../components/utils/upstoxApi';

// Example 1: Converting internal timeframes to Upstox format
console.log('=== Timeframe Conversion Examples ===');

const timeframes: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

timeframes.forEach(tf => {
  const upstoxFormat = convertToUpstoxTimeframe(tf);
  const maxDuration = getMaxDurationForTimeframe(upstoxFormat.unit, upstoxFormat.interval);
  console.log(`${tf} -> unit: "${upstoxFormat.unit}", interval: "${upstoxFormat.interval}", max: ${maxDuration} days`);
});

// Example 2: Validate date ranges for 1-hour timeframe (your specific case)
console.log('\n=== 1-Hour Timeframe Validation ===');

const validation = validateDateRangeForTimeframe(
  '1h',
  '2025-05-28',  // Your example fromDate
  '2025-08-27'   // Your example toDate
);

console.log('Validation result for your 1h example:');
console.log(`- Valid: ${validation.isValid}`);
console.log(`- Days requested: ${validation.daysDiff}`);
console.log(`- Max allowed: ${validation.maxAllowed}`);
if (!validation.isValid) {
  console.log(`- Error: ${validation.errorMessage}`);
  console.log(`- Suggested fromDate: ${validation.suggestedFromDate}`);
}

// Example 3: Using the API functions with enhanced features
console.log('\n=== Enhanced API Usage Examples ===');

async function exampleApiUsage() {
  try {
    // Example instrument key (TCS - matching your example)
    const instrumentKey = 'NSE_EQ|INE397D01024';
    const apiKey = 'your-upstox-api-key';
    
    // Method 1: Using 1-hour timeframe with automatic range validation
    console.log('\n--- 1-Hour Data with Auto-Validation ---');
    const result1h = await fetchPaginatedUpstoxData({
      instrumentKey,
      timeframe: '1h',
      apiKey,
      from: '2025-05-28',  // Your example dates
      to: '2025-08-27',    // Will auto-adjust if needed
    });
    
    console.log(`✅ 1h data: ${result1h.candles.length} candles`);
    console.log(`📅 Range: ${result1h.oldestTimestamp} to ${result1h.newestTimestamp}`);
    
    // Method 2: Different timeframes with optimal ranges
    const timeframesToTest: Timeframe[] = ['5m', '15m', '1h', '1d'];
    
    for (const tf of timeframesToTest) {
      console.log(`\n--- Testing ${tf} timeframe ---`);
      
      // Get max duration for this timeframe
      const { unit, interval } = convertToUpstoxTimeframe(tf);
      const maxDuration = getMaxDurationForTimeframe(unit, interval);
      console.log(`Max duration for ${tf}: ${maxDuration} days`);
      
      // Validate a potentially problematic range
      const validation = validateDateRangeForTimeframe(tf, '2025-01-01', '2025-08-27');
      if (!validation.isValid) {
        console.log(`❌ ${validation.errorMessage}`);
        console.log(`💡 Use fromDate: ${validation.suggestedFromDate} instead`);
      } else {
        console.log(`✅ Range is valid for ${tf}`);
      }
    }
    
  } catch (error) {
    console.error('API call failed:', error);
  }
}

// Example 4: URL construction for Upstox V3 API (matching your example)
console.log('\n=== URL Construction Example (Your Format) ===');

function constructUpstoxUrl(
  instrumentKey: string, 
  timeframe: Timeframe, 
  toDate: string, 
  fromDate?: string
): string {
  const { unit, interval } = convertToUpstoxTimeframe(timeframe);
  const encodedKey = encodeURIComponent(instrumentKey);
  
  let url = `https://api.upstox.com/v3/historical-candle/${encodedKey}/${unit}/${interval}/${toDate}`;
  
  if (fromDate) {
    url += `/${fromDate}`;
  }
  
  return url;
}

// Recreate your exact example URL
const yourInstrumentKey = 'NSE_EQ|INE397D01024';
const yourToDate = '2025-08-27';
const yourFromDate = '2025-05-28';

console.log('Your 1-hour example URL:');
const yourUrl = constructUpstoxUrl(yourInstrumentKey, '1h', yourToDate, yourFromDate);
console.log(yourUrl);
console.log('\nThis should match:');
console.log('https://api.upstox.com/v3/historical-candle/NSE_EQ%7CINE397D01024/hours/1/2025-08-27/2025-05-28');

// Validate your example range
const yourValidation = validateDateRangeForTimeframe('1h', yourFromDate, yourToDate);
console.log(`\n📊 Your example validation:`);
console.log(`- Days requested: ${yourValidation.daysDiff}`);
console.log(`- Max allowed: ${yourValidation.maxAllowed}`);
console.log(`- Valid: ${yourValidation.isValid ? '✅' : '❌'}`);

// Additional examples for different timeframes
console.log('\n=== Additional URL Examples ===');

const examples = [
  { tf: '1m' as Timeframe, days: 5 },
  { tf: '5m' as Timeframe, days: 15 },
  { tf: '15m' as Timeframe, days: 30 },
  { tf: '1d' as Timeframe, days: 180 },
];

examples.forEach(({ tf, days }) => {
  const endDate = new Date('2025-08-27');
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);
  
  const url = constructUpstoxUrl(
    yourInstrumentKey, 
    tf, 
    endDate.toISOString().split('T')[0],
    startDate.toISOString().split('T')[0]
  );
  
  console.log(`${tf} (${days} days): ${url}`);
});

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
