import { EMA, RSI } from 'technicalindicators';
import { Candle } from '../types/candle';

/**
 * TradingView-compatible EMA calculation
 * Uses the exact same algorithm as TradingView with proper SMA initialization
 * @param prices - Array of price values (typically close prices)
 * @param period - EMA period (e.g., 8, 30, 200)
 * @param startingEMA - Optional starting EMA value for incremental calculation
 * @returns Array of EMA values
 */
function calculateTradingViewEMA(prices: number[], period: number, startingEMA?: number): number[] {
    if (!prices.length || period <= 0) return [];
    
    const emaValues: number[] = [];
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
function calculateFullEMAValues(prices: number[], period: number, multiplier: number): number[] {
    console.log(`🔄 Starting calculateFullEMAValues for period ${period}`);
    console.log(`📊 Input: ${prices.length} prices, multiplier: ${multiplier.toFixed(6)}`);
    console.log(`📊 First 3 prices: [${prices.slice(0, 3).map(p => p.toFixed(2)).join(', ')}]`);
    console.log(`📊 Last 3 prices: [${prices.slice(-3).map(p => p.toFixed(2)).join(', ')}]`);
    
    if (prices.length < period) {
        console.log(`❌ Insufficient data: need ${period}, have ${prices.length}`);
        return [];
    }
    
    const emaValues: number[] = new Array(prices.length);
    
    // Calculate SMA for the first EMA value (TradingView standard)
    const smaSum = prices.slice(0, period).reduce((sum, price) => sum + price, 0);
    emaValues[period - 1] = smaSum / period;
    console.log(`📍 SMA calculated for first ${period} prices: ${(smaSum / period).toFixed(4)} at index ${period - 1}`);
    
    // Calculate EMA for subsequent values - this should continue to the end!
    for (let i = period; i < prices.length; i++) {
        emaValues[i] = (prices[i] * multiplier) + (emaValues[i - 1] * (1 - multiplier));
        
        // Debug every 10th calculation and the last few
        if (i % 10 === 0 || i >= prices.length - 3) {
            console.log(`  [${i}] Price: ${prices[i].toFixed(2)}, PrevEMA: ${emaValues[i - 1].toFixed(4)}, NewEMA: ${emaValues[i].toFixed(4)}`);
        }
    }
    
    const definedValues = emaValues.filter(v => v !== undefined).length;
    console.log(`✅ EMA${period} complete: ${definedValues}/${emaValues.length} defined values`);
    console.log(`🎯 Last EMA value at index ${prices.length - 1}: ${emaValues[prices.length - 1]?.toFixed(4) || 'undefined'}`);
    console.log(`🔍 EMA array structure: [${emaValues.slice(0, 3).map(v => v !== undefined ? v.toFixed(2) : 'undef').join(', ')}, ..., ${emaValues.slice(-3).map(v => v !== undefined ? v.toFixed(2) : 'undef').join(', ')}]`);
    
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
                ? { ema8: (emaValues.length > 0 && i >= 7) ? emaValues[i] : undefined }
                : { ema30: (emaValues.length > 0 && i >= 29) ? emaValues[i] : undefined }
            )
        }));
    }
    
    // Calculate EMA only for new candles
    const newPrices = newCandles.map(c => c.close);
    const newEMAValues = calculateTradingViewEMA(newPrices, period, lastExistingEMA);
    
    // Add EMA values to new candles
    const processedNewCandles = newCandles.map((candle, i) => ({
        ...candle,
        ...(period === 8 ? { ema8: newEMAValues[i] } : { ema30: newEMAValues[i] })
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
    if (!candles.length) {
        console.log('⚠️ calculateIndicators: No candles provided');
        return candles;
    }

    console.log(`📊 calculateIndicators: ${candles.length} candles, EMA periods: ${emaPeriod}/8/30 (TradingView-compatible), RSI: ${rsiPeriod}, preserveEMA: ${preserveExistingEMA}`);
    
    // Critical: Check timestamp ordering to ensure we're calculating in the correct direction
    console.log(`🕐 TIMESTAMP ORDER CHECK:`);
    console.log(`  First candle: ${candles[0]?.timestamp} (index 0)`);
    console.log(`  Second candle: ${candles[1]?.timestamp} (index 1)`);
    console.log(`  Third candle: ${candles[2]?.timestamp} (index 2)`);
    console.log(`  ...`);
    console.log(`  Third last: ${candles[candles.length - 3]?.timestamp} (index ${candles.length - 3})`);
    console.log(`  Second last: ${candles[candles.length - 2]?.timestamp} (index ${candles.length - 2})`);
    console.log(`  Last candle: ${candles[candles.length - 1]?.timestamp} (index ${candles.length - 1})`);
    
    // Check if timestamps are in ascending or descending order
    if (candles.length >= 2) {
        const isAscending = candles[1].timestamp > candles[0].timestamp;
        const isDescending = candles[1].timestamp < candles[0].timestamp;
        let orderDescription = 'UNKNOWN';
        if (isAscending) orderDescription = 'ASCENDING (oldest first)';
        else if (isDescending) orderDescription = 'DESCENDING (newest first)';
        
        console.log(`  Order: ${orderDescription}`);
        
        if (isDescending) {
            console.log(`⚠️ WARNING: Timestamps are in DESCENDING order - we need to reverse for proper EMA calculation!`);
            console.log(`🔄 Reversing candles for chronological EMA calculation...`);
            
            // Reverse candles for proper chronological EMA calculation
            const reversedCandles = [...candles].reverse();
            console.log(`🔄 After reversal:`);
            console.log(`  First (oldest): ${reversedCandles[0]?.timestamp}`);
            console.log(`  Last (newest): ${reversedCandles[reversedCandles.length - 1]?.timestamp}`);
            
            // Calculate EMA on reversed (chronological) data
            const reversedResult = calculateIndicatorsInChronologicalOrder(reversedCandles, emaPeriod, rsiPeriod, preserveExistingEMA);
            
            // Reverse the result back to match original order
            console.log(`🔄 Reversing results back to original order...`);
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
            
            console.log(`📊 Incremental EMA: ${existingCandles.length} existing, ${newCandles.length} new candles`);
            
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

    // Use technicalindicators library for EMA200 (long period)
    const emaValues = EMA.calculate({ period: emaPeriod, values: closes });
    
    // Use TradingView-compatible calculation for EMA8 and EMA30
    const ema8Values = calculateTradingViewEMA(closes, 8);
    const ema30Values = calculateTradingViewEMA(closes, 30);
    
    // Debug: Let's see what we actually get
    console.log(`🔍 Raw EMA calculation results:`);
    console.log(`- Input closes length: ${closes.length}`);
    console.log(`- EMA8 output length: ${ema8Values.length}`);
    console.log(`- EMA30 output length: ${ema30Values.length}`);
    if (closes.length >= 30) {
        console.log(`- First 5 closes: [${closes.slice(0, 5).map(c => c.toFixed(2)).join(', ')}]`);
        console.log(`- Last 5 closes: [${closes.slice(-5).map(c => c.toFixed(2)).join(', ')}]`);
        
        if (ema8Values.length > 0) {
            const validEma8 = ema8Values.filter(v => v !== undefined);
            console.log(`- EMA8 valid values: ${validEma8.length}/${ema8Values.length}`);
            console.log(`- EMA8 first 10 values: [${ema8Values.slice(0, 10).map(v => v !== undefined ? v.toFixed(2) : 'undef').join(', ')}]`);
            console.log(`- EMA8 last 5 values: [${ema8Values.slice(-5).map(v => v !== undefined ? v.toFixed(2) : 'undef').join(', ')}]`);
            if (validEma8.length > 0) {
                console.log(`- EMA8 last 3 valid: [${validEma8.slice(-3).map(v => v.toFixed(2)).join(', ')}]`);
            }
        }
        
        if (ema30Values.length > 0) {
            const validEma30 = ema30Values.filter(v => v !== undefined);
            console.log(`- EMA30 valid values: ${validEma30.length}/${ema30Values.length}`);
            console.log(`- EMA30 last 5 values: [${ema30Values.slice(-5).map(v => v !== undefined ? v.toFixed(2) : 'undef').join(', ')}]`);
            if (validEma30.length > 0) {
                console.log(`- EMA30 last 3 valid: [${validEma30.slice(-3).map(v => v.toFixed(2)).join(', ')}]`);
            }
        }
    }
    
    // Continue using technicalindicators for RSI
    const rsiValues = RSI.calculate({ period: rsiPeriod, values: closes });
    
    console.log(`- Calculated: EMA${emaPeriod}(${emaValues.length}), EMA8-TV(${ema8Values.length}), EMA30-TV(${ema30Values.length}), RSI(${rsiValues.length})`);
    
    // Debug: Check EMA array structure
    console.log(`📊 EMA Array Debug:`);
    console.log(`- Total candles: ${candles.length}`);
    console.log(`- EMA8 array length: ${ema8Values.length}`);
    console.log(`- EMA30 array length: ${ema30Values.length}`);
    console.log(`- EMA8 defined values: ${ema8Values.filter(v => v !== undefined).length}`);
    console.log(`- EMA30 defined values: ${ema30Values.filter(v => v !== undefined).length}`);
    console.log(`- EMA8 first defined at index: ${ema8Values.findIndex(v => v !== undefined)}`);
    console.log(`- EMA30 first defined at index: ${ema30Values.findIndex(v => v !== undefined)}`);
    
    // Debug: Show the actual values for the last candle for comparison with TradingView
    if (ema8Values.length > 0 && ema30Values.length > 0) {
        const lastCandle = candles[candles.length - 1];
        const lastEma8 = ema8Values[ema8Values.length - 1];
        const lastEma30 = ema30Values[ema30Values.length - 1];
        
        console.log(`📊 TradingView EMA Verification - Last Candle:`);
        console.log(`- Close: ${lastCandle.close.toFixed(2)}`);
        console.log(`- EMA8: ${lastEma8?.toFixed(2) || 'N/A'}`);
        console.log(`- EMA30: ${lastEma30?.toFixed(2) || 'N/A'}`);
        console.log(`- Expected Airtel: Close=1904.70, EMA8=1913.06, EMA30=1912.51`);
    }

    console.log(`🔍 Starting EMA mapping to ${candles.length} candles...`);
    console.log(`📅 Candle time order check:`);
    console.log(`  First candle: ${candles[0]?.timestamp} (index 0)`);
    console.log(`  Last candle: ${candles[candles.length - 1]?.timestamp} (index ${candles.length - 1})`);
    
    const result = candles.map((candle, i) => {
        const ema8Value = (ema8Values.length > 0 && i >= 7) ? ema8Values[i] : undefined;
        const ema30Value = (ema30Values.length > 0 && i >= 29) ? ema30Values[i] : undefined;
        
        // Debug first few and last few mappings
        if (i < 3 || i >= candles.length - 3 || (i >= 6 && i <= 8) || (i >= 28 && i <= 31)) {
            console.log(`  [${i}] Time: ${candle.timestamp}, Close: ${candle.close.toFixed(2)}, EMA8: ${ema8Value !== undefined ? ema8Value.toFixed(4) : 'undef'}, EMA30: ${ema30Value !== undefined ? ema30Value.toFixed(4) : 'undef'}`);
        }
        
        return {
            ...candle,
            ema: emaValues[i - (candles.length - emaValues.length)] ?? undefined,
            // EMA arrays now have full length, values available from period-1 onwards
            ema8: ema8Value,
            ema30: ema30Value,
            rsi: rsiValues[i - (candles.length - rsiValues.length)] ?? undefined,
        };
    });

    // Verify the mapping results
    const resultWithEma8 = result.filter(c => c.ema8 !== null && c.ema8 !== undefined);
    const resultWithEma30 = result.filter(c => c.ema30 !== null && c.ema30 !== undefined);
    console.log(`- Final: ${result.length} candles with EMA8-TV(${resultWithEma8.length}) EMA30-TV(${resultWithEma30.length}) values`);
    
    // Debug: Check last few candles to see if EMA values are assigned properly
    console.log(`🔍 Last 3 candles EMA mapping:`);
    result.slice(-3).forEach((candle, idx) => {
        const globalIdx = result.length - 3 + idx;
        console.log(`  [${globalIdx}] Close: ${candle.close.toFixed(2)}, EMA8: ${candle.ema8 !== undefined ? candle.ema8.toFixed(2) : 'undef'}, EMA30: ${candle.ema30 !== undefined ? candle.ema30.toFixed(2) : 'undef'}`);
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
        emaValues = calculateTradingViewEMA(closes, period);
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
