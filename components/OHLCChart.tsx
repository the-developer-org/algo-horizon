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

function calculateEMA(data: number[], period: number): number[] {
    const k = 2 / (period + 1);
    let ema: number[] = [];
    let prevEma = data[0];
    ema.push(prevEma);
    for (let i = 1; i < data.length; i++) {
        prevEma = data[i] * k + prevEma * (1 - k);
        ema.push(prevEma);
    }
    return ema;
}

function calculateRSI(closes: number[], period: number): number[] {
    let rsi: number[] = [];
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff; else losses -= diff;
    }
    gains /= period;
    losses /= period;
    let rs = losses === 0 ? 100 : gains / losses;
    rsi[period] = 100 - 100 / (1 + rs);
    for (let i = period + 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) {
            gains = (gains * (period - 1) + diff) / period;
            losses = (losses * (period - 1)) / period;
        } else {
            gains = (gains * (period - 1)) / period;
            losses = (losses * (period - 1) - diff) / period;
        }
        rs = losses === 0 ? 100 : gains / losses;
        rsi[i] = 100 - 100 / (1 + rs);
    }
    // Fill initial values with NaN
    for (let i = 0; i < period; i++) rsi[i] = NaN;
    return rsi;
}

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
    const [showEMA, setShowEMA] = useState(true);
    const [showRSI, setShowRSI] = useState(true);
    const [showVIX, setShowVIX] = useState(true);
    const emaSeriesRef = useRef<any>(null);
    const rsiSeriesRef = useRef<any>(null);
    const vixSeriesRef = useRef<any>(null);

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

        // Overlay EMA (from candle.ema) if enabled
        if (showEMA) {
            emaSeriesRef.current = chart.addLineSeries({
                color: '#1976D2',
                lineWidth: 2,
                priceScaleId: '', // overlay on main price scale
            });
            // @ts-ignore
            emaSeriesRef.current.setData(candles.map(c => ({
                time: Math.floor(new Date(c.timestamp).getTime() / 1000),
                // @ts-ignore
                value: c.ema,
            })));
        } else if (emaSeriesRef.current) {
            chart.removeSeries(emaSeriesRef.current);
            emaSeriesRef.current = null;
        }

        // RSI (from candle.rsi) as subchart if enabled
        if (showRSI) {
            const rsiPaneId = 'rsi';
            // @ts-ignore
            rsiSeriesRef.current = chart.addLineSeries({
                color: '#9C27B0',
                lineWidth: 2,
                priceScaleId: rsiPaneId,
                // @ts-ignore
                pane: 1, // put in a new pane below
            });
            // @ts-ignore
            rsiSeriesRef.current.setData(candles.map((c) => ({
                time: Math.floor(new Date(c.timestamp).getTime() / 1000),
                // @ts-ignore
                value: c.rsi,
            })));
            // @ts-ignore
            chart.priceScale(rsiPaneId).applyOptions({
                // @ts-ignore
                position: 'right',
                scaleMargins: { top: 0.1, bottom: 0.1 },
                borderColor: '#9C27B0',
                borderVisible: true,
                visible: true,
                autoScale: true,
            });
        } else if (rsiSeriesRef.current) {
            chart.removeSeries(rsiSeriesRef.current);
            rsiSeriesRef.current = null;
        }

        // VIX overlay if enabled
        let formattedVix: { time: number; value: number }[] = [];
        if (showVIX && vixData && vixData.length > 0) {
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
            vixSeriesRef.current = chart.addLineSeries({
                color: '#FFD600', // bright yellow
                lineWidth: 2,
                priceScaleId: 'vix', // separate scale for VIX
            });
            // @ts-ignore
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
        } else if (vixSeriesRef.current) {
            chart.removeSeries(vixSeriesRef.current);
            vixSeriesRef.current = null;
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
                rsi: last.rsi,
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
                        rsi: hovered.rsi,
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
            // Remove indicator series on cleanup
            if (emaSeriesRef.current) { chart.removeSeries(emaSeriesRef.current); emaSeriesRef.current = null; }
            if (rsiSeriesRef.current) { chart.removeSeries(rsiSeriesRef.current); rsiSeriesRef.current = null; }
            if (vixSeriesRef.current) { chart.removeSeries(vixSeriesRef.current); vixSeriesRef.current = null; }
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [candles, height, width, showVolume, vixData, showEMA, showRSI, showVIX]);

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

    return (
        <div style={chartAreaStyle}>
            {/* Indicator toggles (top right) */}
            <div style={{ position: 'absolute', top: 12, right: 16, zIndex: 201, background: 'rgba(255,255,255,0.92)', padding: '8px 20px', borderRadius: 10, fontWeight: 700, fontSize: 15, boxShadow: '0 2px 12px rgba(0,0,0,0.12)', border: '2px solid #bdbdbd', display: 'flex', gap: 12, minWidth: 320, width: 340 }}>
                <label><input type="checkbox" checked={showEMA} onChange={e => setShowEMA(e.target.checked)} /> EMA (200)</label>
                <label><input type="checkbox" checked={showRSI} onChange={e => setShowRSI(e.target.checked)} /> RSI (14)</label>
                <label><input type="checkbox" checked={showVIX} onChange={e => setShowVIX(e.target.checked)} /> VIX</label>
            </div>
            {/* Stats section (separate, beneath toggles) */}
            <div style={{ position: 'absolute', top: 64, right: 16, zIndex: 201, background: 'rgba(255,255,255,0.96)', padding: '8px 20px', borderRadius: 10, fontWeight: 600, fontSize: 15, color: '#333', boxShadow: '0 2px 12px rgba(0,0,0,0.10)', border: '2px solid #bdbdbd', minWidth: 320, width: 340, display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                <>
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
                        {showRSI && ohlcInfo.rsi !== undefined && !isNaN(ohlcInfo.rsi) && (
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
                        {vixValue !== null && (
                            <span style={{ color: '#FFD600', fontWeight: 700 }}>VIX <b>{vixValue.toFixed(2)}</b></span>
                        )}
                    </div>
                </>
            )}
            <div ref={chartContainerRef} style={{ width: '100vw', height: '80vh' }} />
        </div>
    );
}; 