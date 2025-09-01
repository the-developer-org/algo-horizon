"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { createChart } from 'lightweight-charts';
import { Candle } from './types/candle';

// Utility function to properly handle timestamps from API (without timezone)
const parseTimestampToUnix = (timestamp: string): number => {
  // API workflow:
  // 1. Upstox API returns: "2025-08-26T09:30:00+05:30" (IST time)
  // 2. upstoxApi.ts strips timezone: "2025-08-26T09:30:00" (no timezone info)
  // 3. We treat this as UTC time for consistency across all timeframes
  
  
  if (!timestamp.includes('T')) {
    // If no 'T', assume it's already a date string, return as-is
    const unixTimestamp = Math.floor(new Date(timestamp).getTime() / 1000);
    return unixTimestamp;
  }
  
  // For all timeframes (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w):
  // Treat the stripped timestamp as UTC by adding +00:00
  // This ensures consistent behavior across all timeframes and prevents date shifting
  
  const utcTimestamp = timestamp + '+00:00';
  const unixTimestamp = Math.floor(new Date(utcTimestamp).getTime() / 1000);
  
  
  return unixTimestamp;
};

// Performance optimization constants
const MAX_VISIBLE_CANDLES = 2000; // Limit visible data points for ultra-fast performance
const PERFORMANCE_SAMPLE_THRESHOLD = 5000; // Start sampling when data exceeds this
const CHART_UPDATE_DEBOUNCE = 16; // ~60fps for smooth updates

// Data sampling for performance optimization
const sampleData = (data: any[], maxPoints: number): any[] => {
  if (data.length <= maxPoints) return data;
  
  const step = Math.ceil(data.length / maxPoints);
  const sampled = [];
  
  // Always include first and last points
  sampled.push(data[0]);
  
  for (let i = step; i < data.length - 1; i += step) {
    sampled.push(data[i]);
  }
  
  sampled.push(data[data.length - 1]);
  return sampled;
};

// Memoized data processing for ultra-fast performance
const processChartData = (candles: Candle[]) => {
  const formattedData = candles.map(candle => {
    return {
      time: parseTimestampToUnix(candle.timestamp),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    };
  }).filter((item, index, self) => 
    // Remove duplicates and invalid entries
    item.time && !isNaN(item.time) && 
    index === self.findIndex(t => t.time === item.time)
  ).sort((a, b) => a.time - b.time); // Ensure ascending order

  // Apply performance sampling for large datasets
  return sampleData(formattedData, MAX_VISIBLE_CANDLES);
};

// Memoized volume data processing
const processVolumeData = (candles: Candle[]) => {
  const volumeData = candles.map(candle => {
    return {
      time: parseTimestampToUnix(candle.timestamp),
      value: candle.volume,
      color: candle.close >= candle.open ? '#4caf50' : '#ef5350',
    };
  }).filter((item, index, self) => 
    item.time && !isNaN(item.time) && 
    index === self.findIndex(t => t.time === item.time)
  ).sort((a, b) => a.time - b.time);

  // Apply performance sampling for large datasets
  return sampleData(volumeData, MAX_VISIBLE_CANDLES);
};

interface OHLCChartProps {
    candles: Candle[];
    vixData?: { timestamp: string; value: number }[];
    title?: string;
    height?: number;
    width?: number;
    showVolume?: boolean;
    showEMA?: boolean;
    showRSI?: boolean;
    showVIX?: boolean;
    showSwingPoints?: boolean;
    analysisList?: { timestamp: string; swingLabel?: string; }[]; // Added analysisList prop
    supportLevel?: number; // Support level from backend
    resistanceLevel?: number; // Resistance level from backend
    avgVolume?: number; // Average volume for the stock
    // Add callback for loading more data when user scrolls to edges
    onLoadMoreData?: (direction: 'older' | 'newer') => Promise<void>;
    hasMoreOlderData?: boolean;
    hasMoreNewerData?: boolean;
    isLoadingMoreData?: boolean;
}

const maxWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
const maxHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
const chartHeight = maxHeight * 0.91; // Increase chart height to 91% of the viewport height

// Support and resistance levels are now provided by backend

