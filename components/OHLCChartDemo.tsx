"use client";

import React, { useState, useEffect } from 'react';
import { OHLCChart } from './OHLCChart';
import { Candle } from './types/candle';

// Generate sample OHLC data
const generateSampleData = (count: number = 100): Candle[] => {
  const data: Candle[] = [];
  let basePrice = 15000; // Starting price
  const now = new Date();
  
  for (let i = count - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); // Daily data
    
    // Generate realistic price movements
    const volatility = 0.02; // 2% daily volatility
    const change = (Math.random() - 0.5) * volatility;
    const open = basePrice;
    const close = basePrice * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(Math.random() * 1000000) + 100000;
    const openInterest = Math.floor(Math.random() * 50000) + 10000;
    
    data.push({
      timestamp: timestamp.toISOString(),
      open,
      high,
      low,
      close,
      volume,
      openInterest,
    });
    
    basePrice = close; // Next day's open is previous day's close
  }
  
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