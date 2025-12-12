"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { createChart } from 'lightweight-charts';
import { Candle } from './types/candle';
import { calculateSwingPointsFromCandles, parseTimestampToUnix } from '../utils/swingPointCalculator';
import { he } from 'date-fns/locale';

// Performance optimization constants
const MAX_VISIBLE_CANDLES = 2000; // Limit visible data points for ultra-fast performance
const PERFORMANCE_SAMPLE_THRESHOLD = 5000; // Start sampling when data exceeds this
const CHART_UPDATE_DEBOUNCE = 16; // ~60fps for smooth updates

// Interface for candle click analysis results
interface CandleAnalysis {
    clickedCandle: Candle;
    clickedIndex: number;
    trendReversalIndex: number;
    trendReversalCandle: Candle;
    maxProfitPrice: number;
    maxLossPrice: number;
    maxProfitPercent: number;
    maxLossPercent: number;
    finalProfitLoss: number;
    finalProfitLossPercent: number;
    candlesAnalyzed: number;
    trendDirection: 'bullish' | 'bearish' | 'sideways' | 'neutral' | 'consolidated';
    startDate: string;
    endDate: string;
    swingPointLabel: string;
}

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


// Function to analyze profit/loss from clicked candle using existing calculated swing points
const analyzeCandleClick = (candles: Candle[], clickedIndex: number, calculatedSwingPoints: any[]): CandleAnalysis | null => {
  if (clickedIndex < 0 || clickedIndex >= candles.length - 1) return null;
  
  const clickedCandle = candles[clickedIndex];
  const entryPrice = clickedCandle.close; // Use close price as entry point
  
  // Use the existing calculated swing points to find the next relevant swing point
  let endIndex = candles.length - 1;
  let swingPointLabel = 'end of data';
  
  if (calculatedSwingPoints && calculatedSwingPoints.length > 0) {
    // Find the most recent swing point before or at the clicked candle
    const previousSwingPoint = calculatedSwingPoints
      .filter(sp => sp.index <= clickedIndex)
      .sort((a, b) => b.index - a.index)[0]; // Get the most recent swing point
    
    if (previousSwingPoint) {
      const previousLabel = previousSwingPoint.label;
      
      // If clicked after LL or HL, look for next HH or LH
      if (previousLabel === 'LL' || previousLabel === 'HL') {
        const nextRelevantSwingPoint = calculatedSwingPoints.find(sp => 
          sp.index > clickedIndex && (sp.label === 'HH' || sp.label === 'LH')
        );
        
        if (nextRelevantSwingPoint) {
          endIndex = nextRelevantSwingPoint.index;
          swingPointLabel = nextRelevantSwingPoint.label;
        }
      }
      // If clicked after HH or LH, look for next LL or HL
      else if (previousLabel === 'HH' || previousLabel === 'LH') {
        const nextRelevantSwingPoint = calculatedSwingPoints.find(sp => 
          sp.index > clickedIndex && (sp.label === 'LL' || sp.label === 'HL')
        );
        
        if (nextRelevantSwingPoint) {
          endIndex = nextRelevantSwingPoint.index;
          swingPointLabel = nextRelevantSwingPoint.label;
        }
      }
    } else {
      // If no previous swing point, just use the next swing point after clicked candle
      const nextSwingPoint = calculatedSwingPoints.find(sp => sp.index > clickedIndex);
      if (nextSwingPoint) {
        endIndex = nextSwingPoint.index;
        swingPointLabel = nextSwingPoint.label;
      }
    }
  }
  
  const reversalCandle = candles[endIndex];
  const finalPrice = reversalCandle.close;
  
  // Calculate profit/loss using close prices
  const profitLoss = finalPrice - entryPrice;
  const profitLossPercent = ((profitLoss / entryPrice) * 100);
  
  let maxProfitPrice = entryPrice;
  let maxLossPrice = entryPrice;
  
  // Analyze each candle from entry through reversal (including reversal candle)
  for (let i = clickedIndex + 1; i <= endIndex; i++) {
    const currentCandle = candles[i];
    
    // Track maximum profit using close prices
    if (currentCandle.close > maxProfitPrice) {
      maxProfitPrice = currentCandle.close;
    }
    
    // Track maximum loss using close prices
    if (currentCandle.close < maxLossPrice) {
      maxLossPrice = currentCandle.close;
    }
  }
  
  // Calculate max profit and loss percentages
  const maxProfitPercent = ((maxProfitPrice - entryPrice) / entryPrice) * 100;
  const maxLossPercent = ((maxLossPrice - entryPrice) / entryPrice) * 100;
  
  // Determine trend direction based on last 4 swing points (with fallback to available data)
  const determineTrendFromSwingPoints = (calculatedSwingPoints: any[], clickedIndex: number): 'bullish' | 'bearish' | 'sideways' | 'neutral' | 'consolidated' => {
    if (!calculatedSwingPoints || calculatedSwingPoints.length === 0) return 'bullish'; // Default
    
    // Get swing points up to the clicked candle
    const relevantSwingPoints = calculatedSwingPoints
      .filter(sp => sp.index <= clickedIndex)
      .sort((a, b) => a.index - b.index); // Sort by index (chronological order)
    
    if (relevantSwingPoints.length === 0) return 'bullish'; // Default if no data
    
    // Get the last 4 swing points (or as many as available)
    const numPointsToAnalyze = Math.min(4, relevantSwingPoints.length);
    const lastSwingPoints = relevantSwingPoints.slice(-numPointsToAnalyze);

    return analyzeSwingPointTrend(lastSwingPoints)

    // Default fallback
    return 'bullish';
  };
  
  function analyzeSwingPointTrend(lastSwingPoints :any[]) {
  if (!lastSwingPoints || lastSwingPoints.length === 0) {
    return 'neutral';
  }

  // 4 Swing Points Analysis - Most Comprehensive
  if (lastSwingPoints.length === 4) {
    const [fourth, third, second, first] = lastSwingPoints.map(sp => sp.label);
    
    return analyzeFourPoints(fourth, third, second, first);
  }
  
  // 3 Swing Points Analysis
  else if (lastSwingPoints.length === 3) {
    const [third, second, first] = lastSwingPoints.map(sp => sp.label);
    return analyzeThreePoints(third, second, first);
  }
  
  // 2 Swing Points Analysis
  else if (lastSwingPoints.length === 2) {
    const [second, first] = lastSwingPoints.map(sp => sp.label);
    return analyzeTwoPoints(second, first);
  }
  
  // Single Swing Point Analysis
  else if (lastSwingPoints.length === 1) {
    const singlePoint = lastSwingPoints[0].label;
    return analyzeSinglePoint(singlePoint);
  }
  
  return 'neutral';
}

// Helper function for 4-point analysis
function analyzeFourPoints(fourth: string, third: string, second: string, first: string) {
  // Strong Bullish Patterns (4 points)
  // Pattern: Uptrend establishment and continuation
  if (fourth === 'LL' && third === 'HL' && second === 'HH' && first === 'HL') {
    return 'bullish'; // Classic uptrend: LL->HL->HH->HL (pullback in uptrend)
  }
  if (fourth === 'LL' && third === 'LH' && second === 'HL' && first === 'HH') {
    return 'bullish'; // Recovery: LL->LH->HL->HH (reversal from downtrend)
  }
  if (fourth === 'LH' && third === 'LL' && second === 'HL' && first === 'HH') {
    return 'bullish'; // V-shaped recovery: LH->LL->HL->HH
  }
  if (fourth === 'HL' && third === 'HH' && second === 'HL' && first === 'HH') {
    return 'bullish'; // Strong uptrend: HL->HH->HL->HH (healthy pullbacks)
  }
  
  // Strong Bearish Patterns (4 points)
  // Pattern: Downtrend establishment and continuation
  if (fourth === 'HH' && third === 'LH' && second === 'LL' && first === 'LH') {
    return 'bearish'; // Classic downtrend: HH->LH->LL->LH (pullback in downtrend)
  }
  if (fourth === 'HH' && third === 'HL' && second === 'LH' && first === 'LL') {
    return 'bearish'; // Breakdown: HH->HL->LH->LL (reversal from uptrend)
  }
  if (fourth === 'HL' && third === 'HH' && second === 'LH' && first === 'LL') {
    return 'bearish'; // Inverted V breakdown: HL->HH->LH->LL
  }
  if (fourth === 'LH' && third === 'LL' && second === 'LH' && first === 'LL') {
    return 'bearish'; // Strong downtrend: LH->LL->LH->LL (weak rallies)
  }
  
  // Additional 4-point patterns for completeness
  if (fourth === 'HH' && third === 'HL' && second === 'HH' && first === 'HL') {
    return 'bullish'; // Continued uptrend with healthy pullbacks
  }
  if (fourth === 'LL' && third === 'LH' && second === 'LL' && first === 'LH') {
    return 'bearish'; // Continued downtrend with weak rallies
  }
  
  // Fall back to 3-point analysis if no 4-point pattern matches
  return analyzeThreePoints(third, second, first);
}

// Helper function for 3-point analysis
function analyzeThreePoints(third: string, second: string, first: string) {
  // Strong Bullish 3-point patterns
  if (third === 'LL' && second === 'HL' && first === 'HH') {
    return 'bullish'; // Clear uptrend: LL->HL->HH
  }
  if (third === 'LH' && second === 'HL' && first === 'HH') {
    return 'bullish'; // Reversal to uptrend: LH->HL->HH
  }
  if (third === 'HL' && second === 'HH' && first === 'HL') {
    return 'bullish'; // Uptrend with pullback: HL->HH->HL
  }
  if (third === 'LL' && second === 'LH' && first === 'HL') {
    return 'bullish'; // Early reversal signs: LL->LH->HL
  }
  
  // Strong Bearish 3-point patterns
  if (third === 'HH' && second === 'LH' && first === 'LL') {
    return 'bearish'; // Clear downtrend: HH->LH->LL
  }
  if (third === 'HL' && second === 'LH' && first === 'LL') {
    return 'bearish'; // Reversal to downtrend: HL->LH->LL
  }
  if (third === 'LH' && second === 'LL' && first === 'LH') {
    return 'bearish'; // Downtrend with pullback: LH->LL->LH
  }
  if (third === 'HH' && second === 'HL' && first === 'LH') {
    return 'bearish'; // Early breakdown signs: HH->HL->LH
  }
  
  // Consolidation/Mixed patterns (neutral bias but lean toward recent action)
  if (third === 'HH' && second === 'HL' && first === 'HH') {
    return 'bullish'; // Consolidation in uptrend, likely to continue up
  }
  if (third === 'LL' && second === 'LH' && first === 'LL') {
    return 'bearish'; // Consolidation in downtrend, likely to continue down
  }
  if (third === 'HL' && second === 'LH' && first === 'HL') {
    return 'neutral'; // True consolidation - mixed signals
  }
  if (third === 'LH' && second === 'HL' && first === 'LH') {
    return 'neutral'; // True consolidation - mixed signals
  }
  
  // Fall back to 2-point analysis
  return analyzeTwoPoints(second, first);
}

// Helper function for 2-point analysis
function analyzeTwoPoints(second: string, first: string) {
  // Bullish 2-point combinations
  if (first === 'HH') {
    if (second === 'HL') return 'bullish';  // HL->HH: Perfect uptrend sequence
    if (second === 'HH') return 'neutral';  // HH->HH: Sideways at highs (could go either way)
    if (second === 'LH') return 'bullish';  // LH->HH: Strong reversal upward
    if (second === 'LL') return 'bullish';  // LL->HH: Very strong reversal upward
  }
  
  if (first === 'HL') {
    if (second === 'HH') return 'bullish';  // HH->HL: Healthy pullback in uptrend
    if (second === 'HL') return 'neutral';  // HL->HL: Sideways at support (consolidation)
    if (second === 'LH') return 'neutral';  // LH->HL: Potential trend change (wait for confirmation)
    if (second === 'LL') return 'bullish';  // LL->HL: Recovery from lows
  }
  
  // Bearish 2-point combinations
  if (first === 'LH') {
    if (second === 'LL') return 'bearish';  // LL->LH: Perfect downtrend sequence
    if (second === 'LH') return 'neutral';  // LH->LH: Sideways at lows (could go either way)
    if (second === 'HL') return 'bearish';  // HL->LH: Strong reversal downward
    if (second === 'HH') return 'bearish';  // HH->LH: Very strong reversal downward
  }
  
  if (first === 'LL') {
    if (second === 'LH') return 'bearish';  // LH->LL: Healthy pullback in downtrend
    if (second === 'LL') return 'neutral';  // LL->LL: Sideways at lows (consolidation)
    if (second === 'HL') return 'neutral';  // HL->LL: Potential trend change (wait for confirmation)
    if (second === 'HH') return 'bearish';  // HH->LL: Breakdown from highs
  }
  
  return 'neutral';
}

// Helper function for single point analysis
function analyzeSinglePoint(singlePoint: string) {
  // Single point analysis - limited information, lean based on point type
  if (singlePoint === 'HH') return 'bullish';    // New high is bullish
  if (singlePoint === 'HL') return 'bullish';    // Higher low is bullish
  if (singlePoint === 'LH') return 'bearish';    // Lower high is bearish
  if (singlePoint === 'LL') return 'bearish';    // New low is bearish
  return 'neutral';
}
  
  const trendDirection = determineTrendFromSwingPoints(calculatedSwingPoints, clickedIndex);
  
  const candlesAnalyzed = endIndex - clickedIndex + 1;
  
  return {
    clickedCandle,
    clickedIndex,
    trendReversalIndex: endIndex,
    trendReversalCandle: reversalCandle,
    maxProfitPrice,
    maxLossPrice,
    maxProfitPercent,
    maxLossPercent,
    finalProfitLoss: profitLoss,
    finalProfitLossPercent: profitLossPercent,
    candlesAnalyzed,
    trendDirection: trendDirection,
    startDate: new Date(clickedCandle.timestamp).toLocaleDateString(),
    endDate: new Date(reversalCandle.timestamp).toLocaleDateString(),
    swingPointLabel
  };
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

// Function to map entry dates to the correct candles based on timeframe
const mapEntryDatesToCandles = (entryDates: string[], candles: Candle[], timeframe: string): Set<number> => {
  const entryCandleIndices = new Set<number>();
  
  if (!entryDates || entryDates.length === 0 || !candles || candles.length === 0) {
    return entryCandleIndices;
  }
  
  // Helper function to get timeframe duration in milliseconds
  const getTimeframeDuration = (tf: string): number => {
    switch (tf) {
      case '1m': return 60 * 1000;
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '30m': return 30 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '1d': return 24 * 60 * 60 * 1000;
      case '1w': return 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000; // Default to 1 hour
    }
  };
  
  const timeframeDuration = getTimeframeDuration(timeframe);
  
  entryDates.forEach(entryDateStr => {
    try {
      // Parse entry date - handle various formats including MM-DD-YYYY
      let entryTime: Date;
      
      // First Ptry standard YYYY-MM-DD format
      entryTime = new Date(entryDateStr);
      
      // If that fails and it looks like MM-DD-YYYY format, try swapping
      if (isNaN(entryTime.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(entryDateStr)) {
        const parts = entryDateStr.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);
        
        // If month > 12, it's likely MM-DD-YYYY format, so swap month and day
        if (month > 12 && day <= 12) {
          ////console.log(`🔄 Detected MM-DD-YYYY format, converting ${entryDateStr} to ${year}-${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}`);
          entryTime = new Date(`${year}-${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}`);
        }
      }
      
      // Handle other formats
      if (isNaN(entryTime.getTime())) {
        if (entryDateStr.includes('T')) {
          // ISO format: "2024-09-06T09:33:00"
          entryTime = new Date(entryDateStr);
        } else if (entryDateStr.includes(' ')) {
          // Format: "2024-09-06 09:33:00"
          entryTime = new Date(entryDateStr.replace(' ', 'T'));
        } else {
          // Assume it's just time: "09:33:00" - use current date
          const today = new Date().toISOString().split('T')[0];
          entryTime = new Date(`${today}T${entryDateStr}`);
        }
      }
      
      if (isNaN(entryTime.getTime())) {
        ////console.warn('Invalid entry date format:', entryDateStr);
        return;
      }
      
      const entryTimestamp = entryTime.getTime();
      
      // Get the time range of available candles
      const firstCandleTime = new Date(candles[0].timestamp).getTime();
      const lastCandleTime = new Date(candles[candles.length - 1].timestamp).getTime();
      
      // Define acceptable time tolerance based on timeframe
      const getTimeTolerance = (tf: string): number => {
        switch (tf) {
          case '1m': return 2 * 60 * 1000; // 2 minutes
          case '5m': return 10 * 60 * 1000; // 10 minutes
          case '15m': return 30 * 60 * 1000; // 30 minutes
          case '30m': return 60 * 60 * 1000; // 1 hour
          case '1h': return 2 * 60 * 60 * 1000; // 2 hours
          case '4h': return 8 * 60 * 60 * 1000; // 8 hours
          case '1d': return 2 * 24 * 60 * 60 * 1000; // 2 days
          case '1w': return 7 * 24 * 60 * 60 * 1000; // 1 week
          default: return 60 * 60 * 1000; // Default to 1 hour
        }
      };
      
      const timeTolerance = getTimeTolerance(timeframe);
      
      // Check if entry date is within acceptable range of available data
      // Silently filter out dates outside the range instead of showing warnings
      ////console.log(`🔍 Checking date range for ${entryDateStr}: entry=${new Date(entryTimestamp).toISOString()} vs first=${new Date(firstCandleTime).toISOString()} to last=${new Date(lastCandleTime).toISOString()}`);
      if (entryTimestamp < firstCandleTime - timeTolerance) {
        ////console.log(`❌ Entry date ${entryDateStr} is too old - filtering out`);
        // Entry date is too old - silently skip
        return;
      }
      
      if (entryTimestamp > lastCandleTime + timeTolerance) {
        ////console.log(`❌ Entry date ${entryDateStr} is too new - filtering out`);
        // Entry date is too new - silently skip
        return;
      }
      
      // Find the candle that should contain this entry
      let bestCandleIndex = -1;
      let smallestTimeDiff = Infinity;
      
      for (let i = 0; i < candles.length; i++) {
        const candleTime = new Date(candles[i].timestamp).getTime();
        
        if (timeframe === '1d') {
          // For daily candles, check if same day
          const candleDate = new Date(candleTime).toDateString();
          const entryDate = entryTime.toDateString();
          if (candleDate === entryDate) {
            bestCandleIndex = i;
            break;
          }
        } else {
          // For intraday timeframes, find the candle that the entry time falls into
          // The logic: if entry is at 9:33 and we have 5m candles at 9:30, 9:35, 9:40
          // then 9:33 should map to the 9:35 candle (next boundary after entry)
          
          // Check if entry time is between this candle and the next one
          if (i < candles.length - 1) {
            const nextCandleTime = new Date(candles[i + 1].timestamp).getTime();
            
            // If entry falls between current and next candle, it belongs to the next candle
            if (entryTimestamp > candleTime && entryTimestamp <= nextCandleTime) {
              bestCandleIndex = i + 1;
              break;
            }
          }
          
          // Alternative: find the closest candle after the entry time (but only within tolerance)
          if (candleTime >= entryTimestamp) {
            const timeDiff = candleTime - entryTimestamp;
            if (timeDiff < smallestTimeDiff && timeDiff <= timeTolerance) {
              smallestTimeDiff = timeDiff;
              bestCandleIndex = i;
            }
          }
        }
      }
      
      if (bestCandleIndex >= 0) {
        entryCandleIndices.add(bestCandleIndex);
        //////console.log(`📍 Entry at ${entryDateStr} mapped to candle ${bestCandleIndex} (${candles[bestCandleIndex].timestamp}) for ${timeframe} timeframe`);
      } else {
        ////console.warn(`⚠️ Could not map entry date ${entryDateStr} to any candle for ${timeframe} timeframe - entry may be outside available data range`);
      }
      
    } catch (error) {
      ////console.error('Error processing entry date:', entryDateStr, error);
    }
  });
  
  return entryCandleIndices;
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
    analysisList?: { timestamp: string; swingLabel?: string; entryTime?: string; entryCandleClose?: number; target?: number; stopLoss?: number; }[]; // Updated to include entry/target/SL data
    supportLevel?: number; // Support level from backend
    resistanceLevel?: number; // Resistance level from backend
    avgVolume?: number; // Average volume for the stock
    entryDates?: string[]; // Entry dates to highlight on chart
    strykeDates?: string[]; // Stryke entry dates to highlight with different style
    algoDates?: string[]; // Algo entry dates to highlight with different style
    zoneStartDates?: string[]; // Dates to use for calculating zone start times
    entryPrice?: number; // Entry price for plotting target/SL lines
    targetPrice?: number; // Target price for plotting target line
    stopLossPrice?: number; // Stop loss price for plotting SL line
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
    entryDates = [], // Entry dates to highlight
    strykeDates = [], // Stryke entry dates to highlight
    algoDates = [], // Algo entry dates to highlight
    zoneStartDates = [], // Dates to use for calculating zone start times
    entryPrice, // Entry price for plotting target/SL lines
    targetPrice, // Target price for plotting target line
    stopLossPrice, // Stop loss price for plotting SL line
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
    const [candleAnalysis, setCandleAnalysis] = useState<CandleAnalysis | null>(null);
    const ema8SeriesRef = useRef<any>(null);
    const ema30SeriesRef = useRef<any>(null);
    const ema200SeriesRef = useRef<any>(null);
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
    const trendLinesRef = useRef<any[]>([]);
    
    // Store calculated swing points for reuse in click analysis
    const calculatedSwingPointsRef = useRef<any[]>([]);

    // Separate ref for entry/target/SL lines to prevent them from being cleaned up by swing points effect
    const entryLinesRef = useRef<any[]>([]);

    // Mobile detection and responsive values
    const [isMobile, setIsMobile] = useState(false);
    const [containerDimensions, setContainerDimensions] = useState({ width: maxWidth, height: height });

    // Detect mobile and update dimensions
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            
            // Update container dimensions based on screen size
            const newWidth = window.innerWidth;
            setContainerDimensions({ width: newWidth, height: height });
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [height]);

  

    // Detect timeframe from candle intervals
    const detectedTimeframe = useMemo(() => {
        if (candles.length < 2) return '1d'; // Default timeframe
        
        const first = new Date(candles[0].timestamp).getTime();
        const second = new Date(candles[1].timestamp).getTime();
        const intervalMs = second - first;
        
        // Convert to minutes for easier comparison
        const intervalMinutes = intervalMs / (1000 * 60);
        
        if (intervalMinutes <= 1) return '1m';
        if (intervalMinutes <= 5) return '5m';
        if (intervalMinutes <= 15) return '15m';
        if (intervalMinutes <= 30) return '30m';
        if (intervalMinutes <= 60) return '1h';
        if (intervalMinutes <= 240) return '4h';
        if (intervalMinutes <= 1440) return '1d';
        return '1w';
    }, [candles]);

    // Map entry dates to candle indices
    const entryCandleIndices = useMemo(() => {
        const indices = mapEntryDatesToCandles(entryDates, candles, detectedTimeframe);
        if (indices.size > 0) {
            //////console.log(`🎯 Entry date mapping for ${detectedTimeframe} timeframe:`, entryDates.length, indices.size);
        }
        return indices;
    }, [entryDates, candles, detectedTimeframe]);

    // Map stryke dates to candle indices
    const strykeCandleIndices = useMemo(() => {
        if (candles.length > 0) {
            const firstCandle = new Date(candles[0].timestamp);
            const lastCandle = new Date(candles[candles.length - 1].timestamp);
            ////console.log(`📊 Data range: ${firstCandle.toISOString().split('T')[0]} to ${lastCandle.toISOString().split('T')[0]} (${candles.length} candles)`);
        }
        const indices = mapEntryDatesToCandles(strykeDates, candles, detectedTimeframe);
        if (indices.size > 0) {
            ////console.log(`🎯 Stryke date mapping for ${detectedTimeframe} timeframe:`, strykeDates.length, 'dates →', indices.size, 'markers');
            ////console.log('Stryke dates:', strykeDates);
            ////console.log('Stryke indices:', Array.from(indices));
        } else if (strykeDates.length > 0) {
            ////console.log(`❌ No stryke markers created for ${detectedTimeframe} timeframe:`, strykeDates.length, 'dates provided');
            //console.log('Stryke dates:', strykeDates);
        }
        return indices;
    }, [strykeDates, candles, detectedTimeframe]);

    // Map algo dates to candle indices
    const algoCandleIndices = useMemo(() => {
        const indices = mapEntryDatesToCandles(algoDates, candles, detectedTimeframe);
        if (indices.size > 0) {
            //console.log(`🎯 Algo date mapping for ${detectedTimeframe} timeframe:`, algoDates.length, 'dates →', indices.size, 'markers');
            //console.log('Algo dates:', algoDates);
            //console.log('Algo indices:', Array.from(indices));
        } else if (algoDates.length > 0) {
            //console.log(`❌ No algo markers created for ${detectedTimeframe} timeframe:`, algoDates.length, 'dates provided');
            //console.log('Algo dates:', algoDates);
        }
        return indices;
    }, [algoDates, candles, detectedTimeframe]);


    // Chart initialization effect - only runs when data changes, not indicator toggles
    useEffect(() => {
       //////console.log('🔄 Chart initialization effect triggered', { candlesLength: candles.length, height, width, showVolume });
        if (!UnderstchartContainerRef.current || !candles.length) return;

        // Performance optimization: reduce data points on mobile
        const maxVisibleCandles = isMobile ? 500 : MAX_VISIBLE_CANDLES;
        const processedCandles = candles.length > maxVisibleCandles ? candles.slice(-maxVisibleCandles) : candles;

        // Create chart with enhanced navigation and zoom configuration optimized for mobile
        const chart = createChart(UnderstchartContainerRef.current, {
            width: containerDimensions.width,
             height: isMobile ? containerDimensions.height + 30 : containerDimensions.height - 120, // Different heights for mobile vs desktop
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
                // Enhanced navigation settings optimized for mobile
                fixLeftEdge: false,
                fixRightEdge: false,
                lockVisibleTimeRangeOnResize: false,
                borderVisible: true,
                visible: true,
                rightOffset: isMobile ? 2 : 3,
                minBarSpacing: isMobile ? 1 : 0.5,
                borderColor: '#333333',
                // Enhanced scroll and zoom behavior for mobile
                shiftVisibleRangeOnNewBar: true,
            },
            crosshair: {
                mode: 0, // Normal crosshair mode
                vertLine: {
                    color: '#758696',
                    width: isMobile ? 2 : 1,
                    style: 2, // Dashed line
                    visible: true,
                    labelVisible: !isMobile, // Hide labels on mobile for cleaner look
                },
                horzLine: {
                    color: '#758696',
                    width: isMobile ? 2 : 1,
                    style: 2, // Dashed line
                    visible: true,
                    labelVisible: !isMobile, // Hide labels on mobile for cleaner look
                },
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
            handleScale: {
                axisPressedMouseMove: {
                    time: true,
                    price: true,
                },
                mouseWheel: true,
                pinch: true, // Enhanced pinch-to-zoom for mobile
                axisDoubleClickReset: {
                    time: true,
                    price: true,
                },
            },
            // Enhanced kinetic scrolling optimized for mobile
            kineticScroll: {
                touch: true,
                mouse: false,
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

        // Configure main price scale to ensure X-axis visibility
        chart.priceScale('right').applyOptions({
            scaleMargins: {
                top: 0.005,
                bottom: 0.01, // Minimal space for X-axis
            },
            borderVisible: true,
        });

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
                scaleMargins: { top: 0.65, bottom: 0 },
                autoScale: true // Re-enable auto-scaling
            });
        }

        // Format data for the chart using processed candles (performance optimized)
        // Use consistent timestamp handling to prevent chart distortion
        const formattedData = processedCandles.map(candle => {
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
            
            // Fit content to show all data at normal zoom level
            chart.timeScale().fitContent();
            
           //////console.log(`📊 Chart data range: ${formattedData.length} candles from ${new Date(dataRange.from * 1000).toISOString()} to ${new Date(dataRange.to * 1000).toISOString()}`);
        }

        // Set volume data if enabled
        if (showVolume && volumeSeries) {
            // Use consistent timestamp handling for volume data
            const volumeData = processedCandles.map(candle => {
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

        // Handle candle click for profit/loss analysis
        chart.subscribeClick(param => {
            if (param && param.time) {
                // Find the clicked candle index
                const clickedIndex = candles.findIndex((c: Candle) => parseTimestampToUnix(c.timestamp) === param.time);
                if (clickedIndex !== -1 && clickedIndex < candles.length - 1) {
                    // Perform the analysis using calculated swing points
                    const analysis = analyzeCandleClick(candles, clickedIndex, calculatedSwingPointsRef.current);
                    if (analysis) {
                        setCandleAnalysis(analysis);
                    }
                } else {
                    toast.error('Cannot analyze the last candle or invalid selection');
                }
            }
        });

        // Handle resize and auto-fit chart
        const handleResize = () => {
            if (UnderstchartContainerRef.current && chartRef.current) {
                const containerWidth = UnderstchartContainerRef.current.clientWidth;
                const containerHeight = UnderstchartContainerRef.current.clientHeight; // Reduce height by 10%
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
                    //console.warn('Failed to auto-fit chart content:', error);
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
    }, [candles, height, width, showVolume, entryCandleIndices, strykeDates, algoDates]); // Added entryCandleIndices, strykeDates, algoDates to dependencies

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

    // Separate effect for EMA indicator management (EMA 8, EMA 30, and EMA 200)
    useEffect(() => {
       //////console.log('📊 EMA effect triggered', { showEMA, candlesLength: candles.length });
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
            try {
                if (ema200SeriesRef.current) { chart.removeSeries(ema200SeriesRef.current); ema200SeriesRef.current = null; }
            } catch {}
        };

        if (showEMA) {
            try {
                removeEmaSeries();
                
                // Check raw EMA values in candles
                const candlesWithEma8 = candles.filter(c => typeof c.ema8 === 'number' && !isNaN(c.ema8));
                const candlesWithEma30 = candles.filter(c => typeof c.ema30 === 'number' && !isNaN(c.ema30));
                const candlesWithEma200 = candles.filter(c => typeof c.ema === 'number' && !isNaN(c.ema));
                
                // Debug logging for EMA data analysis
               //////console.log(`🔍 EMA Analysis: ${candles.length} candles, EMA8(${candlesWithEma8.length}) EMA30(${candlesWithEma30.length}) EMA200(${candlesWithEma200.length})`);
                
                // Debug timestamp ordering - check if data might be in reverse order
                if (candles.length >= 2) {
                    const first = candles[0];
                    const last = candles[candles.length - 1];
                    const firstTime = parseTimestampToUnix(first.timestamp);
                    const lastTime = parseTimestampToUnix(last.timestamp);
                   //////console.log(`🕐 Time order: ${new Date(firstTime * 1000).toISOString()} to ${new Date(lastTime * 1000).toISOString()}`);
                    if (firstTime > lastTime) {
                        //console.warn('⚠️ Data appears to be in reverse chronological order!');
                    }
                }
                
                // EMA 8
                ema8SeriesRef.current = chart.addLineSeries({
                    color: '#03A9F4',
                    lineWidth: 2,
                    priceScaleId: '',
                    title: 'EMA 8',
                });
               //////console.log(`🎯 Creating EMA8 chart data...`);
                const ema8Data = candles
                    .map((c: Candle, idx: number) => {
                        const chartPoint = {
                            time: parseTimestampToUnix(c.timestamp),
                            value: typeof c.ema8 === 'number' && !isNaN(c.ema8) ? c.ema8 : null,
                        };
                        return chartPoint;
                    })
                    .filter((item: any) => {
                        const isValid = typeof item.value === 'number' && !isNaN(item.value);
                        return isValid;
                    })
                    .sort((a, b) => a.time - b.time); // Ensure ascending time order

                // Set EMA8 data with enhanced error handling
                if (ema8Data.length > 0) {
                    ema8SeriesRef.current.setData(ema8Data);
                   //////console.log('✅ EMA8 data set successfully');
                    
                    // Ensure EMA series scales with the main chart
                    ema8SeriesRef.current.applyOptions({
                        lastValueVisible: false,
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

                // Set EMA30 data with enhanced error handling
                if (ema30Data.length > 0) {
                    ema30SeriesRef.current.setData(ema30Data);
                   //////console.log('✅ EMA30 data set successfully');
                    
                    // Ensure EMA series scales with the main chart
                    ema30SeriesRef.current.applyOptions({
                        lastValueVisible: false,
                        priceLineVisible: false,
                    });
                }

                // EMA 200
                ema200SeriesRef.current = chart.addLineSeries({
                    color: '#9C27B0', // Purple
                    lineWidth: 2,
                    priceScaleId: '',
                    title: 'EMA 200',
                });
                const ema200Data = candles
                    .map((c: Candle) => {
                        return {
                            time: parseTimestampToUnix(c.timestamp),
                            value: typeof c.ema === 'number' && !isNaN(c.ema) ? c.ema : null,
                        };
                    })
                    .filter((item: any) => typeof item.value === 'number' && !isNaN(item.value))
                    .sort((a, b) => a.time - b.time); // Ensure ascending time order

                // Set EMA200 data with enhanced error handling
                if (ema200Data.length > 0) {
                    ema200SeriesRef.current.setData(ema200Data);
                   //////console.log('✅ EMA200 data set successfully');
                    
                    // Ensure EMA series scales with the main chart
                    ema200SeriesRef.current.applyOptions({
                        lastValueVisible: false,
                        priceLineVisible: false,
                    });
                }

                // Enhanced error checking with detailed logging
                if (!ema8Data.length && !ema30Data.length && !ema200Data.length) {
                    //console.error('❌ EMA Error Details:');
                    //console.error(`- Total candles: ${candles.length}`);
                    //console.error(`- Candles with EMA8: ${candlesWithEma8.length}`);
                    //console.error(`- Candles with EMA30: ${candlesWithEma30.length}`);
                    //console.error(`- Candles with EMA200: ${candlesWithEma200.length}`);
                    throw new Error('Insufficient EMA data - EMA arrays are empty');
                }
            } catch (err) {
                //console.error('EMA calculation error:', err);
                setEmaError('Insufficient EMA data available');
                removeEmaSeries();
            }
        } else {
            removeEmaSeries();
        }
    }, [showEMA, candles]); // Added candles dependency to ensure EMA updates when data changes

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
                //console.error('RSI calculation error:', err);
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
                    //console.error('VIX calculation error:', err);
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

    // Separate effect for entry/target/SL lines from URL parameters
    useEffect(() => {
        if (!chartRef.current || !entryPrice) {
            return;
        }

        const chart = chartRef.current;

        // Clean up any existing entry lines
        const existingEntryLines: any[] = [];
        // Note: We can't easily identify which lines are entry lines, so we'll skip cleanup for now
        // and let the swing points effect handle the main cleanup

        // // Add target and SL lines if they exist
        // if (targetPrice && typeof targetPrice === 'number') {
        //     const timeScale = chart.timeScale();
        //     const visibleRange = timeScale.getVisibleRange();
            
        //     let startTime, endTime;
        //     if (visibleRange) {
        //         startTime = visibleRange.from;
        //         endTime = visibleRange.to;
        //     } else if (candles.length > 0) {
        //         startTime = parseTimestampToUnix(candles[0].timestamp);
        //         endTime = parseTimestampToUnix(candles[candles.length - 1].timestamp);
        //     } else {
        //         return;
        //     }

        //     const targetLineSeries = chart.addLineSeries({
        //         color: '#10b981', // Emerald green to match profit zone
        //         lineWidth: 3,
        //         lineStyle: 0,
        //         title: `Target: ₹${targetPrice.toFixed(2)}`,
        //         priceLineVisible: false,
        //         lastValueVisible: false,
        //         crosshairMarkerVisible: false,
        //     });

        //     targetLineSeries.setData([
        //         { time: startTime, value: targetPrice },
        //         { time: endTime, value: targetPrice }
        //     ]);

        //     // Store for cleanup
        //     entryLinesRef.current.push(targetLineSeries);
        // }

        // Add entry line if entryPrice exists
        if (entryPrice && typeof entryPrice === 'number') {
            const timeScale = chart.timeScale();
            const visibleRange = timeScale.getVisibleRange();
            
            let startTime, endTime;
            if (visibleRange) {
                startTime = visibleRange.from;
                endTime = visibleRange.to;
            } else if (candles.length > 0) {
                startTime = parseTimestampToUnix(candles[0].timestamp);
                endTime = parseTimestampToUnix(candles[candles.length - 1].timestamp);
            } else {
                return;
            }

            const entryLineSeries = chart.addLineSeries({
                color: '#1d4ed8', // Stronger blue for entry
                lineWidth: 3,
                lineStyle: 2, // Dashed line to distinguish from target/SL
                title: `Entry: ₹${entryPrice.toFixed(2)}`,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
            });

            entryLineSeries.setData([
                { time: startTime, value: entryPrice },
                { time: endTime, value: entryPrice }
            ]);

            // Store for cleanup
            entryLinesRef.current.push(entryLineSeries);
        }

        // if (stopLossPrice && typeof stopLossPrice === 'number') {
        //     const timeScale = chart.timeScale();
        //     const visibleRange = timeScale.getVisibleRange();
            
        //     let startTime, endTime;
        //     if (visibleRange) {
        //         startTime = visibleRange.from;
        //         endTime = visibleRange.to;
        //     } else if (candles.length > 0) {
        //         startTime = parseTimestampToUnix(candles[0].timestamp);
        //         endTime = parseTimestampToUnix(candles[candles.length - 1].timestamp);
        //     } else {
        //         return;
        //     }

        //     const stopLossLineSeries = chart.addLineSeries({
        //         color: '#ef4444', // Bright red to match loss zone
        //         lineWidth: 3,
        //         lineStyle: 0,
        //         title: `SL: ₹${stopLossPrice.toFixed(2)}`,
        //         priceLineVisible: false,
        //         lastValueVisible: false,
        //         crosshairMarkerVisible: false,
        //     });

        //     stopLossLineSeries.setData([
        //         { time: startTime, value: stopLossPrice },
        //         { time: endTime, value: stopLossPrice }
        //     ]);

        //     // Store for cleanup
        //     entryLinesRef.current.push(stopLossLineSeries);
        // }

        // Add profit zone (green area between entry and target)
        if (entryPrice && targetPrice && typeof entryPrice === 'number' && typeof targetPrice === 'number') {
            let startTime, endTime;
            
            // Always calculate algo start time first, regardless of visible range
            let algoStartTime = null;
            if (candles.length > 0) {
                let algoStartDate;
                if (zoneStartDates.length > 0) {
                    // Use the first algo date from URL parameters
                    algoStartDate = zoneStartDates[0];
                } else {
                    // Fallback to first candle date if no algo date provided
                    algoStartDate = new Date(candles[0].timestamp).toISOString().split('T')[0];
                }
                
                // Find the candle that matches the algo start date and use its timestamp
                const algoStartCandle = candles.find(candle => 
                    candle.timestamp.startsWith(algoStartDate)
                );
                if (algoStartCandle) {
                    algoStartTime = parseTimestampToUnix(algoStartCandle.timestamp); 
                }
            }
            
            // Use algo start time if available, otherwise fallback to visible range or data range
            if (algoStartTime) {
                startTime = algoStartTime;
                endTime = parseTimestampToUnix(candles[candles.length - 1].timestamp);

            } else if (candles.length > 0) {
                startTime = parseTimestampToUnix(candles[0].timestamp);
                endTime = parseTimestampToUnix(candles[candles.length - 1].timestamp);
            } else {
                return;
            }

            const profitZoneSeries = chart.addBaselineSeries({
                baseValue: { type: 'price', price: entryPrice },
                topFillColor1: 'rgba(16, 185, 129, 0.35)', // Emerald green
                topFillColor2: 'rgba(16, 185, 129, 0.08)',
                topLineColor: 'rgba(16, 185, 129, 1.0)',
                bottomFillColor1: 'rgba(16, 185, 129, 0.08)',
                bottomFillColor2: 'rgba(16, 185, 129, 0.35)',
                bottomLineColor: 'rgba(16, 185, 129, 1.0)',
                lineWidth: 2,
                crosshairMarkerVisible: false,
                priceLineVisible: false,
                lastValueVisible: false,
            });

            // Create area data points - line at the target price
            const areaData = [
                { time: startTime, value: targetPrice },
                { time: endTime, value: targetPrice },
            ];

            profitZoneSeries.setData(areaData);
            
            // Store for cleanup - add profit zone first for proper layering
            entryLinesRef.current.unshift(profitZoneSeries);
        }

        // Add loss zone (red area between entry and stop loss)
        if (entryPrice && stopLossPrice && typeof entryPrice === 'number' && typeof stopLossPrice === 'number') {
            let startTime, endTime;
            
            // Always calculate algo start time first, regardless of visible range
            let algoStartTime = null;
            if (candles.length > 0) {
                let algoStartDate;
                if (zoneStartDates.length > 0) {
                    // Use the first algo date from URL parameters
                    algoStartDate = zoneStartDates[0];
                } else {
                    // Fallback to first candle date if no algo date provided
                    algoStartDate = new Date(candles[0].timestamp).toISOString().split('T')[0];
                }
                
                // Find the candle that matches the algo start date and use its timestamp
                const algoStartCandle = candles.find(candle => 
                    candle.timestamp.startsWith(algoStartDate)
                );
                if (algoStartCandle) {
                    algoStartTime = parseTimestampToUnix(algoStartCandle.timestamp);
                }
            }
            
            // Use algo start time if available, otherwise fallback to visible range or data range
            if (algoStartTime) {
                startTime = algoStartTime;
                endTime = parseTimestampToUnix(candles[candles.length - 1].timestamp);
            } else if (candles.length > 0) {
                startTime = parseTimestampToUnix(candles[0].timestamp);
                endTime = parseTimestampToUnix(candles[candles.length - 1].timestamp);
            } else {
                return;
            }

            const lossZoneSeries = chart.addBaselineSeries({
                baseValue: { type: 'price', price: entryPrice },
                topFillColor1: 'rgba(239, 68, 68, 0.35)', // Bright red
                topFillColor2: 'rgba(239, 68, 68, 0.08)',
                topLineColor: 'rgba(239, 68, 68, 1.0)',
                bottomFillColor1: 'rgba(239, 68, 68, 0.08)',
                bottomFillColor2: 'rgba(239, 68, 68, 0.35)',
                bottomLineColor: 'rgba(239, 68, 68, 1.0)',
                lineWidth: 2,
                crosshairMarkerVisible: false,
                priceLineVisible: false,
                lastValueVisible: false,
            });

            // Create area data points - line at the stop loss price
            const areaData = [
                { time: startTime, value: stopLossPrice },
                { time: endTime, value: stopLossPrice },
            ];

            lossZoneSeries.setData(areaData);

            // Store for cleanup - add loss zone after profit zone for proper layering
            entryLinesRef.current.unshift(lossZoneSeries);
        }

    }, [entryPrice, targetPrice, stopLossPrice, candles, zoneStartDates]);
    useEffect(() => {
        return () => {
            if (entryLinesRef.current && entryLinesRef.current.length && chartRef.current) {
                entryLinesRef.current.forEach(line => {
                    if (line && chartRef.current) {
                        try {
                            chartRef.current.removeSeries(line);
                        } catch (err) {
                            // Ignore cleanup errors - chart may already be destroyed
                        }
                    }
                });
                entryLinesRef.current = [];
            }
        };
    }, []);
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
                        //console.warn('Error cleaning up trend line:', err);
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
        if (showSwingPoints && candles.length >= 11) { // Need at least 11 candles for lookback of 5
            try {
                const calculatedSwingPoints = calculateSwingPointsFromCandles(candles, 5);
                
                // Store swing points for use in click analysis
                calculatedSwingPointsRef.current = calculatedSwingPoints;
            
                ////console.log(`✅ Calculated ${calculatedSwingPoints.length} swing points directly from OHLC data`);
                
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
                    
                    // Calculate offset for visual separation from candles
                    const priceRange = Math.max(...candles.map(c => c.high)) - Math.min(...candles.map(c => c.low));
                    const offset = priceRange * 0.002; // 0.2% of price range for gap
                    
                    // Add offset based on swing point type (above/below candles)
                    const isHigh = label === 'HH' || label === 'LH';
                    const adjustedPrice = isHigh ? swingPoint.price + offset : swingPoint.price - offset;
                    
                    for (let i = Math.max(0, currentCandleIndex - lineExtent); 
                         i <= Math.min(candles.length - 1, currentCandleIndex + lineExtent);
                         i++) {
                        // Create dotted effect by only adding every 2nd point
                        if ((i - (currentCandleIndex - lineExtent)) % 2 === 0) {
                            dottedLineData.push({
                                time: parseTimestampToUnix(candles[i].timestamp),
                                value: adjustedPrice
                            });
                        }
                    }
                    
                    // Create a line series for this swing point's dotted line
                    const dottedLineSeries = chart.addLineSeries({
                        color: color,
                        lineWidth: 2,
                        lineStyle: 1, // Solid line (we create dotted effect with data points)
                        title: '',
                        priceLineVisible: false,
                        lastValueVisible: false,
                        crosshairMarkerVisible: false,
                        priceFormat: {
                            type: 'price',
                            precision: 2,
                            minMove: 0.01,
                        },
                    });
                    
                    // Set the dotted line data
                    dottedLineSeries.setData(dottedLineData);
                    
                    // Explicitly ensure no values are shown on Y-axis
                    dottedLineSeries.applyOptions({
                        lastValueVisible: false,
                        priceLineVisible: false,
                    });
                    
                    // Store the line series for cleanup
                    trendLinesRef.current.push(dottedLineSeries);
                    
                    // Add marker with label to the collection
                    // Use 'flag' and larger size so text labels render clearly on the chart
                    allMarkers.push({
                        time: swingPoint.time,
                        position: (label === 'HH' || label === 'LH') ? 'aboveBar' : 'belowBar',
                        color: color,
                        shape: 'flag',
                        text: label,
                        size: 4,
                    });
                });
                
                // Add entry date markers and dotted lines only if we have Stryke entry dates
                if (entryCandleIndices && entryCandleIndices.size > 0 && (strykeCandleIndices.size === 0 && algoCandleIndices.size === 0)) {
                    entryCandleIndices.forEach((entryIndex) => {
                        if (entryIndex < candles.length) {
                            const entryCandle = candles[entryIndex];
                            const entryTime = parseTimestampToUnix(entryCandle.timestamp);
                            
                             // Add stryke marker with different color and style
                            allMarkers.push({
                                time: entryTime,
                                position: 'aboveBar',
                                color: '#ff6b35', // Orange color for stryke points
                                shape: 'flag',
                                text: 'Stryke',
                                size: 10,
                            });
                            
                            // Add circle marker for stryke
                            allMarkers.push({
                                time: entryTime,
                                position: 'aboveBar',
                                color: '#ff6b35', // Orange color for the circle
                                shape: 'circle',
                                text: '', // No text for the circle
                                size: 0.5,
                            });
                        }
                    });
                }

                // Add stryke date markers
                if (strykeCandleIndices && strykeCandleIndices.size > 0) {
                    strykeCandleIndices.forEach((entryIndex) => {
                        if (entryIndex < candles.length) {
                            const entryCandle = candles[entryIndex];
                            const entryTime = parseTimestampToUnix(entryCandle.timestamp);
                            
                            // Add stryke marker with different color and style
                            allMarkers.push({
                                time: entryTime,
                                position: 'aboveBar',
                                color: '#e32424ff', // Red color for stryke points
                                shape: 'flag',
                                text: 'S',
                                size: 10,
                            });
                            
                            // Add circle marker for stryke
                            allMarkers.push({
                                time: entryTime,
                                position: 'aboveBar',
                                color: '#e32424ff', // Red color for the circle
                                shape: 'circle',
                                text: '', // No text for the circle
                                size: 0.5,
                            });
                        }
                    });
                }

                // Add algo date markers
                if (algoCandleIndices && algoCandleIndices.size > 0) {
                    algoCandleIndices.forEach((entryIndex) => {
                        if (entryIndex < candles.length) {
                            const entryCandle = candles[entryIndex];
                            const entryTime = parseTimestampToUnix(entryCandle.timestamp);
                            
                            // Add algo marker with different color and style
                            allMarkers.push({
                                time: entryTime,
                                position: 'aboveBar',
                                color: '#18ebe1ff', // Teal color for algo points
                                shape: 'flag',
                                text: 'A',
                                size: 10,
                            });
                            
                            // Add circle marker for algo
                            allMarkers.push({
                                time: entryTime,
                                position: 'aboveBar',
                                color: '#4ecdc4', // Teal color for the circle
                                shape: 'circle',
                                text: '', // No text for the circle
                                size: 0.5,
                            });
                        }
                    });
                }

        
                
                // Then check analysisList for additional entries
                if (propAnalysisList && propAnalysisList.length > 0) {
                    propAnalysisList.forEach((analysis) => {
                        if (analysis.entryTime && analysis.entryCandleClose) {
                            const entryTime = parseTimestampToUnix(analysis.entryTime);
                            
                            // Add entry marker
                            allMarkers.push({
                                time: entryTime,
                                position: 'aboveBar',
                                color: '#2563eb', // Blue for entry
                                shape: 'flag',
                                text: 'E',
                                size: 10,
                            });
                            
                            // Add circle marker for entry
                            allMarkers.push({
                                time: entryTime,
                                position: 'aboveBar',
                                color: '#2563eb',
                                shape: 'circle',
                                text: '',
                                size: 0.5,
                            });
                            
                            // Find entry candle index for line calculations
                            const entryCandleIndex = candles.findIndex(c => parseTimestampToUnix(c.timestamp) === entryTime);
                            
                            if (entryCandleIndex >= 0) {
                                const entryPrice = analysis.entryCandleClose;
                                
                                // Target line (light green)
                                if (analysis.target && typeof analysis.target === 'number') {
                                    const targetPrice = analysis.target;
                                    const endIndex = Math.min(entryCandleIndex + 20, candles.length - 1); // 20 candles ahead or end of data
                                    const endTime = parseTimestampToUnix(candles[endIndex].timestamp);
                                    
                                    const targetLineData = [
                                        { time: entryTime, value: entryPrice },
                                        { time: endTime, value: targetPrice }
                                    ];
                                    
                                    const targetLineSeries = chart.addLineSeries({
                                        color: '#90EE90', // Light green
                                        lineWidth: 2,
                                        lineStyle: 0,
                                        title: `Target: ₹${targetPrice.toFixed(2)}`,
                                        priceLineVisible: false,
                                        lastValueVisible: false,
                                        crosshairMarkerVisible: false,
                                    });
                                    
                                    targetLineSeries.setData(targetLineData);
                                    trendLinesRef.current.push(targetLineSeries);
                                }
                                
                                // Stop Loss line (light red)
                                if (analysis.stopLoss && typeof analysis.stopLoss === 'number') {
                                    const stopLossPrice = analysis.stopLoss;
                                    const endIndex = Math.min(entryCandleIndex + 20, candles.length - 1); // 20 candles ahead or end of data
                                    const endTime = parseTimestampToUnix(candles[endIndex].timestamp);
                                    
                                    const stopLossLineData = [
                                        { time: entryTime, value: entryPrice },
                                        { time: endTime, value: stopLossPrice }
                                    ];
                                    
                                    const stopLossLineSeries = chart.addLineSeries({
                                        color: '#FFB6C1', // Light red
                                        lineWidth: 2,
                                        lineStyle: 0,
                                        title: `SL: ₹${stopLossPrice.toFixed(2)}`,
                                        priceLineVisible: false,
                                        lastValueVisible: false,
                                        crosshairMarkerVisible: false,
                                    });
                                    
                                    stopLossLineSeries.setData(stopLossLineData);
                                    trendLinesRef.current.push(stopLossLineSeries);
                                }
                            }
                        }
                    });
                }
                
                // Ensure markers are ordered and unique by time before setting them
                allMarkers.sort((a, b) => a.time - b.time);
                // Deduplicate markers with same time and position (keep first)
                const dedupedMarkers: typeof allMarkers = [];
                const seen = new Set<string>();
                for (const m of allMarkers) {
                    const key = `${m.time}|${m.position}|${m.text}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        dedupedMarkers.push(m);
                    }
                }

                // Set all markers at once
                candlestickSeries.setMarkers(dedupedMarkers);
                
            } catch (err) {
                toast.error('Error calculating swing points', { duration: 4000 });
            }
        } else if (!showSwingPoints) {
            // Clear swing points when disabled
            calculatedSwingPointsRef.current = [];
            
            // Clear markers
            if (chartRef.current?.candlestickSeries) {
                chartRef.current.candlestickSeries.setMarkers([]);
            }
        } else {
            ////console.log('❌ Insufficient candles for swing point calculation (need at least 11)');
        }
        
        // Return cleanup function
        return () => {
            // Clean up trend lines when component unmounts or dependencies change
            if (trendLinesRef.current && trendLinesRef.current.length && chart) {
                trendLinesRef.current.forEach(line => {
                    if (line && chart) {
                        try {
                            // Check if line is still valid before removing
                            if (line && typeof line.options === 'function') {
                                chart.removeSeries(line);
                            }
                        } catch (err) {
                            // Silently ignore cleanup errors - chart may already be destroyed
                            // This is expected during development with React StrictMode
                        }
                    }
                });
                trendLinesRef.current = [];
            }
        };
    }, [showSwingPoints, propAnalysisList, candles, entryCandleIndices, strykeCandleIndices, algoCandleIndices, entryPrice, targetPrice, stopLossPrice]); // Added entryCandleIndices, strykeCandleIndices, algoCandleIndices, entryPrice, targetPrice, stopLossPrice

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

    // Chart container - responsive design for mobile and desktop
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
               //////console.log('📥 Loading older data due to scroll position');
                
                try {
                    await onLoadMoreData('older');
                    // Add a small delay to prevent rapid loading
                    setTimeout(() => { isLoadingOlder = false; }, 1000);
                } catch (error) {
                    //console.error('Failed to load older data:', error);
                    isLoadingOlder = false;
                }
            }
            
            // Check if user scrolled close to the right edge (newer data)
            if (hasMoreNewerData && !isLoadingNewer && (newRange.to >= dataRange.to - threshold)) {
                isLoadingNewer = true;
               //////console.log('📥 Loading newer data due to scroll position');
                
                try {
                    await onLoadMoreData('newer');
                    // Add a small delay to prevent rapid loading
                    setTimeout(() => { isLoadingNewer = false; }, 1000);
                } catch (error) {
                    //console.error('Failed to load newer data:', error);
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
                //console.warn('Failed to unsubscribe from visible time range changes:', error);
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
    <div className="relative w-full bg-white z-1" style={{ height: height + 'px' }}>
            <LoadingOverlay />
            <Toaster position="top-right" />
            
            {/* Combined Stats and OHLC Info */}
            {ohlcInfo && (
                isMobile ? (
                    // Mobile Compact Version
                    <div className={`absolute top-1 left-1 z-[200] bg-white/95 p-1.5 rounded shadow-md border border-gray-300 min-w-[200px] max-w-[240px] ${ohlcInfo.close >= ohlcInfo.open ? 'text-green-600' : 'text-red-700'}`}>
                        
                        {/* Ultra Compact OHLC Row */}
                        <div className="flex justify-between gap-1 font-bold text-[10px] leading-tight">
                            <span>O: {ohlcInfo.open.toFixed(0)}</span>
                            <span>H: {ohlcInfo.high.toFixed(0)}</span>
                            <span>L: {ohlcInfo.low.toFixed(0)}</span>
                            <span>C: {ohlcInfo.close.toFixed(0)}</span>
                            <span>V: {ohlcInfo.volume ? (ohlcInfo.volume / 1000).toFixed(0) + 'K' : 'N/A'}</span>
                               <span className={`font-semibold ${ohlcInfo.close >= ohlcInfo.prevClose ? 'text-green-600' : 'text-red-600'}`}>
                                {(() => {
                                    const change = ohlcInfo.close - ohlcInfo.prevClose;
                                    const percent = ohlcInfo.prevClose ? (change / ohlcInfo.prevClose) * 100 : 0;
                                    const sign = change > 0 ? '+' : '';
                                    return `${sign}${percent.toFixed(1)}%`;
                                })()}
                            </span>
                        </div>
                    </div>
                ) : (
                    // Desktop Version
                    <div className={`absolute top-1 left-4 z-[200] bg-white/95 p-3 md:p-4 rounded-lg shadow-lg border-2 border-gray-400 min-w-[200px] max-w-[280px] ${ohlcInfo.close >= ohlcInfo.open ? 'text-green-600' : 'text-red-700'}`}>
                        
                        {/* OHLC Data Column */}
                        <div className="flex flex-col gap-1 text-xs md:text-sm">
                            <div className="flex justify-between font-bold">
                                <span>Open:</span>
                                <span>{ohlcInfo.open.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>High:</span>
                                <span>{ohlcInfo.high.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>Low:</span>
                                <span>{ohlcInfo.low.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>Close:</span>
                                <span>{ohlcInfo.close.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>Volume:</span>
                                <span>{ohlcInfo.volume ? ohlcInfo.volume.toLocaleString() : 'N/A'}</span>
                            </div>
                            <div className={`flex justify-between font-semibold border-t border-gray-200 pt-1 mt-1 ${ohlcInfo.close >= ohlcInfo.prevClose ? 'text-green-600' : 'text-red-600'}`}>
                                <span className="text-xs md:text-sm">Change:</span>
                                <span>
                                    {(() => {
                                        const change = ohlcInfo.close - ohlcInfo.prevClose;
                                        const percent = ohlcInfo.prevClose ? (change / ohlcInfo.prevClose) * 100 : 0;
                                        const sign = change > 0 ? '+' : '';
                                        return `${sign}${change.toFixed(2)} (${sign}${percent.toFixed(2)}%)`;
                                    })()}
                                </span>
                            </div>
                        </div>

                        {/* Additional Stats Column */}
                        <div className="flex flex-col gap-1 text-xs text-gray-700 border-t border-gray-200 pt-2 mt-2">
                            <div className="flex justify-between font-bold">
                                <span>Gap:</span>
                                <span>
                                    {(() => {
                                        const gapInfo = getPrevCloseToTodayOpenGap(ohlcInfo ? { ...ohlcInfo, timestamp: (candles.find(c => c.close === ohlcInfo.close && c.open === ohlcInfo.open && c.high === ohlcInfo.high && c.low === ohlcInfo.low && c.volume === ohlcInfo.volume)?.timestamp) || candles[candles.length - 1].timestamp } : candles[candles.length - 1]);
                                        if (!gapInfo) return <span className="text-gray-500">No data</span>;
                                        const sign = gapInfo.gap > 0 ? '+' : '';
                                        return (
                                            <span className={`font-semibold ${gapInfo.gap > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {sign}{gapInfo.gap.toFixed(2)}
                                            </span>
                                        );
                                    })()}
                                </span>
                            </div>

                            {avgVolume > 0 && (
                                <>
                                    <div className="flex justify-between font-bold">
                                        <span>Avg Vol:</span>
                                        <span className="text-gray-600">
                                            {avgVolume >= 1000000 
                                                ? `${(avgVolume / 1000000).toFixed(2)}M` 
                                                : `${(avgVolume / 1000).toFixed(1)}K`}
                                        </span>
                                    </div>
                                    {ohlcInfo?.volume && (
                                        <div className="flex justify-between font-bold">
                                            <span>Vol Ratio:</span>
                                            <span className={ohlcInfo.volume > avgVolume ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                                {(ohlcInfo.volume / avgVolume).toFixed(1)}x
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )
            )}
            
            {/* Error messages for indicators */}
            {(emaError || rsiError || vixError) && (
                <div className="absolute top-1 right-4 z-[202] bg-red-50 text-red-700 p-2 md:p-5 rounded-lg font-semibold text-sm md:text-base border-2 border-red-700 md:min-w-[400px] md:w-[420px] min-w-[280px] w-[300px]">
                    {emaError && <div>{emaError}</div>}
                    {rsiError && <div>{rsiError}</div>}
                    {vixError && <div>{vixError}</div>}
                </div>
            )}
         
            {/* Floating OHLC info at top left (inside chart area) */}
           
            {candleAnalysis && !isMobile && (
                <div className={`absolute top-1 md:-right-[400px] -right-[280px] z-[200] bg-white/95 p-3 md:p-4 rounded-lg font-semibold text-sm md:text-base text-gray-800 shadow-xl border-4 min-w-[280px] max-w-[350px] ${candleAnalysis.finalProfitLoss >= 0 ? 'border-green-600' : 'border-red-700'}`}>
                    <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-base md:text-lg">📊 Analysis</span>
                            <button
                                onClick={() => setCandleAnalysis(null)}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold transition-colors"
                                title="Close"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                    
                    <div style={{ lineHeight: 1.4 }}>
                        <div style={{ marginBottom: 6 }}>
                            <span style={{ color: '#666' }}>Trend:</span> 
                            <span className={`font-bold ${candleAnalysis.trendDirection === 'bullish' ? 'text-green-600' : 'text-red-700'}`}>
                                {candleAnalysis.trendDirection === 'bullish' ? '📈 Bullish' : '📉 Bearish'}
                            </span>
                        </div>
                        
                        <div className="mb-1.5">
                            <span className="text-gray-600">Duration:</span>
                            <b> {candleAnalysis.candlesAnalyzed} candles</b>
                            <span className="text-xs text-gray-500 ml-1">
                                (until {candleAnalysis.swingPointLabel})
                            </span>
                        </div>

                        <div className="mb-1.5">
                            <span className="text-gray-600">Period:</span>
                            <div className="text-xs text-gray-700 mt-0.5">
                                <div><b>Start:</b> {candleAnalysis.startDate}</div>
                                <div><b>End:</b> {candleAnalysis.endDate}</div>
                            </div>
                        </div>

                        <div className="mb-1.5">
                            <span className="text-gray-600">Max Profit:</span>
                            <span className="text-green-600 font-bold">
                                +{candleAnalysis.maxProfitPercent.toFixed(2)}%
                                (₹{candleAnalysis.maxProfitPrice.toFixed(2)})
                            </span>
                        </div>

                        <div className="mb-1.5">
                            <span className="text-gray-600">Max Loss:</span>
                            <span className="text-red-700 font-bold">
                                {candleAnalysis.maxLossPercent.toFixed(2)}%
                                (₹{candleAnalysis.maxLossPrice.toFixed(2)})
                            </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-gray-200 font-bold text-sm md:text-base">
                            <span className="text-gray-600">Final Result:</span> 
                            <span style={{ 
                                color: candleAnalysis.finalProfitLoss >= 0 ? '#1e7e34' : '#c62828'
                            }}>
                                {candleAnalysis.finalProfitLoss >= 0 ? '+' : ''}
                                {candleAnalysis.finalProfitLossPercent.toFixed(2)}%
                                {candleAnalysis.finalProfitLoss >= 0 ? ' 💰' : ' 📉'}
                            </span>
                        </div>
                        
                        <div style={{ 
                            marginTop: 8, 
                            fontSize: 12, 
                            color: '#888',
                            fontStyle: 'italic'
                        }}>
                            Analysis from entry through trend reversal candle
                        </div>
                    </div>
                </div>
            )}
            
            <div ref={UnderstchartContainerRef} style={{ 
                width: '100%', 
                height: `${height - 5}px`
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