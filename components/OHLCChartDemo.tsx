"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { OHLCChart } from './OHLCChart';
import { BoomDaysTable } from './BoomDaysTable';
import { Candle } from './types/candle';
import { calculateIndicators } from './utils/indicators';
import { Timeframe, processTimeframeData } from './utils/timeframeUtils';
import { fetchPaginatedUpstoxData, UpstoxPaginationParams } from './utils/upstoxApi';
import { ApiKeyModal } from './ApiKeyModal';

// Performance optimization constants
const MAX_CANDLES_FOR_CHART = 3000; // Limit for ultra-fast performance
const PAGINATION_CHUNK_SIZE = 500; // Smaller chunks for faster loading

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
  const [showEMA] = useState(true);
  const [showRSI] = useState(false);
  const [showVIX] = useState(false);
  const [showSwingPoints] = useState(false);
  // Pagination state for Upstox API
  const [hasMoreCandles, setHasMoreCandles] = useState(false);
  const [loadingOlderData, setLoadingOlderData] = useState(false);
  const [oldestCandleTime, setOldestCandleTime] = useState<string | undefined>(undefined);
  const [newestCandleTime, setNewestCandleTime] = useState<string | undefined>(undefined);
  // API Key modal
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [upstoxApiKey, setUpstoxApiKey] = useState('alpha');

  const [shouldFetchIntraDay, setShouldFetchIntraDay] = useState(true);

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
   * Calculate the optimal date range based on timeframe to fetch approximately 100 candles
   * @param baseDate The base date to calculate from (should be current date/time)
   * @param timeframe The selected timeframe
   * @returns Date object set to appropriate historical point (always in the past)
   */
  const calculateFromDate = (baseDate: Date, timeframe: Timeframe): Date => {
    const from = new Date(baseDate);
    
    // Calculate based on typical trading hours and market days to get ~100 candles
    // Always go backwards in time
    switch (timeframe) {
      case '1m':
        from.setDate(from.getDate() - 3); // 375 per Day * 3 days = 1125 Candles
        break;
      case '5m':
        from.setDate(from.getDate() - 10); // 75 per Day * 10 days = 750 Candles
        break;
      case '15m':
        from.setDate(from.getDate() - 21); // 25 per Day * 21 days = 525 Candles
        break;
      case '30m':
        from.setDate(from.getDate() - 60); // 12 per Day * 60 days = 720 Candles
        break;
      case '1h':
        from.setDate(from.getDate() - 120); // 6 per Day * 120 days = 720 Candles
        break;
      case '4h':
        // Based on working URL: from 2025-05-27 to 2025-08-27 = ~3 months = ~90 days
        from.setDate(from.getDate() - 120); // ~90 days for 4h timeframe
        break;
      case '1d':
        from.setDate(from.getDate() - 500); // ~6 months = ~130 trading days 
        break;
      case '1w':
        from.setDate(from.getDate() - 730); // ~2 years = ~104 weeks
        break;
      default:
        from.setDate(from.getDate() - 90); // Default fallback - 3 months
    }
    
    return from;
  };

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

  // Handle selection from suggestions
  const handleSelectCompany = useCallback((companyName: string) => {
    setSelectedCompany(companyName);
    setSelectedInstrumentKey(keyMapping[companyName]);
    setSearchTerm(companyName);
    setSuggestions([]);

    // We preserve the current view (either chart view or boom days) when selecting a new company
  }, [keyMapping]); // Add dependencies for useCallback

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

  // Fetch candles for selected company/instrument using Upstox API
  const handleFetchData = useCallback(async () => {
    console.log('🚀 handleFetchData called', { selectedCompany, selectedInstrumentKey, upstoxApiKey: !!upstoxApiKey });
    if (!selectedCompany || !selectedInstrumentKey) {
      toast.error('Please select a company from the search dropdown first.', {
        duration: 3000
      });
      return;
    }
    
    if (!upstoxApiKey) {
      toast.error('Upstox API key is required to fetch market data. Please configure your API key first.', {
        duration: 4000
      });
      handleOpenApiKeyModal();
      return;
    }

    setIsLoading(true);
    setCandles([]);
    setRawCandles([]);
    setHasMoreCandles(false);
    setOldestCandleTime(undefined);
    setNewestCandleTime(undefined);
    
    try {
      
      // Calculate dynamic date range based on timeframe to limit candles to ~100
      const now = new Date();
      // Use the last trading day instead of today since today's data might not be available
      const lastTradingDay = getLastTradingDay(now);
      const to = lastTradingDay.toISOString();
      const from = calculateFromDate(new Date(lastTradingDay), selectedTimeframe);
      
      console.log(`📅 Date range calculation:`, {
        timeframe: selectedTimeframe,
        from: from.toISOString(),
        to: to,
        daysDiff: Math.floor((new Date(to).getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
        currentDate: now.toISOString(),
        lastTradingDay: lastTradingDay.toISOString()
      });
      
      const params: UpstoxPaginationParams = {
        instrumentKey: selectedInstrumentKey,
        timeframe: selectedTimeframe,
        apiKey: upstoxApiKey,
        from: from.toISOString(),
        to: to,
        limit: PAGINATION_CHUNK_SIZE // Use smaller chunks for faster loading
      };

    
      const result = await fetchPaginatedUpstoxData(params, shouldFetchIntraDay);
      setShouldFetchIntraDay(false);

      if (result.candles.length > 0) {
        // Sort candles by timestamp in ascending order (oldest first) and remove duplicates
        // Apply consistent UTC timestamp handling to prevent chart distortion
        const sortedCandles = [...result.candles]
          .filter((candle, index, self) =>
            index === self.findIndex((c) => c.timestamp === candle.timestamp)
          )
          .sort((a, b) => {
            // Use consistent timestamp comparison that matches our chart parsing logic
            // Don't add 'Z' since timestamps are already processed as IST in the chart
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeA - timeB;
          });
        
        // Process candles with indicators
        console.log(`🔄 Processing ${sortedCandles.length} candles with indicators after API fetch`);
      
        const processedCandles = calculateIndicators(sortedCandles);
        
        setRawCandles(processedCandles);
        // Apply selected timeframe processing
        const timeframeProcessedData = processTimeframeData(
          processedCandles,
          selectedTimeframe
        );
        
        
        setCandles(timeframeProcessedData);
                 setHasMoreCandles(result.hasMore);
        setOldestCandleTime(result.oldestTimestamp);
        setNewestCandleTime(result.newestTimestamp);

        // Calculate average volume
        const volumes = processedCandles.map((candle) => candle.volume);
        const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        setAvgVolume(avgVol);
        
        // Set placeholder values for other data (since Upstox doesn't provide these)
        setAnalysisList([]);
        setBoomDaysData([]);
        setHasBoomDaysData(false);
        setSupport(null);
        setResistance(null);
        
        // First load handling
        if (isFirstLoad) {
          setShowBoomDays(false);
          setIsFirstLoad(false);
        }
        
        toast.success(`Loaded data from Upstox for ${selectedCompany}`);
      } else {
        toast.error('No data available for the selected timeframe');
      }
    } catch (error) {
      console.error('Error fetching data from Upstox:', error);
      toast.error('Failed to fetch data from Upstox API. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
      setVixData([]); // Clear any VIX data
    }
  }, [selectedCompany, selectedInstrumentKey, upstoxApiKey, selectedTimeframe, isFirstLoad]); // Add dependencies for useCallback

  // Function to load more historical data (pagination)
  const loadMoreHistoricalData = useCallback(async (direction: 'older' | 'newer' = 'older') => {
    if (!selectedInstrumentKey || !upstoxApiKey || loadingOlderData) {
      return;
    }
    
    setLoadingOlderData(true);
    const loadingToast = toast.loading(`Loading ${direction} data...`);
    
    try {
      let to: string;
      let from: Date;
      
      if (direction === 'older' && newestCandleTime) {
        debugger;
        // Loading older data - use newest candle time as "to"
        const newestDate = new Date(newestCandleTime);
        to = newestDate.toISOString();
        from = calculateFromDate(newestDate, selectedTimeframe);
      } else if (direction === 'newer' && oldestCandleTime) {
        // Loading newer data - use oldest candle time as "from" and last trading day as "to"
        from = new Date(oldestCandleTime);
        const lastTradingDay = getLastTradingDay(new Date());
        to = lastTradingDay.toISOString();
      } else {
        // Fallback - use last trading day instead of current date
        const lastTradingDay = getLastTradingDay(new Date());
        to = lastTradingDay.toISOString();
        from = calculateFromDate(new Date(lastTradingDay), selectedTimeframe);
      }
      
      console.log(`Pagination request details (${direction}):`, {
        instrumentKey: selectedInstrumentKey,
        timeframe: selectedTimeframe,
        from: from.toISOString(),
        to: to,
        direction
      });
      
      const params: UpstoxPaginationParams = {
        instrumentKey: selectedInstrumentKey,
        timeframe: selectedTimeframe,
        apiKey: upstoxApiKey,
        from: from.toISOString(),
        to: to,
        limit: PAGINATION_CHUNK_SIZE
      };

      const result = await fetchPaginatedUpstoxData(params, shouldFetchIntraDay);
            setShouldFetchIntraDay(false);

      if (result.candles.length > 0) {
        // Update pagination state
        if (direction === 'older') {
          setOldestCandleTime(result.oldestTimestamp);
        } else {
          setNewestCandleTime(result.newestTimestamp);
        }
        setHasMoreCandles(result.hasMore);
        
        // Merge with existing candles
        const combinedCandles = direction === 'older' 
          ? [...result.candles, ...rawCandles] 
          : [...rawCandles, ...result.candles];
        
        // Remove duplicates (by timestamp) with consistent UTC handling
        const uniqueCandles = combinedCandles.filter((candle, index, self) =>
          index === self.findIndex((c) => c.timestamp === candle.timestamp)
        );
        
        // Sort by timestamp (oldest to newest) with IST consistency
        uniqueCandles.sort((a, b) => {
          // Use consistent timestamp comparison that matches our chart parsing logic
          // Don't add 'Z' since timestamps are already processed as IST in the chart
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB;
        });

        // Performance optimization: limit total stored candles to prevent memory issues
        const maxStoredCandles = MAX_CANDLES_FOR_CHART * 2; // Store 2x what we display for pagination
        const optimizedUnique = uniqueCandles.length > maxStoredCandles 
          ? uniqueCandles.slice(-maxStoredCandles) // Keep most recent candles
          : uniqueCandles;
        
        console.log(`Memory optimization: Storing ${optimizedUnique.length} of ${uniqueCandles.length} total candles`);
        
        // Update raw candles
        setRawCandles(optimizedUnique);
        
        // Process with the selected timeframe
        const processedCandles = processTimeframeData(optimizedUnique, selectedTimeframe);
        console.log(`🔄 Processing ${processedCandles.length} candles with indicators during pagination (full calculation for now)`);
        // Use full EMA calculation for now to ensure accuracy
        const candlesWithIndicators = calculateIndicators(processedCandles, 200, 14, false);
        
        setCandles(candlesWithIndicators);
                 
        toast.success(`Loaded ${result.candles.length} more ${direction} candles`, {
          id: loadingToast
        });
      } else {
        toast.error(`No more ${direction} data available`, {
          id: loadingToast
        });
        setHasMoreCandles(false);
      }
    } catch (error) {
      console.error(`Error loading more ${direction} data:`, error);
      toast.error(`Failed to load more ${direction} data`, {
        id: loadingToast
      });
    } finally {
      setLoadingOlderData(false);
    }
  }, [selectedInstrumentKey, upstoxApiKey, loadingOlderData, newestCandleTime, oldestCandleTime, selectedTimeframe, rawCandles]); // Add dependencies for useCallback

  // Handle timeframe change with proper error handling and rollback
  const handleTimeframeChange = useCallback((newTimeframe: Timeframe) => {
    const previousTimeframe = selectedTimeframe;
    
    // Optimistically update the timeframe
    setSelectedTimeframe(newTimeframe);
    
    // Check if we need to fetch new data for the timeframe
    const needsNewData = shouldFetchNewDataForTimeframe(previousTimeframe, newTimeframe);
    
    if (needsNewData && selectedInstrumentKey && upstoxApiKey) {
      // Fetch fresh data for the new timeframe
      const loadingToast = toast.loading('Fetching data for new timeframe...', { duration: 10000 });

      
      fetchDataForTimeframe(newTimeframe, true)
        .then(() => {
          toast.success(`Successfully loaded ${newTimeframe} data`, { id: loadingToast });
        })
        .catch((error) => {
          console.error('Failed to fetch data for new timeframe:', error);
          toast.error(`Failed to load ${newTimeframe} data. Reverting to ${previousTimeframe}.`, { 
            id: loadingToast,
            duration: 4000 
          });
          
          // Revert to previous timeframe on error
          setSelectedTimeframe(previousTimeframe);
        });
    } else if (rawCandles.length) {
      // Use existing data and process it for the new timeframe
      try {
        const processedCandles = processTimeframeData(rawCandles, newTimeframe);
        console.log(`🔄 Processing ${processedCandles.length} candles with indicators during timeframe change`);
        const candlesWithIndicators = calculateIndicators(processedCandles, 200, 14);
        
        setCandles(candlesWithIndicators);
                 toast.success(`Switched to ${newTimeframe} timeframe`);
      } catch (error) {
        console.error('Failed to process data for new timeframe:', error);
        toast.error(`Failed to switch to ${newTimeframe}. Reverting to ${previousTimeframe}.`);
        
        // Revert to previous timeframe on processing error
        setSelectedTimeframe(previousTimeframe);
      }
    } else {
      // No data available
      toast.error(`No data available for ${newTimeframe}. Please fetch data first.`);
      setSelectedTimeframe(previousTimeframe);
    }
  }, [selectedTimeframe, selectedInstrumentKey, upstoxApiKey, rawCandles]); // Add dependencies for useCallback

  // Helper function to determine if we need to fetch new data
  const shouldFetchNewDataForTimeframe = (currentTf: Timeframe, newTf: Timeframe): boolean => {
    // Define timeframe hierarchy (lower index = higher resolution)
    const timeframeOrder = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
    const currentIndex = timeframeOrder.indexOf(currentTf);
    const newIndex = timeframeOrder.indexOf(newTf);
    
    // If switching to a higher resolution timeframe, we need new data
    return newIndex < currentIndex;
  };

  // Function to fetch data for a specific timeframe with proper error handling
  const fetchDataForTimeframe = useCallback(async (timeframe: Timeframe, shouldFetchIntraDay: boolean): Promise<void> => {
    if (!selectedInstrumentKey || !upstoxApiKey) {
      throw new Error('Missing instrument key or API key');
    }
    
    setIsLoading(true);
    
    try {
      // Calculate dynamic date range based on timeframe
      const now = new Date();
      // Use the last trading day instead of today since today's data might not be available
      const lastTradingDay = getLastTradingDay(now);
      const to = lastTradingDay.toISOString();
      const from = calculateFromDate(new Date(lastTradingDay), timeframe);
      
      console.log(`📅 Fetching data for timeframe ${timeframe}:`, {
        from: from.toISOString(),
        to: to,
        instrumentKey: selectedInstrumentKey,
        lastTradingDay: lastTradingDay.toISOString(),
        currentDate: now.toISOString()
      });
      
      const params: UpstoxPaginationParams = {
        instrumentKey: selectedInstrumentKey,
        timeframe: timeframe,
        apiKey: upstoxApiKey,
        from: from.toISOString(),
        to: to,
        limit: PAGINATION_CHUNK_SIZE // Use smaller chunks for faster fetching
      };
      
      const result = await fetchPaginatedUpstoxData(params, shouldFetchIntraDay);
      setShouldFetchIntraDay(false);

      if (result.candles.length > 0) {
        // Sort candles by timestamp and remove duplicates with UTC consistency
        const sortedCandles = [...result.candles]
          .filter((candle, index, self) =>
            index === self.findIndex((c) => c.timestamp === candle.timestamp)
          )
          .sort((a, b) => {
            const timeA = new Date(a.timestamp.endsWith('Z') ? a.timestamp : a.timestamp + 'Z').getTime();
            const timeB = new Date(b.timestamp.endsWith('Z') ? b.timestamp : b.timestamp + 'Z').getTime();
            return timeA - timeB;
          });
        
        // Process candles with indicators
        console.log(`🔄 Processing ${sortedCandles.length} candles with indicators during timeframe fetch`);
        const processedCandles = calculateIndicators(sortedCandles);
        
        setRawCandles(processedCandles);
        
        // Apply timeframe processing
        const timeframeProcessedData = processTimeframeData(processedCandles, timeframe);
        setCandles(timeframeProcessedData);
        
        setHasMoreCandles(result.hasMore);
        setOldestCandleTime(result.oldestTimestamp);
        setNewestCandleTime(result.newestTimestamp);
        
        console.log(`✅ Successfully loaded ${timeframe} data for ${selectedCompany}: ${sortedCandles.length} candles`);
      } else {
        throw new Error(`No data available for ${timeframe} timeframe`);
      }
    } catch (error) {
      console.error(`❌ Error fetching ${timeframe} data:`, error);
      throw error; // Re-throw to allow proper error handling in handleTimeframeChange
    } finally {
      setIsLoading(false);
    }
  }, [selectedInstrumentKey, upstoxApiKey, selectedCompany]); // Add dependencies for useCallback

  // Handle API key modal
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
          
          {/* Load More Historical Data button */}
          {!showBoomDays && candles.length > 0 && hasMoreCandles && (
            <button
              onClick={() => loadMoreHistoricalData('older')}
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
                  onLoadMoreData={undefined} // Temporarily disable automatic loading
                  hasMoreOlderData={hasMoreCandles}
                  hasMoreNewerData={false} // We typically only load historical data
                  isLoadingMoreData={loadingOlderData}
                />
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