"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { useIsMobile } from '../hooks/use-mobile';
import { OHLCChart } from './OHLCChart';
import { Candle } from './types/candle';
import { calculateIndicators } from './utils/indicators';
import { Timeframe, processTimeframeData } from './utils/timeframeUtils';
import { fetchPaginatedUpstoxData, UpstoxPaginationParams } from './utils/upstoxApi';


// Performance optimization constants
const MAX_CANDLES_FOR_CHART = 10000; // Limit for ultra-fast performance
const PAGINATION_CHUNK_SIZE = 500; // Smaller chunks for faster loading

// Progressive loading configuration
const PROGRESSIVE_BATCH_CONFIG = {
  '1m': { batchSize: 5000, targetDays: 365, maxBatches: 110 },  // 550k ≈ 1y
  '5m': { batchSize: 5000, targetDays: 365, maxBatches: 25 },   // 125k ≈ 1y
  '15m': { batchSize: 2500, targetDays: 365, maxBatches: 15 },  // 37.5k ≈ 1y
  '30m': { batchSize: 2000, targetDays: 365, maxBatches: 10 },  // 20k ≈ 1y
  '1h': { batchSize: 1000, targetDays: 365, maxBatches: 10 },   // 10k ≈ 1y
  '4h': { batchSize: 1500, targetDays: 730, maxBatches: 5 },    // 2.5k ≈ 2y
  '1d': { batchSize: 1500, targetDays: 1500, maxBatches: 1 },   // 1500 ≈ 4y
  '1w': { batchSize: 520, targetDays: 3650, maxBatches: 1 },    // 520 ≈ 10y
} as const;

