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
    if (!candles.length) return candles;

    const closes = candles.map(c => c.close);
    const emaValues = EMA.calculate({ period: emaPeriod, values: closes });
    const rsiValues = RSI.calculate({ period: rsiPeriod, values: closes });

    return candles.map((candle, i) => ({
        ...candle,
        ema: emaValues[i - (candles.length - emaValues.length)] ?? null,
        rsi: rsiValues[i - (candles.length - rsiValues.length)] ?? null,
    }));
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
