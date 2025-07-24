"use client";

import React, { useEffect, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { createChart } from 'lightweight-charts';
import { Candle } from './types/candle';

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
}

const maxWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
const maxHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
const chartHeight = maxHeight * 0.91; // Increase chart height to 91% of the viewport height

// Function to calculate support and resistance levels
const calculateSupportResistance = (candles: Candle[]) => {
    if (!candles || candles.length < 20) {
        return { support: null, resistance: null, levels: [] };
    }

    // Get recent data (last 50 candles for more responsive levels)
    const recentCandles = candles.slice(-50);
    const currentPrice = recentCandles[recentCandles.length - 1].close;
    
    // Find pivot points (local maxima and minima) with their index
    const pivotHighs: { price: number, strength: number, index: number, age: number }[] = [];
    const pivotLows: { price: number, strength: number, index: number, age: number }[] = [];
    
    // Look for pivot points with a window of 3 periods for more recent signals
    for (let i = 3; i < recentCandles.length - 3; i++) {
        const currentHigh = recentCandles[i].high;
        const currentLow = recentCandles[i].low;
        
        // Check if current high is a pivot high
        const isPivotHigh = [1, 2, 3].every(offset => 
            currentHigh >= recentCandles[i - offset].high && 
            currentHigh >= recentCandles[i + offset].high
        );
        
        if (isPivotHigh) {
            // Calculate strength based on how much higher than surrounding candles
            const surroundingHighs = [
                ...[-3, -2, -1, 1, 2, 3].map(offset => recentCandles[i + offset].high)
            ];
            const avgSurrounding = surroundingHighs.reduce((a, b) => a + b, 0) / surroundingHighs.length;
            const strength = ((currentHigh - avgSurrounding) / avgSurrounding) * 100;
            const age = recentCandles.length - 1 - i; // How many periods ago
            
            pivotHighs.push({ price: currentHigh, strength, index: i, age });
        }
        
        // Check if current low is a pivot low
        const isPivotLow = [1, 2, 3].every(offset => 
            currentLow <= recentCandles[i - offset].low && 
            currentLow <= recentCandles[i + offset].low
        );
        
        if (isPivotLow) {
            // Calculate strength based on how much lower than surrounding candles
            const surroundingLows = [
                ...[-3, -2, -1, 1, 2, 3].map(offset => recentCandles[i + offset].low)
            ];
            const avgSurrounding = surroundingLows.reduce((a, b) => a + b, 0) / surroundingLows.length;
            const strength = ((avgSurrounding - currentLow) / avgSurrounding) * 100;
            const age = recentCandles.length - 1 - i; // How many periods ago
            
            pivotLows.push({ price: currentLow, strength, index: i, age });
        }
    }
    
    // Filter out broken levels with a small tolerance for noise
    const priceThreshold = currentPrice * 0.001; // 0.1% threshold for noise
    
    const validResistanceLevels = pivotHighs.filter(pivot => {
        // Check if price has clearly broken above this resistance
        const candlesAfterPivot = recentCandles.slice(pivot.index + 1);
        const hasBeenBroken = candlesAfterPivot.some(candle => candle.close > (pivot.price + priceThreshold));
        return !hasBeenBroken && pivot.price > currentPrice;
    });
    
    const validSupportLevels = pivotLows.filter(pivot => {
        // Check if price has clearly broken below this support
        const candlesAfterPivot = recentCandles.slice(pivot.index + 1);
        const hasBeenBroken = candlesAfterPivot.some(candle => candle.close < (pivot.price - priceThreshold));
        return !hasBeenBroken && pivot.price < currentPrice;
    });
    
    // Score levels based on proximity, strength, and recency
    const scoreLevel = (level: { price: number, strength: number, age: number }) => {
        const distance = Math.abs(level.price - currentPrice);
        const proximityScore = 1 / (1 + distance / currentPrice); // Closer = higher score
        const strengthScore = level.strength / 100; // Normalize strength
        const recencyScore = 1 / (1 + level.age / 10); // More recent = higher score
        
        return proximityScore * 0.4 + strengthScore * 0.4 + recencyScore * 0.2;
    };
    
    // Sort by combined score
    const resistanceLevels = validResistanceLevels
        .map(level => ({ ...level, score: scoreLevel(level) }))
        .toSorted((a, b) => b.score - a.score)
        .slice(0, 3);
    
    const supportLevels = validSupportLevels
        .map(level => ({ ...level, score: scoreLevel(level) }))
        .toSorted((a, b) => b.score - a.score)
        .slice(0, 3);
    
    // Primary resistance and support (highest scoring unbroken levels)
    const resistance = resistanceLevels.length > 0 ? resistanceLevels[0].price : null;
    const support = supportLevels.length > 0 ? supportLevels[0].price : null;
    
    return { 
        resistance, 
        support, 
        levels: [
            ...resistanceLevels.map(r => ({ price: r.price, type: 'resistance', strength: r.strength, score: r.score })),
            ...supportLevels.map(s => ({ price: s.price, type: 'support', strength: s.strength, score: s.score }))
        ]
    };
};