export const OHLCChartDemo: React.FC = () => {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [rawCandles, setRawCandles] = useState<Candle[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1d');
  const [isLoading, setIsLoading] = useState(false);
  const [keyMapping, setKeyMapping] = useState<{ [companyName: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedInstrumentKey, setSelectedInstrumentKey] = useState<string>('');
  const [analysisList, setAnalysisList] = useState<{ timestamp: string; swingLabel?: string; }[]>([]);
  const [support, setSupport] = useState<{ value: number } | null>(null);
  const [resistance, setResistance] = useState<{ value: number } | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [shouldAutoLoad, setShouldAutoLoad] = useState(false);
  const [showSwingPoints, setShowSwingPoints] = useState(false);
  const [avgVolume, setAvgVolume] = useState<number>(0);
  // Chart indicator toggles
  const [showRSI] = useState(false);
  
  // EMA calculation toggle - separate from display toggle
  const [emaCalculation, setEmaCalculation] = useState(false);
  const [isCalculatingEMA, setIsCalculatingEMA] = useState(false);
  
  // showEMA should be controlled by emaCalculation to avoid chart errors
  const showEMA = emaCalculation;
  // Pagination state for Upstox API
  const [hasMoreCandles, setHasMoreCandles] = useState(false);
  const [loadingOlderData, setLoadingOlderData] = useState(false);
  const [oldestCandleTime, setOldestCandleTime] = useState<string | undefined>(undefined);
  const [newestCandleTime, setNewestCandleTime] = useState<string | undefined>(undefined);
  // API Key modal
  
  // Entry dates state
  const [strykeEntryDates, setStrykeEntryDates] = useState<string[]>([]);
  const [algoEntryDates, setAlgoEntryDates] = useState<string[]>([]);
  const [realTimeEntryDates, setRealTimeEntryDates] = useState<string[]>([]);

  // View mode state
  const [viewMode, setViewMode] = useState<'stryke' | 'algo'>('stryke');

  // Risk-reward parameters from URL
  const [entryPrice, setEntryPrice] = useState<number | undefined>(undefined);
  const [targetPrice, setTargetPrice] = useState<number | undefined>(undefined);
  const [stopLossPrice, setStopLossPrice] = useState<number | undefined>(undefined);

  // Specific configs for Stryke and Algo
  const [strykeConfig, setStrykeConfig] = useState<{
    entryPrice?: number;
    targetPrice?: number;
    stopLossPrice?: number;
  }>({});

  const [algoConfig, setAlgoConfig] = useState<{
    entryPrice?: number;
    targetPrice?: number;
    stopLossPrice?: number;
  }>({});

  const [shouldFetchIntraDay, setShouldFetchIntraDay] = useState(true);

  // Mock trading date/time filter state
  const [maxDate, setMaxDate] = useState<string>('');
  const [maxTime, setMaxTime] = useState<string>('');

  // Progressive loading state
  const [isProgressiveLoading, setIsProgressiveLoading] = useState(false);
  const [progressiveLoadingProgress, setProgressiveLoadingProgress] = useState({ loaded: 0, total: 0 });
  const [progressiveAbortController, setProgressiveAbortController] = useState<AbortController | null>(null);

  // Device detection for responsive design
  const isMobile = useIsMobile();
  const [windowHeight, setWindowHeight] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Controls visibility state
  const [showControls, setShowControls] = useState(false);

  // Chart container dimensions for dynamic height calculation
  const [chartContainerDimensions, setChartContainerDimensions] = useState<{width: number, height: number} | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

 // Fetch KeyMapping from Redis on mount
  useEffect(() => {
    setIsLoading(true);
    fetch("https://saved-dassie-60359.upstash.io/get/KeyMapping", {
      method: "GET",
      headers: {
        Authorization: `Bearer AevHAAIjcDE5ZjcwOWVlMmQzNWI0MmE5YTA0NzgxN2VhN2E0MTNjZHAxMA`,
      },
    })
      .then(res => res.json())
      .then(data => {
        const mapping = JSON.parse(data.result);
        setKeyMapping(mapping);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Calculate available chart height by measuring all elements above the chart
  const availableChartHeight = useMemo(() => {
    if (!mounted || typeof window === 'undefined') return isMobile ? 750 : 1100;
    
    const viewportHeight = window.innerHeight;
    let usedHeight = 0;
    
    // Account for browser UI (address bar, etc.) on mobile
    if (isMobile && window.visualViewport) {
      usedHeight += (window.innerHeight - window.visualViewport.height);
    }
    
    // Add some padding for safe areas
    usedHeight += 16; // 1rem padding
    
    // If we have measured container dimensions, use them
    if (chartContainerDimensions && chartContainerDimensions.height > 0) {
      return chartContainerDimensions.height;
    }
    
    // Otherwise calculate based on viewport minus estimated UI elements
    // Title height (approx 2rem + margins)
    if (selectedCompany) {
      usedHeight += 48; // ~3rem
    }
    
    // Controls height (when visible)
    if (showControls) {
      if (isMobile) {
        usedHeight += 280; // Estimated mobile controls height
      } else {
        usedHeight += 120; // Estimated desktop controls height
      }
    } else {
      usedHeight += 48; // Show controls button height
    }
    
    const calculatedHeight = Math.max(viewportHeight - usedHeight, 350);
    console.log('📏 Calculated available chart height:', {
      viewportHeight,
      usedHeight,
      calculatedHeight,
      isMobile,
      showControls,
      selectedCompany
    });
    
    return calculatedHeight;
  }, [mounted, isMobile, selectedCompany, showControls, chartContainerDimensions]);

  // Next.js routing hooks for URL parameters
  const searchParams = useSearchParams();
  const router = useRouter();

  // Function to find company name from instrument key (reverse lookup)
  const findCompanyNameFromInstrumentKey = useCallback((instrumentKey: string): string | null => {
    for (const [companyName, key] of Object.entries(keyMapping)) {
      if (key === instrumentKey) {
        return companyName;
      }
    }
    return null;
  }, [keyMapping]);

  // Function to update URL parameters
  const updateUrlParams = useCallback((instrumentKey: string, timeframe: Timeframe, date?: string, time?: string, strykeDate?: string, algoDate?: string, realTimeDate?: string) => {
    const params = new URLSearchParams();
    if (instrumentKey) {
      params.set('instrumentKey', instrumentKey);
    }
    if (timeframe) {
      params.set('timeframe', timeframe);
    }
    if (date) {
      params.set('date', date);
    }
    if (time) {
      params.set('time', time);
    }
    if (strykeDate) {
      params.set('strykeDate', strykeDate);
    }
    if (algoDate) {
      params.set('algoDate', algoDate);
    }
    if (realTimeDate) {
      params.set('realTimeDate', realTimeDate);
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [router]);

  /**
   * Get the most recent trading day (excludes weekends and uses previous day)
   * @param date The reference date
   * @returns The most recent trading day
   */
  const getLastTradingDay = (date: Date): Date => {
    const lastTradingDay = new Date(date);
    
    // Always go back one day from the current date since today's data might not be available
    lastTradingDay.setDate(lastTradingDay.getDate() - 1);
    
    // If it's a weekend, go back to Friday
    const dayOfWeek = lastTradingDay.getDay(); // 0 = Sunday, 6 = Saturday
    
    if (dayOfWeek === 0) { // Sunday
      lastTradingDay.setDate(lastTradingDay.getDate() - 2); // Go back to Friday
    } else if (dayOfWeek === 6) { // Saturday
      lastTradingDay.setDate(lastTradingDay.getDate() - 1); // Go back to Friday
    }
    
    return lastTradingDay;
  };

  /**
   * Calculate date ranges for progressive loading to get historical data
   * @param timeframe The selected timeframe
   * @param lastTradingDay The most recent trading day
   * @returns Array of date ranges for batch loading
   */
  const calculateProgressiveDateRanges = (timeframe: Timeframe, lastTradingDay: Date): Array<{from: Date, to: Date}> => {
    const config = PROGRESSIVE_BATCH_CONFIG[timeframe];
    const ranges: Array<{from: Date, to: Date}> = [];
    
    // Calculate how many calendar days each batch should cover
    const daysPerBatch = Math.max(7, Math.ceil(config.targetDays / config.maxBatches));
    
    // Limit total batches to prevent excessive API calls
    const totalBatches = Math.min(config.maxBatches, Math.ceil(config.targetDays / daysPerBatch));
    
    let currentTo = new Date(lastTradingDay);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const currentFrom = new Date(currentTo);
      currentFrom.setDate(currentFrom.getDate() - daysPerBatch);
      
      ranges.push({
        from: new Date(currentFrom),
        to: new Date(currentTo)
      });
      
      // Move to next batch (no gap between batches to ensure continuity)
      currentTo = new Date(currentFrom);
    }
    
    return ranges;
  };


  /**
   * Legacy function for backward compatibility - calculate date range for single batch
   */
  const calculateFromDate = (baseDate: Date, timeframe: Timeframe): Date => {
    const from = new Date(baseDate);
    
    // Calculate based on typical trading hours and market days to get ~100 candles
    switch (timeframe) {
      case '1m':
        from.setDate(from.getDate() - 60);
        break;
      case '5m':
        from.setDate(from.getDate() - 60);
        break;
      case '15m':
        from.setDate(from.getDate() - 360);
        break;
      case '30m':
        from.setDate(from.getDate() - 90);
        break;
      case '1h':
        from.setDate(from.getDate() - 90);
        break;
      case '4h':
        from.setDate(from.getDate() - 20);
        break;
      case '1d':
        from.setDate(from.getDate() - 500);
        break;
      case '1w':
        from.setDate(from.getDate() - 730);
        break;
      default:
        from.setDate(from.getDate() - 90);
    }
    
    return from;
  };

  // Separate EMA calculation function
  const calculateEMAForCandles = useCallback((candlesToProcess: Candle[]): Candle[] => {
    if (!candlesToProcess || candlesToProcess.length === 0) {
      return candlesToProcess;
    }

    if (!emaCalculation) {
      // If EMA calculation is disabled, return candles without EMA data
      // Use undefined to indicate no EMA data available
      return candlesToProcess.map(candle => ({
        ...candle,
        ema8: undefined,
        ema30: undefined,
        ema: undefined
      }));
    }

    // Calculate EMA8, EMA30, and EMA200 using the shared utility
    // This ensures consistency across the app
    return calculateIndicators(candlesToProcess, 200, 14, false);
  }, [emaCalculation]);

  // Unified function to apply EMA calculations to candles
  const applyEMAToCandles = useCallback((candlesToProcess: Candle[]): Candle[] => {
    return calculateEMAForCandles(candlesToProcess);
  }, [calculateEMAForCandles]);



  // Window height detection and mounted state for SSR
  useEffect(() => {
    // Mark component as mounted to prevent hydration mismatches
    setMounted(true);
    
    const updateWindowHeight = () => {
      if (typeof window !== 'undefined') {
        setWindowHeight(window.innerHeight);
      }
    };

    // Initial check
    updateWindowHeight();

    // Listen for window resize
    window.addEventListener('resize', updateWindowHeight);

    return () => {
      window.removeEventListener('resize', updateWindowHeight);
    };
  }, []);


  // Process URL parameters after keyMapping is loaded
  useEffect(() => {
    if (!searchParams || Object.keys(keyMapping).length === 0) return; // Wait for keyMapping to load

    const instrumentKeyParam = searchParams.get('instrumentKey');
    const timeframeParam = searchParams.get('timeframe') as Timeframe;
    const dateParam = searchParams.get('date');
    const timeParam = searchParams.get('time');
    const strykeDateParam = searchParams.get('strykeDate');
    const algoDateParam = searchParams.get('algoDate');
    const realTimeDateParam = searchParams.get('realTimeDate');
    const entryPriceParam = searchParams.get('entryPrice');
    const targetPriceParam = searchParams.get('targetPrice');
    const stopLossPriceParam = searchParams.get('stopLossPrice');

    // New params for specific configs
    const strykeEntryPriceParam = searchParams.get('strykeEntryPrice');
    const strykeTargetPriceParam = searchParams.get('strykeTargetPrice');
    const strykeStopLossPriceParam = searchParams.get('strykeStopLossPrice');

    const algoEntryPriceParam = searchParams.get('algoEntryPrice');
    const algoTargetPriceParam = searchParams.get('algoTargetPrice');
    const algoStopLossPriceParam = searchParams.get('algoStopLossPrice');

    if (instrumentKeyParam && timeframeParam) {
      //console.log('🔗 Processing URL parameters:', { instrumentKeyParam, timeframeParam, dateParam, timeParam });
      
      // Validate timeframe
      const validTimeframes: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
      const isValidTimeframe = validTimeframes.includes(timeframeParam);
      
      if (!isValidTimeframe) {
        console.warn('❌ Invalid timeframe in URL:', timeframeParam);
        toast.error(`Invalid timeframe: ${timeframeParam}. Using default 1d.`);
        return;
      }

      // Find company name from instrument key
      const companyName = findCompanyNameFromInstrumentKey(instrumentKeyParam);
      
      if (!companyName) {
        console.warn('❌ Company not found for instrument key:', instrumentKeyParam);
        toast.error(`Company not found for instrument key: ${instrumentKeyParam}`);
        return;
      }

      //console.log('✅ Found company for URL params:', { companyName, instrumentKeyParam, timeframeParam, dateParam, timeParam });
      
      // Set the state
      setSelectedCompany(companyName);
      setSelectedInstrumentKey(instrumentKeyParam);
      setSelectedTimeframe(timeframeParam);
      setMaxDate(dateParam || '');
      setMaxTime(timeParam || '');
      
      // Parse and set stryke and algo dates
      let hasStrykeData = false;
      let hasAlgoData = false;
      let hasRealTimeData = false;

      if (strykeDateParam) {
        try {
          const strykeDates = strykeDateParam.split(',').map(date => date.trim()).filter(date => date);
          setStrykeEntryDates(strykeDates);
          if (strykeDates.length > 0) hasStrykeData = true;
        } catch (error) {
          console.warn('Invalid strykeDate parameter:', strykeDateParam);
          setStrykeEntryDates([]);
        }
      } else {
        setStrykeEntryDates([]);
      }
      
      if (algoDateParam) {
        try {
          const algoDates = algoDateParam.split(',').map(date => date.trim()).filter(date => date);
          setAlgoEntryDates(algoDates);
          if (algoDates.length > 0) hasAlgoData = true;
        } catch (error) {
          console.warn('Invalid algoDate parameter:', algoDateParam);
          setAlgoEntryDates([]);
        }
      } else {
        setAlgoEntryDates([]);
      }

      if (realTimeDateParam) {
        try {
          const realTimeDates = realTimeDateParam.split(',').map(date => date.trim()).filter(date => date);
          setRealTimeEntryDates(realTimeDates);
          if (realTimeDates.length > 0) hasRealTimeData = true;
        } catch (error) {
          console.warn('Invalid realTimeDate parameter:', realTimeDateParam);
          setRealTimeEntryDates([]);
        }
      } else {
        setRealTimeEntryDates([]);
      }
      
      // Parse risk-reward parameters (Legacy/Global)
      if (entryPriceParam) {
        const parsedEntryPrice = Number.parseFloat(entryPriceParam);
        setEntryPrice(Number.isNaN(parsedEntryPrice) ? undefined : parsedEntryPrice);
      } else {
        setEntryPrice(undefined);
      }
      
      if (targetPriceParam) {
        const parsedTargetPrice = Number.parseFloat(targetPriceParam);
        setTargetPrice(Number.isNaN(parsedTargetPrice) ? undefined : parsedTargetPrice);
      } else {
        setTargetPrice(undefined);
      }
      
      if (stopLossPriceParam) {
        const parsedStopLossPrice = Number.parseFloat(stopLossPriceParam);
        setStopLossPrice(Number.isNaN(parsedStopLossPrice) ? undefined : parsedStopLossPrice);
      } else {
        setStopLossPrice(undefined);
      }

      // Parse Stryke Config
      const newStrykeConfig = {
        entryPrice: strykeEntryPriceParam ? Number.parseFloat(strykeEntryPriceParam) : undefined,
        targetPrice: strykeTargetPriceParam ? Number.parseFloat(strykeTargetPriceParam) : undefined,
        stopLossPrice: strykeStopLossPriceParam ? Number.parseFloat(strykeStopLossPriceParam) : undefined,
      };
      setStrykeConfig(newStrykeConfig);
      if (newStrykeConfig.entryPrice) hasStrykeData = true;

      // Parse Algo Config
      const newAlgoConfig = {
        entryPrice: algoEntryPriceParam ? Number.parseFloat(algoEntryPriceParam) : undefined,
        targetPrice: algoTargetPriceParam ? Number.parseFloat(algoTargetPriceParam) : undefined,
        stopLossPrice: algoStopLossPriceParam ? Number.parseFloat(algoStopLossPriceParam) : undefined,
      };
      setAlgoConfig(newAlgoConfig);
      if (newAlgoConfig.entryPrice) hasAlgoData = true;

      // Determine default view mode
      if (hasStrykeData && hasAlgoData) {
        setViewMode('stryke');
      } else if (hasAlgoData) {
        setViewMode('algo');
      } else {
        setViewMode('stryke');
      }

      // Mark that we have URL parameters to auto-load
      if (instrumentKeyParam && timeframeParam) {
        setShouldAutoLoad(true);
      }
    
    }
  }, [keyMapping, searchParams, findCompanyNameFromInstrumentKey]);

  // Auto-load data when all required state is ready
  useEffect(() => {
    if (shouldAutoLoad && selectedCompany && selectedInstrumentKey && isFirstLoad) {
      console.log('🔄 Auto-loading data - all state ready');
      setIsFirstLoad(false);
      setShouldAutoLoad(false);
      handleFetchData();
    }
  }, [shouldAutoLoad, selectedCompany, selectedInstrumentKey, isFirstLoad]);

  // Update suggestions as user types
  useEffect(() => {
    if (!searchTerm) {
      setSuggestions([]);
      return;
    }
    const matches = Object.keys(keyMapping)
      .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 8);
    setSuggestions(matches);
  }, [searchTerm, keyMapping]);

  // Real-time EMA calculation when toggle changes
  useEffect(() => {
    if (candles.length === 0) return;

    //console.log(`🔄 EMA toggle changed to: ${emaCalculation}, recalculating for ${candles.length} candles`);
    setIsCalculatingEMA(true);
    
    try {
      // Apply EMA calculation based on current toggle state
      const updatedCandles = applyEMAToCandles(candles);
      
      // Log sample EMA values for debugging
      if (updatedCandles.length > 0) {
        const sample = updatedCandles[Math.min(10, updatedCandles.length - 1)];
        //console.log(`📊 Sample EMA values: ema8=${sample.ema8}, ema30=${sample.ema30}, showEMA=${emaCalculation}`);
      }
      
      setCandles(updatedCandles);
      
      // Show user feedback
      toast.success(emaCalculation ? 'EMA indicators enabled' : 'EMA indicators disabled', {
        duration: 2000
      });
      
      //console.log(`✅ EMA recalculation completed`);
    } catch (error) {
      console.error('Error recalculating EMA:', error);
      toast.error('Failed to update EMA calculations');
    } finally {
      setIsCalculatingEMA(false);
    }
  }, [emaCalculation, applyEMAToCandles]); // Don't include candles to avoid infinite loop

  // Update chart container dimensions when mounted or resized
  useLayoutEffect(() => {
    const updateChartContainerDimensions = () => {
      if (chartContainerRef.current && mounted) {
        const rect = chartContainerRef.current.getBoundingClientRect();
        const newHeight = rect.height;
        const newWidth = rect.width;
        
        // Only update if dimensions have actually changed and are valid
        setChartContainerDimensions(prev => {
          if (!prev || prev?.height !== newHeight || prev.width !== newWidth) {
            console.log('📏 Updated chart container dimensions:', { width: newWidth, height: newHeight });
            return { width: newWidth, height: newHeight };
          }
          return prev;
        });
      }
    };

    // Initial measurement - delay slightly to ensure DOM is ready
    const timeoutId = setTimeout(updateChartContainerDimensions, 0);

    // Update on window resize
    window.addEventListener('resize', updateChartContainerDimensions);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateChartContainerDimensions);
    };
  }, [mounted]);

  // Use ref to track previous instrument key
  const prevInstrumentKeyRef = useRef<string>('');
  
  // Cancel progressive loading when changing companies
  useEffect(() => {
    const currentKey = selectedInstrumentKey;
    const previousKey = prevInstrumentKeyRef.current;
    
    //console.log(`🔍 Company change check: previous="${previousKey}", current="${currentKey}", hasAbortController=${!!progressiveAbortController}`);
    
    // Only abort if we have a previous key and it's different from current
    if (previousKey && previousKey !== currentKey && progressiveAbortController) {
      //console.log(`🔄 Aborting progressive loading due to company change: ${previousKey} → ${currentKey}`);
      progressiveAbortController.abort();
      setProgressiveAbortController(null);
      setIsProgressiveLoading(false);
    }
    
    // Update the ref with current key
    prevInstrumentKeyRef.current = currentKey;
  }, [selectedInstrumentKey]); // Only depend on instrumentKey, not abortController

  const handleSelectCompany = useCallback((companyName: string) => {
    setSelectedCompany(companyName);
    const instrumentKey = keyMapping[companyName];
    setSelectedInstrumentKey(instrumentKey);
    setSearchTerm(companyName);
    setSuggestions([]);

    // Update URL parameters
    if (instrumentKey) {
      const strykeDateStr = strykeEntryDates.length > 0 ? strykeEntryDates.join(',') : undefined;
      const algoDateStr = algoEntryDates.length > 0 ? algoEntryDates.join(',') : undefined;
      const realTimeDateStr = realTimeEntryDates.length > 0 ? realTimeEntryDates.join(',') : undefined;
      updateUrlParams(instrumentKey, selectedTimeframe, maxDate, maxTime, strykeDateStr, algoDateStr, realTimeDateStr);
    }

    // Fetch entry dates when a new company is selected
    if (instrumentKey && companyName) {
      //fetchEntryDates(instrumentKey, companyName);
    }

    // We preserve the current view (either chart view or boom days) when selecting a new company
  }, [keyMapping, selectedTimeframe, updateUrlParams, maxDate, maxTime]); // Add dependencies for useCallback

  // Function to filter candles based on max date and time for mock trading
  const filterCandlesByDateTime = useCallback((candlesToFilter: Candle[]): Candle[] => {
    if (!maxDate || !maxTime || candlesToFilter.length === 0) {
      return candlesToFilter; // No filtering if no date/time specified
    }

    try {
      //console.log(`🔍 Starting date/time filtering with maxDate=${maxDate}, maxTime=${maxTime}`);
      
      // Parse the time with proper format (add seconds if missing)
      const timeWithSeconds = maxTime.includes(':') && maxTime.split(':').length === 2 
        ? `${maxTime}:00` 
        : maxTime;
      
      // Create maxDateTime in UTC to match the candle timestamps format
      // Since the URL time is likely in IST (Indian Standard Time), we need to handle timezone properly
      const maxDateTime = new Date(`${maxDate}T${timeWithSeconds}.000Z`);
      
      if (isNaN(maxDateTime.getTime())) {
        console.warn('❌ Invalid date/time format for filtering:', { maxDate, maxTime, timeWithSeconds });
        return candlesToFilter;
      }

      //console.log(`🔍 Filtering candles: showing data up to ${maxDateTime.toISOString()}`);
      //console.log(`🔍 Sample candle timestamps:`, candlesToFilter.slice(0, 3).map(c => c.timestamp));
      //console.log(`🔍 Sample candle timestamps (last 3):`, candlesToFilter.slice(-3).map(c => c.timestamp));
      
      // Filter candles to only include those with timestamps before or equal to maxDateTime
      const filteredCandles = candlesToFilter.filter((candle, index) => {
        const candleTime = new Date(candle.timestamp);
        const isBeforeMax = candleTime <= maxDateTime;
        
        // Log first few comparisons for debugging
        if (index < 3) {
          //console.log(`🔍 Comparing #${index}:`, candleTime.toISOString(), maxDateTime.toISOString());
        }
        
        return isBeforeMax;
      });

      //console.log(`✅ Filtered ${candlesToFilter.length} candles down to ${filteredCandles.length} candles`);
      
      if (filteredCandles.length === 0 && candlesToFilter.length > 0) {
        console.warn(`⚠️ All candles filtered out! This suggests a timezone or date format issue.`);
        //console.log(`Debug info:`, maxDate, maxTime, maxDateTime.toISOString());
      }
      
      return filteredCandles;
    } catch (error) {
      console.error('Error filtering candles by date/time:', error);
      return candlesToFilter; // Return unfiltered candles on error
    }
  }, [maxDate, maxTime]);

  // Re-apply date/time filtering when parameters change
  useEffect(() => {
    if (rawCandles.length > 0) {
      //console.log(`🔄 Re-applying date/time filter: date=${maxDate}, time=${maxTime}`);
      const timeframeProcessedData = processTimeframeData(rawCandles, selectedTimeframe);
      const emaProcessedCandles = applyEMAToCandles(timeframeProcessedData);
      const filteredCandles = filterCandlesByDateTime(emaProcessedCandles);
      setCandles(filteredCandles);
    }
  }, [maxDate, maxTime, rawCandles, selectedTimeframe, processTimeframeData, applyEMAToCandles, filterCandlesByDateTime]);

  // Performance optimization: limit displayed candles to prevent slowdown
  const optimizedCandles = useMemo(() => {
    if (candles.length <= MAX_CANDLES_FOR_CHART) {
      return candles;
    }
    
    // Keep the most recent candles for better performance
    const recentCandles = candles.slice(-MAX_CANDLES_FOR_CHART);
    //console.log(`Performance optimization: Showing ${recentCandles.length} of ${candles.length} candles`);
    return recentCandles;
  }, [candles]);

  // Progressive loading function for initial data loads
  const fetchCandlesProgressively = useCallback(async (): Promise<void> => {
 
    
    // Prevent multiple concurrent progressive loading operations
    if (isProgressiveLoading) {
      return;
    }
    
    // Validation checks
    if (!selectedCompany || !selectedInstrumentKey) {
      toast.error('Please select a company from the search dropdown first.', { duration: 3000 });
      return;
    }
    
    // Cancel any existing progressive loading
    if (progressiveAbortController) {
      progressiveAbortController.abort();
    }

    const abortController = new AbortController();
    setProgressiveAbortController(abortController);

    // Check if already aborted (edge case)
    if (abortController.signal.aborted) {
      return;
    }

    // Reset state for fresh load
    setCandles([]);
    setRawCandles([]);
    setHasMoreCandles(false);
    setOldestCandleTime(undefined);
    setNewestCandleTime(undefined);
    setIsProgressiveLoading(true);
  

    try {
      const lastTradingDay = getLastTradingDay(new Date());
      
      const dateRanges = calculateProgressiveDateRanges(selectedTimeframe, lastTradingDay);
      
      setProgressiveLoadingProgress({ loaded: 0, total: dateRanges.length });
      
      let allCandles: Candle[] = [];
      let batchCount = 0;

      for (const range of dateRanges) {
        // Check if aborted
        if (abortController.signal.aborted) {
          return;
        }

        try {
          const params: UpstoxPaginationParams = {
            instrumentKey: selectedInstrumentKey,
            timeframe: selectedTimeframe,
            from: range.from.toISOString(),
            to: range.to.toISOString(),
            limit: PROGRESSIVE_BATCH_CONFIG[selectedTimeframe].batchSize
          };

          const result = await fetchPaginatedUpstoxData(params, shouldFetchIntraDay);
          setShouldFetchIntraDay(false);

          // Check if aborted after API call
          if (abortController.signal.aborted) {
            return;
          }

          if (result.candles.length > 0) {
            // Sort and process new candles
            const sortedCandles = [...result.candles]
              .filter((candle, index, self) =>
                index === self.findIndex((c) => c.timestamp === candle.timestamp)
              )
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            // Merge with existing candles
            allCandles = [...allCandles, ...sortedCandles];
            
            // Remove duplicates across all batches
            const uniqueCandles = allCandles.filter((candle, index, self) =>
              index === self.findIndex((c) => c.timestamp === candle.timestamp)
            );
            uniqueCandles.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            
            allCandles = uniqueCandles;

            // Update state with current progress
            setRawCandles(allCandles);
            
            // Apply timeframe processing and EMA
            const timeframeProcessedData = processTimeframeData(allCandles, selectedTimeframe);
            const emaProcessedCandles = applyEMAToCandles(timeframeProcessedData);
            const finalCandles = filterCandlesByDateTime(emaProcessedCandles);
            setCandles(finalCandles);

            batchCount++;
            setProgressiveLoadingProgress({ loaded: batchCount, total: dateRanges.length });

            // Show immediate feedback for first batch
            if (batchCount === 1) {
              setIsLoading(false); // Stop showing main loading spinner
              toast.success(`Initial data loaded - continuing in background`);
              
              // Set other initial data
              setAnalysisList([]);
              setSupport(null);
              setResistance(null);
              
              if (isFirstLoad) {
                setIsFirstLoad(false);
              }
            }

            // Calculate average volume from all accumulated candles for better accuracy
            if (allCandles.length > 0) {
              const volumes = allCandles.map((candle) => candle.volume);
              const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
              setAvgVolume(avgVol);
            }

          } 

          // Small delay between batches to prevent overwhelming the API
          if (batchCount < dateRanges.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

        } catch (batchError) {
          console.error(`❌ Error in batch ${batchCount + 1}:`, batchError);
          
          // Check if error is due to abort
          if (abortController.signal.aborted) {
            return;
          }
          
          // For API errors, continue with next batch but log the error
          if (batchError instanceof Error && (
            batchError.message.includes('aborted') ||
            batchError.message.includes('cancelled')
          )) {
            return;
          }
          
          // Continue with next batch for other errors (network issues, etc.)
          console.warn(`⚠️ Continuing progressive loading despite batch ${batchCount + 1} error`);
        }
      }

      // Update final state
      setHasMoreCandles(false); // No more data to load
      setOldestCandleTime(allCandles[0]?.timestamp);
      setNewestCandleTime(allCandles[allCandles.length - 1]?.timestamp);
      
      toast.success(`Progressive loading complete: ${allCandles.length} candles loaded`);

    } catch (error) {
      console.error('❌ Progressive loading error:', error);
      
      // Check if this is an abort error
      if (error instanceof Error && (
        error.message.includes('aborted') ||
        error.message.includes('cancelled') ||
        abortController.signal.aborted
      )) {
        toast.error('Data loading cancelled');
      } else {
        console.error('❌ Unexpected progressive loading error:', error);
        toast.error('Failed to load data progressively. Please try again.');
      }
    } finally {
      // Clean up loading states
      setIsProgressiveLoading(false);
      setIsLoading(false);
      
      // Only clear abort controller if it's the current one we created
      if (progressiveAbortController === abortController) {
        setProgressiveAbortController(null);
      } 
    }
  }, [
    selectedCompany,
    selectedInstrumentKey,
  //  fetchEntryDates,
    shouldFetchIntraDay,
    applyEMAToCandles,
    isFirstLoad,
    isProgressiveLoading
  ]); // Removed progressiveAbortController from dependencies to prevent recreation

  // Unified function to fetch candles for all scenarios
  type FetchMode = 'initial' | 'pagination' | 'timeframe-change';
  
  interface FetchCandlesOptions {
    mode: FetchMode;
    timeframe?: Timeframe;
    resetState?: boolean;
    showLoadingToast?: boolean;
    loadingMessage?: string;
  }

  const fetchCandles = useCallback(async (options: FetchCandlesOptions): Promise<void> => {
    const { 
      mode, 
      timeframe = selectedTimeframe, 
      resetState = mode === 'initial' || mode === 'timeframe-change',
      showLoadingToast = mode === 'pagination',
      loadingMessage = 'Loading data...'
    } = options;

    //console.log(`🚀 fetchCandles called with mode: ${mode}`, selectedCompany, selectedInstrumentKey, timeframe);

    // Validation checks
    if (!selectedCompany || !selectedInstrumentKey) {
      toast.error('Please select a company from the search dropdown first.', { duration: 3000 });
      return;
    }
    
    // Early return for pagination if already loading
    if (mode === 'pagination' && loadingOlderData) {
      return;
    }

    // Set loading states
    if (mode === 'pagination') {
      setLoadingOlderData(true);
    } else {
      setIsLoading(true);
    }

    // Reset state for fresh loads
    if (resetState) {
      setCandles([]);
      setRawCandles([]);
      setHasMoreCandles(false);
      setOldestCandleTime(undefined);
      setNewestCandleTime(undefined);
      
      // Only fetch entry dates for initial loads (not timeframe changes)
      if (mode === 'initial') {
      //  fetchEntryDates(selectedInstrumentKey, selectedCompany);
      }
    }

    // Show loading toast for long operations
    let loadingToastId: string | undefined;
    if (showLoadingToast || mode === 'timeframe-change') {
      loadingToastId = toast.loading(loadingMessage);
    }

    try {
      // Calculate date range based on mode
      let to: string;
      let from: Date;
      
      if (mode === 'pagination') {
        // For pagination, fetch older data relative to the oldest existing candle
        const oldestCandle = candles.at(0);
        const oldestDate = new Date(oldestCandle?.timestamp ?? new Date().toISOString());
        to = oldestDate.toISOString();
        from = calculateFromDate(oldestDate, timeframe);
      } else {
        // For initial and timeframe-change, use current date as reference
        const now = new Date();
        const lastTradingDay = getLastTradingDay(now);
        to = lastTradingDay.toISOString();
        from = calculateFromDate(new Date(lastTradingDay), timeframe);
      }
      
      //console.log(`📅 Date range calculation for ${mode}:`, timeframe, from.toISOString(), to);
      
      const params: UpstoxPaginationParams = {
        instrumentKey: selectedInstrumentKey,
        timeframe: timeframe,
        from: from.toISOString(),
        to: to,
        limit: PAGINATION_CHUNK_SIZE
      };

      const result = await fetchPaginatedUpstoxData(params, shouldFetchIntraDay);
      setShouldFetchIntraDay(false);

      if (result.candles.length > 0) {
        // Sort and deduplicate candles
        const sortedCandles = [...result.candles]
          .filter((candle, index, self) =>
            index === self.findIndex((c) => c.timestamp === candle.timestamp)
          )
          .sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeA - timeB;
          });

        // Handle different merge strategies based on mode
        let finalRawCandles: Candle[];
        
        if (mode === 'pagination') {
          // Merge with existing candles for pagination
          const combinedCandles = [...sortedCandles, ...rawCandles];
          const uniqueCandles = combinedCandles.filter((candle, index, self) =>
            index === self.findIndex((c) => c.timestamp === candle.timestamp)
          );
          uniqueCandles.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          
          // Performance optimization: limit total stored candles
          const maxStoredCandles = MAX_CANDLES_FOR_CHART * 2;
          finalRawCandles = uniqueCandles.length > maxStoredCandles
            ? uniqueCandles.slice(-maxStoredCandles)
            : uniqueCandles;
            
          //console.log(`Memory optimization: Storing ${finalRawCandles.length} of ${uniqueCandles.length} total candles`);
        } else {
          // Fresh data for initial and timeframe-change
          finalRawCandles = sortedCandles;
        }
        
        setRawCandles(finalRawCandles);
        
        // Apply timeframe processing and EMA
        const timeframeProcessedData = processTimeframeData(finalRawCandles, timeframe);
        const emaProcessedCandles = applyEMAToCandles(timeframeProcessedData);
        const finalCandles = filterCandlesByDateTime(emaProcessedCandles);
        setCandles(finalCandles);
        
        // Update pagination state
        setHasMoreCandles(result.hasMore);
        setOldestCandleTime(result.oldestTimestamp);
        setNewestCandleTime(result.newestTimestamp);

        // Calculate average volume and set additional data for initial loads
        if (mode === 'initial') {
          const volumes = sortedCandles.map((candle) => candle.volume);
          const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
          setAvgVolume(avgVol);
          
          setAnalysisList([]);
          setSupport(null);
          setResistance(null);
          
          if (isFirstLoad) {
            setIsFirstLoad(false);
          }
        }
        
        // Success messages
        let successMessage: string;
        if (mode === 'initial') {
          successMessage = `Loaded data from Upstox for ${selectedCompany}`;
        } else if (mode === 'pagination') {
          successMessage = `Loaded ${result.candles.length} more historical candles`;
        } else {
          successMessage = `Successfully loaded ${timeframe} data`;
        }
          
        if (loadingToastId) {
          toast.success(successMessage, { id: loadingToastId });
        } else {
          toast.success(successMessage);
        }
        
      } else {
        const errorMessage = `No data available for the selected timeframe`;
        if (loadingToastId) {
          toast.error(errorMessage, { id: loadingToastId });
        } else {
          toast.error(errorMessage);
        }
        
        if (mode === 'pagination') {
          setHasMoreCandles(false);
        }
      }
    } catch (error) {
      console.error(`Error fetching data for ${mode}:`, error);
      
      let errorMessage: string;
      if (mode === 'initial') {
        errorMessage = 'Failed to fetch data from Upstox API. Please check your API key and try again.';
      } else if (mode === 'pagination') {
        errorMessage = 'Failed to load more historical data';
      } else {
        errorMessage = `Failed to load ${timeframe} data`;
      }
        
      if (loadingToastId) {
        toast.error(errorMessage, { id: loadingToastId });
      } else {
        toast.error(errorMessage);
      }
      
      // Re-throw for timeframe-change to allow rollback
      if (mode === 'timeframe-change') {
        throw error;
      }
    } finally {
      // Reset loading states
      if (mode === 'pagination') {
        setLoadingOlderData(false);
      } else {
        setIsLoading(false);
      }
    
    }
  }, [
    selectedCompany, 
    selectedInstrumentKey, 
    selectedTimeframe, 
    isFirstLoad, 
    //fetchEntryDates,
    candles,
    rawCandles,
    loadingOlderData,
    applyEMAToCandles
  ]);

  // Wrapper functions for backward compatibility and cleaner interface
  const handleFetchData = useCallback(async () => {
    // Use progressive loading for initial data loads
    setIsLoading(true); // Show initial spinner
    await fetchCandlesProgressively();
  }, [fetchCandlesProgressively]);

  const loadMoreHistoricalData = useCallback(async () => {
    await fetchCandles({ 
      mode: 'pagination',
      showLoadingToast: true,
      loadingMessage: 'Loading older historical data...'
    });
  }, [fetchCandles]);

  // Handle timeframe change with proper error handling and rollback
  const handleTimeframeChange = useCallback((newTimeframe: Timeframe) => {
    const previousTimeframe = selectedTimeframe;
    
    // Optimistically update the timeframe
    setSelectedTimeframe(newTimeframe);
    
    // Update URL parameters
    if (selectedInstrumentKey) {
      const strykeDateStr = strykeEntryDates.length > 0 ? strykeEntryDates.join(',') : undefined;
      const algoDateStr = algoEntryDates.length > 0 ? algoEntryDates.join(',') : undefined;
      const realTimeDateStr = realTimeEntryDates.length > 0 ? realTimeEntryDates.join(',') : undefined;
      updateUrlParams(selectedInstrumentKey, newTimeframe, maxDate, maxTime, strykeDateStr, algoDateStr, realTimeDateStr);
    }
    
    // Check if we need to fetch new data for the timeframe
    const needsNewData = shouldFetchNewDataForTimeframe(previousTimeframe, newTimeframe);
    
    if (needsNewData && selectedInstrumentKey) {
      // Fetch fresh data for the new timeframe using unified function
      fetchCandles({ 
        mode: 'timeframe-change', 
        timeframe: newTimeframe,
        loadingMessage: 'Fetching data for new timeframe...'
      })
        .then(() => {
          toast.success(`Successfully loaded ${newTimeframe} data`);
        })
        .catch((error) => {
          console.error('Failed to fetch data for new timeframe:', error);
          toast.error(`Failed to load ${newTimeframe} data. Reverting to ${previousTimeframe}.`, { 
            duration: 4000 
          });
          
          // Revert to previous timeframe on error
          setSelectedTimeframe(previousTimeframe);
          // Also revert URL parameters
          const strykeDateStr = strykeEntryDates.length > 0 ? strykeEntryDates.join(',') : undefined;
          const algoDateStr = algoEntryDates.length > 0 ? algoEntryDates.join(',') : undefined;
          const realTimeDateStr = realTimeEntryDates.length > 0 ? realTimeEntryDates.join(',') : undefined;
          updateUrlParams(selectedInstrumentKey, previousTimeframe, maxDate, maxTime, strykeDateStr, algoDateStr, realTimeDateStr);
        });
    } else if (rawCandles.length) {
      // Use existing data and process it for the new timeframe
      try {
        const processedCandles = processTimeframeData(rawCandles, newTimeframe);
        //console.log(`🔄 Processing ${processedCandles.length} candles with indicators during timeframe change`);
        const candlesWithIndicators = calculateIndicators(processedCandles, 200, 14, false);
        
        // Apply EMA based on current toggle state
        const emaProcessedCandles = applyEMAToCandles(candlesWithIndicators);
        const finalCandles = filterCandlesByDateTime(emaProcessedCandles);
        setCandles(finalCandles);
        toast.success(`Switched to ${newTimeframe} timeframe`);
      } catch (error) {
        console.error('Failed to process data for new timeframe:', error);
        toast.error(`Failed to switch to ${newTimeframe}. Reverting to ${previousTimeframe}.`);
        
        // Revert to previous timeframe on processing error
        setSelectedTimeframe(previousTimeframe);
        const strykeDateStr = strykeEntryDates.length > 0 ? strykeEntryDates.join(',') : undefined;
        const algoDateStr = algoEntryDates.length > 0 ? algoEntryDates.join(',') : undefined;
        const realTimeDateStr = realTimeEntryDates.length > 0 ? realTimeEntryDates.join(',') : undefined;
        updateUrlParams(selectedInstrumentKey, previousTimeframe, maxDate, maxTime, strykeDateStr, algoDateStr, realTimeDateStr);
      }
    } else {
      // No data available
      toast.error(`No data available for ${newTimeframe}. Please fetch data first.`);
      setSelectedTimeframe(previousTimeframe);
      const strykeDateStr = strykeEntryDates.length > 0 ? strykeEntryDates.join(',') : undefined;
      const algoDateStr = algoEntryDates.length > 0 ? algoEntryDates.join(',') : undefined;
      const realTimeDateStr = realTimeEntryDates.length > 0 ? realTimeEntryDates.join(',') : undefined;
      updateUrlParams(selectedInstrumentKey, previousTimeframe, maxDate, maxTime, strykeDateStr, algoDateStr, realTimeDateStr);
    }
  }, [selectedTimeframe, selectedInstrumentKey, rawCandles, updateUrlParams, fetchCandles, applyEMAToCandles, maxDate, maxTime]);

  // Helper function to determine if we need to fetch new data
  const shouldFetchNewDataForTimeframe = (currentTf: Timeframe, newTf: Timeframe): boolean => {
    // Define timeframe hierarchy (lower index = higher resolution)
    const timeframeOrder = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
    const currentIndex = timeframeOrder.indexOf(currentTf);
    const newIndex = timeframeOrder.indexOf(newTf);
    
    // If switching to a higher resolution timeframe, we need new data
    return newIndex < currentIndex;
  };

  // Show loading during SSR hydration or when actually loading
  if (isLoading || !mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-screen min-h-[100dvh] min-h-screen"
      ref={(el) => {
        if (el && isMobile && mounted) {
          console.log('🏠 Main container dimensions:', {
            clientWidth: el.clientWidth,
            clientHeight: el.clientHeight,
            offsetWidth: el.offsetWidth,
            offsetHeight: el.offsetHeight,
            scrollWidth: el.scrollWidth,
            scrollHeight: el.scrollHeight,
            computedStyle: window.getComputedStyle(el)
          });
        }
      }}
    >
      <Toaster position="top-right" />
      {selectedCompany && (
        <h2 
          className="text-xl md:text-2xl font-bold text-center mb-1 px-4"
          ref={(el) => {
            if (el && isMobile && mounted) {
              console.log('📝 Title dimensions:', {
                clientWidth: el.clientWidth,
                clientHeight: el.clientHeight,
                offsetWidth: el.offsetWidth,
                offsetHeight: el.offsetHeight,
                scrollWidth: el.scrollWidth,
                scrollHeight: el.scrollHeight
              });
            }
          }}
        >
          {selectedCompany}
        </h2>
      )}
      {!showControls && (
        <div 
          className="flex justify-center p-2"
          ref={(el) => {
            if (el && isMobile && mounted) {
              console.log('🔘 Show controls button dimensions:', {
                clientWidth: el.clientWidth,
                clientHeight: el.clientHeight,
                offsetWidth: el.offsetWidth,
                offsetHeight: el.offsetHeight,
                scrollWidth: el.scrollWidth,
                scrollHeight: el.scrollHeight
              });
            }
          }}
        > 
          <button
            onClick={() => setShowControls(true)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded shadow-sm"
          >
            Show Controls
          </button>
        </div>
      )}
      {showControls && (
        <>
          {/* Mobile Controls Version */}
          <div 
            className={`mb-0.5 flex flex-col p-1.5 bg-gray-50 rounded mx-2 mobile-only ${!mounted || !isMobile ? 'hidden' : ''}`}
            ref={(el) => {
              if (el && isMobile && mounted) {
                console.log('🎛️ Mobile controls dimensions:', {
                  clientWidth: el.clientWidth,
                  clientHeight: el.clientHeight,
                  offsetWidth: el.offsetWidth,
                  offsetHeight: el.offsetHeight,
                  scrollWidth: el.scrollWidth,
                  scrollHeight: el.scrollHeight
                });
              }
            }}
          >
              {/* Mobile Search Section */}
              <div className="mb-1.5">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setSelectedCompany('');
                      setSelectedInstrumentKey('');
                    }}
                    placeholder="Search company..."
                    className="w-full p-1.5 border border-gray-300 rounded text-xs font-medium bg-white shadow-sm"
                  />
                  {suggestions.length > 0 && !selectedCompany && (
                    <ul className="absolute z-50 w-full mt-1 border border-gray-200 rounded max-h-28 overflow-auto bg-white shadow-lg">
                      {suggestions.map((name) => (
                        <button
                          key={name}
                          onClick={() => handleSelectCompany(name)}
                          className="w-full p-1.5 text-left text-xs hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                        >
                          {name}
                        </button>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Mobile Primary Actions */}
              <div className="flex gap-1 mb-1.5 items-center">
                <button
                  onClick={handleFetchData}
                  data-testid="fetch-button"
                  className="flex-1 bg-blue-500 text-white py-1.5 px-2 rounded text-xs font-semibold shadow-md active:scale-95 transition-transform"
                >
                  Load
                </button>
                <a
                  href="/"
                  className="flex-1 bg-gray-200 text-gray-800 py-1.5 px-2 rounded text-xs font-semibold text-center shadow-md active:scale-95 transition-transform"
                >
                  Home
                </a>
                {/* Swings Slider Switch (Mobile) */}
                <label className="flex items-center cursor-pointer select-none ml-2">
                  <span className="mr-1 text-xs text-gray-700">Swings</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={showSwingPoints}
                      onChange={() => setShowSwingPoints(!showSwingPoints)}
                      className="sr-only peer"
                      aria-label="Toggle Swing Point Calculation"
                    />
                    <div className="w-7 h-4 bg-gray-300 rounded-full peer-checked:bg-orange-500 transition-colors"></div>
                    <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform peer-checked:translate-x-3"></div>
                  </div>
                  <span className="ml-1 text-xs text-gray-700">{showSwingPoints ? 'ON' : 'OFF'}</span>
                </label>
              </div>

              {/* Mobile View Mode Toggle */}
              {(strykeEntryDates.length > 0 || strykeConfig.entryPrice) && (algoEntryDates.length > 0 || algoConfig.entryPrice) && (
                <div className="flex bg-white rounded p-0.5 mb-1.5 shadow-sm">
                  <button
                    onClick={() => setViewMode('stryke')}
                    className={`flex-1 py-1 px-1.5 rounded text-xs font-semibold transition-all ${
                      viewMode === 'stryke'
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Stryke
                  </button>
                  <button
                    onClick={() => setViewMode('algo')}
                    className={`flex-1 py-1 px-1.5 rounded text-xs font-semibold transition-all ${
                      viewMode === 'algo'
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Algo
                  </button>
                </div>
              )}

              {/* Mobile Entry Dates Indicator */}
              {strykeEntryDates && strykeEntryDates.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded p-1 mb-1.5">
                  <div className="flex items-center justify-center gap-0.5 text-orange-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[10px] font-semibold">
                      {strykeEntryDates.length} Stryke Points Available
                    </span>
                  </div>
                </div>
              )}

              {/* Mobile Progressive Loading Indicator */}
              {isProgressiveLoading && progressiveLoadingProgress.total > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-1 mb-1.5">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1 text-blue-700">
                      <div className="animate-spin rounded-full h-2.5 w-2.5 border-t-2 border-b-2 border-blue-600"></div>
                      <span className="text-[10px] font-semibold">
                        {progressiveLoadingProgress.loaded}/{progressiveLoadingProgress.total}
                      </span>
                    </div>
                    {progressiveLoadingProgress.loaded > 0 && (
                      <div className="w-full bg-blue-200 rounded-full h-1">
                        <div 
                          className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${(progressiveLoadingProgress.loaded / progressiveLoadingProgress.total) * 100}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mobile Timeframe Selector */}
              {candles.length > 0 && (
                <div className="mb-1.5">
                  <div className="grid grid-cols-4 gap-0.5 bg-white rounded p-0.5 shadow-sm">
                    {(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'] as Timeframe[]).map((tf) => {
                      const isSelected = selectedTimeframe === tf;
                      return (
                        <button
                          key={tf}
                          onClick={() => handleTimeframeChange(tf)}
                          disabled={isLoading}
                          className={`py-0.5 px-0.5 rounded text-[10px] font-semibold transition-all ${
                            isSelected
                              ? 'bg-blue-500 text-white shadow-md'
                              : isLoading
                              ? 'bg-gray-100 text-gray-400'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 active:scale-95'
                          }`}
                        >
                          {tf}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mobile Action Buttons */}
              <div className="flex flex-col gap-1">
                {/* Load More Data */}
                {candles.length > 0 && hasMoreCandles && (
                  <button
                    onClick={() => loadMoreHistoricalData()}
                    disabled={loadingOlderData}
                    className={`py-1.5 px-2 rounded text-xs font-semibold transition-all ${
                      loadingOlderData
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-green-500 text-white shadow-md active:scale-95'
                    }`}
                  >
                    {loadingOlderData ? 'Loading...' : 'More'}
                  </button>
                )}
              </div>

              {/* Mobile Hide Controls */}
              <div className="flex justify-center mt-1.5 pt-1.5 border-t border-gray-200">
                <button
                  onClick={() => setShowControls(false)}
                  className="bg-gray-200 text-gray-700 py-1 px-3 rounded text-xs font-semibold active:scale-95 transition-transform"
                >
                  Hide
                </button>
              </div>
            </div>
        
          
          {/* Desktop Controls Version */}
          <div 
            className={`mb-2 flex flex-col items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm mx-4 desktop-only responsive-transition ${!mounted || isMobile ? 'hidden' : ''}`}
            ref={(el) => {
              if (el && !isMobile && mounted) {
                console.log('🖥️ Desktop controls dimensions:', {
                  clientWidth: el.clientWidth,
                  clientHeight: el.clientHeight,
                  offsetWidth: el.offsetWidth,
                  offsetHeight: el.offsetHeight,
                  scrollWidth: el.scrollWidth,
                  scrollHeight: el.scrollHeight
                });
              }
            }}
          >
              {/* Desktop Layout - Horizontal */}
              <div className="flex flex-row flex-wrap items-center justify-center w-full max-w-6xl gap-4 mx-auto">
                {/* Desktop Search */}
                <div className="w-64 relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setSelectedCompany('');
                      setSelectedInstrumentKey('');
                    }}
                    placeholder="Search for a company..."
                    className="p-3 border border-gray-300 rounded-md w-full text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {suggestions.length > 0 && !selectedCompany && (
                    <ul className="absolute z-50 w-full mt-1 border border-gray-300 rounded-md max-h-60 overflow-auto bg-white shadow-lg">
                      {suggestions.map((name) => (
                        <button
                          key={name}
                          onClick={() => handleSelectCompany(name)}
                          className="p-3 cursor-pointer hover:bg-gray-100 w-full text-left text-sm"
                        >
                          {name}
                        </button>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Desktop Primary Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleFetchData}
                    data-testid="fetch-button"
                    className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
                  >
                    Load Data
                  </button>
                  <a
                    href="/"
                    className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors text-sm font-medium text-center shadow-sm"
                  >
                    Home
                  </a>
                  {/* Slider Switch */}
                  <label className="flex items-center cursor-pointer select-none ml-2">
                    <span className="mr-2 text-sm text-gray-700">Swings</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={showSwingPoints}
                        onChange={() => setShowSwingPoints(!showSwingPoints)}
                        className="sr-only peer"
                        aria-label="Toggle Swing Point Calculation"
                      />
                      <div className="w-10 h-5 bg-gray-300 rounded-full peer-checked:bg-orange-500 transition-colors"></div>
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-700">{showSwingPoints ? 'ON' : 'OFF'}</span>
                  </label>
                </div>

                {/* Desktop View Mode Toggle */}
                {(strykeEntryDates.length > 0 || strykeConfig.entryPrice) && (algoEntryDates.length > 0 || algoConfig.entryPrice) && (
                  <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                    <button
                      onClick={() => setViewMode('stryke')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'stryke'
                          ? 'bg-white text-orange-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Stryke
                    </button>
                    <button
                      onClick={() => setViewMode('algo')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'algo'
                          ? 'bg-white text-teal-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Algo
                    </button>
                  </div>
                )}

                {/* Desktop Entry Dates Indicator */}
                {strykeEntryDates && strykeEntryDates.length > 0 && (
                  <div className="px-3 py-2 rounded-md bg-orange-100 border border-orange-300 text-orange-800 text-sm font-medium flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{strykeEntryDates.length} Stryke Points</span>
                  </div>
                )}

                {/* Desktop Progressive Loading Indicator */}
                {isProgressiveLoading && progressiveLoadingProgress.total > 0 && (
                  <div className="px-3 py-2 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-600"></div>
                      <span>Loading: {progressiveLoadingProgress.loaded}/{progressiveLoadingProgress.total}</span>
                    </div>
                    {progressiveLoadingProgress.loaded > 0 && (
                      <div className="w-full bg-blue-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(progressiveLoadingProgress.loaded / progressiveLoadingProgress.total) * 100}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                )}

                {/* Desktop Timeframe Selector */}
                {candles.length > 0 && (
                  <div className="flex bg-white bg-opacity-90 border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                    {(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'] as Timeframe[]).map((tf) => {
                      const isSelected = selectedTimeframe === tf;
                      let classes = 'px-3 py-1 text-sm font-medium transition-colors text-center';
                      
                      if (isSelected) {
                        classes += ' bg-blue-500 text-white';
                      } else if (isLoading) {
                        classes += ' bg-gray-200 text-gray-400 cursor-not-allowed';
                      } else {
                        classes += ' bg-white text-gray-700 hover:bg-gray-100';
                      }
                      
                      return (
                        <button
                          key={tf}
                          onClick={() => handleTimeframeChange(tf)}
                          disabled={isLoading}
                          className={classes}
                          title={isLoading ? 'Loading...' : `View ${tf} timeframe`}
                        >
                          {tf}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Desktop EMA Toggle */}
                {candles.length > 0 && (
                  <button
                    onClick={() => setEmaCalculation(!emaCalculation)}
                    disabled={isCalculatingEMA}
                    className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 text-sm font-medium ${
                      emaCalculation
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    } ${isCalculatingEMA ? 'cursor-not-allowed opacity-50' : ''} shadow-sm`}
                    title={emaCalculation ? 'Disable EMA calculations' : 'Enable EMA calculations'}
                  >
                    {isCalculatingEMA && (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    )}
                    EMA {emaCalculation ? 'ON' : 'OFF'}
                  </button>
                )}
                
                {/* Desktop Load More Data */}
                {candles.length > 0 && (
                  <button
                    onClick={() => loadMoreHistoricalData()}
                    disabled={loadingOlderData}
                    className={`px-4 py-2 rounded-md text-sm font-medium shadow-sm ${
                      loadingOlderData
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {loadingOlderData ? 'Loading...' : 'Load More History'}
                  </button>
                )}
              </div>

              {/* Desktop Hide Controls */}
              <div className="flex justify-center mt-3 pt-3 border-t border-gray-200 w-full">
                <button
                  onClick={() => setShowControls(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                  Hide Controls
                </button>
              </div>
            </div>
        </>)
      }

      {/* Display content based on loading and view state */}
      {(() => {
        // If loading, show spinner
        if (isLoading) {
          return (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          );
        }

        // Show chart
        return (
          <div 
            className="flex-1 min-h-[350px]"
            ref={(el) => {
              chartContainerRef.current = el;
              if (el && isMobile) {
                console.log('📊 Chart flex container dimensions:', {
                  clientWidth: el.clientWidth,
                  clientHeight: el.clientHeight,
                  offsetWidth: el.offsetWidth,
                  offsetHeight: el.offsetHeight,
                  scrollWidth: el.scrollWidth,
                  scrollHeight: el.scrollHeight,
                  computedStyle: window.getComputedStyle(el)
                });
              }
            }}
          >
            {candles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 border border-gray-200 rounded-lg m-4">
                <div className="text-center space-y-3">
                  <div className="text-4xl text-gray-400">📊</div>
                  <h3 className="text-lg font-semibold text-gray-600">No Chart Data</h3>
                  <p className="text-gray-500 max-w-md">
                    {(() => {
                      if (!selectedCompany) {
                        return 'Please select a company from the search dropdown and click "Load Data".';
                      }
                      return 'Click "Load Data" to fetch historical data for the selected company.';
                    })()}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {isMobile && console.log('📊 Passing height to OHLCChart:', availableChartHeight)}
                <OHLCChart
                candles={optimizedCandles}
                title={`${selectedCompany || 'Select a company'} - ${selectedTimeframe} Chart`}
                height={typeof availableChartHeight === 'number' ? availableChartHeight : Number.parseInt(availableChartHeight as string, 10) || 800}
                showVolume={true}
                showEMA={showEMA}
                showRSI={showRSI}
                showSwingPoints={showSwingPoints}
                analysisList={analysisList}
                supportLevel={support?.value}
                resistanceLevel={resistance?.value}
                avgVolume={avgVolume}
                entryDates={[]} // Legacy entry dates - empty when using new stryke/algo dates
                strykeDates={strykeEntryDates} // Stryke entry dates
                algoDates={algoEntryDates} // Algo entry dates
                realTimeDates={realTimeEntryDates} // Real-Time entry dates
                
                // Pass active config based on view mode
                entryPrice={viewMode === 'stryke' ? (strykeConfig.entryPrice || entryPrice) : (algoConfig.entryPrice || entryPrice)}
                targetPrice={viewMode === 'stryke' ? (strykeConfig.targetPrice || targetPrice) : (algoConfig.targetPrice || targetPrice)}
                stopLossPrice={viewMode === 'stryke' ? (strykeConfig.stopLossPrice || stopLossPrice) : (algoConfig.stopLossPrice || stopLossPrice)}
                
                // Pass active dates for zone calculation
                zoneStartDates={viewMode === 'stryke' ? strykeEntryDates : algoEntryDates}
                
                onLoadMoreData={undefined} // Temporarily disable automatic loading
                hasMoreOlderData={hasMoreCandles}
                hasMoreNewerData={false} // We typically only load historical data
                isLoadingMoreData={loadingOlderData}
              />
              </>
            )}
           
            
            
            {/* Progressive loading indicator in chart area */}
            {isProgressiveLoading && candles.length > 0 && (
              <div className="flex items-center justify-center p-3 bg-blue-50 border border-blue-200 rounded-md m-4">
                <div className="animate-pulse rounded-full h-2 w-2 bg-blue-600 mr-3"></div>
                <span className="text-blue-800 text-sm font-medium">
                  Loading more historical data... ({progressiveLoadingProgress.loaded}/{progressiveLoadingProgress.total} batches)
                </span>
                <div className="ml-3 w-24 bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressiveLoadingProgress.total > 0 ? (progressiveLoadingProgress.loaded / progressiveLoadingProgress.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {/* Loading older data indicator */}
            {loadingOlderData && (
              <div className="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-md m-4">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500 mr-3"></div>
                <span className="text-green-800">Loading historical data...</span>
              </div>
            )}
          </div>
        );
      })()}
      
    </div>
  );
};