// Function to calculate swing points directly from OHLC data
const calculateSwingPointsFromCandles = (candles: Candle[], lookback: number = 5) => {
    if (candles.length < lookback * 2 + 1) {
        console.log('❌ Insufficient candles for swing point calculation');
        return [];
    }

    // First, identify all potential swing highs and lows
    const potentialSwings: any[] = [];
    
    for (let i = lookback; i < candles.length - lookback; i++) {
        const currentCandle = candles[i];
        const currentHigh = currentCandle.high;
        const currentLow = currentCandle.low;
        
        // Check for swing high (current high is higher than lookback candles on both sides)
        let isSwingHigh = true;
        let isSwingLow = true;
        
        for (let j = 1; j <= lookback; j++) {
            // Check left side
            if (candles[i - j].high >= currentHigh) {
                isSwingHigh = false;
            }
            if (candles[i - j].low <= currentLow) {
                isSwingLow = false;
            }
            
            // Check right side
            if (candles[i + j].high >= currentHigh) {
                isSwingHigh = false;
            }
            if (candles[i + j].low <= currentLow) {
                isSwingLow = false;
            }
        }
        
        if (isSwingHigh) {
            potentialSwings.push({
                time: parseTimestampToUnix(currentCandle.timestamp),
                price: currentHigh,
                type: 'high',
                timestamp: currentCandle.timestamp,
                candle: currentCandle,
                index: i
            });
        }
        
        if (isSwingLow) {
            potentialSwings.push({
                time: parseTimestampToUnix(currentCandle.timestamp),
                price: currentLow,
                type: 'low',
                timestamp: currentCandle.timestamp,
                candle: currentCandle,
                index: i
            });
        }
    }
    
    // Sort potential swings chronologically
    potentialSwings.sort((a, b) => a.time - b.time);
    
    // Apply proper swing labeling logic
    const swingPoints: any[] = [];
    
    for (let i = 0; i < potentialSwings.length; i++) {
        const current = potentialSwings[i];
        let label = '';
        
        if (current.type === 'high') {
            // Find the last swing high
            const lastSwingHigh = [...swingPoints].reverse().find(p => p.label === 'HH' || p.label === 'LH');
            
            if (!lastSwingHigh) {
                label = 'HH'; // First high
            } else {
                label = current.price > lastSwingHigh.price ? 'HH' : 'LH';
            }
        } else { // current.type === 'low'
            // Find the last swing low
            const lastSwingLow = [...swingPoints].reverse().find(p => p.label === 'HL' || p.label === 'LL');
            
            if (!lastSwingLow) {
                label = 'HL'; // First low
            } else {
                label = current.price > lastSwingLow.price ? 'HL' : 'LL';
            }
        }
        
        swingPoints.push({
            time: current.time,
            price: current.price,
            label,
            timestamp: current.timestamp,
            candle: current.candle,
            index: current.index
        });
    }
    
    // Now fix missing alternating points
    const finalSwingPoints: any[] = [];
    
    for (let i = 0; i < swingPoints.length; i++) {
        const current = swingPoints[i];
        
        if (finalSwingPoints.length > 0) {
            const last = finalSwingPoints[finalSwingPoints.length - 1];
            
            // Check if we have consecutive points of same type
            const lastIsHigh = last.label === 'HH' || last.label === 'LH';
            const currentIsHigh = current.label === 'HH' || current.label === 'LH';
            
            if (lastIsHigh === currentIsHigh) {
                // Same type consecutive - need to insert missing alternating point
                const startIndex = last.index;
                const endIndex = current.index;
                
                if (lastIsHigh) {
                    // Both are highs, need to find lowest point between them
                    let lowestPrice = Infinity;
                    let lowestCandle = null;
                    let lowestIndex = -1;
                    
                    for (let j = startIndex + 1; j < endIndex; j++) {
                        if (candles[j].low < lowestPrice) {
                            lowestPrice = candles[j].low;
                            lowestCandle = candles[j];
                            lowestIndex = j;
                        }
                    }
                    
                    if (lowestCandle) {
                        // Determine if it's HL or LL
                        const lastSwingLow = [...finalSwingPoints].reverse().find(p => p.label === 'HL' || p.label === 'LL');
                        const lowLabel = !lastSwingLow || lowestPrice > lastSwingLow.price ? 'HL' : 'LL';
                        
                        finalSwingPoints.push({
                            time: parseTimestampToUnix(lowestCandle.timestamp),
                            price: lowestPrice,
                            label: lowLabel,
                            timestamp: lowestCandle.timestamp,
                            candle: lowestCandle,
                            index: lowestIndex
                        });
                    }
                } else {
                    // Both are lows, need to find highest point between them
                    let highestPrice = -Infinity;
                    let highestCandle = null;
                    let highestIndex = -1;
                    
                    for (let j = startIndex + 1; j < endIndex; j++) {
                        if (candles[j].high > highestPrice) {
                            highestPrice = candles[j].high;
                            highestCandle = candles[j];
                            highestIndex = j;
                        }
                    }
                    
                    if (highestCandle) {
                        // Determine if it's HH or LH
                        const lastSwingHigh = [...finalSwingPoints].reverse().find(p => p.label === 'HH' || p.label === 'LH');
                        const highLabel = !lastSwingHigh || highestPrice > lastSwingHigh.price ? 'HH' : 'LH';
                        
                        finalSwingPoints.push({
                            time: parseTimestampToUnix(highestCandle.timestamp),
                            price: highestPrice,
                            label: highLabel,
                            timestamp: highestCandle.timestamp,
                            candle: highestCandle,
                            index: highestIndex
                        });
                    }
                }
            }
        }
        
        finalSwingPoints.push(current);
    }
    
    // Sort final swing points chronologically
    finalSwingPoints.sort((a, b) => a.time - b.time);
    
    // Console log all swing points in descending order by price
    if (finalSwingPoints.length > 0) {
        console.log('\n🔥 SWING POINTS ANALYSIS (Calculated from OHLC - Descending Order by Price):');
        console.log('=' .repeat(70));
        
        const sortedSwingPoints = [...finalSwingPoints].sort((a, b) => b.price - a.price);
        
        sortedSwingPoints.forEach((point, index) => {
            const date = new Date(point.timestamp).toLocaleDateString();
            const time = new Date(point.timestamp).toLocaleTimeString();
            console.log(`${index + 1}. ${point.label} - ₹${point.price.toFixed(2)} | ${date} ${time} | Candle #${point.index}`);
        });
        
        // Separate swing points by type
        const hhPoints = finalSwingPoints.filter(p => p.label === 'HH');
        const lhPoints = finalSwingPoints.filter(p => p.label === 'LH');
        const hlPoints = finalSwingPoints.filter(p => p.label === 'HL');
        const llPoints = finalSwingPoints.filter(p => p.label === 'LL');
        
        console.log('\n📊 SWING POINTS BY TYPE:');
        console.log(`🟢 HH (Higher Highs): ${hhPoints.length} points`);
        console.log(`🔴 LH (Lower Highs): ${lhPoints.length} points`);
        console.log(`🟡 HL (Higher Lows): ${hlPoints.length} points`);
        console.log(`🔵 LL (Lower Lows): ${llPoints.length} points`);
        
        console.log('\n📅 SWING POINTS CHRONOLOGICAL ORDER:');
        finalSwingPoints.forEach((point, index) => {
            const date = new Date(point.timestamp).toLocaleDateString();
            const time = new Date(point.timestamp).toLocaleTimeString();
            console.log(`${index + 1}. ${point.label} - ₹${point.price.toFixed(2)} | ${date} ${time} | Candle #${point.index}`);
        });
        console.log('=' .repeat(70));
    }
    
    return finalSwingPoints;
};