// Function to draw trend lines connecting swing points
const drawTrendLines = (sortedAnalysis: { timestamp: string; swingLabel?: string; }[], candles: Candle[], chart: any) => {
    // Group swing points by trend type
    const swingPoints = sortedAnalysis.map(analysis => {
        const time = Math.floor(new Date(analysis.timestamp).getTime() / 1000);
        const candle = candles.find(c => Math.floor(new Date(c.timestamp).getTime() / 1000) === time);
        
        if (!candle || !analysis.swingLabel) return null;
        
        const label = analysis.swingLabel;
        let price: number;
        
        switch (label) {
            case 'HH':
            case 'LH':
                price = candle.high;
                break;
            case 'HL':
            case 'LL':
                price = candle.low;
                break;
            default:
                return null;
        }
        
        return {
            time,
            price,
            label,
            timestamp: analysis.timestamp,
            candle: candle
        };
    }).filter(Boolean);
    
    // Detect trend sequences
    const trends = detectTrendSequences(swingPoints);
    
    // Draw trend lines for each sequence using the main price scale
    trends.forEach((trend, index) => {
        if (trend.points.length >= 2) {
            const startPoint = trend.points[0];
            const endPoint = trend.points[trend.points.length - 1];
            
            // Create data array that includes intermediate points to ensure line continuity
            const trendLineData = [];
            
            // Add start point
            trendLineData.push({ 
                time: startPoint.time, 
                value: startPoint.price 
            });
            
            // Calculate slope for linear interpolation
            const timeDiff = endPoint.time - startPoint.time;
            const priceDiff = endPoint.price - startPoint.price;
            const slope = priceDiff / timeDiff;
            
            // Add intermediate points for smooth line rendering
            // Get all candles between start and end points
            const intermediateCandles = candles.filter(candle => {
                const candleTime = Math.floor(new Date(candle.timestamp).getTime() / 1000);
                return candleTime > startPoint.time && candleTime < endPoint.time;
            });
            
            // Add interpolated points for each intermediate candle
            intermediateCandles.forEach(candle => {
                const candleTime = Math.floor(new Date(candle.timestamp).getTime() / 1000);
                const interpolatedPrice = startPoint.price + slope * (candleTime - startPoint.time);
                trendLineData.push({
                    time: candleTime,
                    value: interpolatedPrice
                });
            });
            
            // Add end point
            trendLineData.push({ 
                time: endPoint.time, 
                value: endPoint.price 
            });
            
            // Sort by time to ensure proper ordering
            trendLineData.sort((a, b) => a.time - b.time);
            
            // Create a line series for this trend line that overlays on the main chart
            const trendLineSeries = chart.addLineSeries({
                color: trend.type === 'uptrend' ? '#00FF00' : '#FF0000', // Green for uptrend, red for downtrend
                lineWidth: 2,
                lineStyle: 1, // Dashed line
                priceScaleId: '', // Use main price scale to overlay with candlesticks
                title: `${trend.type === 'uptrend' ? 'Uptrend' : 'Downtrend'} Line ${index + 1}`,
                crosshairMarkerVisible: false,
                priceLineVisible: false, // Don't show price line
                lastValueVisible: false, // Don't show last value
            });
            
            // Set the trend line data with all interpolated points
            trendLineSeries.setData(trendLineData);
        }
    });
};

