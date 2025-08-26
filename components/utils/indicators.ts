import { EMA, RSI } from 'technicalindicators';
import { Candle } from '../types/candle';

/**
 * Calculates EMA and RSI indicators for the given candles
 * @param candles - Array of candles
 * @param emaPeriod - Period for EMA calculation (default: 200)
 * @param rsiPeriod - Period for RSI calculation (default: 14)
 * @returns Array of candles with EMA and RSI values added
 */
export function calculateIndicators(
    candles: Candle[], 
    emaPeriod: number = 200, 
    rsiPeriod: number = 14
): Candle[] {
    if (!candles.length) {
        console.log('⚠️ calculateIndicators: No candles provided');
        return candles;
    }

    console.log(`📊 calculateIndicators: ${candles.length} candles, EMA periods: ${emaPeriod}/8/30, RSI: ${rsiPeriod}`);

    const closes = candles.map(c => c.close);

    // Calculate EMA values
    const emaValues = EMA.calculate({ period: emaPeriod, values: closes });
    const ema8Values = EMA.calculate({ period: 8, values: closes });
    const ema30Values = EMA.calculate({ period: 30, values: closes });
    const rsiValues = RSI.calculate({ period: rsiPeriod, values: closes });
    
    console.log(`- Calculated: EMA${emaPeriod}(${emaValues.length}), EMA8(${ema8Values.length}), EMA30(${ema30Values.length}), RSI(${rsiValues.length})`);

    const result = candles.map((candle, i) => ({
        ...candle,
        ema: emaValues[i - (candles.length - emaValues.length)] ?? null,
        ema8: ema8Values[i - (candles.length - ema8Values.length)] ?? null,
        ema30: ema30Values[i - (candles.length - ema30Values.length)] ?? null,
        rsi: rsiValues[i - (candles.length - rsiValues.length)] ?? null,
    }));

    // Verify the mapping results
    const resultWithEma8 = result.filter(c => c.ema8 !== null);
    const resultWithEma30 = result.filter(c => c.ema30 !== null);
    console.log(`- Final: ${result.length} candles with EMA8(${resultWithEma8.length}) EMA30(${resultWithEma30.length}) values`);

    return result;
}

/**
 * Calculates only EMA for the given candles
 */
export function calculateEMA(candles: Candle[], period: number = 200): Candle[] {
    if (!candles.length) return candles;

    const closes = candles.map(c => c.close);
    const emaValues = EMA.calculate({ period, values: closes });

    return candles.map((candle, i) => ({
        ...candle,
        ema: emaValues[i - (candles.length - emaValues.length)] ?? null,
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
