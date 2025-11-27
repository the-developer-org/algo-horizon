import { EMA, RSI } from 'technicalindicators';
import { Candle } from '../types/candle';

/**
 * TradingView-compatible EMA calculation
 * Uses the exact same a        //console.log(`🧪 Test EMA8 values: [${testEMA8.map(v => v !== null && v !== undefined ? v.toFixed(2) : 'null/undef').join(', ')}]`;gorithm as TradingView with proper SMA initialization
 * @param prices - Array of price values (typically close prices)
 * @param period - EMA period (e.g., 8, 30, 200)
 * @param startingEMA - Optional starting EMA value for incremental calculation
 * @returns Array of EMA values
 */
function calculateTradingViewEMA(prices: number[], period: number, startingEMA?: number): (number | null)[] {
    if (!prices.length || period <= 0) return [];
    
    const emaValues: (number | null)[] = [];
    const multiplier = 2 / (period + 1); // TradingView smoothing factor
    
    if (startingEMA !== undefined) {
        // Incremental calculation: continue from previous EMA
        return calculateIncrementalEMAValues(prices, multiplier, startingEMA);
    }
    
    // Full calculation: start with SMA, then EMA
    return calculateFullEMAValues(prices, period, multiplier);
}

/**
 * Calculate EMA values incrementally from a starting EMA
 */
function calculateIncrementalEMAValues(prices: number[], multiplier: number, startingEMA: number): number[] {
    const emaValues: number[] = [];
    for (let i = 0; i < prices.length; i++) {
        if (i === 0) {
            emaValues[i] = (prices[i] * multiplier) + (startingEMA * (1 - multiplier));
        } else {
            emaValues[i] = (prices[i] * multiplier) + (emaValues[i - 1] * (1 - multiplier));
        }
    }
    return emaValues;
}

/**
 * Calculate full EMA values starting with SMA initialization
 */
function calculateFullEMAValues(prices: number[], period: number, multiplier: number): (number | null)[] {
    ////console.log(`🔄 Starting calculateFullEMAValues for period ${period}`);
    
    if (prices.length < period) {
        ////console.log(`❌ Insufficient data: need ${period}, have ${prices.length}`);
        return new Array(prices.length).fill(null);
    }
    
    // Initialize array with null for early values
    const emaValues: (number | null)[] = new Array(prices.length).fill(null);
    
    // Calculate SMA for the first EMA value (TradingView standard)
    const smaSum = prices.slice(0, period).reduce((sum, price) => sum + price, 0);
    emaValues[period - 1] = smaSum / period;
    
    // Calculate EMA for subsequent values
    for (let i = period; i < prices.length; i++) {
        const prevEMA = emaValues[i - 1] as number; // Previous EMA value (guaranteed to be number)
        emaValues[i] = (prices[i] * multiplier) + (prevEMA * (1 - multiplier));
    }
    
    return emaValues;
}

/**
 * Calculate incremental EMA for new candles without affecting existing EMA values
 * @param existingCandles - Candles that already have EMA values
 * @param newCandles - New candles that need EMA calculation
 * @param period - EMA period
 * @returns Combined array with proper EMA values
 */
function calculateIncrementalEMA(existingCandles: Candle[], newCandles: Candle[], period: number): Candle[] {
    if (!newCandles.length) return existingCandles;
    
    // Get the last EMA value from existing candles for continuation
    let lastExistingEMA: number | undefined;
    if (existingCandles.length > 0) {
        const lastCandle = existingCandles[existingCandles.length - 1];
        lastExistingEMA = period === 8 ? lastCandle.ema8 : lastCandle.ema30;
    }
    
    if (lastExistingEMA === undefined || lastExistingEMA === null) {
        // No existing EMA to continue from, calculate fresh
        const allCandles = [...existingCandles, ...newCandles];
        const closes = allCandles.map(c => c.close);
        const emaValues = calculateTradingViewEMA(closes, period);
        
        return allCandles.map((candle, i) => ({
            ...candle,
            ...(period === 8 
                ? { ema8: (emaValues.length > 0) ? (emaValues[i] ?? undefined) : undefined }
                : { ema30: (emaValues.length > 0) ? (emaValues[i] ?? undefined) : undefined }
            )
        }));
    }
    
    // Calculate EMA only for new candles
    const newPrices = newCandles.map(c => c.close);
    const newEMAValues = calculateTradingViewEMA(newPrices, period, lastExistingEMA);
    
    // Add EMA values to new candles
    const processedNewCandles = newCandles.map((candle, i) => ({
        ...candle,
        ...(period === 8 ? { ema8: newEMAValues[i] ?? undefined } : { ema30: newEMAValues[i] ?? undefined })
    }));
    
    return [...existingCandles, ...processedNewCandles];
}