// Function to detect trend sequences from swing points
const detectTrendSequences = (swingPoints: any[]) => {
    const trends: { type: 'uptrend' | 'downtrend', points: any[] }[] = [];
    let currentTrend: { type: 'uptrend' | 'downtrend', points: any[] } | null = null;
    
    for (let i = 0; i < swingPoints.length; i++) {
        const point = swingPoints[i];
        
        // Determine if this point indicates uptrend or downtrend
        const isUptrendPoint = point.label === 'HH' || point.label === 'HL';
        const isDowntrendPoint = point.label === 'LH' || point.label === 'LL';
        
        if (isUptrendPoint) {
            // If we're not in an uptrend or switching from downtrend, start new uptrend
            if (!currentTrend || currentTrend.type !== 'uptrend') {
                // Save the previous trend if it exists and has enough points
                if (currentTrend && currentTrend.points.length >= 2) {
                    trends.push(currentTrend);
                }
                currentTrend = { type: 'uptrend', points: [point] };
            } else {
                // Continue the current uptrend
                currentTrend.points.push(point);
            }
        } else if (isDowntrendPoint) {
            // If we're not in a downtrend or switching from uptrend, start new downtrend
            if (!currentTrend || currentTrend.type !== 'downtrend') {
                // Save the previous trend if it exists and has enough points
                if (currentTrend && currentTrend.points.length >= 2) {
                    trends.push(currentTrend);
                }
                currentTrend = { type: 'downtrend', points: [point] };
            } else {
                // Continue the current downtrend
                currentTrend.points.push(point);
            }
        }
    }
    
    // Don't forget to add the last trend
    if (currentTrend && currentTrend.points.length >= 2) {
        trends.push(currentTrend);
    }
    
    return trends;
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
    analysisList,// Destructure analysisList
}) => {
    const UnderstchartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const [ohlcInfo, setOhlcInfo] = useState<any>(null);
    const [vixValue, setVixValue] = useState<number | null>(null);
    const [emaError, setEmaError] = useState<string | null>(null);
    const [rsiError, setRsiError] = useState<string | null>(null);
    const [vixError, setVixError] = useState<string | null>(null);
    const emaSeriesRef = useRef<any>(null);
    const rsiSeriesRef = useRef<any>(null);
    const vixSeriesRef = useRef<any>(null);
    const swingPointsSeriesRef = useRef<any>(null);
    const propAnalysisList = analysisList || []; // Use propAnalysisList if provided


    // Chart initialization effect - only runs when data changes, not indicator toggles
    useEffect(() => {
        if (!UnderstchartContainerRef.current || !candles.length) return;

        // Create chart with minimal configuration
        const chart = createChart(UnderstchartContainerRef.current, {
            width: maxWidth,
            height: 800 * 0.96, // Reduce height by 10%
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
            // @ts-ignore
            chart.priceScale('volume').applyOptions({
                scaleMargins: { top: 0.75, bottom: 0 },
                autoScale: true // Re-enable auto-scaling
            });
        }

        // Format data for the chart using candles
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
                const hovered = candles.find((c: Candle) => Math.floor(new Date(c.timestamp).getTime() / 1000) === param.time);
                if (hovered) {
                    // Find previous candle for change calculation
                    const idx = candles.findIndex((c: Candle) => Math.floor(new Date(c.timestamp).getTime() / 1000) === param.time);
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

        // Handle resize
        const handleResize = () => {
            if (UnderstchartContainerRef.current && chartRef.current) {
                const containerWidth = UnderstchartContainerRef.current.clientWidth;
                const containerHeight = UnderstchartContainerRef.current.clientHeight * 0.9; // Reduce height by 10%
                chartRef.current.applyOptions({
                    width: containerWidth,
                    height: containerHeight,
                });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [candles, height, width, showVolume, vixData]); // Removed indicator toggles from dependencies

    // Separate effect for EMA indicator management
    useEffect(() => {
        if (!chartRef.current) return;

        const chart = chartRef.current;
        setEmaError(null);

        const handleEMA = () => {
            if (showEMA) {
                try {
                    emaSeriesRef.current = chart.addLineSeries({
                        color: '#1976D2',
                        lineWidth: 2,
                        priceScaleId: '',
                    });
                    const emaData = candles
                        .map((c: Candle) => ({
                            time: Math.floor(new Date(c.timestamp).getTime() / 1000),
                            value: typeof c.ema === 'number' && !isNaN(c.ema) ? c.ema : null,
                        }))
                        .filter((item: any) => typeof item.value === 'number' && !isNaN(item.value));
                    if (!emaData.length) throw new Error('Insufficient EMA data');
                    emaSeriesRef.current.setData(emaData);
                } catch (err) {
                    console.error('EMA calculation error:', err);
                    setEmaError('Insufficient EMA data available');
                    if (emaSeriesRef.current) {
                        chart.removeSeries(emaSeriesRef.current);
                        emaSeriesRef.current = null;
                    }
                }
            } else if (emaSeriesRef.current) {
                chart.removeSeries(emaSeriesRef.current);
                emaSeriesRef.current = null;
            }
        };

        handleEMA();
    }, [showEMA]); // Removed candles dependency since EMA is pre-calculated

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
                    .map((c: Candle) => ({
                        time: Math.floor(new Date(c.timestamp).getTime() / 1000),
                        value: typeof c.rsi === 'number' && !isNaN(c.rsi) ? c.rsi : null,
                    }))
                    .filter((item: any) => typeof item.value === 'number' && !isNaN(item.value));
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
                        const t = Math.floor(new Date(v.timestamp).getTime() / 1000);
                        vixMap.set(t, v.value);
                    });
                    let lastVix = 0;
                    formattedVix = candles.map(candle => {
                        const t = Math.floor(new Date(candle.timestamp).getTime() / 1000);
                        if (vixMap.has(t)) {
                            lastVix = vixMap.get(t)!;
                        }
                        return { time: t, value: typeof lastVix === 'number' && !isNaN(lastVix) ? lastVix : undefined };
                    }).filter(item => typeof item.value === 'number' && !isNaN(item.value)) as { time: number; value: number }[];
                    if (!formattedVix.length) throw new Error('Insufficient VIX data');
                    vixSeriesRef.current = chart.addLineSeries({
                        color: '#FFD600', // bright yellow
                        lineWidth: 2,
                        priceScaleId: 'vix', // separate scale for VIX
                    });
                    vixSeriesRef.current.setData(formattedVix);
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

    // Define candlestickSeries and fix issues in swing points logic
    useEffect(() => {
        if (!chartRef.current || !showSwingPoints) return;

        const chart = chartRef.current;
        // Ensure the candlestick series is initialized
        const candlestickSeries = chartRef.current.series?.candlestickSeries || chart.addCandlestickSeries({
            upColor: '#1e7e34',
            downColor: '#c62828',
            borderVisible: false,
            wickUpColor: '#1e7e34',
            wickDownColor: '#c62828',
        });
        chartRef.current.series = { ...chartRef.current.series, candlestickSeries };

        if (Array.isArray(propAnalysisList) && propAnalysisList.length > 0) {
            try {
                console.log('Analysis List:', propAnalysisList);
                const markers: { time: number; position: string; color: string; shape: string; text: string; size: number }[] = [];
                
                // Sort analysis list by timestamp to ensure correct order
                const sortedAnalysis = propAnalysisList
                    .filter(item => item.swingLabel) // Only items with swing labels
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                // Process swing point markers
                sortedAnalysis.forEach((analysis) => {
                    const time = Math.floor(new Date(analysis.timestamp).getTime() / 1000);
                    const candle = candles.find(c => Math.floor(new Date(c.timestamp).getTime() / 1000) === time);

                    if (analysis.swingLabel && candle) {
                        const label = analysis.swingLabel;
                        let position: 'aboveBar' | 'belowBar';
                        let price: number;

                        switch (label) {
                            case 'HH':
                            case 'LH':
                                position = 'aboveBar';
                                price = candle.high;
                                break;
                            case 'HL':
                            case 'LL':
                                position = 'belowBar';
                                price = candle.low;
                                break;
                            default:
                                console.warn(`Unknown swing label: ${label}`);
                                return;
                        }

                        const color = getSwingPointColor(label);

                        // Add marker for the swing point
                        markers.push({
                            time: time,
                            position: position,
                            color: color,
                            shape: 'circle',
                            text: label,
                            size: 10,
                        });

                        // Add horizontal line for High/Low using candlestickSeries
                        candlestickSeries.createPriceLine({
                            price: price,
                            color: color,
                            lineWidth: 2,
                            lineStyle: 0,
                            axisLabelVisible: true,
                            title: `${label} (${price.toFixed(2)})`,
                        });
                    }
                });

                // Set markers on the candlestick series
                candlestickSeries.setMarkers(markers);

                // Now draw trend lines
                drawTrendLines(sortedAnalysis, candles, chart);

            } catch (err) {
                console.error('Swing points error:', err);
                toast.error('Error displaying swing points', { duration: 4000 });
            }
        } else {
            toast.error('No swing point data available in analysisList.', { duration: 4000 });
        }
    }, [showSwingPoints, propAnalysisList]);

    // Crosshair move handler effect - updates when chart changes
    useEffect(() => {
        if (!chartRef.current) return;

        const chart = chartRef.current;

        // Update the OHLC info and VIX on crosshair move
        const crosshairHandler = (param: any) => {
            if (param?.time) {
                // Find the candle for the hovered time
                const hovered = candles.find((c: Candle) => Math.floor(new Date(c.timestamp).getTime() / 1000) === param.time);
                if (hovered) {
                    // Find previous candle for change calculation
                    const idx = candles.findIndex((c: Candle) => Math.floor(new Date(c.timestamp).getTime() / 1000) === param.time);
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
                        const t = Math.floor(new Date(v.timestamp).getTime() / 1000);
                        vixMap.set(t, v.value);
                    });
                    let lastVix = 0;
                    const formattedVix = candles.map(candle => {
                        const t = Math.floor(new Date(candle.timestamp).getTime() / 1000);
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
    }, [candles, showVIX, vixData]); // Removed candlesWithIndicators dependency

    // Error toast effect
    useEffect(() => {
        if (emaError) toast.error(emaError, { duration: 4000 });
        if (rsiError) toast.error(rsiError, { duration: 4000 });
        if (vixError) toast.error(vixError, { duration: 4000 });
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
        top: 0,
        left: 0,
        width: '100vw', // Revert to original width
        height: '90vh', // Revert to original height
        zIndex: 1,
        background: '#fff',
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

    useEffect(() => {
        // Calculate and add dynamic support/resistance lines
        if (candles.length > 0 && chartRef.current?.candlestickSeries) {
            const levels = calculateSupportResistance(candles);
            
            // Add primary resistance level
            if (levels.resistance) {
                chartRef.current.candlestickSeries.createPriceLine({
                    price: levels.resistance,
                    color: '#FF0000',
                    lineWidth: 2,
                    lineStyle: 0, // Solid line
                    axisLabelVisible: true,
                    title: `Dynamic Resistance (${levels.resistance.toFixed(2)})`,
                });
            }
            
            // Add primary support level
            if (levels.support) {
                chartRef.current.candlestickSeries.createPriceLine({
                    price: levels.support,
                    color: '#00FF00',
                    lineWidth: 2,
                    lineStyle: 0, // Solid line
                    axisLabelVisible: true,
                    title: `Dynamic Support (${levels.support.toFixed(2)})`,
                });
            }
            
            // Add secondary levels with different styling
            levels.levels.slice(1).forEach((level, index) => {
                if (index < 2) { // Only show top 2 secondary levels
                    chartRef.current.candlestickSeries.createPriceLine({
                        price: level.price,
                        color: level.type === 'resistance' ? '#FF6B6B' : '#4ECDC4', // Lighter colors
                        lineWidth: 1,
                        lineStyle: 2, // Dashed line
                        axisLabelVisible: false,
                        title: `${level.type} ${level.price.toFixed(2)}`,
                    });
                }
            });
        }
    }, [candles]);

    return (
        <div style={chartAreaStyle}>
            <Toaster position="top-right" />
            {/* Error messages for indicators */}
            {(emaError || rsiError || vixError) && (
                <div style={{ position: 'absolute', top: 12, right: 16, zIndex: 202, background: '#ffeaea', color: '#c62828', padding: '8px 20px', borderRadius: 10, fontWeight: 600, fontSize: 15, border: '2px solid #c62828', minWidth: 400, width: 420 }}>
                    {emaError && <div>{emaError}</div>}
                    {rsiError && <div>{rsiError}</div>}
                    {vixError && <div>{vixError}</div>}
                </div>
            )}
            {/* Stats section */}
            <div style={{ position: 'absolute', top: -200, right: 16, zIndex: 203, background: 'rgba(255,255,255,0.96)', padding: '8px 20px', borderRadius: 10, fontWeight: 600, fontSize: 15, color: '#333', boxShadow: '0 2px 12px rgba(0,0,0,0.10)', border: '2px solid #bdbdbd', minWidth: 400, width: 420, display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                </div>
            )}
            <div ref={UnderstchartContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};