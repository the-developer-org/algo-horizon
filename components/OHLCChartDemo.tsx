"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { OHLCChart } from './OHLCChart';
import { BoomDaysTable } from './BoomDaysTable';
import { Candle } from './types/candle';
import { calculateIndicators } from './utils/indicators';
import { Timeframe, processTimeframeData } from './utils/timeframeUtils';
import { fetchPaginatedUpstoxData, UpstoxPaginationParams } from './utils/upstoxApi';
import { ApiKeyModal } from './ApiKeyModal';
import { EntryDatesApiResponse } from './types/entry-dates';
import axios from 'axios';

// Performance optimization constants
const MAX_CANDLES_FOR_CHART = 10000; // Limit for ultra-fast performance
const PAGINATION_CHUNK_SIZE = 500; // Smaller chunks for faster loading

// Progressive loading configuration
const PROGRESSIVE_BATCH_CONFIG = {
  '1m': { batchSize: 100, targetDays: 30, maxBatches: 12 },
  '5m': { batchSize: 100, targetDays: 60, maxBatches: 15 },
  '15m': { batchSize: 75, targetDays: 90, maxBatches: 12 },
  '30m': { batchSize: 60, targetDays: 120, maxBatches: 15 },
  '1h': { batchSize: 50, targetDays: 180, maxBatches: 18 },
  '4h': { batchSize: 40, targetDays: 300, maxBatches: 20 },
  '1d': { batchSize: 30, targetDays: 365, maxBatches: 24 },
  '1w': { batchSize: 20, targetDays: 365, maxBatches: 18 }
} as const;

