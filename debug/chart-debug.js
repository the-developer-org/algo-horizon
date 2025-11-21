// Test script to validate chart timeframe handling and timezone consistency
// Run this in browser console to debug chart distortion issues

//console.log('=== Chart Timeframe & Timezone Debug Test ===');

// Test timestamp normalization function
function normalizeTimestamp(timestamp) {
  let normalizedTimestamp = timestamp;
  if (!timestamp.endsWith('Z') && !timestamp.includes('+')) {
    normalizedTimestamp = timestamp + 'Z';
  }
  
  const utcTime = new Date(normalizedTimestamp).getTime();
  const unixTime = Math.floor(utcTime / 1000);
  
  //console.log('Original:', timestamp);
  //console.log('Normalized:', normalizedTimestamp);
  //console.log('UTC Time:', utcTime);
  //console.log('Unix Time:', unixTime);
  //console.log('Back to Date:', new Date(unixTime * 1000).toISOString());
  //console.log('---');
  
  return unixTime;
}

// Test different timestamp formats
const testTimestamps = [
  '2024-01-15T09:30:00.000Z',     // UTC with Z
  '2024-01-15T09:30:00',          // No timezone
  '2024-01-15T09:30:00.000',      // No timezone with milliseconds
  '2024-01-15T09:30:00+05:30',    // IST timezone
  '2024-01-15T09:30:00-05:00'     // EST timezone
];

//console.log('Testing timestamp normalization:');
testTimestamps.forEach(ts => normalizeTimestamp(ts));

// Function to test chart data consistency
function validateChartData(candles) {
  //console.log('=== Chart Data Validation ===');
  //console.log('Total candles:', candles.length);
  
  if (candles.length === 0) {
    console.warn('No candles to validate');
    return;
  }
  
  // Check for duplicate timestamps
  const timestamps = candles.map(c => c.timestamp);
  const uniqueTimestamps = [...new Set(timestamps)];
  
  if (timestamps.length !== uniqueTimestamps.length) {
    console.error('Duplicate timestamps detected:', timestamps.length - uniqueTimestamps.length, 'duplicates');
  } else {
    //console.log('✓ No duplicate timestamps');
  }
  
  // Check timestamp ordering
  let isOrdered = true;
  for (let i = 1; i < candles.length; i++) {
    const prevTime = new Date(candles[i-1].timestamp).getTime();
    const currTime = new Date(candles[i].timestamp).getTime();
    
    if (currTime <= prevTime) {
      console.error('Timestamps not in ascending order at index', i);
      console.error('Previous:', candles[i-1].timestamp, 'Current:', candles[i].timestamp);
      isOrdered = false;
      break;
    }
  }
  
  if (isOrdered) {
    //console.log('✓ Timestamps are in ascending order');
  }
  
  // Check for invalid OHLC values
  const invalidCandles = candles.filter(c => 
    isNaN(c.open) || isNaN(c.high) || isNaN(c.low) || isNaN(c.close) ||
    c.high < c.low || c.high < c.open || c.high < c.close ||
    c.low > c.open || c.low > c.close
  );
  
  if (invalidCandles.length > 0) {
    console.error('Invalid OHLC data detected:', invalidCandles.length, 'candles');
    console.error('First invalid candle:', invalidCandles[0]);
  } else {
    //console.log('✓ All OHLC data is valid');
  }
  
  // Check timeframe consistency
  if (candles.length > 1) {
    const intervals = [];
    for (let i = 1; i < Math.min(10, candles.length); i++) {
      const prevTime = new Date(candles[i-1].timestamp).getTime();
      const currTime = new Date(candles[i].timestamp).getTime();
      intervals.push(currTime - prevTime);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const intervalMinutes = avgInterval / (1000 * 60);
    
    //console.log('Average interval between candles:', intervalMinutes.toFixed(2), 'minutes');
    
    // Check for irregular intervals
    const irregularIntervals = intervals.filter(interval => 
      Math.abs(interval - avgInterval) > avgInterval * 0.1
    );
    
    if (irregularIntervals.length > 0) {
      console.warn('Irregular intervals detected:', irregularIntervals.length, 'out of', intervals.length);
    } else {
      //console.log('✓ Intervals are consistent');
    }
  }
}

// Function to test timeframe switching
function testTimeframeSwitching() {
  //console.log('=== Timeframe Switching Test ===');
  
  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
  
  timeframes.forEach(tf => {
    //console.log(`Testing timeframe: ${tf}`);
    
    // Check if the timeframe button exists and is clickable
    const button = document.querySelector(`button[title*="${tf}"]`);
    if (button) {
      //console.log(`✓ ${tf} button found`);
    } else {
      console.warn(`⚠ ${tf} button not found`);
    }
  });
}

// Export functions to window for manual testing
window.chartDebug = {
  normalizeTimestamp,
  validateChartData,
  testTimeframeSwitching
};

//console.log('Chart debug functions available as window.chartDebug');
//console.log('Usage: window.chartDebug.validateChartData(yourCandlesArray)');
