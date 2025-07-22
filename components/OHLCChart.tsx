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
}

const maxWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
const maxHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
console.log(maxWidth, maxHeight);

export const OHLCChart: React.FC<OHLCChartProps> = ({
    candles,
    vixData,
    title = "OHLC Chart",
    height = 400,
    width,
    showVolume = true,
    showEMA = true,
    showRSI = true,
    showVIX = true,
    showSwingPoints = true,
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

    // Chart initialization effect - only runs when data changes, not indicator toggles
    useEffect(() => {
        if (!UnderstchartContainerRef.current || !candles.length) return;

        // Create chart with minimal configuration
        const chart = createChart(UnderstchartContainerRef.current, {
            width: maxWidth,
            height: 800, // Fixed reasonable height instead of maxHeight
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
            if (UnderstchartContainerRef.current) {
                chart.applyOptions({
                    width: width || UnderstchartContainerRef.current.clientWidth,
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

    // Separate effect for Swing Points indicator management
    useEffect(() => {
        if (!chartRef.current) return;
        
        const chart = chartRef.current;
        
        if (showSwingPoints) {
            try {
                // Debug: Count swing points in data
                const swingPointCount = candles.reduce((count, candle) => {
                    return count + 
                        (candle.isHigherHigh ? 1 : 0) + 
                        (candle.isHigherLow ? 1 : 0) + 
                        (candle.isLowerHigh ? 1 : 0) + 
                        (candle.isLowerLow ? 1 : 0);
                }, 0);
                console.log(`Found ${swingPointCount} swing points in ${candles.length} candles`);

                // Check if there are no swing points
                if (swingPointCount === 0) {
                    toast.error('No swing point data available. Not enough data to plot higher\'s or lower\'s', { duration: 4000 });
                    return;
                }

                swingPointsSeriesRef.current = chart.addLineSeries({
                    color: 'transparent', // Line is transparent, we only want markers
                    lineWidth: 0,
                    priceScaleId: '', // overlay on main price scale
                    crosshairMarkerVisible: false,
                    lastValueVisible: false,
                    priceLineVisible: false,
                });

                // Create markers for swing points
                const markers: any[] = [];
                candles.forEach((candle, index) => {
                    const time = Math.floor(new Date(candle.timestamp).getTime() / 1000);
                    
                    // Higher Highs and Higher Lows (green dots)
                    if (candle.isHigherHigh) {
                        console.log(`Adding HH marker at ${candle.timestamp}`);
                        markers.push({
                            time: time,
                            position: 'aboveBar',
                            color: '#00AA00', // Darker green for better visibility
                            shape: 'circle',
                            text: 'HH',
                            size: 10, // Larger size
                        });
                    }
                    
                    if (candle.isHigherLow) {
                        console.log(`Adding HL marker at ${candle.timestamp}`);
                        markers.push({
                            time: time,
                            position: 'belowBar',
                            color: '#00AA00', // Darker green for better visibility
                            shape: 'circle',
                            text: 'HL',
                            size: 10, // Larger size
                        });
                    }
                    
                    // Lower Highs and Lower Lows (red dots)
                    if (candle.isLowerHigh) {
                        console.log(`Adding LH marker at ${candle.timestamp}`);
                        markers.push({
                            time: time,
                            position: 'aboveBar',
                            color: '#CC0000', // Darker red for better visibility
                            shape: 'circle',
                            text: 'LH',
                            size: 10, // Larger size
                        });
                    }
                    
                    if (candle.isLowerLow) {
                        console.log(`Adding LL marker at ${candle.timestamp}`);
                        markers.push({
                            time: time,
                            position: 'belowBar',
                            color: '#CC0000', // Darker red for better visibility
                            shape: 'circle',
                            text: 'LL',
                            size: 10, // Larger size
                        });
                    }
                });

                console.log(`Created ${markers.length} markers for swing points`);

                // Set markers on the series
                swingPointsSeriesRef.current.setMarkers(markers);
                
                // Set empty data for the line series (we only want markers)
                swingPointsSeriesRef.current.setData([]);
                
            } catch (err) {
                console.error('Swing points error:', err);
                toast.error('Error displaying swing points', { duration: 4000 });
                if (swingPointsSeriesRef.current) {
                    chart.removeSeries(swingPointsSeriesRef.current);
                    swingPointsSeriesRef.current = null;
                }
            }
        } else if (swingPointsSeriesRef.current) {
            chart.removeSeries(swingPointsSeriesRef.current);
            swingPointsSeriesRef.current = null;
        }
    }, [showSwingPoints]); // Only depend on toggle state

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
                    const gapInfo = getPrevCloseToTodayOpenGap(ohlcInfo ? { ...ohlcInfo, timestamp: (candles.find(c => c.close === ohlcInfo.close && c.open === ohlcInfo.open && c.high === ohlcInfo.high && c.low === ohlcInfo.low && c.volume === ohlcInfo.volume)?.timestamp) || candles[candles.length-1].timestamp } : candles[candles.length-1]);
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
            <div ref={UnderstchartContainerRef} style={{ width: '100vw', height: '100vh' }} />
        </div>
    );
};