export const OHLCChart: React.FC<OHLCChartProps> = ({
    candles,
    vixData,
    title = "OHLC Chart",
    height = chartHeight, // Use the updated chartHeight
    width,
    showVolume = true,
    showEMA = true,
    showRSI = true,
    showVIX = true,
    showSwingPoints = true,
    analysisList, // Destructure analysisList
    supportLevel, // Use backend-provided support level
    resistanceLevel, // Use backend-provided resistance level
    avgVolume = 0, // Average volume with default value of 0
    onLoadMoreData, // Callback for loading more data
    hasMoreOlderData = false,
    hasMoreNewerData = false,
    isLoadingMoreData = false
}) => {
    const UnderstchartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const [ohlcInfo, setOhlcInfo] = useState<any>(null);
    const [vixValue, setVixValue] = useState<number | null>(null);
    const [emaError, setEmaError] = useState<string | null>(null);
    const [rsiError, setRsiError] = useState<string | null>(null);
    const [vixError, setVixError] = useState<string | null>(null);
    const ema8SeriesRef = useRef<any>(null);
    const ema30SeriesRef = useRef<any>(null);
    const rsiSeriesRef = useRef<any>(null);
    const vixSeriesRef = useRef<any>(null);
    const swingPointsSeriesRef = useRef<any>(null);
    const volumeSeriesRef = useRef<any>(null);
    const avgVolumeLineRef = useRef<any>(null);
    const propAnalysisList = analysisList || []; // Use propAnalysisList if provided
    // Refs for SR price lines so we can update/remove them
    const staticSupportLineRef = useRef<any>(null);
    const staticResistanceLineRef = useRef<any>(null);
    const dynamicSupportLineRef = useRef<any>(null);
    const dynamicResistanceLineRef = useRef<any>(null);

    // Memoized data processing for ultra-fast performance
    const processedChartData = useMemo(() => {
        if (!candles.length) return [];
       //console.log(`Processing ${candles.length} candles for chart display`);
        const start = performance.now();
        const data = processChartData(candles);
       //console.log(`Chart data processed in ${(performance.now() - start).toFixed(2)}ms, showing ${data.length} points`);
        return data;
    }, [candles]);

    const processedVolumeData = useMemo(() => {
        if (!candles.length || !showVolume) return [];
        const start = performance.now();
        const data = processVolumeData(candles);
       //console.log(`Volume data processed in ${(performance.now() - start).toFixed(2)}ms`);
        return data;
    }, [candles, showVolume]);

    // Debounced chart update for smooth performance
    const updateChartData = useCallback((chart: any, candlestickSeries: any, volumeSeries: any | null) => {
        const start = performance.now();
        
        // Update candlestick data with processed data
        if (processedChartData.length > 0) {
            candlestickSeries.setData(processedChartData);
        }

        // Update volume data if enabled
        if (showVolume && volumeSeries && processedVolumeData.length > 0) {
            volumeSeries.setData(processedVolumeData);
        }
        
       //console.log(`Chart updated in ${(performance.now() - start).toFixed(2)}ms`);
    }, [processedChartData, processedVolumeData, showVolume]);


    // Chart initialization effect - only runs when data changes, not indicator toggles
    useEffect(() => {
       //console.log('🔄 Chart initialization effect triggered', { candlesLength: candles.length, height, width, showVolume });
        if (!UnderstchartContainerRef.current || !candles.length) return;

        // Create chart with enhanced navigation and zoom configuration
        const chart = createChart(UnderstchartContainerRef.current, {
            width: maxWidth,
            height: 800 * 0.9, // Reduce height to leave space for x-axis
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
                // Enhanced navigation settings
                fixLeftEdge: false,  // Allow scrolling beyond the leftmost data point
                fixRightEdge: false, // Allow scrolling beyond the rightmost data point
                lockVisibleTimeRangeOnResize: false, // Allow automatic adjustment on resize
                borderVisible: true,
                visible: true,
                rightOffset: 50,     // Increased from 12 to provide more space for navigation
                minBarSpacing: 0.5,  // Reduced from 3 to allow more zoom levels
                borderColor: '#333333',
                // Enhanced scroll and zoom behavior
                shiftVisibleRangeOnNewBar: true, // Auto-scroll with new data
            },
            crosshair: {
                mode: 0, // Normal crosshair mode
                vertLine: {
                    color: '#758696',
                    width: 1,
                    style: 2, // Dashed line
                    visible: true,
                    labelVisible: true,
                },
                horzLine: {
                    color: '#758696',
                    width: 1,
                    style: 2, // Dashed line
                    visible: true,
                    labelVisible: true,
                },
            },
            handleScroll: {
                mouseWheel: true,      // Enable mouse wheel scrolling
                pressedMouseMove: true, // Enable drag scrolling
                horzTouchDrag: true,    // Enable horizontal touch drag
                vertTouchDrag: true,    // Enable vertical touch drag
            },
            handleScale: {
                axisPressedMouseMove: {
                    time: true,  // Enable time axis scaling with mouse
                    price: true, // Enable price axis scaling with mouse
                },
                mouseWheel: true,        // Enable mouse wheel scaling
                pinch: true,            // Enable pinch scaling on touch devices
                axisDoubleClickReset: {
                    time: true,  // Double-click time axis to reset
                    price: true, // Double-click price axis to reset
                },
            },
            // Enhanced kinetic scrolling for better user experience
            kineticScroll: {
                touch: true,    // Enable kinetic scrolling on touch
                mouse: false,   // Disable for mouse (can be distracting)
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
        
        // Store candlestick series reference for later use
        chartRef.current.candlestickSeries = candlestickSeries;

        // Initialize a dedicated swing points series during chart creation
        swingPointsSeriesRef.current = chart.addLineSeries({
            color: '#000000',
            lineWidth: 1,
            priceScaleId: '',
        });

        // Add volume series on a separate scale at the bottom
        let volumeSeries = null;
        if (showVolume) {
            // @ts-ignore
            volumeSeries = chart.addHistogramSeries({
                color: '#4caf50',
                priceFormat: { type: 'volume' },
                priceScaleId: 'volume',
            });
            volumeSeriesRef.current = volumeSeries;
            // @ts-ignore
            chartRef.current.volumeSeries = volumeSeries;
            // @ts-ignore
            chart.priceScale('volume').applyOptions({
                scaleMargins: { top: 0.75, bottom: 0 },
                autoScale: true // Re-enable auto-scaling
            });
        }

        // Format data for the chart using candles
        // Use consistent timestamp handling to prevent chart distortion
        const formattedData = candles.map(candle => {
            return {
                time: parseTimestampToUnix(candle.timestamp),
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
            };
        }).filter((item, index, self) => 
            // Remove duplicates and invalid entries
            item.time && !isNaN(item.time) && 
            index === self.findIndex(t => t.time === item.time)
        ).sort((a, b) => a.time - b.time); // Ensure ascending order

        // Set candlestick data with enhanced boundary handling
        // @ts-ignore: TypeScript types are too strict, but this works at runtime
        candlestickSeries.setData(formattedData);
        
        // Configure better viewport management for limited data
        if (formattedData.length > 0) {
            // Add padding to prevent empty space issues
            const dataRange = {
                from: formattedData[0].time,
                to: formattedData[formattedData.length - 1].time
            };
            
            // Set an appropriate initial visible range
            const visibleCandleCount = Math.min(100, formattedData.length);
            const startIndex = Math.max(0, formattedData.length - visibleCandleCount);
            
            chart.timeScale().setVisibleRange({
                from: formattedData[startIndex].time as any,
                to: formattedData[formattedData.length - 1].time as any
            });
            
           //console.log(`📊 Chart data range: ${formattedData.length} candles from ${new Date(dataRange.from * 1000).toISOString()} to ${new Date(dataRange.to * 1000).toISOString()}`);
        }

        // Set volume data if enabled
        if (showVolume && volumeSeries) {
            // Use consistent timestamp handling for volume data
            const volumeData = candles.map(candle => {
                return {
                    time: parseTimestampToUnix(candle.timestamp),
                    value: candle.volume,
                    color: candle.close >= candle.open ? '#4caf50' : '#ef5350',
                };
            }).filter((item, index, self) => 
                // Remove duplicates and invalid entries
                item.time && !isNaN(item.time) && 
                index === self.findIndex(t => t.time === item.time)
            ).sort((a, b) => a.time - b.time); // Ensure ascending order
            
            // @ts-ignore: TypeScript types are too strict, but this works at runtime
            volumeSeries.setData(volumeData);
        }

        // Show the last candle's info by default
        if (candles.length > 0) {
            const last = candles[candles.length - 1];
            setOhlcInfo({
                open: last.open,
                high: last.high,
                low: last.low,
                close: last.close,
                prevClose: candles.length > 1 ? candles[candles.length - 2].close : last.open,
                volume: last.volume,
                rsi: last.rsi,
            });
        }

        // Update the OHLC info on crosshair move
        chart.subscribeCrosshairMove(param => {
            if (param && param.time) {
                // Find the candle for the hovered time
                const hovered = candles.find((c: Candle) => parseTimestampToUnix(c.timestamp) === param.time);
                if (hovered) {
                    // Find previous candle for change calculation
                    const idx = candles.findIndex((c: Candle) => parseTimestampToUnix(c.timestamp) === param.time);
                    const prevClose = idx > 0 ? candles[idx - 1].close : hovered.open;
                    setOhlcInfo({
                        open: hovered.open,
                        high: hovered.high,
                        low: hovered.low,
                        close: hovered.close,
                        prevClose,
                        volume: hovered.volume,
                        rsi: hovered.rsi,
                    });
                }
            }
        });

        // Handle resize and auto-fit chart
        const handleResize = () => {
            if (UnderstchartContainerRef.current && chartRef.current) {
                const containerWidth = UnderstchartContainerRef.current.clientWidth;
                const containerHeight = UnderstchartContainerRef.current.clientHeight * 0.9; // Reduce height by 10%
                chartRef.current.applyOptions({
                    width: containerWidth,
                    height: containerHeight,
                });
                
                // Auto-fit the data to the viewport after resize
                setTimeout(() => {
                    if (chartRef.current && formattedData.length > 0) {
                        chartRef.current.timeScale().fitContent();
                    }
                }, 100);
            }
        };

        // Auto-fit content to the available space
        const autoFitContent = () => {
            if (chartRef.current && formattedData.length > 0) {
                try {
                    // Use a timeout to ensure the chart is fully rendered
                    setTimeout(() => {
                        if (chartRef.current) {
                            chartRef.current.timeScale().fitContent();
                        }
                    }, 200);
                } catch (error) {
                    console.warn('Failed to auto-fit chart content:', error);
                }
            }
        };

        // Call auto-fit after chart is fully loaded
        autoFitContent();

        window.addEventListener('resize', handleResize);

        // Add keyboard shortcuts for better navigation
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!chartRef.current) return;
            
            const timeScale = chartRef.current.timeScale();
            
            switch (event.key) {
                case 'Home':
                    // Go to the beginning of data
                    if (formattedData.length > 0) {
                        timeScale.setVisibleRange({
                            from: formattedData[0].time as any,
                            to: formattedData[Math.min(50, formattedData.length - 1)].time as any
                        });
                    }
                    break;
                case 'End':
                    // Go to the end of data
                    if (formattedData.length > 0) {
                        const endIndex = formattedData.length - 1;
                        const startIndex = Math.max(0, endIndex - 50);
                        timeScale.setVisibleRange({
                            from: formattedData[startIndex].time as any,
                            to: formattedData[endIndex].time as any
                        });
                    }
                    break;
                case 'f':
                case 'F':
                    if (event.ctrlKey || event.metaKey) {
                        // Ctrl+F or Cmd+F: Fit content
                        event.preventDefault();
                        timeScale.fitContent();
                    }
                    break;
                case 'r':
                case 'R':
                    if (event.ctrlKey || event.metaKey) {
                        // Ctrl+R or Cmd+R: Reset zoom
                        event.preventDefault();
                        timeScale.resetTimeScale();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyDown);
            try {
                // Clean up avg volume line if present
                if (avgVolumeLineRef.current && volumeSeriesRef.current) {
                    // @ts-ignore
                    volumeSeriesRef.current.removePriceLine(avgVolumeLineRef.current);
                }
            } catch {}
            chart.remove();
            volumeSeriesRef.current = null;
            avgVolumeLineRef.current = null;
        };
    }, [candles, height, width, showVolume]); // Removed vixData to prevent unnecessary recreations

    // Manage Avg Volume reference line on the volume histogram
    useEffect(() => {
        const series = volumeSeriesRef.current;

        // If no volume series (e.g., showVolume is false or chart not ready), nothing to do
        if (!series) return;

        // Remove any existing avg volume price line first
        if (avgVolumeLineRef.current) {
            try {
                // @ts-ignore
                series.removePriceLine(avgVolumeLineRef.current);
            } catch {}
            avgVolumeLineRef.current = null;
        }

        // Only add when we have a positive avgVolume and volume display is enabled
        if (!showVolume || !avgVolume || avgVolume <= 0) return;

        try {
            // @ts-ignore
            avgVolumeLineRef.current = series.createPriceLine({
                price: avgVolume,
                color: '#FFD600',
                lineWidth: 2,
                lineStyle: 0, // solid
                axisLabelVisible: true,
                title: 'Avg Volume',
            });
        } catch (e) {
            // noop
        }
    }, [avgVolume, showVolume, candles]);

    // Separate effect for EMA indicator management (EMA 8 and EMA 30)
    useEffect(() => {
       //console.log('📊 EMA effect triggered', { showEMA, candlesLength: candles.length });
        if (!chartRef.current) return;

        const chart = chartRef.current;
        setEmaError(null);

        // Always clean existing EMA series before updating
        const removeEmaSeries = () => {
            try {
                if (ema8SeriesRef.current) { chart.removeSeries(ema8SeriesRef.current); ema8SeriesRef.current = null; }
            } catch {}
            try {
                if (ema30SeriesRef.current) { chart.removeSeries(ema30SeriesRef.current); ema30SeriesRef.current = null; }
            } catch {}
        };

        if (showEMA) {
            try {
                removeEmaSeries();
                
                // Check raw EMA values in candles
                const candlesWithEma8 = candles.filter(c => typeof c.ema8 === 'number' && !isNaN(c.ema8));
                const candlesWithEma30 = candles.filter(c => typeof c.ema30 === 'number' && !isNaN(c.ema30));
                
                // Debug logging for EMA data analysis
               //console.log(`🔍 EMA Analysis: ${candles.length} candles, EMA8(${candlesWithEma8.length}) EMA30(${candlesWithEma30.length})`);
                
                // Debug raw candle data for EMA values
               //console.log(`📊 Raw EMA8 candle analysis:`);
               //console.log(`  First 5 candles EMA8: [${candles.slice(0, 5).map(c => c.ema8?.toFixed(2) || 'null').join(', ')}]`);
               //console.log(`  Last 5 candles EMA8: [${candles.slice(-5).map(c => c.ema8?.toFixed(2) || 'null').join(', ')}]`);
                if (candlesWithEma8.length > 0) {
                   //console.log(`  EMA8 first valid candle: index ${candles.findIndex(c => typeof c.ema8 === 'number')}, timestamp: ${candles.find(c => typeof c.ema8 === 'number')?.timestamp}`);
                   //console.log(`  EMA8 last valid candle: index ${candles.findLastIndex(c => typeof c.ema8 === 'number')}, timestamp: ${candles[candles.findLastIndex(c => typeof c.ema8 === 'number')]?.timestamp}`);
                }
                
                // Debug timestamp ordering - check if data might be in reverse order
                if (candles.length >= 2) {
                    const first = candles[0];
                    const last = candles[candles.length - 1];
                    const firstTime = parseTimestampToUnix(first.timestamp);
                    const lastTime = parseTimestampToUnix(last.timestamp);
                   //console.log(`🕐 Time order: ${new Date(firstTime * 1000).toISOString()} to ${new Date(lastTime * 1000).toISOString()}`);
                    if (firstTime > lastTime) {
                        console.warn('⚠️ Data appears to be in reverse chronological order!');
                    }
                }
                
                // EMA 8
                ema8SeriesRef.current = chart.addLineSeries({
                    color: '#03A9F4',
                    lineWidth: 2,
                    priceScaleId: '',
                    title: 'EMA 8',
                });
               //console.log(`🎯 Creating EMA8 chart data...`);
                const ema8Data = candles
                    .map((c: Candle, idx: number) => {
                        const chartPoint = {
                            time: parseTimestampToUnix(c.timestamp),
                            value: typeof c.ema8 === 'number' && !isNaN(c.ema8) ? c.ema8 : null,
                        };
                        
                        // Debug key data points
                        if (idx < 3 || idx >= candles.length - 3 || (idx >= 6 && idx <= 9)) {
                           //console.log(`  Chart[${idx}] EMA8: raw=${c.ema8?.toFixed(4) || 'null'} → chart=${chartPoint.value?.toFixed(4) || 'null'} at ${new Date(chartPoint.time * 1000).toISOString()}`);
                        }
                        
                        return chartPoint;
                    })
                    .filter((item: any) => {
                        const isValid = typeof item.value === 'number' && !isNaN(item.value);
                        return isValid;
                    })
                    .sort((a, b) => a.time - b.time); // Ensure ascending time order

               //console.log(`📈 EMA8 chart data summary:`);
               //console.log(`  - Total candles processed: ${candles.length}`);
               //console.log(`  - Valid EMA8 chart points: ${ema8Data.length}`);
               //console.log(`  - Data reduction: ${candles.length - ema8Data.length} points filtered out`);
                if (ema8Data.length > 0) {
                   //console.log(`  - Time range: ${new Date(ema8Data[0].time * 1000).toISOString()} to ${new Date(ema8Data[ema8Data.length - 1].time * 1000).toISOString()}`);
                   //console.log(`  - Value range: ${ema8Data[0].value?.toFixed(4)} to ${ema8Data[ema8Data.length - 1].value?.toFixed(4)}`);
                }

                // Set EMA8 data with enhanced error handling
                if (ema8Data.length > 0) {
                    ema8SeriesRef.current.setData(ema8Data);
                   //console.log('✅ EMA8 data set successfully');
                    
                    // Ensure EMA series scales with the main chart
                    ema8SeriesRef.current.applyOptions({
                        lastValueVisible: true,
                        priceLineVisible: false,
                    });
                }

                // EMA 30
                ema30SeriesRef.current = chart.addLineSeries({
                    color: '#FF9800',
                    lineWidth: 2,
                    priceScaleId: '',
                    title: 'EMA 30',
                });
                const ema30Data = candles
                    .map((c: Candle) => {
                        return {
                            time: parseTimestampToUnix(c.timestamp),
                            value: typeof c.ema30 === 'number' && !isNaN(c.ema30) ? c.ema30 : null,
                        };
                    })
                    .filter((item: any) => typeof item.value === 'number' && !isNaN(item.value))
                    .sort((a, b) => a.time - b.time); // Ensure ascending time order

               //console.log(`EMA30 chart data points: ${ema30Data.length}`);
                if (ema30Data.length > 0) {
                   //console.log(`EMA30 time range: ${new Date(ema30Data[0].time * 1000).toISOString()} to ${new Date(ema30Data[ema30Data.length - 1].time * 1000).toISOString()}`);
                }

                // Set EMA30 data with enhanced error handling
                if (ema30Data.length > 0) {
                    ema30SeriesRef.current.setData(ema30Data);
                   //console.log('✅ EMA30 data set successfully');
                    
                    // Ensure EMA series scales with the main chart
                    ema30SeriesRef.current.applyOptions({
                        lastValueVisible: true,
                        priceLineVisible: false,
                    });
                }

                // Enhanced error checking with detailed logging
                if (!ema8Data.length && !ema30Data.length) {
                    console.error('❌ EMA Error Details:');
                    console.error(`- Total candles: ${candles.length}`);
                    console.error(`- Candles with EMA8: ${candlesWithEma8.length}`);
                    console.error(`- Candles with EMA30: ${candlesWithEma30.length}`);
                    console.error(`- EMA8 data points after processing: ${ema8Data.length}`);
                    console.error(`- EMA30 data points after processing: ${ema30Data.length}`);
                    throw new Error('Insufficient EMA data - both EMA8 and EMA30 arrays are empty');
                }
            } catch (err) {
                console.error('EMA calculation error:', err);
                setEmaError('Insufficient EMA data available');
                removeEmaSeries();
            }
        } else {
            removeEmaSeries();
        }
    }, [showEMA]); // Removed candles dependency since EMA is pre-calculated in candles data

    // Separate effect for RSI indicator management
    useEffect(() => {
        if (!chartRef.current) return;

        const chart = chartRef.current;
        setRsiError(null);

        if (showRSI) {
            try {
                const rsiPaneId = 'rsi';
                rsiSeriesRef.current = chart.addLineSeries({
                    color: '#9C27B0',
                    lineWidth: 2,
                    priceScaleId: rsiPaneId,
                });
                const rsiData = candles
                    .map((c: Candle) => {
                        return {
                            time: parseTimestampToUnix(c.timestamp),
                            value: typeof c.rsi === 'number' && !isNaN(c.rsi) ? c.rsi : null,
                        };
                    })
                    .filter((item: any) => typeof item.value === 'number' && !isNaN(item.value))
                    .sort((a, b) => a.time - b.time); // Ensure ascending time order
                if (!rsiData.length) throw new Error('Insufficient RSI data');
                rsiSeriesRef.current.setData(rsiData);
                chart.priceScale(rsiPaneId).applyOptions({
                    scaleMargins: { top: 0.1, bottom: 0.1 },
                    borderColor: '#9C27B0',
                    borderVisible: true,
                    visible: true,
                    autoScale: true,
                });
            } catch (err) {
                console.error('RSI calculation error:', err);
                setRsiError('Insufficient RSI data available');
                if (rsiSeriesRef.current) {
                    chart.removeSeries(rsiSeriesRef.current);
                    rsiSeriesRef.current = null;
                }
            }
        } else if (rsiSeriesRef.current) {
            chart.removeSeries(rsiSeriesRef.current);
            rsiSeriesRef.current = null;
        }
    }, [showRSI]); // Removed candles dependency since RSI is pre-calculated

    // Separate effect for VIX indicator management
    useEffect(() => {
        if (!chartRef.current) return;

        const chart = chartRef.current;
        setVixError(null);
        let formattedVix: { time: number; value: number }[] = [];

        if (showVIX) {
            if (!vixData || vixData.length === 0) {
                setVixError('Insufficient VIX data available');
                if (vixSeriesRef.current) {
                    chart.removeSeries(vixSeriesRef.current);
                    vixSeriesRef.current = null;
                }
            } else {
                try {
                    // Build a map for fast lookup
                    const vixMap = new Map<number, number>();
                    vixData.forEach(v => {
                        const t = parseTimestampToUnix(v.timestamp);
                        vixMap.set(t, v.value);
                    });
                    let lastVix = 0;
                    formattedVix = candles.map(candle => {
                        const t = parseTimestampToUnix(candle.timestamp);
                        if (vixMap.has(t)) {
                            lastVix = vixMap.get(t)!;
                        }
                        return { time: t, value: typeof lastVix === 'number' && !isNaN(lastVix) ? lastVix : undefined };
                    }).filter(item => typeof item.value === 'number' && !isNaN(item.value))
                     .sort((a, b) => a.time - b.time) as { time: number; value: number }[]; // Ensure ascending time order
                    if (!formattedVix.length) throw new Error('Insufficient VIX data');
                    vixSeriesRef.current = chart.addLineSeries({
                        color: '#FFD600', // bright yellow
                        lineWidth: 2,
                        priceScaleId: 'vix', // separate scale for VIX
                    });
                    vixSeriesRef.current.setData(formattedVix);
                    // @ts-ignore
                    chart.priceScale('vix').applyOptions({
                        scaleMargins: { top: 0.1, bottom: 0.1 },
                        borderColor: '#FFD600',
                        borderVisible: true,
                        entireTextOnly: false,
                        visible: true,
                        autoScale: true,
                    });

                    // Set initial VIX value
                    if (formattedVix.length > 0) {
                        setVixValue(formattedVix[formattedVix.length - 1].value);
                    }
                } catch (err) {
                    console.error('VIX calculation error:', err);
                    setVixError('Insufficient VIX data available');
                    if (vixSeriesRef.current) {
                        chart.removeSeries(vixSeriesRef.current);
                        vixSeriesRef.current = null;
                    }
                }
            }
        } else if (vixSeriesRef.current) {
            chart.removeSeries(vixSeriesRef.current);
            vixSeriesRef.current = null;
            setVixValue(null);
        }
    }, [showVIX, vixData]); // Removed candles dependency

    // Reference to store trend lines for cleanup
    const trendLinesRef = useRef<any[]>([]);
    
    // Define candlestickSeries and implement swing points logic
    useEffect(() => {
        if (!chartRef.current) return;

        const chart = chartRef.current;
        
        // Clean up any existing trend lines from previous renders
        if (trendLinesRef.current && trendLinesRef.current.length && chart) {
            trendLinesRef.current.forEach(line => {
                if (line && chart) {
                    try {
                        chart.removeSeries(line);
                    } catch (err) {
                        // Ignore cleanup errors - chart may already be destroyed
                        console.warn('Error cleaning up trend line:', err);
                    }
                }
            });
            trendLinesRef.current = [];
        }
        
        
        // Ensure the candlestick series is initialized
        const candlestickSeries = chart.candlestickSeries || chart.addCandlestickSeries({
            upColor: '#1e7e34',
            downColor: '#c62828',
            borderVisible: false,
            wickUpColor: '#1e7e34',
            wickDownColor: '#c62828',
        });
        
        // Store reference
        if (!chart.candlestickSeries) {
            chart.candlestickSeries = candlestickSeries;
        }

        // Calculate swing points directly from OHLC data and display dotted lines
        if (candles.length >= 11) { // Need at least 11 candles for lookback of 5
            try {
                const calculatedSwingPoints = calculateSwingPointsFromCandles(candles, 5);
                console.log(`✅ Calculated ${calculatedSwingPoints.length} swing points directly from OHLC data`);
                
                // Collect all markers for swing points
                const allMarkers: { time: number; position: string; color: string; shape: string; text: string; size: number }[] = [];
                
                // Create small dotted lines for each swing point
                calculatedSwingPoints.forEach((swingPoint) => {
                    const label = swingPoint.label;
                    const color = getSwingPointColor(label);
                    
                    // Find the index of this swing point in the candles array
                    const currentCandleIndex = swingPoint.index;
                    
                    // Create dotted line data (3 points on each side = 6 total points)
                    const dottedLineData: { time: number; value: number }[] = [];
                    const lineExtent = 3; // 3 points on each side
                    
                    for (let i = Math.max(0, currentCandleIndex - lineExtent); 
                         i <= Math.min(candles.length - 1, currentCandleIndex + lineExtent); 
                         i++) {
                        // Create dotted effect by only adding every 2nd point
                        if ((i - (currentCandleIndex - lineExtent)) % 2 === 0) {
                            dottedLineData.push({
                                time: parseTimestampToUnix(candles[i].timestamp),
                                value: swingPoint.price
                            });
                        }
                    }
                    
                    // Create a line series for this swing point's dotted line
                    const dottedLineSeries = chart.addLineSeries({
                        color: color,
                        lineWidth: 2,
                        lineStyle: 1, // Solid line (we create dotted effect with data points)
                        title: `${label} - ₹${swingPoint.price.toFixed(2)}`,
                        priceLineVisible: false,
                        lastValueVisible: false,
                        crosshairMarkerVisible: false,
                    });
                    
                    // Set the dotted line data
                    dottedLineSeries.setData(dottedLineData);
                    
                    // Add marker with label to the collection
                    allMarkers.push({
                        time: swingPoint.time,
                        position: (label === 'HH' || label === 'LH') ? 'aboveBar' : 'belowBar',
                        color: color,
                        shape: 'circle',
                        text: label,
                        size: 2,
                    });
                });
                
                // Set all markers at once
                candlestickSeries.setMarkers(allMarkers);
                
            } catch (err) {
                console.error('Swing points calculation error:', err);
                toast.error('Error calculating swing points', { duration: 4000 });
            }
        } else {
            console.log('❌ Insufficient candles for swing point calculation (need at least 11)');
        }
        
        // Return cleanup function
        return () => {
            // Clean up trend lines when component unmounts or dependencies change
            if (trendLinesRef.current && trendLinesRef.current.length && chart) {
                trendLinesRef.current.forEach(line => {
                    if (line && chart) {
                        try {
                            chart.removeSeries(line);
                        } catch (err) {
                            // Ignore cleanup errors - chart may already be destroyed
                            console.warn('Error cleaning up trend line:', err);
                        }
                    }
                });
                trendLinesRef.current = [];
            }
        };
    }, [showSwingPoints, propAnalysisList, candles]);

    // Crosshair move handler effect - updates when chart changes
    useEffect(() => {
        if (!chartRef.current) return;

        const chart = chartRef.current;

        // Update the OHLC info and VIX on crosshair move
        const crosshairHandler = (param: any) => {
            if (param?.time) {
                // Find the candle for the hovered time
                const hovered = candles.find((c: Candle) => parseTimestampToUnix(c.timestamp) === param.time);
                if (hovered) {
                    // Find previous candle for change calculation
                    const idx = candles.findIndex((c: Candle) => parseTimestampToUnix(c.timestamp) === param.time);
                    const prevClose = idx > 0 ? candles[idx - 1].close : hovered.open;
                    setOhlcInfo({
                        open: hovered.open,
                        high: hovered.high,
                        low: hovered.low,
                        close: hovered.close,
                        prevClose,
                        volume: hovered.volume,
                        rsi: hovered.rsi,
                    });
                }

                // Find the VIX value for the hovered time
                if (showVIX && vixData && vixData.length > 0) {
                    const vixMap = new Map<number, number>();
                    vixData.forEach(v => {
                        const t = parseTimestampToUnix(v.timestamp);
                        vixMap.set(t, v.value);
                    });
                    let lastVix = 0;
                    const formattedVix = candles.map(candle => {
                        const t = parseTimestampToUnix(candle.timestamp);
                        if (vixMap.has(t)) {
                            lastVix = vixMap.get(t)!;
                        }
                        return { time: t, value: typeof lastVix === 'number' && !isNaN(lastVix) ? lastVix : undefined };
                    }).filter(item => typeof item.value === 'number' && !isNaN(item.value)) as { time: number; value: number }[];

                    const hoveredVix = formattedVix.find(v => v.time === param.time);
                    setVixValue(hoveredVix ? hoveredVix.value : null);
                }
            }
        };

        chart.subscribeCrosshairMove(crosshairHandler);

        return () => {
            chart.unsubscribeCrosshairMove(crosshairHandler);
        };
    }, [showVIX, vixData]); // Removed candles dependency to prevent excessive re-subscriptions

    // Error toast effect
    useEffect(() => {
        if (emaError) toast.error(emaError, { duration: 1000 });
        if (rsiError) toast.error(rsiError, { duration: 1000 });
        if (vixError) toast.error(vixError, { duration: 1000 });
    }, [emaError, rsiError, vixError]);

    if (!candles.length) {
        return (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                <div className="text-gray-500">No data available</div>
            </div>
        );
    }

    // Helper to get the gap between previous day's close and today's open
    function getPrevCloseToTodayOpenGap(currentCandle: any) {
        if (!currentCandle) return null;
        const currentDate = new Date(currentCandle.timestamp);
        const currentDay = currentDate.toISOString().slice(0, 10);
        // Find the first candle of the current day
        const todayFirstCandle = candles.find(c => c.timestamp.slice(0, 10) === currentDay);
        if (!todayFirstCandle) return null;
        // Find the last candle of the previous day
        const prevDay = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        // Find the last candle of the previous day (latest timestamp for prevDay)
        const prevDayCandles = candles.filter(c => c.timestamp.slice(0, 10) === prevDay);
        if (!prevDayCandles.length) return null;
        const prevDayLastCandle = prevDayCandles[prevDayCandles.length - 1];
        const gap = todayFirstCandle.open - prevDayLastCandle.close;
        return { gap, todayOpen: todayFirstCandle.open, prevClose: prevDayLastCandle.close };
    }

    // Chart container - adaptive width, reasonable height
    const chartAreaStyle = {
        position: 'relative' as const,
        top: 50,
        left: 0,
        width: '100vw', // Revert to original width
        height: '90vh', // Revert to original height
        zIndex: 1,
        background: '#fff',
        // Add padding to ensure x-axis is visible
        paddingBottom: '40px', // Add space for x-axis
        // Add negative margin to lift it up further
    };

    const getSwingPointColor = (label: string): string => {
        switch (label) {
            case 'HH':
                return '#1e90ff'; // Blue for Higher High
            case 'HL':
                return '#32cd32'; // Green for Higher Low
            case 'LH':
                return '#ff4500'; // Orange for Lower High
            case 'LL':
                return '#8b0000'; // Dark Red for Lower Low
            default:
                return '#000000'; // Default color
        }
    };
    
    // Calculate Average True Range (ATR) for volatility measurement
    const calculateATR = (candles: Candle[], period: number = 14): number => {
        if (!candles || candles.length < period + 1) {
            return 0;
        }
        
        // Calculate True Range for each candle
        const trueRanges: number[] = [];
        
        for (let i = 1; i < candles.length; i++) {
            const high = candles[i].high;
            const low = candles[i].low;
            const prevClose = candles[i-1].close;
            
            // True Range is the greatest of:
            // 1. Current High - Current Low
            // 2. |Current High - Previous Close|
            // 3. |Current Low - Previous Close|
            const tr1 = high - low;
            const tr2 = Math.abs(high - prevClose);
            const tr3 = Math.abs(low - prevClose);
            
            const trueRange = Math.max(tr1, tr2, tr3);
            trueRanges.push(trueRange);
        }
        
        // Calculate simple average of the true ranges for the specified period
        const recentTrueRanges = trueRanges.slice(-period);
        if (!recentTrueRanges.length) return 0;
        
        const atr = recentTrueRanges.reduce((sum, tr) => sum + tr, 0) / recentTrueRanges.length;
        return atr;
    };

    // Draw backend-provided SR as "static" lines (used when viewing latest)
    useEffect(() => {
        if (!chartRef.current?.candlestickSeries) return;

        const series = chartRef.current.candlestickSeries;

        // Clean up existing static lines first
        if (staticSupportLineRef.current) {
            try { series.removePriceLine(staticSupportLineRef.current); } catch {}
            staticSupportLineRef.current = null;
        }
        if (staticResistanceLineRef.current) {
            try { series.removePriceLine(staticResistanceLineRef.current); } catch {}
            staticResistanceLineRef.current = null;
        }

        // Create new static lines if levels provided
        if (typeof resistanceLevel === 'number' && !isNaN(resistanceLevel)) {
            staticResistanceLineRef.current = series.createPriceLine({
                price: resistanceLevel,
                color: '#FF0000',
                lineWidth: 2,
                lineStyle: 0,
                axisLabelVisible: true,
                title: 'Resistance',
            });
        }
        if (typeof supportLevel === 'number' && !isNaN(supportLevel)) {
            staticSupportLineRef.current = series.createPriceLine({
                price: supportLevel,
                color: '#00AA00',
                lineWidth: 2,
                lineStyle: 0,
                axisLabelVisible: true,
                title: 'Support',
            });
        }
    }, [supportLevel, resistanceLevel]);

    // Compute dynamic S/R for a given reference time within current/visible window
    const computeDynamicSR = (refUnixTime: number, visibleFrom?: number, visibleTo?: number) => {
        // Map candles to (time, high, low)
        const candlePoints = candles.map(c => ({
            time: parseTimestampToUnix(c.timestamp),
            high: c.high,
            low: c.low,
        }));

        const lastIdx = candlePoints.findIndex(p => p.time > refUnixTime);
        const cutIdx = lastIdx === -1 ? candlePoints.length : lastIdx; // candles up to ref time

        // Determine the working window: prefer visible range intersection
        let windowPoints = candlePoints.slice(0, cutIdx);
        if (typeof visibleFrom === 'number' && typeof visibleTo === 'number') {
            windowPoints = windowPoints.filter(p => p.time >= visibleFrom && p.time <= visibleTo);
            if (!windowPoints.length) {
                // fallback to last N bars before ref time
                windowPoints = candlePoints.slice(Math.max(0, cutIdx - 100), cutIdx);
            }
        } else {
            // fallback to last N bars
            windowPoints = candlePoints.slice(Math.max(0, cutIdx - 100), cutIdx);
        }

        // Try swing-point based SR first using analysisList
        let dynSupport: number | undefined;
        let dynResistance: number | undefined;

        if (propAnalysisList && propAnalysisList.length) {
            // Build fast candle lookup by time
            const candleMap = new Map<number, { high: number; low: number }>();
            candlePoints.forEach(p => candleMap.set(p.time, { high: p.high, low: p.low }));

            let swingItems = propAnalysisList
                .filter(a => a.swingLabel)
                .map(a => ({ time: parseTimestampToUnix(a.timestamp), label: a.swingLabel! }));

            // Strictly limit swing points to the visible window if available; otherwise up to ref time
            if (typeof visibleFrom === 'number' && typeof visibleTo === 'number') {
                swingItems = swingItems.filter(s => s.time >= visibleFrom && s.time <= visibleTo);
            } else {
                swingItems = swingItems.filter(s => s.time <= refUnixTime);
            }

            swingItems.sort((a, b) => a.time - b.time);

            // Last swing low before ref time
            for (let i = swingItems.length - 1; i >= 0; i--) {
                const s = swingItems[i];
                if ((s.label === 'HL' || s.label === 'LL') && candleMap.has(s.time)) {
                    dynSupport = candleMap.get(s.time)!.low;
                    break;
                }
            }
            // Last swing high before ref time
            for (let i = swingItems.length - 1; i >= 0; i--) {
                const s = swingItems[i];
                if ((s.label === 'HH' || s.label === 'LH') && candleMap.has(s.time)) {
                    dynResistance = candleMap.get(s.time)!.high;
                    break;
                }
            }
        }

        // Fallback: use window extremes
        if (dynSupport === undefined && windowPoints.length) {
            dynSupport = Math.min(...windowPoints.map(p => p.low));
        }
        if (dynResistance === undefined && windowPoints.length) {
            dynResistance = Math.max(...windowPoints.map(p => p.high));
        }

        return { support: dynSupport, resistance: dynResistance };
    };

    // Subscribe to visible range changes and toggle SR lines dynamically for historical views
    useEffect(() => {
        if (!chartRef.current?.candlestickSeries || candles.length < 2) return;

        const chart = chartRef.current;
        const series = chart.candlestickSeries;

        // Helper to remove dynamic lines
        const clearDynamic = () => {
            if (dynamicSupportLineRef.current) {
                try { series.removePriceLine(dynamicSupportLineRef.current); } catch {}
                dynamicSupportLineRef.current = null;
            }
            if (dynamicResistanceLineRef.current) {
                try { series.removePriceLine(dynamicResistanceLineRef.current); } catch {}
                dynamicResistanceLineRef.current = null;
            }
        };

        // Helper to ensure static lines exist when on latest
        const ensureStaticVisible = () => {
            clearDynamic();
            // Re-create static lines if missing
            if (!staticResistanceLineRef.current && typeof resistanceLevel === 'number' && !isNaN(resistanceLevel)) {
                staticResistanceLineRef.current = series.createPriceLine({
                    price: resistanceLevel,
                    color: '#FF0000',
                    lineWidth: 2,
                    lineStyle: 0,
                    axisLabelVisible: true,
                    title: 'Resistance',
                });
            }
            if (!staticSupportLineRef.current && typeof supportLevel === 'number' && !isNaN(supportLevel)) {
                staticSupportLineRef.current = series.createPriceLine({
                    price: supportLevel,
                    color: '#00AA00',
                    lineWidth: 2,
                    lineStyle: 0,
                    axisLabelVisible: true,
                    title: 'Support',
                });
            }
        };

        const hideStatic = () => {
            if (staticSupportLineRef.current) {
                try { series.removePriceLine(staticSupportLineRef.current); } catch {}
                staticSupportLineRef.current = null;
            }
            if (staticResistanceLineRef.current) {
                try { series.removePriceLine(staticResistanceLineRef.current); } catch {}
                staticResistanceLineRef.current = null;
            }
        };

        const times = candles.map(c => parseTimestampToUnix(c.timestamp));
        const lastTime = times[times.length - 1];
        const candleDur = times[1] - times[0];
        const epsilon = Math.max(1, Math.floor(candleDur / 2));

        const handleRange = (range: { from: number; to: number } | null) => {
            if (!range) return;

            const isViewingLatest = (range.to >= lastTime - epsilon);

            if (isViewingLatest) {
                // Show backend/static SR at latest; hide dynamic
                ensureStaticVisible();
                return;
            }

            // Compute dynamic SR for the right edge (latest in view)
            const { support: dynS, resistance: dynR } = computeDynamicSR(range.to, range.from, range.to);

            // Replace dynamic lines
            clearDynamic();
            // Hide static while in historical view
            hideStatic();

            if (typeof dynR === 'number' && !isNaN(dynR)) {
                dynamicResistanceLineRef.current = series.createPriceLine({
                    price: dynR,
                    color: '#FF0000',
                    lineWidth: 2,
                    lineStyle: 0, // Solid line to match static styling
                    axisLabelVisible: true,
                    title: 'Historical Resistance',
                });
            }
            if (typeof dynS === 'number' && !isNaN(dynS)) {
                dynamicSupportLineRef.current = series.createPriceLine({
                    price: dynS,
                    color: '#00AA00',
                    lineWidth: 2,
                    lineStyle: 0, // Solid line to match static styling
                    axisLabelVisible: true,
                    title: 'Historical Support',
                });
            }
        };

        // Initial run for current range
        const currentRange = chart.timeScale().getVisibleRange?.();
        if (currentRange) handleRange(currentRange);

        // Subscribe to changes
        chart.timeScale().subscribeVisibleTimeRangeChange(handleRange);

        return () => {
            try { chart.timeScale().unsubscribeVisibleTimeRangeChange(handleRange); } catch {}
            clearDynamic();
        };
    }, [candles, propAnalysisList, supportLevel, resistanceLevel]);

    // Enhanced effect for handling automatic data loading when scrolling to edges
    useEffect(() => {
        if (!chartRef.current || !onLoadMoreData || isLoadingMoreData) return;

        const chart = chartRef.current;
        let isLoadingOlder = false;
        let isLoadingNewer = false;
        
        const handleVisibleTimeRangeChange = async (newRange: { from: number; to: number } | null) => {
            if (!newRange || !candles.length) return;
            
            const dataRange = {
                from: parseTimestampToUnix(candles[0].timestamp),
                to: parseTimestampToUnix(candles[candles.length - 1].timestamp)
            };
            
            // Calculate thresholds for loading more data (when user is within 10% of edges)
            const dataSpan = dataRange.to - dataRange.from;
            const threshold = dataSpan * 0.1; // 10% threshold
            
            // Check if user scrolled close to the left edge (older data)
            if (hasMoreOlderData && !isLoadingOlder && (newRange.from <= dataRange.from + threshold)) {
                isLoadingOlder = true;
               //console.log('📥 Loading older data due to scroll position');
                
                try {
                    await onLoadMoreData('older');
                    // Add a small delay to prevent rapid loading
                    setTimeout(() => { isLoadingOlder = false; }, 1000);
                } catch (error) {
                    console.error('Failed to load older data:', error);
                    isLoadingOlder = false;
                }
            }
            
            // Check if user scrolled close to the right edge (newer data)
            if (hasMoreNewerData && !isLoadingNewer && (newRange.to >= dataRange.to - threshold)) {
                isLoadingNewer = true;
               //console.log('📥 Loading newer data due to scroll position');
                
                try {
                    await onLoadMoreData('newer');
                    // Add a small delay to prevent rapid loading
                    setTimeout(() => { isLoadingNewer = false; }, 1000);
                } catch (error) {
                    console.error('Failed to load newer data:', error);
                    isLoadingNewer = false;
                }
            }
        };

        // Subscribe to visible time range changes
        chart.timeScale().subscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange);

        return () => {
            try {
                chart.timeScale().unsubscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange);
            } catch (error) {
                // Chart might have been destroyed
                console.warn('Failed to unsubscribe from visible time range changes:', error);
            }
        };
    }, [onLoadMoreData, hasMoreOlderData, hasMoreNewerData, isLoadingMoreData]); // Removed candles from dependencies

    // Loading indicator overlay
    const LoadingOverlay = () => {
        if (!isLoadingMoreData) return null;
        
        return (
            <div 
                style={{
                    position: 'absolute',
                    top: 10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    zIndex: 1000,
                    pointerEvents: 'none'
                }}
            >
                Loading more data...
            </div>
        );
    };

    return (
        <div style={chartAreaStyle}>
            <LoadingOverlay />
            <Toaster position="top-right" />
            {/* Error messages for indicators */}
            {(emaError || rsiError || vixError) && (
                <div style={{ position: 'absolute', top: 5, right: 16, zIndex: 202, background: '#ffeaea', color: '#c62828', padding: '8px 20px', borderRadius: 10, fontWeight: 600, fontSize: 15, border: '2px solid #c62828', minWidth: 400, width: 420 }}>
                    {emaError && <div>{emaError}</div>}
                    {rsiError && <div>{rsiError}</div>}
                    {vixError && <div>{vixError}</div>}
                </div>
            )}
            {/* Stats section */}
            <div style={{ position: 'absolute', top: -80, left: 16, zIndex: 203, background: 'rgba(255,255,255,0.96)', padding: '8px 20px', borderRadius: 10, fontWeight: 600, fontSize: 15, color: '#333', boxShadow: '0 2px 12px rgba(0,0,0,0.10)', border: '2px solid #bdbdbd', minWidth: 400, width: 420, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#333' }}>Stats</span>
                {(() => {
                    const gapInfo = getPrevCloseToTodayOpenGap(ohlcInfo ? { ...ohlcInfo, timestamp: (candles.find(c => c.close === ohlcInfo.close && c.open === ohlcInfo.open && c.high === ohlcInfo.high && c.low === ohlcInfo.low && c.volume === ohlcInfo.volume)?.timestamp) || candles[candles.length - 1].timestamp } : candles[candles.length - 1]);
                    if (!gapInfo) return <span style={{ fontSize: 13, color: '#888' }}>No gap data</span>;
                    const sign = gapInfo.gap > 0 ? '+' : '';
                    return (
                        <span style={{ fontSize: 15, color: gapInfo.gap > 0 ? '#1e7e34' : '#c62828' }}>
                            Gap Up / Down: <b>{sign}{gapInfo.gap.toFixed(2)}</b>
                        </span>
                    );
                })()}
            </div>
            {/* Floating OHLC info at top left (inside chart area) */}
            {ohlcInfo && (
                <div style={{
                    position: 'absolute',
                    top: 5,
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
                    <span>V <b>{(() => {
                        if (!ohlcInfo.volume) return 'N/A';
                        return `${(ohlcInfo.volume / 1000).toFixed(1)}K`;
                    })()}</b></span>
                    {showRSI && ohlcInfo.rsi !== undefined && ohlcInfo.rsi !== null && !isNaN(ohlcInfo.rsi) && (
                        <span>RSI <b>{ohlcInfo.rsi.toFixed(2)}</b></span>
                    )}
                    <span>
                        {(() => {
                            const change = ohlcInfo.close - ohlcInfo.prevClose;
                            const percent = ohlcInfo.prevClose ? (change / ohlcInfo.prevClose) * 100 : 0;
                            const sign = change > 0 ? '+' : '';
                            return `${sign}${change.toFixed(2)} (${sign}${percent.toFixed(2)}%)`;
                        })()}
                    </span>
                    {(typeof vixValue === 'number' && !isNaN(vixValue)) ? (
                        <span style={{ color: '#FFD600', fontWeight: 700 }}>VIX <b>{vixValue.toFixed(2)}</b></span>
                    ) : null}
                     {/* Average Volume Information */}
            {avgVolume > 0 && (
                <div style={{
                    position: 'absolute',
                    top: 55, // Position it closer to the OHLC info
                    left: -3,
                    zIndex: 200,
                    background: 'rgba(255,255,255,0.92)',
                    padding: '8px 20px',
                    borderRadius: 10,
                    fontWeight: 600,
                    fontSize: 15,
                    color: '#333',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                    border: '2px solid #bdbdbd',
                    minWidth: 250,
                }}>
                    <span>
                        Avg Volume: <b>{avgVolume >= 1000000 
                            ? `${(avgVolume / 1000000).toFixed(2)}M` 
                            : `${(avgVolume / 1000).toFixed(1)}K`}
                        </b>
                    </span>
                    {ohlcInfo?.volume && (
                        <div style={{ marginTop: 4, fontSize: 14 }}>
                            {ohlcInfo.volume > avgVolume 
                                ? <span style={{ color: '#1e7e34' }}>Volume is <b>{(ohlcInfo.volume / avgVolume).toFixed(1)}x</b> average</span>
                                : <span style={{ color: '#c62828' }}>Volume is <b>{(ohlcInfo.volume / avgVolume).toFixed(1)}x</b> average</span>
                            }
                        </div>
                    )}
                </div>
            )}
                </div>
            )}
            
           
            
            <div ref={UnderstchartContainerRef} style={{ 
                width: '100%', 
                height: 'calc(100% - 40px)', // Reduce height to leave space for x-axis
                paddingBottom: '10px' // Additional padding for x-axis visibility
            }} />
            
            {/* Navigation hints */}
            <div style={{
                position: 'absolute',
                bottom: 5,
                right: 16,
                zIndex: 200,
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '11px',
                pointerEvents: 'none'
            }}>
                <div>🖱️ Scroll: Pan • Wheel: Zoom • Home/End: Navigate edges • Ctrl+F: Fit • Ctrl+R: Reset</div>
                {hasMoreOlderData && <div>📈 Scroll left for more historical data</div>}
                {hasMoreNewerData && <div>📈 Scroll right for newer data</div>}
            </div>
        </div>
    );
}