/**
 * Calculates EMA and RSI indicators for the given candles
 * Now uses TradingView-compatible EMA calculation with proper incremental support
 * @param candles - Array of candles
 * @param emaPeriod - Period for EMA calculation (default: 200)
 * @param rsiPeriod - Period for RSI calculation (default: 14)
 * @param preserveExistingEMA - Whether to preserve existing EMA values (for incremental calculation)
 * @returns Array of candles with EMA and RSI values added
 */
export function calculateIndicators(
    candles: Candle[], 
    emaPeriod: number = 200, 
    rsiPeriod: number = 14,
    preserveExistingEMA: boolean = false
): Candle[] {
    ////console.log(`🚀 calculateIndicators CALLED with ${candles.length} candles`);
    ////console.log(`🔍 First candle: ${candles[0]?.timestamp}, Close: ${candles[0]?.close}`);
    ////console.log(`🔍 Last candle: ${candles[candles.length - 1]?.timestamp}, Close: ${candles[candles.length - 1]?.close}`);
    
    if (!candles.length) {
        ////console.log('⚠️ calculateIndicators: No candles provided');
        return candles;
    }

    ////console.log(`📊 calculateIndicators: ${candles.length} candles, EMA periods: ${emaPeriod}/8/30 (TradingView-compatible), RSI: ${rsiPeriod}, preserveEMA: ${preserveExistingEMA}`);
    
    // CRITICAL DEBUG: Test basic EMA calculation first
    ////console.log(`🧪 URGENT DEBUGGING: Testing basic EMA calculation...`);
    const testPrices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115];
    ////console.log(`🧪 Test prices: [${testPrices.join(', ')}]`);
    try {
        const testEMA8 = calculateTradingViewEMA(testPrices, 8);
        ////console.log(`🧪 Test EMA8 result length: ${testEMA8.length}`);
        ////console.log(`🧪 Test EMA8 values: [${testEMA8.map(v => v !== null && v !== undefined ? v.toFixed(2) : 'null/undef').join(', ')}]`);
        
        if (testEMA8.length === 0) {
            console.error(`❌ CRITICAL: calculateTradingViewEMA returned empty array for test data!`);
        } else {
            ////console.log(`✅ Basic EMA calculation works. Array length: ${testEMA8.length}`);
        }
    } catch (error) {
        console.error(`❌ CRITICAL: calculateTradingViewEMA threw error:`, error);
    }
    


    // Critical: Check timestamp ordering to ensure we're calculating in the correct direction
    ////console.log(`🕐 TIMESTAMP ORDER CHECK:`);
    ////console.log(`  First candle: ${candles[0]?.timestamp} (index 0)`);
    ////console.log(`  Second candle: ${candles[1]?.timestamp} (index 1)`);
    ////console.log(`  Third candle: ${candles[2]?.timestamp} (index 2)`);
    ////console.log(`  ...`);
    ////console.log(`  Third last: ${candles[candles.length - 3]?.timestamp} (index ${candles.length - 3})`);
    ////console.log(`  Second last: ${candles[candles.length - 2]?.timestamp} (index ${candles.length - 2})`);
    ////console.log(`  Last candle: ${candles[candles.length - 1]?.timestamp} (index ${candles.length - 1})`);
    
    // Check if timestamps are in ascending or descending order
    if (candles.length >= 2) {
        const isAscending = candles[1].timestamp > candles[0].timestamp;
        const isDescending = candles[1].timestamp < candles[0].timestamp;
        let orderDescription = 'UNKNOWN';
        if (isAscending) orderDescription = 'ASCENDING (oldest first)';
        else if (isDescending) orderDescription = 'DESCENDING (newest first)';
        
        ////console.log(`  Order: ${orderDescription}`);
        
        if (isDescending) {
            ////console.log(`⚠️ WARNING: Timestamps are in DESCENDING order - we need to reverse for proper EMA calculation!`);
            ////console.log(`🔄 Reversing candles for chronological EMA calculation...`);
            
            // Reverse candles for proper chronological EMA calculation
            const reversedCandles = [...candles].reverse();
            ////console.log(`🔄 After reversal:`);
            ////console.log(`  First (oldest): ${reversedCandles[0]?.timestamp}`);
            ////console.log(`  Last (newest): ${reversedCandles[reversedCandles.length - 1]?.timestamp}`);
            
            // Calculate EMA on reversed (chronological) data
            const reversedResult = calculateIndicatorsInChronologicalOrder(reversedCandles, emaPeriod, rsiPeriod, preserveExistingEMA);
            
            // Reverse the result back to match original order
            ////console.log(`🔄 Reversing results back to original order...`);
            return reversedResult.reverse();
        }
    }
    
    // If timestamps are already in ascending order, proceed normally
    return calculateIndicatorsInChronologicalOrder(candles, emaPeriod, rsiPeriod, preserveExistingEMA);
}

/**
 * Internal function that assumes candles are in chronological order (oldest first)
 */
