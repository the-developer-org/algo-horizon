"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { Candle } from './types/candle';

interface OHLCChartProps {
  candles: Candle[];
  vixData?: { timestamp: string; value: number }[];
  title?: string;
  height?: number;
  width?: number;
  showVolume?: boolean;
}

const maxWidth = typeof window !== 'undefined' ? Math.floor(window.innerWidth * 0.8) : 1152;
const maxHeight = typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.8) : 720;
console.log(maxWidth, maxHeight);

export const OHLCChart: React.FC<OHLCChartProps> = ({
  candles,
  vixData,
  title = "OHLC Chart",
  height = 400,
  width,
  showVolume = true
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [ohlcInfo, setOhlcInfo] = useState<any>(null);
  const [vixValue, setVixValue] = useState<number | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !candles.length) return;

    // Create chart with minimal configuration
    const chart = createChart(chartContainerRef.current, {
      width: maxWidth,
      height: maxHeight,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 0,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });
    chartRef.current = chart;

    // Add candlestick series using the correct API for v4.1.0
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#1e7e34',      // Darker green for candles
      downColor: '#c62828',    // Darker red for candles
      borderVisible: false,
      wickUpColor: '#1e7e34',  // Darker green for wicks
      wickDownColor: '#c62828', // Darker red for wicks
    });

    // Add volume series on a separate scale at the bottom
    let volumeSeries = null;
    if (showVolume) {
      // @ts-ignore
      volumeSeries = chart.addHistogramSeries({
        color: '#4caf50',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume', // separate scale for volume
        // @ts-ignore
        scaleMargins: { top: 0.8, bottom: 0 }, // restrict to bottom 20%
      });
      // @ts-ignore
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.94, bottom: 0 }, // larger gap between candles and volume
      });
    }

    // Format data for the chart
    // @ts-ignore: TypeScript types are too strict, but this works at runtime
    const formattedData = candles.map(candle => ({
      time: Math.floor(new Date(candle.timestamp).getTime() / 1000),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    // Set candlestick data
    // @ts-ignore: TypeScript types are too strict, but this works at runtime
    candlestickSeries.setData(formattedData);

    // Set volume data if enabled
    if (showVolume && volumeSeries) {
      // @ts-ignore: TypeScript types are too strict, but this works at runtime
      const volumeData = candles.map(candle => ({
        time: Math.floor(new Date(candle.timestamp).getTime() / 1000),
        value: candle.volume,
        color: candle.close >= candle.open ? '#4caf50' : '#ef5350', // Lighter colors for volume
      }));
      // @ts-ignore: TypeScript types are too strict, but this works at runtime
      volumeSeries.setData(volumeData);
    }

    // Add VIX line overlay
    let formattedVix: { time: number; value: number }[] = [];
    if (vixData && vixData.length > 0) {
      // Build a map for fast lookup
      const vixMap = new Map<number, number>();
      vixData.forEach(v => {
        const t = Math.floor(new Date(v.timestamp).getTime() / 1000);
        vixMap.set(t, v.value);
      });
      let lastVix = 0;
      formattedVix = candles.map(candle => {
        const t = Math.floor(new Date(candle.timestamp).getTime() / 1000);
        if (vixMap.has(t)) {
          lastVix = vixMap.get(t)!;
        }
        return { time: t, value: lastVix };
      });
      const vixSeries = chart.addLineSeries({
        color: '#FFD600', // bright yellow
        lineWidth: 2,
        priceScaleId: 'vix', // separate scale for VIX
      });
      // @ts-ignore
      vixSeries.setData(formattedVix);
      // Add and configure the VIX price scale on the left
      // @ts-ignore
      chart.priceScale('vix').applyOptions({
        position: 'left',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        borderColor: '#FFD600',
        borderVisible: true,
        entireTextOnly: false,
        visible: true,
        autoScale: true,
      });
    }

    // Show the last candle's info and VIX by default
    if (candles.length > 0) {
      const last = candles[candles.length - 1];
      setOhlcInfo({
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
        prevClose: candles.length > 1 ? candles[candles.length - 2].close : last.open,
        volume: last.volume,
      });
      if (formattedVix.length > 0) {
        setVixValue(formattedVix[formattedVix.length - 1].value);
      } else {
        setVixValue(null);
      }
    }

    // Update the OHLC info and VIX on crosshair move
    chart.subscribeCrosshairMove(param => {
      if (param && param.time) {
        // Find the candle for the hovered time
        const hovered = candles.find(c => Math.floor(new Date(c.timestamp).getTime() / 1000) === param.time);
        if (hovered) {
          // Find previous candle for change calculation
          const idx = candles.findIndex(c => Math.floor(new Date(c.timestamp).getTime() / 1000) === param.time);
          const prevClose = idx > 0 ? candles[idx - 1].close : hovered.open;
          setOhlcInfo({
            open: hovered.open,
            high: hovered.high,
            low: hovered.low,
            close: hovered.close,
            prevClose,
            volume: hovered.volume,
          });
        }
        // Find the VIX value for the hovered time
        if (formattedVix.length > 0) {
          const hoveredVix = formattedVix.find(v => v.time === param.time);
          setVixValue(hoveredVix ? hoveredVix.value : null);
        }
      }
    });

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: width || chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candles, height, width, showVolume, vixData]);

  if (!candles.length) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  // Chart container with 20% gap at the top
  const chartAreaStyle = {
    position: 'fixed' as const,
    top: '20vh',
    left: 0,
    width: '100vw',
    height: '80vh',
    zIndex: 100,
    background: '#fff',
    borderRadius: 0,
    boxShadow: 'none',
  };

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.applyOptions({
          width: window.innerWidth,
          height: window.innerHeight * 0.8,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={chartAreaStyle}>
      {/* Floating OHLC info at top left (inside chart area) */}
      {ohlcInfo && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: 16,
          zIndex: 200,
          background: 'rgba(255,255,255,0.92)',
          padding: '8px 20px',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 17,
          color: ohlcInfo.close >= ohlcInfo.open ? '#1e7e34' : '#c62828',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          border: '2px solid #bdbdbd',
          letterSpacing: '0.5px',
          minWidth: 320,
          textAlign: 'left',
          display: 'flex',
          gap: 16,
        }}>
          <span>O <b>{ohlcInfo.open.toLocaleString()}</b></span>
          <span>H <b>{ohlcInfo.high.toLocaleString()}</b></span>
          <span>L <b>{ohlcInfo.low.toLocaleString()}</b></span>
          <span>C <b>{ohlcInfo.close.toLocaleString()}</b></span>
          <span>V <b>{ohlcInfo.volume?.toLocaleString()}</b></span>
          <span>
            {(() => {
              const change = ohlcInfo.close - ohlcInfo.prevClose;
              const percent = ohlcInfo.prevClose ? (change / ohlcInfo.prevClose) * 100 : 0;
              const sign = change > 0 ? '+' : '';
              return `${sign}${change.toFixed(2)} (${sign}${percent.toFixed(2)}%)`;
            })()}
          </span>
          {vixValue !== null && (
            <span style={{ color: '#FFD600', fontWeight: 700 }}>VIX <b>{vixValue.toFixed(2)}</b></span>
          )}
        </div>
      )}
      <div ref={chartContainerRef} style={{ width: '100vw', height: '80vh' }} />
    </div>
  );
}; 