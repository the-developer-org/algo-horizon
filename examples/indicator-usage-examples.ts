// Example of how to use the calculateIndicators utility
// before passing data to OHLCChart component

import { calculateIndicators, calculateEMA, calculateRSI } from '../components/utils/indicators';
import { Candle } from '../components/types/candle';

// Example 1: In an API call function
export async function fetchCandlesWithIndicators(companyName: string, instrumentKey: string): Promise<Candle[]> {
  try {
    const response = await fetch(`/api/candles/${companyName}/${instrumentKey}`);
    const data = await response.json();
    
    // Raw candles from API (without EMA/RSI)
    const rawCandles: Candle[] = data.candles;
    
    // Calculate indicators before returning
    const candlesWithIndicators = calculateIndicators(rawCandles, 200, 14); // EMA(200), RSI(14)
    
    return candlesWithIndicators;
  } catch (error) {
    console.error('Error fetching candles:', error);
    return [];
  }
}

// Example 2: In a React component
/*
const MyTradingComponent = () => {
  const [candles, setCandles] = useState<Candle[]>([]);
  
  const loadData = async () => {
    // Fetch raw data
    const rawCandles = await fetchRawCandles();
    
    // Calculate indicators
    const candlesWithIndicators = calculateIndicators(rawCandles, 200, 14);
    
    // Set state with calculated indicators
    setCandles(candlesWithIndicators);
  };
  
  return (
    <OHLCChart 
      candles={candles} // Already includes EMA and RSI
      showVolume={true}
    />
  );
};
*/

// Example 3: Custom periods
export function processCandlesWithCustomIndicators(rawCandles: Candle[]): Candle[] {
  // You can customize the periods as needed
  return calculateIndicators(rawCandles, 50, 21); // EMA(50), RSI(21)
}

// Example 4: Calculate only specific indicators
export function processWithSeparateIndicators(rawCandles: Candle[]): Candle[] {
  // First add EMA
  let candlesWithEMA = calculateEMA(rawCandles, 200);
  
  // Then add RSI
  let candlesWithBothIndicators = calculateRSI(candlesWithEMA, 14);
  
  return candlesWithBothIndicators;
}