function calculateIndicatorsInChronologicalOrder(
    candles: Candle[], 
    emaPeriod: number = 200, 
    rsiPeriod: number = 14,
    preserveExistingEMA: boolean = false
): Candle[] {

    // If preserving existing EMA, find split point where EMA calculation should start
    if (preserveExistingEMA) {
        const lastEMAIndex = candles.findLastIndex(c => c.ema8 !== null && c.ema8 !== undefined);
        if (lastEMAIndex >= 0 && lastEMAIndex < candles.length - 1) {
            // Split candles into existing (with EMA) and new (without EMA)
            const existingCandles = candles.slice(0, lastEMAIndex + 1);
            const newCandles = candles.slice(lastEMAIndex + 1);
            
            ////console.log(`📊 Incremental EMA: ${existingCandles.length} existing, ${newCandles.length} new candles`);
            
            // Calculate EMA incrementally for new candles only
            let result = calculateIncrementalEMA(existingCandles, newCandles, 8);
            result = calculateIncrementalEMA(existingCandles, newCandles, 30);
            
            // Add RSI for all candles (RSI calculation is fast and needs full dataset)
            const closes = result.map(c => c.close);
            const rsiValues = RSI.calculate({ period: rsiPeriod, values: closes });
            
            return result.map((candle, i) => ({
                ...candle,
                rsi: rsiValues[i - (result.length - rsiValues.length)] ?? null,
            }));
        }
    }

    // Full calculation for new datasets
    const closes = candles.map(c => c.close);

    // Use TradingView-compatible calculation for ALL EMAs to ensure consistency
    // This also handles array padding correctly (returns array of size N with nulls)
    
    // For larger periods (like 200), use the technicalindicators library which might match 
    // external charts better due to internal precision or initialization differences.
    // For smaller periods (8, 30), stick to our custom implementation as verified correct.
    let emaValues: (number | null)[];
    if (emaPeriod > 50) {
        const calculated = EMA.calculate({ period: emaPeriod, values: closes });
        // Pad with nulls to match closes length
        const paddingCount = closes.length - calculated.length;
        const padding = new Array(paddingCount).fill(null);
        emaValues = [...padding, ...calculated];
    } else {
        emaValues = calculateTradingViewEMA(closes, emaPeriod);
    }

    const ema8Values = calculateTradingViewEMA(closes, 8);
    const ema30Values = calculateTradingViewEMA(closes, 30);
    
    // Continue using technicalindicators for RSI
    const rsiValues = RSI.calculate({ period: rsiPeriod, values: closes });
    
    const result = candles.map((candle, i) => {
        // EMA8: values start at index 7 (period-1), EMA30: values start at index 29 (period-1)
        // Convert null values to undefined for compatibility with Candle type
        const ema8Raw = ema8Values[i];
        const ema30Raw = ema30Values[i];
        const emaRaw = emaValues[i];
        
        // Be more permissive - pass through any valid number we get, regardless of index
        const ema8Value = (ema8Raw !== null && ema8Raw !== undefined && typeof ema8Raw === 'number' && !Number.isNaN(ema8Raw)) ? ema8Raw : undefined;
        const ema30Value = (ema30Raw !== null && ema30Raw !== undefined && typeof ema30Raw === 'number' && !Number.isNaN(ema30Raw)) ? ema30Raw : undefined;
        const emaValue = (emaRaw !== null && emaRaw !== undefined && typeof emaRaw === 'number' && !Number.isNaN(emaRaw)) ? emaRaw : undefined;
        
        return {
            ...candle, // Preserve ALL original candle properties
            ema: emaValue,
            // Pass through any valid EMA values we calculated
            ema8: ema8Value,
            ema30: ema30Value,
            rsi: rsiValues[i - (candles.length - rsiValues.length)] ?? undefined,
        };
    });

    return result;
}

/**
 * Calculates only EMA for the given candles using TradingView-compatible method
 */
export function calculateEMA(candles: Candle[], period: number = 200): Candle[] {
    if (!candles.length) return candles;

    const closes = candles.map(c => c.close);
    
    // Use TradingView-compatible EMA for shorter periods, technicalindicators for longer periods
    let emaValues: number[];
    if (period <= 50) {
        const rawEmaValues = calculateTradingViewEMA(closes, period);
        // Convert nulls to NaN and filter valid values for compatibility
        emaValues = rawEmaValues.map(value => value ?? Number.NaN).filter(value => !Number.isNaN(value));
    } else {
        emaValues = EMA.calculate({ period, values: closes });
    }

    return candles.map((candle, i) => ({
        ...candle,
        ema: period <= 50 ? (emaValues[i] ?? null) : (emaValues[i - (candles.length - emaValues.length)] ?? null),
    }));
}

/**
 * Calculates only RSI for the given candles
 */
export function calculateRSI(candles: Candle[], period: number = 14): Candle[] {
    if (!candles.length) return candles;

    const closes = candles.map(c => c.close);
    const rsiValues = RSI.calculate({ period, values: closes });

    return candles.map((candle, i) => ({
        ...candle,
        rsi: rsiValues[i - (candles.length - rsiValues.length)] ?? null,
    }));
}
