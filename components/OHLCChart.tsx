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
    showTrendLines?: boolean;
    analysisList?: { timestamp: string; swingLabel?: string; }[]; // Added analysisList prop
    supportLevel?: number; // Support level from backend
    resistanceLevel?: number; // Resistance level from backend
    avgVolume?: number; // Average volume for the stock
}

const maxWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
const maxHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
const chartHeight = maxHeight * 0.91; // Increase chart height to 91% of the viewport height

// Support and resistance levels are now provided by backend

// Function to draw trend lines connecting swing points
const drawTrendLines = (sortedAnalysis: { timestamp: string; swingLabel?: string; }[], candles: Candle[], chart: any) => {
    // Group swing points by trend type with accurate price points
    const swingPoints = sortedAnalysis.map(analysis => {
        const time = Math.floor(new Date(analysis.timestamp).getTime() / 1000);
        const candle = candles.find(c => Math.floor(new Date(c.timestamp).getTime() / 1000) === time);
        
        if (!candle || !analysis.swingLabel) return null;
        
        const label = analysis.swingLabel;
        let price: number;
        
        // Ensure we use the exact high/low price point for the swing point type
        switch (label) {
            case 'HH': // Higher High - use exact high price
                price = candle.high;
                break;
            case 'LH': // Lower High - use exact high price
                price = candle.high;
                break;
            case 'HL': // Higher Low - use exact low price
                price = candle.low;
                break;
            case 'LL': // Lower Low - use exact low price
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
            candle
        };
    }).filter(Boolean);
    
    // Separate swing points by type for more accurate trend line drawing
    // We already filtered out nulls with .filter(Boolean) so these are safe to access
    const hhPoints = swingPoints.filter((p: any) => p && p.label === 'HH');
    const lhPoints = swingPoints.filter((p: any) => p && p.label === 'LH');
    const hlPoints = swingPoints.filter((p: any) => p && p.label === 'HL');
    const llPoints = swingPoints.filter((p: any) => p && p.label === 'LL');
    
    // Store all trend lines for cleanup if needed later
    const trendLines: any[] = [];
    
    // Draw uptrend lines (connecting HL points)
    if (hlPoints.length >= 2) {
        // Sort by time to ensure proper sequence
        const sortedHLs = [...hlPoints].sort((a: any, b: any) => a.time - b.time);
        
        // Create an uptrend line series
        const uptrendSeries = chart.addLineSeries({
            color: '#4CAF50', // Green for uptrend
            lineWidth: 2,
            lineStyle: 1, // Solid line
            priceScaleId: '', // Use main price scale
            title: 'Uptrend Line',
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        // Prepare data points for the line
        const uptrendData = sortedHLs.map((point: any) => ({
            time: point.time,
            value: point.price
        }));
        
        // Set the uptrend data
        uptrendSeries.setData(uptrendData);
        trendLines.push(uptrendSeries);
    }
    
    // Draw downtrend lines (connecting LH points)
    if (lhPoints.length >= 2) {
        // Sort by time to ensure proper sequence
        const sortedLHs = [...lhPoints].sort((a: any, b: any) => a.time - b.time);
        
        // Create a downtrend line series
        const downtrendSeries = chart.addLineSeries({
            color: '#F44336', // Red for downtrend
            lineWidth: 2,
            lineStyle: 1, // Solid line
            priceScaleId: '', // Use main price scale
            title: 'Downtrend Line',
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        // Prepare data points for the line
        const downtrendData = sortedLHs.map((point: any) => ({
            time: point.time,
            value: point.price
        }));
        
        // Set the downtrend data
        downtrendSeries.setData(downtrendData);
        trendLines.push(downtrendSeries);
    }
    
    // Also generate combined trend lines using the original algorithm for more complex patterns
    const trends = detectTrendSequences(swingPoints);
    
    trends.forEach((trend) => {
        // Only process trends with enough points
        if (trend.points.length < 2) return;
        
        // Filter points by swing label type based on trend direction
        let relevantPoints;
        
        if (trend.type === 'uptrend') {
            // For uptrend, we primarily connect Higher Lows (HL)
            relevantPoints = trend.points.filter(p => p.label === 'HL');
            
            // If we don't have enough HL points, fall back to all points
            if (relevantPoints.length < 2) {
                relevantPoints = trend.points;
            }
        } else { // downtrend
            // For downtrend, we primarily connect Lower Highs (LH)
            relevantPoints = trend.points.filter(p => p.label === 'LH');
            
            // If we don't have enough LH points, fall back to all points
            if (relevantPoints.length < 2) {
                relevantPoints = trend.points;
            }
        }
        
        // Skip if we still don't have enough points
        if (relevantPoints.length < 2) return;
        
        // Sort points by time
        relevantPoints.sort((a, b) => a.time - b.time);
        
        // Create the series with appropriate styling
        const trendLineSeries = chart.addLineSeries({
            color: trend.type === 'uptrend' ? '#4CAF50' : '#F44336',
            lineWidth: 2,
            lineStyle: 1, // Solid line
            priceScaleId: '', // Use main price scale
            title: `${trend.type === 'uptrend' ? 'Uptrend' : 'Downtrend'} Line`,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        // Convert points to line data format
        const lineData = relevantPoints.map((point: any) => ({
            time: point.time,
            value: point.price
        }));
        
        // Set data for the line
        trendLineSeries.setData(lineData);
        trendLines.push(trendLineSeries);
    });
    
    return trendLines;
};

// Calculate trend strength based on consistency of price movements, number of points, and duration
const calculateTrendStrength = (trend: { type: 'uptrend' | 'downtrend', points: any[] }): number => {
    if (trend.points.length < 2) return 0;
    
    // More points means more confirmed trend
    const pointsScore = Math.min(trend.points.length / 6, 1); // Max score at 6+ points
    
    // Calculate consistency (are the swings getting stronger or weaker?)
    let consistencyScore = 0;
    if (trend.points.length >= 3) {
        let consistentCount = 0;
        for (let i = 2; i < trend.points.length; i++) {
            const prevDiff = Math.abs(trend.points[i-1].price - trend.points[i-2].price);
            const currDiff = Math.abs(trend.points[i].price - trend.points[i-1].price);
            
            // For uptrend: HH should be higher than previous HH, HL higher than previous HL
            // For downtrend: LH should be lower than previous LH, LL lower than previous LL
            if ((trend.type === 'uptrend' && 
                ((trend.points[i].label === 'HH' && trend.points[i].price > trend.points[i-2].price) ||
                 (trend.points[i].label === 'HL' && trend.points[i].price > trend.points[i-2].price))) ||
                (trend.type === 'downtrend' && 
                ((trend.points[i].label === 'LH' && trend.points[i].price < trend.points[i-2].price) ||
                 (trend.points[i].label === 'LL' && trend.points[i].price < trend.points[i-2].price)))) {
                consistentCount++;
            }
        }
        consistencyScore = consistentCount / (trend.points.length - 2);
    } else {
        consistencyScore = 0.5; // Default for 2 points
    }
    
    // Calculate duration score
    const duration = trend.points[trend.points.length - 1].time - trend.points[0].time;
    // Normalize duration - longer trends are more significant up to a point
    const durationScore = Math.min(duration / (86400 * 7), 1); // Cap at 1 week
    
    // Weighted average of scores
    return pointsScore * 0.4 + consistencyScore * 0.4 + durationScore * 0.2;
};

// Project trend line into the future
const projectTrendLine = (trend: { type: 'uptrend' | 'downtrend', points: any[] }, lastTime: number, candles: Candle[], chart: any) => {
    // Need at least 2 points to project a line
    if (trend.points.length < 2) return null;
    
    const lastPoint = trend.points[trend.points.length - 1];
    const secondLastPoint = trend.points[trend.points.length - 2];
    
    // Calculate slope based on the last two points
    const timeDiff = lastPoint.time - secondLastPoint.time;
    const priceDiff = lastPoint.price - secondLastPoint.price;
    const slope = priceDiff / timeDiff;
    
    // Project forward for a reasonable amount of time (e.g., 25% of the current trend length or 10 candles)
    const trendDuration = lastPoint.time - trend.points[0].time;
    // Estimate average candle duration from sample candles
    const sampleTime1 = Math.floor(new Date(candles[1].timestamp).getTime() / 1000);
    const sampleTime0 = Math.floor(new Date(candles[0].timestamp).getTime() / 1000);
    const avgCandleDuration = sampleTime1 - sampleTime0;
    
    const projectionLength = Math.max(trendDuration * 0.25, avgCandleDuration * 10);
    
    const projectionEndTime = lastPoint.time + projectionLength;
    const projectionEndPrice = lastPoint.price + slope * projectionLength;
    
    // Create a series for the projection
    const projectionSeries = chart.addLineSeries({
        color: trend.type === 'uptrend' ? 'rgba(0, 200, 83, 0.6)' : 'rgba(213, 0, 0, 0.6)',
        lineWidth: 1,
        lineStyle: 2, // Dotted line for projection
        priceScaleId: '', // Use main price scale
        title: `${trend.type === 'uptrend' ? 'Uptrend' : 'Downtrend'} Projection`,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
    });
    
    // Set projection data
    projectionSeries.setData([
        { time: lastPoint.time, value: lastPoint.price },
        { time: projectionEndTime, value: projectionEndPrice }
    ]);
    
    return projectionSeries;
}

// Function to detect trend sequences from swing points
const detectTrendSequences = (swingPoints: any[]) => {
    const trends: { type: 'uptrend' | 'downtrend', points: any[], startTime?: number, endTime?: number }[] = [];
    let currentTrend: { type: 'uptrend' | 'downtrend', points: any[], startTime?: number, endTime?: number } | null = null;
    
    // First, sort swing points chronologically to ensure correct sequence
    const sortedSwingPoints = [...swingPoints].sort((a, b) => a.time - b.time);
    
    // Group swing points by pattern sequences
    for (let i = 0; i < sortedSwingPoints.length; i++) {
        const point = sortedSwingPoints[i];
        
        // Determine point type
        const isHH = point.label === 'HH';
        const isHL = point.label === 'HL';
        const isLH = point.label === 'LH';
        const isLL = point.label === 'LL';
        
        // Enhanced trend detection logic:
        // An uptrend consists of both HL and HH points (HL->HH->HL->HH...)
        // A downtrend consists of both LL and LH points (LH->LL->LH->LL...)
        
        if (isHH || isHL) {
            if (!currentTrend || currentTrend.type !== 'uptrend') {
                // Save previous trend if it exists and has enough points
                if (currentTrend && currentTrend.points.length >= 2) {
                    currentTrend.endTime = currentTrend.points[currentTrend.points.length - 1].time;
                    trends.push(currentTrend);
                }
                
                // Start a new uptrend
                currentTrend = { 
                    type: 'uptrend', 
                    points: [point],
                    startTime: point.time 
                };
            } else {
                // Continue the current uptrend - check for proper alternation (HL-HH-HL-HH...)
                const lastPoint = currentTrend.points[currentTrend.points.length - 1];
                
                // Only add this point if it maintains the pattern
                if ((isHH && lastPoint.label === 'HL') || 
                    (isHL && lastPoint.label === 'HH') ||
                    // Allow for double HH or double HL in certain cases
                    (isHH && lastPoint.label === 'HH' && point.price > lastPoint.price) || 
                    (isHL && lastPoint.label === 'HL' && point.price > lastPoint.price)) {
                    
                    currentTrend.points.push(point);
                }
            }
        } else if (isLH || isLL) {
            if (!currentTrend || currentTrend.type !== 'downtrend') {
                // Save previous trend if it exists
                if (currentTrend && currentTrend.points.length >= 2) {
                    currentTrend.endTime = currentTrend.points[currentTrend.points.length - 1].time;
                    trends.push(currentTrend);
                }
                
                // Start a new downtrend
                currentTrend = { 
                    type: 'downtrend', 
                    points: [point],
                    startTime: point.time 
                };
            } else {
                // Continue the current downtrend - check for proper alternation (LH-LL-LH-LL...)
                const lastPoint = currentTrend.points[currentTrend.points.length - 1];
                
                // Only add this point if it maintains the pattern
                if ((isLH && lastPoint.label === 'LL') || 
                    (isLL && lastPoint.label === 'LH') ||
                    // Allow for double LH or double LL in certain cases
                    (isLH && lastPoint.label === 'LH' && point.price < lastPoint.price) || 
                    (isLL && lastPoint.label === 'LL' && point.price < lastPoint.price)) {
                    
                    currentTrend.points.push(point);
                }
            }
        }
    }
    
    // Add the last trend
    if (currentTrend && currentTrend.points.length >= 2) {
        currentTrend.endTime = currentTrend.points[currentTrend.points.length - 1].time;
        trends.push(currentTrend);
    }
    
    // Filter out invalid trends (trend points should form a reasonable line)
    const validTrends = trends.filter(trend => {
        if (trend.points.length < 3) return true; // Short trends are kept as is
        
        // For longer trends, calculate linear regression error to ensure points form a reasonable line
        const points = trend.points;
        const times = points.map(p => p.time);
        const prices = points.map(p => p.price);
        
        // Calculate r-squared (simplified approach)
        const n = points.length;
        const sumX = times.reduce((a, b) => a + b, 0);
        const sumY = prices.reduce((a, b) => a + b, 0);
        const sumXY = times.reduce((acc, time, i) => acc + time * prices[i], 0);
        const sumXX = times.reduce((acc, time) => acc + time * time, 0);
        const sumYY = prices.reduce((acc, price) => acc + price * price, 0);
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
        
        const r = denominator === 0 ? 0 : numerator / denominator;
        const rSquared = r * r;
        
        // Require reasonably strong linear trend (r-squared > 0.7)
        return rSquared > 0.7;
    });
    
    return validTrends;
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
    showTrendLines = true, // Add default for trend lines
    analysisList, // Destructure analysisList
    supportLevel, // Use backend-provided support level
    resistanceLevel, // Use backend-provided resistance level
    avgVolume = 0 // Average volume with default value of 0
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
        if (trendLinesRef.current && trendLinesRef.current.length) {
            trendLinesRef.current.forEach(line => {
                if (line) chart.removeSeries(line);
            });
            trendLinesRef.current = [];
        }
        
        // If swing points are disabled, don't proceed
        if (!showSwingPoints) return;
        
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

        if (Array.isArray(propAnalysisList) && propAnalysisList.length > 0) {
            try {
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
                            lineWidth: 1.5,
                            lineStyle: 2, // Dashed line for clearer visibility
                            axisLabelVisible: true,
                            title: `${label} (${price.toFixed(2)})`,
                        });
                    }
                });

                // Set markers on the candlestick series
                candlestickSeries.setMarkers(markers);

                // Now draw trend lines if enabled
                if (showTrendLines && sortedAnalysis.length >= 2) {
                    const trendLines = drawTrendLines(sortedAnalysis, candles, chart);
                    if (trendLines && trendLines.length) {
                        trendLinesRef.current = trendLines;
                    }
                }
            } catch (err) {
                console.error('Swing points error:', err);
                toast.error('Error displaying swing points', { duration: 4000 });
            }
        } else if (showSwingPoints) {
            toast.error('No swing point data available in analysisList.', { duration: 4000 });
        }
        
        // Return cleanup function
        return () => {
            // Clean up trend lines when component unmounts or dependencies change
            if (trendLinesRef.current && trendLinesRef.current.length && chart) {
                trendLinesRef.current.forEach(line => {
                    if (line) chart.removeSeries(line);
                });
                trendLinesRef.current = [];
            }
        };
    }, [showSwingPoints, showTrendLines, propAnalysisList, candles]);

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
        top: 50,
        left: 0,
        width: '100vw', // Revert to original width
        height: '90vh', // Revert to original height
        zIndex: 1,
        background: '#fff',
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

    useEffect(() => {
        // Add support and resistance lines from props
        if (candles.length > 0 && chartRef.current?.candlestickSeries) {
            // Add resistance level
            if (resistanceLevel !== undefined) {
                chartRef.current.candlestickSeries.createPriceLine({
                    price: resistanceLevel,
                    color: '#FF0000',
                    lineWidth: 2,
                    lineStyle: 0, // Solid line
                    axisLabelVisible: true,
                    title: `Resistance`,
                });
            }
            
            // Add support level
            if (supportLevel !== undefined) {
                chartRef.current.candlestickSeries.createPriceLine({
                    price: supportLevel,
                    color: '#00FF00',
                    lineWidth: 2,
                    lineStyle: 0, // Solid line
                    axisLabelVisible: true,
                    title: `Support`,
                });
            }
            
            // Secondary levels are now managed by backend
            // If you need to add secondary levels in the future, they would go here
        }
    }, [candles, supportLevel, resistanceLevel]);

    return (
        <div style={chartAreaStyle}>
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
            
           
            
            <div ref={UnderstchartContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};