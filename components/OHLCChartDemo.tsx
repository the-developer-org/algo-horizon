"use client";

import React, { useState, useEffect } from 'react';
import { OHLCChart } from './OHLCChart';
import { Candle } from './types/candle';

// Generate sample OHLC data
const generateSampleData = (count: number = 100): Candle[] => {
  const data: Candle[] = [];
  let basePrice = 15000; // Starting price
  const now = new Date();
  let closes: number[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); // Daily data
    const volatility = 0.02; // 2% daily volatility
    const change = (Math.random() - 0.5) * volatility;
    let open = basePrice;
    let close = basePrice * (1 + change);
    // Simulate gap up/down every 5 days
    if (i < count - 1 && i % 5 === 0) {
      // 50% chance gap up, 50% gap down
      if (Math.random() > 0.5) {
        open = basePrice * 1.01; // gap up 1%
      } else {
        open = basePrice * 0.99; // gap down 1%
      }
      close = open * (1 + change); // recalc close from new open
    }
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(Math.random() * 1000000) + 100000;
    const openInterest = Math.floor(Math.random() * 50000) + 10000;
    closes.push(close);
    data.push({
      timestamp: timestamp.toISOString(),
      open,
      high,
      low,
      close,
      volume,
      openInterest,
      ema: 0, // placeholder
      rsi: 0, // placeholder
    });
    basePrice = close;
  }
  // Calculate EMA (20)
  const period = 20;
  let k = 2 / (period + 1);
  let ema = closes[0];
  data[0].ema = ema;
  for (let i = 1; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    data[i].ema = ema;
  }
  // Calculate RSI (14)
  const rsiPeriod = 14;
  let gains = 0, losses = 0;
  for (let i = 1; i <= rsiPeriod; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  gains /= rsiPeriod;
  losses /= rsiPeriod;
  let rs = losses === 0 ? 100 : gains / losses;
  data[rsiPeriod].rsi = 100 - 100 / (1 + rs);
  for (let i = rsiPeriod + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) {
      gains = (gains * (rsiPeriod - 1) + diff) / rsiPeriod;
      losses = (losses * (rsiPeriod - 1)) / rsiPeriod;
    } else {
      gains = (gains * (rsiPeriod - 1)) / rsiPeriod;
      losses = (losses * (rsiPeriod - 1) - diff) / rsiPeriod;
    }
    rs = losses === 0 ? 100 : gains / losses;
    data[i].rsi = 100 - 100 / (1 + rs);
  }
  for (let i = 0; i < rsiPeriod; i++) data[i].rsi = NaN;
  return data;
};

// Generate sample VIX data as a smooth line
const generateVixData = (candles: Candle[]): { timestamp: string; value: number }[] => {
  let vixBase = 12;
  return candles.map((c, i) => {
    // Simulate a smooth, wavy VIX
    vixBase += Math.sin(i / 10) * 0.2 + (Math.random() - 0.5) * 0.1;
    return {
      timestamp: c.timestamp,
      value: Math.max(10, vixBase + Math.sin(i / 7) * 0.5),
    };
  });
};

export const OHLCChartDemo: React.FC = () => {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [vixData, setVixData] = useState<{ timestamp: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      const sampleData = generateSampleData(200);
      setCandles(sampleData);
      setVixData(generateVixData(sampleData));
      setIsLoading(false);
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">OHLC Chart Demo</h1>
        <p className="text-gray-600">Interactive candlestick chart with volume and VIX overlay</p>
      </div>
      <OHLCChart 
        candles={candles}
        vixData={vixData}
        title="Nifty 50 OHLC Chart"
        height={500}
        showVolume={true}
      />
    </>
  );
}; 