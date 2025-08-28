/**
 * Example demonstrating the new retry logic for Upstox API
 * This shows how the system automatically handles "Invalid date range" errors
 */

import { 
  fetchPaginatedUpstoxData,
  validateDateRangeForTimeframe 
} from '../components/utils/upstoxApi';

/**
 * Example 1: Test retry logic with a date range that's too large
 */
export const testRetryLogic = async () => {
  console.log('=== Testing Retry Logic for Invalid Date Range ===\n');
  
  const instrumentKey = 'NSE_EQ|INE397D01024'; // TCS
  const timeframe = '1h' as const;
  
  // This range is probably too large for 1h data and will trigger retries
  const fromDate = '2025-01-01'; // Way too far back
  const toDate = '2025-08-27';
  
  // First, let's validate what we expect
  const validation = validateDateRangeForTimeframe(timeframe, fromDate, toDate);
  console.log('📊 Initial validation:');
  console.log(`- Range: ${fromDate} to ${toDate}`);
  console.log(`- Days requested: ${validation.daysDiff}`);
  console.log(`- Max allowed: ${validation.maxAllowed}`);
  console.log(`- Valid: ${validation.isValid ? '✅' : '❌'}`);
  
  if (!validation.isValid) {
    console.log(`- Suggested fromDate: ${validation.suggestedFromDate}`);
  }
  
  console.log('\n🔄 Now testing API call with retry logic...');
  console.log('Expected behavior: API will retry 3 times, reducing range by 10 days each time\n');
  
  try {
    const result = await fetchPaginatedUpstoxData({
      instrumentKey,
      timeframe,
      from: fromDate,
      to: toDate,
      apiKey: process.env.NEXT_PUBLIC_UPSTOX_API_KEY || 'test-key'
    });
    
    console.log('✅ Success! API call completed after retries');
    console.log(`📈 Received ${result.candles.length} candles`);
    console.log(`📅 Actual data range: ${result.oldestTimestamp} to ${result.newestTimestamp}`);
    
  } catch (error) {
    console.log('❌ API call failed even after retries');
    console.log('Error:', error);
    
    // This is expected if we don't have a valid API key
    if (error instanceof Error && error.message.includes('API key')) {
      console.log('💡 This error is expected without a valid API key');
    }
  }
};

/**
 * Example 2: Show what the retry process looks like step by step
 */
export const demonstrateRetryProcess = () => {
  console.log('\n=== Retry Process Demonstration ===\n');
  
  const originalRange = {
    from: '2025-01-01',
    to: '2025-08-27'
  };
  
  const originalDays = Math.abs(
    (new Date(originalRange.to).getTime() - new Date(originalRange.from).getTime()) 
    / (1000 * 60 * 60 * 24)
  );
  
  console.log(`🎯 Original request: ${originalRange.from} to ${originalRange.to} (${Math.round(originalDays)} days)`);
  console.log('💥 Expected: API returns 400 "Invalid date range"\n');
  
  // Simulate the retry process
  let currentFromDate = originalRange.from;
  const toDate = originalRange.to;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    // Reduce by 10 days
    const fromDateObj = new Date(currentFromDate);
    fromDateObj.setDate(fromDateObj.getDate() + 10);
    currentFromDate = fromDateObj.toISOString().split('T')[0];
    
    const newDays = Math.abs(
      (new Date(toDate).getTime() - new Date(currentFromDate).getTime()) 
      / (1000 * 60 * 60 * 24)
    );
    
    console.log(`🔄 Retry ${attempt}: ${currentFromDate} to ${toDate} (${Math.round(newDays)} days)`);
    console.log(`   Reduced by: ${attempt * 10} days total`);
    console.log(`   URL: https://api.upstox.com/v3/historical-candle/NSE_EQ%7CINE397D01024/hours/1/${toDate}/${currentFromDate}`);
    
    // Check if this would be valid for 1h timeframe (max 90 days)
    if (newDays <= 90) {
      console.log(`   ✅ This retry should succeed (${Math.round(newDays)} ≤ 90 days)`);
      break;
    } else {
      console.log(`   ❌ Still too large (${Math.round(newDays)} > 90 days), will retry again`);
    }
    console.log();
  }
};

/**
 * Example 3: Test different timeframes and their retry behavior
 */
export const testDifferentTimeframes = () => {
  console.log('\n=== Different Timeframes Retry Behavior ===\n');
  
  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const;
  const problematicRange = {
    from: '2024-01-01', // Far back
    to: '2025-08-27'
  };
  
  timeframes.forEach(tf => {
    const validation = validateDateRangeForTimeframe(tf, problematicRange.from, problematicRange.to);
    
    console.log(`📊 ${tf} timeframe:`);
    console.log(`   Max allowed: ${validation.maxAllowed} days`);
    console.log(`   Requested: ${validation.daysDiff} days`);
    console.log(`   Status: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
    
    if (!validation.isValid) {
      // Simulate how many retries would be needed
      const excessDays = validation.daysDiff - validation.maxAllowed;
      const retriesNeeded = Math.ceil(excessDays / 10);
      
      console.log(`   Retries needed: ${Math.min(retriesNeeded, 3)} (max 3 allowed)`);
      console.log(`   After 3 retries: ${validation.daysDiff - 30} days (reduced by 30)`);
      
      if (validation.daysDiff - 30 <= validation.maxAllowed) {
        console.log(`   📈 Would succeed after retries`);
      } else {
        console.log(`   💥 Would fail even after 3 retries`);
      }
    }
    console.log();
  });
};

// Run all examples
export const runRetryExamples = async () => {
  console.log('🚀 Testing Upstox API Retry Logic\n');
  console.log('This demonstrates the new automatic retry feature for "Invalid date range" errors\n');
  
  demonstrateRetryProcess();
  testDifferentTimeframes();
  
  // Uncomment this line to test with real API (requires valid API key)
  // await testRetryLogic();
  
  console.log('\n✅ Retry logic examples completed!');
  console.log('\n📝 Summary:');
  console.log('- API automatically retries up to 3 times for "Invalid date range" errors');
  console.log('- Each retry reduces the date range by 10 days');
  console.log('- Total possible reduction: 30 days over 3 retries');
  console.log('- Clear logging shows the retry process and adjustments');
};