export const OHLCChartDemo: React.FC = () => {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [rawCandles, setRawCandles] = useState<Candle[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1d');
  const [vixData, setVixData] = useState<{ timestamp: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [keyMapping, setKeyMapping] = useState<{ [companyName: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedInstrumentKey, setSelectedInstrumentKey] = useState<string>('');
  const [analysisList, setAnalysisList] = useState<{ timestamp: string; swingLabel?: string; }[]>([]);
  const [support, setSupport] = useState<{ value: number } | null>(null);
  const [resistance, setResistance] = useState<{ value: number } | null>(null);
  // Boom Days data
  const [boomDaysData, setBoomDaysData] = useState<import('./types/backtest').BackTest[]>([]);
  const [showBoomDays, setShowBoomDays] = useState(false);
  const [hasBoomDaysData, setHasBoomDaysData] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [avgVolume, setAvgVolume] = useState<number>(0);
  // Chart indicator toggles
  const [showRSI] = useState(false);
  const [showVIX] = useState(false);
  const [showSwingPoints] = useState(true);
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
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [upstoxApiKey, setUpstoxApiKey] = useState('alpha');
  
  // Entry dates state
  const [strykeEntryDates, setStrykeEntryDates] = useState<string[]>([]);

  const [shouldFetchIntraDay, setShouldFetchIntraDay] = useState(true);

  // Progressive loading state
  const [isProgressiveLoading, setIsProgressiveLoading] = useState(false);
  const [progressiveLoadingProgress, setProgressiveLoadingProgress] = useState({ loaded: 0, total: 0 });
  const [progressiveAbortController, setProgressiveAbortController] = useState<AbortController | null>(null);

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
  const updateUrlParams = useCallback((instrumentKey: string, timeframe: Timeframe) => {
    const params = new URLSearchParams();
    if (instrumentKey) {
      params.set('instrumentKey', instrumentKey);
    }
    if (timeframe) {
      params.set('timeframe', timeframe);
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
   * Get approximate candles per trading day for a timeframe
   */
  const getCandlesPerTradingDay = (timeframe: Timeframe): number => {
    // Approximate trading hours: 6.25 hours (9:15 AM to 3:30 PM IST)
    const tradingMinutes = 375;
    
    switch (timeframe) {
      case '1m': return tradingMinutes; // 375 candles per day
      case '5m': return Math.floor(tradingMinutes / 5); // 75 candles per day
      case '15m': return Math.floor(tradingMinutes / 15); // 25 candles per day
      case '30m': return Math.floor(tradingMinutes / 30); // 12.5 ≈ 12 candles per day
      case '1h': return Math.floor(tradingMinutes / 60); // 6.25 ≈ 6 candles per day
      case '4h': return 2; // 2 candles per day (morning and afternoon sessions)
      case '1d': return 1; // 1 candle per day
      case '1w': return 0.2; // 1 candle per week (5 trading days)
      default: return 1;
    }
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
        from.setDate(from.getDate() - 90);
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
        ema30: undefined
      }));
    }

    // Calculate EMA8 and EMA30 for the candles
    console.log(`🔄 Calculating EMA for ${candlesToProcess.length} candles`);
    const candlesWithEMA = [...candlesToProcess];
    
    // Calculate EMA8
    let ema8 = candlesWithEMA[0]?.close || 0;
    const multiplier8 = 2 / (8 + 1);
    
    // Calculate EMA30
    let ema30 = candlesWithEMA[0]?.close || 0;
    const multiplier30 = 2 / (30 + 1);
    
    candlesWithEMA.forEach((candle, index) => {
      if (index === 0) {
        candle.ema8 = candle.close;
        candle.ema30 = candle.close;
        ema8 = candle.close;
        ema30 = candle.close;
      } else {
        ema8 = (candle.close * multiplier8) + (ema8 * (1 - multiplier8));
        ema30 = (candle.close * multiplier30) + (ema30 * (1 - multiplier30));
        candle.ema8 = ema8;
        candle.ema30 = ema30;
      }
    });

    return candlesWithEMA;
  }, [emaCalculation]);

  // Unified function to apply EMA calculations to candles
  const applyEMAToCandles = useCallback((candlesToProcess: Candle[]): Candle[] => {
    return calculateEMAForCandles(candlesToProcess);
  }, [calculateEMAForCandles]);

  // Initialize API key from localStorage after hydration
  useEffect(() => {
    const savedApiKey = localStorage.getItem('upstoxApiKey') || '';
    setUpstoxApiKey(savedApiKey);
  }, []);

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

  // Process URL parameters after keyMapping is loaded
  useEffect(() => {
    if (!searchParams || Object.keys(keyMapping).length === 0) return; // Wait for keyMapping to load

    const instrumentKeyParam = searchParams.get('instrumentKey');
    const timeframeParam = searchParams.get('timeframe') as Timeframe;

    if (instrumentKeyParam && timeframeParam) {
      console.log('🔗 Processing URL parameters:', { instrumentKeyParam, timeframeParam });
      
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

      console.log('✅ Found company for URL params:', { companyName, instrumentKeyParam, timeframeParam });
      
      // Set the state
      setSelectedCompany(companyName);
      setSelectedInstrumentKey(instrumentKeyParam);
      setSelectedTimeframe(timeframeParam);
      setSearchTerm(companyName);
      
      // Auto-load data if API key is available
      const savedApiKey = localStorage.getItem('upstoxApiKey');
      if (savedApiKey) {
        // Small delay to ensure state is set and then trigger data fetch
        setTimeout(() => {
          console.log('🚀 Auto-loading data from URL parameters');
          // Trigger button click to fetch data
          const fetchButton = document.querySelector('[data-testid="fetch-button"]') as HTMLButtonElement;
          if (fetchButton && !fetchButton.disabled) {
            fetchButton.click();
          }
        }, 200);
      } else {
        toast.error('Upstox API key required. Please configure your API key first.', {
          duration: 4000
        });
      }
    }
  }, [keyMapping, searchParams, findCompanyNameFromInstrumentKey]);

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

    console.log(`🔄 EMA toggle changed to: ${emaCalculation}, recalculating for ${candles.length} candles`);
    setIsCalculatingEMA(true);
    
    try {
      // Apply EMA calculation based on current toggle state
      const updatedCandles = applyEMAToCandles(candles);
      
      // Log sample EMA values for debugging
      if (updatedCandles.length > 0) {
        const sample = updatedCandles[Math.min(10, updatedCandles.length - 1)];
        console.log(`📊 Sample EMA values: ema8=${sample.ema8}, ema30=${sample.ema30}, showEMA=${emaCalculation}`);
      }
      
      setCandles(updatedCandles);
      
      // Show user feedback
      toast.success(emaCalculation ? 'EMA indicators enabled' : 'EMA indicators disabled', {
        duration: 2000
      });
      
      console.log(`✅ EMA recalculation completed`);
    } catch (error) {
      console.error('Error recalculating EMA:', error);
      toast.error('Failed to update EMA calculations');
    } finally {
      setIsCalculatingEMA(false);
    }
  }, [emaCalculation, applyEMAToCandles]); // Don't include candles to avoid infinite loop

  // Cleanup progressive loading on component unmount only
  useEffect(() => {
    return () => {
      // Only cleanup on component unmount
      if (progressiveAbortController) {
        console.log('🧹 Cleaning up progressive loading on component unmount');
        progressiveAbortController.abort();
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Use ref to track previous instrument key
  const prevInstrumentKeyRef = useRef<string>('');
  
  // Cancel progressive loading when changing companies
  useEffect(() => {
    const currentKey = selectedInstrumentKey;
    const previousKey = prevInstrumentKeyRef.current;
    
    console.log(`🔍 Company change check: previous="${previousKey}", current="${currentKey}", hasAbortController=${!!progressiveAbortController}`);
    
    // Only abort if we have a previous key and it's different from current
    if (previousKey && previousKey !== currentKey && progressiveAbortController) {
      console.log(`🔄 Aborting progressive loading due to company change: ${previousKey} → ${currentKey}`);
      progressiveAbortController.abort();
      setProgressiveAbortController(null);
      setIsProgressiveLoading(false);
    }
    
    // Update the ref with current key
    prevInstrumentKeyRef.current = currentKey;
  }, [selectedInstrumentKey]); // Only depend on instrumentKey, not abortController

  // Handle selection from suggestions
  // Function to fetch entry dates for the selected instrument
  const fetchEntryDates = useCallback(async (instrumentKey: string, companyName: string) => {
    if (!instrumentKey?.includes('NSE')) {
      console.warn('Invalid instrument key for entry dates fetch:', instrumentKey);
      return;
    }

    try {
      // Replace - with | for the API call
      const apiInstrumentKey = instrumentKey.replace(/-/g, '|');
      
      console.log('🗓️ Fetching entry dates for:', apiInstrumentKey);
      
     const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;


      const response = await axios.get(`${backEndBaseUrl}/api/stryke/get-entry-dates/${apiInstrumentKey}/${companyName}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });


      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Failed to fetch entry dates: ${response.status}`);
      }

      const data: EntryDatesApiResponse = response.data;
      
      if (data.entryDates && Array.isArray(data.entryDates)) {
        
        setStrykeEntryDates(data.entryDates);
        console.log('✅ Entry dates fetched successfully:', data.entryDates.length, 'dates');
      } else {
        console.warn('No entry dates found in response');
        setStrykeEntryDates([]);
      }
    } catch (error) {
      console.error('Error fetching entry dates:', error);
      setStrykeEntryDates([]);
      // Don't show toast error as this is not critical for main functionality
    }
  }, []);

  const handleSelectCompany = useCallback((companyName: string) => {
    setSelectedCompany(companyName);
    const instrumentKey = keyMapping[companyName];
    setSelectedInstrumentKey(instrumentKey);
    setSearchTerm(companyName);
    setSuggestions([]);

    // Update URL parameters
    if (instrumentKey) {
      updateUrlParams(instrumentKey, selectedTimeframe);
    }

    // Fetch entry dates when a new company is selected
    if (instrumentKey && companyName) {
      fetchEntryDates(instrumentKey, companyName);
    }

    // We preserve the current view (either chart view or boom days) when selecting a new company
  }, [keyMapping, fetchEntryDates, selectedTimeframe, updateUrlParams]); // Add dependencies for useCallback

  // Performance optimization: limit displayed candles to prevent slowdown
  const optimizedCandles = useMemo(() => {
    if (candles.length <= MAX_CANDLES_FOR_CHART) {
      return candles;
    }
    
    // Keep the most recent candles for better performance
    const recentCandles = candles.slice(-MAX_CANDLES_FOR_CHART);
    console.log(`Performance optimization: Showing ${recentCandles.length} of ${candles.length} candles`);
    return recentCandles;
  }, [candles]);

  // Handle API key modal functions
  const handleOpenApiKeyModal = useCallback(() => {
    setIsApiKeyModalOpen(true);
  }, []);

  const handleCloseApiKeyModal = useCallback(() => {
    setIsApiKeyModalOpen(false);
  }, []);

  const handleSaveApiKey = useCallback((newApiKey: string) => {
    setUpstoxApiKey(newApiKey);
    if (newApiKey) {
      toast.success('API key saved. You can now fetch data from Upstox.');
    }
  }, []);

  // Progressive loading function for initial data loads
  const fetchCandlesProgressively = useCallback(async (): Promise<void> => {
    console.log(`🚀 Starting progressive loading for ${selectedTimeframe}`);
    
    // Prevent multiple concurrent progressive loading operations
    if (isProgressiveLoading) {
      console.log('⚠️ Progressive loading already in progress, skipping');
      return;
    }
    
    // Validation checks
    if (!selectedCompany || !selectedInstrumentKey) {
      toast.error('Please select a company from the search dropdown first.', { duration: 3000 });
      return;
    }
    
    if (!upstoxApiKey) {
      toast.error('Upstox API key is required to fetch market data.', { duration: 4000 });
      handleOpenApiKeyModal();
      return;
    }

    // Cancel any existing progressive loading
    if (progressiveAbortController) {
      console.log('🛑 Cancelling existing progressive loading before starting new one');
      progressiveAbortController.abort();
    }

    const abortController = new AbortController();
    console.log('🚀 Created new abort controller for progressive loading');
    setProgressiveAbortController(abortController);

    // Check if already aborted (edge case)
    if (abortController.signal.aborted) {
      console.log('🛑 Progressive loading aborted before starting (edge case)');
      return;
    }

    // Reset state for fresh load
    setCandles([]);
    setRawCandles([]);
    setHasMoreCandles(false);
    setOldestCandleTime(undefined);
    setNewestCandleTime(undefined);
    setIsProgressiveLoading(true);
    
    // Fetch entry dates
    fetchEntryDates(selectedInstrumentKey, selectedCompany);

    try {
      const lastTradingDay = getLastTradingDay(new Date());
      console.log(`📅 Using last trading day: ${lastTradingDay.toISOString()}`);
      
      const dateRanges = calculateProgressiveDateRanges(selectedTimeframe, lastTradingDay);
      
      setProgressiveLoadingProgress({ loaded: 0, total: dateRanges.length });
      
      console.log(`📅 Progressive loading: ${dateRanges.length} batches planned for ${selectedTimeframe}`, {
        firstBatch: dateRanges[0] ? {
          from: dateRanges[0].from.toISOString(),
          to: dateRanges[0].to.toISOString()
        } : null,
        lastBatch: dateRanges[dateRanges.length - 1] ? {
          from: dateRanges[dateRanges.length - 1].from.toISOString(),
          to: dateRanges[dateRanges.length - 1].to.toISOString()
        } : null
      });

      let allCandles: Candle[] = [];
      let batchCount = 0;

      for (const range of dateRanges) {
        // Check if aborted
        if (abortController.signal.aborted) {
          console.log('🛑 Progressive loading aborted during batch processing - checking abort reason');
          console.log('🛑 Abort signal details:', {
            aborted: abortController.signal.aborted,
            reason: abortController.signal.reason
          });
          return;
        }

        try {
          const params: UpstoxPaginationParams = {
            instrumentKey: selectedInstrumentKey,
            timeframe: selectedTimeframe,
            apiKey: upstoxApiKey,
            from: range.from.toISOString(),
            to: range.to.toISOString(),
            limit: PROGRESSIVE_BATCH_CONFIG[selectedTimeframe].batchSize
          };

          console.log(`📦 Loading batch ${batchCount + 1}/${dateRanges.length}:`, {
            from: range.from.toISOString(),
            to: range.to.toISOString(),
            timeframe: selectedTimeframe,
            abortSignalAborted: abortController.signal.aborted
          });

          const result = await fetchPaginatedUpstoxData(params, shouldFetchIntraDay);
          setShouldFetchIntraDay(false);

          // Check if aborted after API call
          if (abortController.signal.aborted) {
            console.log('🛑 Progressive loading aborted after API call, before processing');
            return;
          }

          if (result.candles.length > 0) {
            // Sort and process new candles
            const sortedCandles = [...result.candles]
              .filter((candle, index, self) =>
                index === self.findIndex((c) => c.timestamp === candle.timestamp)
              )
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            // Process candles with indicators
            const processedCandles = calculateIndicators(sortedCandles, 200, 14, false);
            
            // Merge with existing candles
            allCandles = [...allCandles, ...processedCandles];
            
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
            const finalCandles = applyEMAToCandles(timeframeProcessedData);
            setCandles(finalCandles);

            batchCount++;
            setProgressiveLoadingProgress({ loaded: batchCount, total: dateRanges.length });

            // Show immediate feedback for first batch
            if (batchCount === 1) {
              setIsLoading(false); // Stop showing main loading spinner
              toast.success(`Initial data loaded - continuing in background`);
              
              // Set other initial data
              setAnalysisList([]);
              setBoomDaysData([]);
              setHasBoomDaysData(false);
              setSupport(null);
              setResistance(null);
              
              if (isFirstLoad) {
                setShowBoomDays(false);
                setIsFirstLoad(false);
              }
            }

            // Calculate average volume from all accumulated candles for better accuracy
            if (allCandles.length > 0) {
              const volumes = allCandles.map((candle) => candle.volume);
              const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
              setAvgVolume(avgVol);
            }

            console.log(`✅ Batch ${batchCount}/${dateRanges.length} loaded: ${sortedCandles.length} candles, total: ${allCandles.length}`);
          } else {
            console.log(`⚠️ Batch ${batchCount + 1} returned no data`);
          }

          // Small delay between batches to prevent overwhelming the API
          if (batchCount < dateRanges.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

        } catch (batchError) {
          console.error(`❌ Error in batch ${batchCount + 1}:`, batchError);
          
          // Check if error is due to abort
          if (abortController.signal.aborted) {
            console.log('🛑 Progressive loading aborted during batch processing');
            return;
          }
          
          // For API errors, continue with next batch but log the error
          if (batchError instanceof Error && (
            batchError.message.includes('aborted') ||
            batchError.message.includes('cancelled')
          )) {
            console.log('🛑 Batch loading cancelled');
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
      
      console.log(`🎉 Progressive loading completed: ${allCandles.length} total candles loaded`);
      toast.success(`Progressive loading complete: ${allCandles.length} candles loaded`);

    } catch (error) {
      console.error('❌ Progressive loading error:', error);
      
      // Check if this is an abort error
      if (error instanceof Error && (
        error.message.includes('aborted') ||
        error.message.includes('cancelled') ||
        abortController.signal.aborted
      )) {
        console.log('🛑 Progressive loading was cancelled');
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
        console.log('🧹 Cleaning up abort controller from progressive loading completion');
        setProgressiveAbortController(null);
      } else {
        console.log('⚠️ Abort controller has changed, not clearing it');
      }
      
      setVixData([]); // Clear any VIX data
    }
  }, [
    selectedCompany,
    selectedInstrumentKey,
    upstoxApiKey,
    fetchEntryDates,
    shouldFetchIntraDay,
    applyEMAToCandles,
    isFirstLoad,
    isProgressiveLoading,
    handleOpenApiKeyModal
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

    console.log(`🚀 fetchCandles called with mode: ${mode}`, { 
      selectedCompany, 
      selectedInstrumentKey, 
      timeframe,
      upstoxApiKey: !!upstoxApiKey 
    });

    // Validation checks
    if (!selectedCompany || !selectedInstrumentKey) {
      toast.error('Please select a company from the search dropdown first.', { duration: 3000 });
      return;
    }
    
    if (!upstoxApiKey) {
      toast.error('Upstox API key is required to fetch market data. Please configure your API key first.', { duration: 4000 });
      handleOpenApiKeyModal();
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
        fetchEntryDates(selectedInstrumentKey, selectedCompany);
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
      
      console.log(`📅 Date range calculation for ${mode}:`, {
        timeframe,
        from: from.toISOString(),
        to: to,
        daysDiff: Math.floor((new Date(to).getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
      });
      
      const params: UpstoxPaginationParams = {
        instrumentKey: selectedInstrumentKey,
        timeframe: timeframe,
        apiKey: upstoxApiKey,
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

        console.log(`🔄 Processing ${sortedCandles.length} candles with indicators for ${mode}`);
        const processedCandles = calculateIndicators(sortedCandles, 200, 14, false);
        
        // Handle different merge strategies based on mode
        let finalRawCandles: Candle[];
        
        if (mode === 'pagination') {
          // Merge with existing candles for pagination
          const combinedCandles = [...processedCandles, ...rawCandles];
          const uniqueCandles = combinedCandles.filter((candle, index, self) =>
            index === self.findIndex((c) => c.timestamp === candle.timestamp)
          );
          uniqueCandles.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          
          // Performance optimization: limit total stored candles
          const maxStoredCandles = MAX_CANDLES_FOR_CHART * 2;
          finalRawCandles = uniqueCandles.length > maxStoredCandles
            ? uniqueCandles.slice(-maxStoredCandles)
            : uniqueCandles;
            
          console.log(`Memory optimization: Storing ${finalRawCandles.length} of ${uniqueCandles.length} total candles`);
        } else {
          // Fresh data for initial and timeframe-change
          finalRawCandles = processedCandles;
        }
        
        setRawCandles(finalRawCandles);
        
        // Apply timeframe processing and EMA
        const timeframeProcessedData = processTimeframeData(finalRawCandles, timeframe);
        const finalCandles = applyEMAToCandles(timeframeProcessedData);
        setCandles(finalCandles);
        
        // Update pagination state
        setHasMoreCandles(result.hasMore);
        setOldestCandleTime(result.oldestTimestamp);
        setNewestCandleTime(result.newestTimestamp);

        // Calculate average volume and set additional data for initial loads
        if (mode === 'initial') {
          const volumes = processedCandles.map((candle) => candle.volume);
          const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
          setAvgVolume(avgVol);
          
          setAnalysisList([]);
          setBoomDaysData([]);
          setHasBoomDaysData(false);
          setSupport(null);
          setResistance(null);
          
          if (isFirstLoad) {
            setShowBoomDays(false);
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
      
      // Clear VIX data for initial loads
      if (mode === 'initial') {
        setVixData([]);
      }
    }
  }, [
    selectedCompany, 
    selectedInstrumentKey, 
    upstoxApiKey, 
    selectedTimeframe, 
    isFirstLoad, 
    fetchEntryDates,
    candles,
    rawCandles,
    loadingOlderData,
    applyEMAToCandles,
    handleOpenApiKeyModal
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
      updateUrlParams(selectedInstrumentKey, newTimeframe);
    }
    
    // Check if we need to fetch new data for the timeframe
    const needsNewData = shouldFetchNewDataForTimeframe(previousTimeframe, newTimeframe);
    
    if (needsNewData && selectedInstrumentKey && upstoxApiKey) {
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
          updateUrlParams(selectedInstrumentKey, previousTimeframe);
        });
    } else if (rawCandles.length) {
      // Use existing data and process it for the new timeframe
      try {
        const processedCandles = processTimeframeData(rawCandles, newTimeframe);
        console.log(`🔄 Processing ${processedCandles.length} candles with indicators during timeframe change`);
        const candlesWithIndicators = calculateIndicators(processedCandles, 200, 14, false);
        
        // Apply EMA based on current toggle state
        const finalCandles = applyEMAToCandles(candlesWithIndicators);
        setCandles(finalCandles);
        toast.success(`Switched to ${newTimeframe} timeframe`);
      } catch (error) {
        console.error('Failed to process data for new timeframe:', error);
        toast.error(`Failed to switch to ${newTimeframe}. Reverting to ${previousTimeframe}.`);
        
        // Revert to previous timeframe on processing error
        setSelectedTimeframe(previousTimeframe);
        updateUrlParams(selectedInstrumentKey, previousTimeframe);
      }
    } else {
      // No data available
      toast.error(`No data available for ${newTimeframe}. Please fetch data first.`);
      setSelectedTimeframe(previousTimeframe);
      updateUrlParams(selectedInstrumentKey, previousTimeframe);
    }
  }, [selectedTimeframe, selectedInstrumentKey, upstoxApiKey, rawCandles, updateUrlParams, fetchCandles, applyEMAToCandles]);

  // Helper function to determine if we need to fetch new data
  const shouldFetchNewDataForTimeframe = (currentTf: Timeframe, newTf: Timeframe): boolean => {
    // Define timeframe hierarchy (lower index = higher resolution)
    const timeframeOrder = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
    const currentIndex = timeframeOrder.indexOf(currentTf);
    const newIndex = timeframeOrder.indexOf(newTf);
    
    // If switching to a higher resolution timeframe, we need new data
    return newIndex < currentIndex;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div>
      <Toaster position="top-right" />
      {selectedCompany && (
        <h2 className="text-2xl font-bold text-center mb-2">
          {selectedCompany}
        </h2>
      )}
      <div className="mb-4 flex flex-col items-center p-4">
        {/* Search bar and controls centered */}
        <div className="flex flex-wrap items-center justify-center w-full max-w-4xl gap-4 mx-auto">
          <div className="w-64 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setSelectedCompany('');
                setSelectedInstrumentKey('');
                // Don't reset isFirstLoad to preserve the current view when changing search term
              }}
              placeholder="Search for a company..."
              className="p-2 border border-gray-300 rounded-md w-full"
            />
            {/* Only show suggestions if not selected */}
            {suggestions.length > 0 && !selectedCompany && (
              <ul className="absolute z-50 w-full mt-1 border border-gray-300 rounded-md max-h-60 overflow-auto bg-white shadow-lg">
                {suggestions.map((name) => (
                  <button
                    key={name}
                    onClick={() => handleSelectCompany(name)}
                    className="p-2 cursor-pointer hover:bg-gray-100 w-full text-left"
                  >
                    {name}
                  </button>
                ))}
              </ul>
            )}
          </div>

          {/* Spacer to push other items to the right */}

          <button
            onClick={handleFetchData}
            data-testid="fetch-button"
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
          >
            Load Data
          </button>

          {/* API Key Configuration Button */}
          <button
            onClick={handleOpenApiKeyModal}
            className={`px-4 py-2 rounded-md flex items-center gap-1 transition-colors ${
              upstoxApiKey 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1 1 21 9z" />
            </svg>
            {upstoxApiKey ? 'Upstox Connected ✓' : 'Connect Upstox API'}
          </button>

          {/* Boom Days button - now always visible */}
          {showBoomDays ? (
            <button
              onClick={() => setShowBoomDays(false)}
              className="px-4 py-2 rounded-md transition-colors bg-gray-600 text-white"
            >
              Show Chart
            </button>
          ) : (
            <button
              onClick={() => hasBoomDaysData && setShowBoomDays(true)}
              disabled={!hasBoomDaysData}
              className={`px-4 py-2 rounded-md transition-colors ${
                hasBoomDaysData 
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={hasBoomDaysData ? 'View boom days analysis' : 'No boom days data available'}
            >
              Boom Days
            </button>
          )}

          {/* Home button */}
          <a
            href="/"
            className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
          >
            Home
          </a>

          {/* Stats button - always visible */}
          <a
            href="/backtest-stats"
            className="px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            Overall Stats
          </a>

          {/* Entry Dates Indicator */}
          {strykeEntryDates && strykeEntryDates.length > 0 && (
            <div className="px-3 py-2 rounded-md bg-orange-100 border border-orange-300 text-orange-800 text-sm font-medium flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {strykeEntryDates.length} Stryke Points
            </div>
          )}

          {/* Progressive Loading Indicator */}
          {isProgressiveLoading && progressiveLoadingProgress.total > 0 && (
            <div className="px-3 py-2 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-600"></div>
              <span>Loading batches: {progressiveLoadingProgress.loaded}/{progressiveLoadingProgress.total}</span>
              {progressiveLoadingProgress.loaded > 0 && (
                <div className="w-16 bg-blue-200 rounded-full h-1.5">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(progressiveLoadingProgress.loaded / progressiveLoadingProgress.total) * 100}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}

          {/* Timeframe selector */}
          {!showBoomDays && candles.length > 0 && (
            <div className="flex bg-white bg-opacity-90 border border-gray-300 rounded-lg overflow-hidden shadow-sm">
              {(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'] as Timeframe[]).map((tf) => {
                const isSelected = selectedTimeframe === tf;
                const baseClasses = 'px-3 py-1 text-sm font-medium transition-colors';
                
                let stateClasses: string;
                if (isSelected) {
                  stateClasses = 'bg-blue-500 text-white';
                } else if (isLoading) {
                  stateClasses = 'bg-gray-200 text-gray-400 cursor-not-allowed';
                } else {
                  stateClasses = 'bg-white text-gray-700 hover:bg-gray-100';
                }
                
                return (
                  <button
                    key={tf}
                    onClick={() => handleTimeframeChange(tf)}
                    disabled={isLoading} // Disable during loading
                    className={`${baseClasses} ${stateClasses}`}
                    title={isLoading ? 'Loading...' : `View ${tf} timeframe`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
          )}

          {/* EMA Calculation Toggle
          {!showBoomDays && candles.length > 0 && (
            <button
              onClick={() => setEmaCalculation(!emaCalculation)}
              disabled={isCalculatingEMA}
              className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                emaCalculation
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              } ${isCalculatingEMA ? 'cursor-not-allowed opacity-50' : ''}`}
              title={emaCalculation ? 'Disable EMA calculations' : 'Enable EMA calculations'}
            >
              {isCalculatingEMA && (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              )}
              EMA {emaCalculation ? 'ON' : 'OFF'}
            </button>
          )} */}
          
          {/* Load More Historical Data button */}
          {!showBoomDays && candles.length > 0 && hasMoreCandles && (
            <button
              onClick={() => loadMoreHistoricalData()}
              disabled={loadingOlderData}
              className={`px-4 py-2 rounded-md ${
                loadingOlderData
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {loadingOlderData ? 'Loading...' : 'Load More History'}
            </button>
          )}

        </div>
      </div>

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

        // If not showing boom days, show chart
        if (!showBoomDays) {
          return (
            <>
              {candles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-gray-50 border border-gray-200 rounded-lg m-4">
                  <div className="text-center space-y-3">
                    <div className="text-4xl text-gray-400">📊</div>
                    <h3 className="text-lg font-semibold text-gray-600">No Chart Data</h3>
                    <p className="text-gray-500 max-w-md">
                      {(() => {
                        if (!upstoxApiKey) {
                          return 'Please connect your Upstox API first, then select a company and click "Load Data".';
                        }
                        if (!selectedCompany) {
                          return 'Please select a company from the search dropdown and click "Load Data".';
                        }
                        return 'Click "Load Data" to fetch historical data for the selected company.';
                      })()}
                    </p>
                  </div>
                </div>
              ) : (
                <OHLCChart
                  candles={optimizedCandles}
                  vixData={vixData}
                  title={`${selectedCompany || 'Select a company'} - ${selectedTimeframe} Chart`}
                  height={1100}
                  showVolume={true}
                  showEMA={showEMA}
                  showRSI={showRSI}
                  showVIX={showVIX}
                  showSwingPoints={showSwingPoints}
                  analysisList={analysisList}
                  supportLevel={support?.value}
                  resistanceLevel={resistance?.value}
                  avgVolume={avgVolume}
                  entryDates={strykeEntryDates} // Pass entry dates for highlighting
                  onLoadMoreData={undefined} // Temporarily disable automatic loading
                  hasMoreOlderData={hasMoreCandles}
                  hasMoreNewerData={false} // We typically only load historical data
                  isLoadingMoreData={loadingOlderData}
                />
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
            </>
          );
        }

        // Otherwise show boom days table
        return (
          <div className="p-4 mb-40"> {/* Increased bottom margin to ensure pagination is visible */}
            {boomDaysData.length > 0 ? (
              <div className="mb-20"> {/* Added bottom margin container for extra space */}
                <BoomDaysTable
                  data={boomDaysData}
                  stockName={selectedCompany}
                  avgVolume={avgVolume}
                />
              </div>
            ) : (
              <div className="w-full p-8 text-center text-gray-500 border border-gray-200 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-2">No Boom Days Data</h3>
                <p>There are no boom days recorded for {selectedCompany}.</p>
              </div>
            )}
          </div>
        );
      })()}
      
      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={handleCloseApiKeyModal}
        onSave={handleSaveApiKey}
        initialApiKey={upstoxApiKey}
      />
    </div>
  );
};