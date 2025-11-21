/**
 * Debug utility for Upstox API calls
 * Use this to test and debug API requests before they're made in the main component
 */

import { convertToUpstoxTimeframe, Timeframe } from '../components/utils/timeframeUtils';

// Test function to validate API URL construction
export const debugUpstoxUrl = (
  instrumentKey: string,
  timeframe: Timeframe,
  fromDate: string,
  toDate: string
) => {
  const { unit, interval } = convertToUpstoxTimeframe(timeframe);
  const encodedInstrumentKey = encodeURIComponent(instrumentKey);
  
  const url = `https://api.upstox.com/v3/historical-candle/${encodedInstrumentKey}/${unit}/${interval}/${toDate}/${fromDate}`;
  
  //console.log('=== Upstox API Debug ===');
  //console.log('Original instrument key:', instrumentKey);
  //console.log('Encoded instrument key:', encodedInstrumentKey);
  //console.log('Unit:', unit);
  //console.log('Interval:', interval);
  //console.log('From date:', fromDate);
  //console.log('To date:', toDate);
  //console.log('Final URL:', url);
  //console.log('URL length:', url.length);
  
  // Check date range
  const fromDateObj = new Date(fromDate);
  const toDateObj = new Date(toDate);
  const daysDiff = Math.abs((toDateObj.getTime() - fromDateObj.getTime()) / (1000 * 60 * 60 * 24));
  //console.log('Date range (days):', daysDiff);
  
  // Validate URL components
  const issues = [];
  if (instrumentKey.includes('|') && !encodedInstrumentKey.includes('%7C')) {
    issues.push('Instrument key may not be properly encoded');
  }
  if (daysDiff > 365) {
    issues.push('Date range exceeds 1 year - may cause API rejection');
  }
  if (!['minutes', 'hours', 'days', 'weeks', 'months'].includes(unit)) {
    issues.push('Invalid unit value');
  }
  
  if (issues.length > 0) {
    console.warn('Potential issues:', issues);
  } else {
    //console.log('✅ URL appears valid');
  }
  
  return {
    url,
    unit,
    interval,
    encodedInstrumentKey,
    daysDiff,
    issues
  };
};

// Test with common scenarios
export const runDebugTests = () => {
  //console.log('\n=== Running Debug Tests ===\n');
  
  const testCases = [
    {
      instrumentKey: 'NSE_EQ|INE206B01013',
      timeframe: '1d' as Timeframe,
      fromDate: '2024-02-20',
      toDate: '2024-08-20'
    },
    {
      instrumentKey: 'NSE_EQ|INE002A01018',
      timeframe: '1h' as Timeframe,
      fromDate: '2024-06-20',
      toDate: '2024-08-20'
    },
    {
      instrumentKey: 'NSE_EQ|INE009A01021',
      timeframe: '5m' as Timeframe,
      fromDate: '2024-08-15',
      toDate: '2024-08-20'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    //console.log(`\n--- Test Case ${index + 1} ---`);
    debugUpstoxUrl(
      testCase.instrumentKey,
      testCase.timeframe,
      testCase.fromDate,
      testCase.toDate
    );
  });
};

// Example usage:
// import { debugUpstoxUrl, runDebugTests } from './debug/upstox-debug';
// runDebugTests();
