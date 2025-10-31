"use client";

import React, { useState, useEffect, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { CallType } from '@/components/types/strike-analysis';
import { fetchUpstoxIntradayData } from '@/components/utils/upstoxApi';

// Define the Stryke interface based on the provided model
interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: string;
  volume?: number;
}

interface SwingDTO {
  timestamp: string;
  candles: Candle[];
  price: number;
  label: string;
  time: number
}

interface EMADTO {
  // New backend shape: prefer these if available
  ema8?: number | null;
  ema30?: number | null;
  ema200?: number | null;

}

interface SwingAnalysis {
  minSwingProfits?: number;
  maxSwingProfits?: number;
  daysTakenForMaxSwingProfits?: number;
  maxProfitCandle?: Candle;
  algoEntryCandle?: Candle;
  supportTouchCandle?: Candle;
  resistanceTouchCandle?: Candle;
  daysTakenForSupportTouch?: number;
  daysTakenForResistanceTouch?: number;
  algoSupport?: number;
  algoResistance?: number;
  currentSwing?: SwingDTO | null;
  previousSwing?: SwingDTO | null;

  emacross: EMACROSS;
 

}
interface EMACROSS {
  // New optional per-timeframe EMA DTOs returned by backend
  emaDataDay?: EMADTO | null;
  emaData4H?: EMADTO | null;
  emaData1H?: EMADTO | null;
  emaData15M?: EMADTO | null;
  // Lists of ISO datetimes when EMA crossovers occurred (may be returned by backend)
  emaCrossoverList1H?: string[] | null;
  emaCrossoverList15M?: string[] | null;
  emaCrossoverList4H?: string[] | null;
  emaCrossoverListDay?: string[] | null;
}

interface FibAnalysis{
  uuid: string;
  companyName: string;
  instrumentKey: string;
  fibLevels: FibLevels;
}

interface FibLevels {
  fibHealthyCandle?: Candle | null;
  fib61Candle?: Candle | null;
  fib78Candle?: Candle | null;
  fib100Candle?: Candle | null;
  fib161Candle?: Candle | null;
  fib261Candle?: Candle | null;
  fib423Candle?: Candle | null;
  maxProfitCandle?: Candle | null;
  maxLossCandle?: Candle | null;
  fibHealthy?: number | null;
  fib61?: number | null;
  fib78?: number | null;
  fib100?: number | null;
  fib161?: number | null;
  fib261?: number | null;
  fib423?: number | null;
  maxProfit?: number | null;
  maxLoss?: number | null;
}

interface Stryke {
  id: string;
  instrumentKey: string;
  companyName: string;
  entryAt: string;
  preEntryTrend: string;
  postEntryTrend: string;
  entryTimeZone: number;
  callType: string;
  entryTime: string;
  preEntryMinuteCandles: Candle[];
  postEntryMinuteCandles: Candle[];
  preEntryDayCandles: Candle[];
  postEntryDayCandles: Candle[];
  entryDaysCandle: Candle;
  entryCandle: Candle;
  entryDayMinutesCandle: Candle;
  rsi: number;


  stopLoss: number;
  target: number;
  dipAfterEntry20M: boolean;
  hitStopLoss: boolean;
  hitTarget: boolean;
  isInResistanceZone: boolean;
  support: number;
  resistance: number;
  peakIn30M: number;
  dipIn30M: number;
  profit: number;
  daysTakenToProfit: number;
  loss: number;
  daysTakenToLoss: number;
  highestPrice: number;
  lowestPrice: number;
  maxDrawDownPercentage: number;
  highestPriceTime: string;
  lowestPriceTime: string;
  remarks: string;
  stockUuid: string;
  lastClosingValue: number;
  avgVolume: number;
  dayStatsMap: { [key: string]: DayStats };
  lastClosingValueDate: string;
  inResistanceZone?: boolean;
  onePercChangeMap: { [dateKey: string]: string }; // Map<LocalDate, LocalDateTime> equivalent in TypeScript

  // New swing analysis structure
  strykeSwingAnalysis?: SwingAnalysis;
  algoSwingAnalysis?: SwingAnalysis;

}

interface DayStats {
  peak: number;
  dip: number;
}

interface StrykeListResponse {
  swingStatsList: { [key: string]: AnalysisResponse[] };
  statusText: string;
}

interface AnalysisResponse {
  uuid: string;
  label: string;
  companyName: string;
  instrumentKey: string;
  entryTime: string;
  entryCandleClose: number;
  stopLoss: number;
  target: number;
  prevSwingLabel: string;
  currentSwingLabel: string;
  minSwingProfits: number;
  maxSwingProfits: number;
  daysTakenForMaxSwingProfits: number;
  daysTakenForSupportTouch: number;
  daysTakenForResistanceTouch: number;
  emacross: EMACROSS;
  strykeType: string; // Add this field - expects "OLD" or "NEW"
}


interface metricsData {
  minProfitsAchieved: number,
  maxProfitsAchieved: number,
  lessThanMinProfits: number,
  supportsTouched: number,
  resistancesTouched: number,
  avgTimeTakenForProfits: number
  ErGap_L3: number,
  ErGap_G3: number
  ER_Gap_AR: number

  minProfitValue: number,
  maxProfitValue: number,
  avgProfitValue: number
}


// Define a type alias for filter order
export type FilterOrder = 'asc' | 'desc' | null;
export type TrendFilter = 'BULLISH' | 'BEARISH' | null;

function StrikeAnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get tab from URL parameter, default to 'form'
  const getInitialTab = () => {
    const tab = searchParams?.get('tab');
    return tab || 'form';
  };

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [strykeMetrics, setStrykeMetrics] = useState<metricsData | null>(null);
  const [algoMetrics, setAlgoMetrics] = useState<metricsData | null>(null);
  const [fiboMetrics, setFiboMetrics] = useState<metricsData | null>(null);
  // Global blocking loader for long running actions (delete, bulk ops, etc.)
  const [globalLoading, setGlobalLoading] = useState(false);
  const [keyMapping, setKeyMapping] = useState<{ [companyName: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedInstrumentKey, setSelectedInstrumentKey] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toLocaleDateString('en-GB').split('/').reverse().join('-') // Format as DD-MM-YYYY
  );
  const [selectedTime, setSelectedTime] = useState<string>('00:00');
  const [callType, setCallType] = useState<CallType>(CallType.INTRADAY);
  const [strykeType, setStrykeType] = useState<'OLD' | 'APP' | 'DISCORD'>('APP');
  const [stopLoss, setStopLoss] = useState<string>('0.00');
  const [target, setTarget] = useState<string>('0.00');
  const [strykeList, setStrykeList] = useState<AnalysisResponse[]>([]);
  const [analysisResult, setAnalysisResult] = useState<Stryke | null>(null);
  const [selectedStryke, setSelectedStryke] = useState<AnalysisResponse | null>(null);
  const [strykeAnalysisList, setStrykeAnalysisList] = useState<AnalysisResponse[]>([]);
  const [algoAnalysisList, setAlgoAnalysisList] = useState<AnalysisResponse[]>([]);
  const [fiboAnalysisList, setFiboAnalysisList] = useState<AnalysisResponse[]>([]);

  const [filteredAnalysisList, setFilteredAnalysisList] = useState<AnalysisResponse[]>([]);

  // Initialize tab states based on URL parameter
  const initialTab = getInitialTab();
  const [showStrykeForm, setShowStrykeForm] = useState(() => initialTab === 'form');
  const [showAllStrykes, setShowAllStrykes] = useState(() => initialTab === 'all');
  const [showStrykeStats, setShowStrykeStats] = useState(() => initialTab === 'stats');
  const [showSwingStats, setShowSwingStats] = useState(() => initialTab === 'swing');
  const [showMetrics, setShowMetrics] = useState(() => false);
  const [showAlgoAnalysis, setShowAlgoAnalysis] = useState(() => true);
  const [showStrykeAnalysis, setShowStrykeAnalysis] = useState(() => true);
  const [showFiboAnalysis, setShowFiboAnalysis] = useState(() => true);
  const [showOldAnalysis, setShowOldAnalysis] = useState(() => true); // Add this new state
  const [showAppAnalysis, setShowAppAnalysis] = useState(() => true); // Add this new state
  const [showDiscordAnalysis, setShowDiscordAnalysis] = useState(() => true); // Add this new state
  const [activeFilter, setActiveFilter] = useState({
    date: null as FilterOrder,
    name: null as FilterOrder,
    avgVolume: null as FilterOrder,
    target: null as FilterOrder,
    entry: null as FilterOrder,
    stopLoss: null as FilterOrder,
    trend: null as TrendFilter,
    inResistanceZone: null as 'YES' | 'NO' | null,
    onePercChange: null as 'YES' | 'NO' | null,
    swingLabel: null as 'LL' | 'LH' | 'HL' | 'HH' | null,
    swingLabel2: null as 'LL' | 'LH' | 'HL' | 'HH' | null,
    swingLabelCombo: null as 'LL<-LH' | 'HL<-LH' | 'LL<-HH' | 'HL<-HH' | 'LH<-LL' | 'HH<-LL' | 'LH<-HL' | 'HH<-HL' | 'HH<-HH' | 'LL<-LL' | 'LH<-LH' | 'HL<-HL' | null,
    erLabel: null as 'ABOVE_3' | 'BELOW_3' | 'AR' | null,
    erSort: null as FilterOrder,
    profitLabel: null as 'ABOVE_3' | 'BELOW_3' | 'NEGATIVE' | null,
    profitSort: null as FilterOrder,
    supportLabel: null as 'HIT' | 'NO_HIT' | null,
    supportSort: null as FilterOrder,
    resistanceLabel: null as 'HIT' | 'NO_HIT' | null,
    resistanceSort: null as FilterOrder,
  });
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Progressive loading state
  const [progressiveLoading, setProgressiveLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({
    completedAlphabets: [] as string[],
    currentAlphabet: null as string | null,
    totalCompanies: 0,
    loadedCompanies: 0,
    isComplete: false
  });

  // Track if data loading has been attempted to prevent unnecessary retries
  const [dataLoadingAttempted, setDataLoadingAttempted] = useState(false);

  // Modal state to show full EMA crossover dates when a badge is clicked
  const [crossoverModal, setCrossoverModal] = useState<{
    open: boolean;
    timeframe: '15M' | '1H' | '4H' | '1D' | null;
    companyName?: string | null;
    list: string[];
  }>({ open: false, timeframe: null, companyName: null, list: [] });

  // Modal state to show stocks missing analysis data
  const [missingAnalysisModal, setMissingAnalysisModal] = useState<{
    open: boolean;
    type: 'stryke' | 'algo' | null;
    stocks: Stryke[];
  }>({ open: false, type: null, stocks: [] });

  // Chart dropdown state
  const [chartDropdownOpen, setChartDropdownOpen] = useState<string | null>(null);

  // Swing labels filter dropdown state
  const [swingLabelsDropdownOpen, setSwingLabelsDropdownOpen] = useState<boolean>(false);

  // ER-Gap filter dropdown state
  const [erGapDropdownOpen, setErGapDropdownOpen] = useState<boolean>(false);

  // Max Profits filter dropdown state
  const [profitsDropdownOpen, setProfitsDropdownOpen] = useState<boolean>(false);

  // Support filter dropdown state
  const [supportDropdownOpen, setSupportDropdownOpen] = useState<boolean>(false);

  // Resistance filter dropdown state
  const [resistanceDropdownOpen, setResistanceDropdownOpen] = useState<boolean>(false);

  // Helper function to apply stryke analysis filter
  const applyStrykeAnalysisFilter = (stocks: Stryke[]): Stryke[] => {
    if (showStrykeAnalysis) {
      // If showStrykeAnalysis is true, only include stocks that have strykeSwingAnalysis
      return stocks.filter(stock => stock.strykeSwingAnalysis != null);
    }
    // If showStrykeAnalysis is false, include all stocks
    return stocks;
  };

  // Fetch KeyMapping from Redis on mount
  useEffect(() => {

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

      })
      .catch(() => {
        toast.error('Failed to load company data');

      });


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
  const handleSelectCompany = (companyName: string) => {
    setSelectedCompany(companyName);
    setSelectedInstrumentKey(keyMapping[companyName]);
    setSearchTerm(companyName);
    setSuggestions([]);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCompany || !selectedInstrumentKey) {
      toast.error('Please select a company');
      return;
    }
    try {
      const checkIfCompanyExists = await fetchUpstoxIntradayData(selectedInstrumentKey, selectedDate);

    } catch (error: any) {

      if (error instanceof Error && error.message.includes('400')) {
        toast.error('Company data is blocked by Upstox and cannot be retrieved.');
        return;
      }
    }

    const stopLossValue = parseFloat(stopLoss);
    const targetValue = parseFloat(target);

    if (isNaN(stopLossValue) || isNaN(targetValue)) {
      toast.error('Stop Loss and Target must be valid numbers');
      return;
    }

    setIsLoading(true);

    const strykeInbound = {
      instrumentKey: selectedInstrumentKey,
      companyName: selectedCompany,
      entryDate: selectedDate,
      time: selectedTime,
      callType,
      strykeType,
      stopLoss: stopLossValue,
      target: targetValue,
    };

    try {
      await addNewStock(strykeInbound);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addNewStock = async (strykeInbound: Partial<Stryke>) => {
    try {
      setIsLoading(true);
      const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.post(`${backEndBaseUrl}/api/stryke/add-stock`, strykeInbound, {
        headers: {
          'accept': 'application/json',
        },
      });
      const addedStock = response.data.stryke;
      setAnalysisResult({
        ...addedStock,
        entryDate: new Date(addedStock.entryTime).toLocaleDateString('en-GB'),
      }); // Display the added stock details
      toast.success('Stock added successfully');

      // Add the new stock to the list
      setStrykeList((prevList) => [
        {
          ...addedStock,
          entryDate: new Date(addedStock.entryTime).toLocaleDateString('en-GB'),
        },
        ...prevList,
      ]);
    } catch (error: any) {
      console.error('Error adding new stock:', error);
      toast.error(error?.response?.data?.statusText || 'Failed to add stock');
    } finally {
      setIsLoading(false);
    }
  };

  const recalculateStrykeAnalysis = async () => {
    try {
      setIsLoading(true);
      const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      await axios.get(`${backEndBaseUrl}/api/stryke/recalculate`, {
        headers: {
          'accept': 'application/json',
        },
      });

      // Reset failure tracking before refetching data
      (0);
      setDataLoadingAttempted(false);
      fetchStrykes();
    } catch (error) {
      console.error('Error recalculating stryke analysis:', error);
      toast.error('Failed to recalculate stryke analysis');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all strykes from API using progressive loading
  const fetchStrykes = async () => {
    // Prevent multiple simultaneous calls
    if (progressiveLoading) {
      toast.error('Loading already in progress. Please wait...');
      return;
    }

    // Mark that data loading has been attempted
    setDataLoadingAttempted(true);

    // QWERTY order for progressive loading
    const alphabetOrder = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B', 'N', 'M'];

    setProgressiveLoading(true);
    setIsLoading(false); // Disable main loading spinner since we have progress bar
    setStrykeList([]); // Clear existing data
    setStrykeAnalysisList([]);
    setAlgoAnalysisList([]);
    setFiboAnalysisList([]);
    setFilteredAnalysisList([]);

    // Initialize progress
    setLoadingProgress({
      completedAlphabets: [],
      currentAlphabet: null,
      totalCompanies: 0,
      loadedCompanies: 0,
      isComplete: false
    });

    const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    let allStrykes: AnalysisResponse[] = [];
    let completedAlphabets: string[] = [];
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 5; // Stop if 5 consecutive alphabets fail

    try {
      for (let i = 0; i < alphabetOrder.length; i++) {
        const alphabet = alphabetOrder[i];

        // Update current alphabet being loaded
        setLoadingProgress(prev => ({
          ...prev,
          currentAlphabet: alphabet,
          completedAlphabets: completedAlphabets
        }));

        try {
          const response = await fetch(`${backEndBaseUrl}/api/stryke/fetch-all-analysis/${alphabet}`, {
            headers: {
              'accept': 'application/json',
            },
          });

          if (response.ok) {
            const data: StrykeListResponse = await response.json();

            if (data.swingStatsList && data.swingStatsList !== null) {
              // Process the new data
              const algoAnalysis: AnalysisResponse[] = data.swingStatsList["ALGO"] || [];
              const strykeAnalysis: AnalysisResponse[] = data.swingStatsList["STRYKE"] || [];
              const fiboAnalysis: AnalysisResponse[] = data.swingStatsList["FIBO"] || [];
              setAlgoAnalysisList((prev) => [...prev, ...algoAnalysis]);
              setStrykeAnalysisList((prev) => [...prev, ...strykeAnalysis]);
              setFiboAnalysisList((prev) => [...prev, ...fiboAnalysis]);

              // Add to accumulated data
              allStrykes = [...allStrykes, ...algoAnalysis, ...strykeAnalysis, ...fiboAnalysis];

              // Update the UI immediately with new data
              setStrykeList(allStrykes);

              // Update filtered lists with the new combined data
              setFilteredAnalysisList((prev) => [...prev, ...algoAnalysis, ...strykeAnalysis, ...fiboAnalysis]);

              console.log(`Loaded ${allStrykes.length} companies from alphabet ${alphabet}`);

              // Reset consecutive failures on success
              consecutiveFailures = 0;
            } else {
              console.warn(`No data returned for alphabet ${alphabet}`);
              consecutiveFailures++;
            }
          } else {
            console.warn(`Failed to fetch data for alphabet ${alphabet}: ${response.status}`);
            consecutiveFailures++;
          }
        } catch (error) {
          console.error(`Error fetching alphabet ${alphabet}:`, error);
          consecutiveFailures++;
        }

        // Check if we should stop due to too many consecutive failures
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.error(`Stopping fetch: ${consecutiveFailures} consecutive failures detected`);
          toast.error(`Stopped loading after ${consecutiveFailures} consecutive failures. Check your connection and try again.`);
          break;
        }

        // Mark alphabet as completed (even if it failed, to track progress)
        completedAlphabets = [...completedAlphabets, alphabet];

        // Update progress
        setLoadingProgress(prev => ({
          ...prev,
          completedAlphabets: completedAlphabets,
          currentAlphabet: i === alphabetOrder.length - 1 ? null : alphabetOrder[i + 1],
          loadedCompanies: allStrykes.length,
          totalCompanies: allStrykes.length // This will grow as we load more
        }));

        // Small delay to prevent overwhelming the server
        if (i < alphabetOrder.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Mark as complete
      setLoadingProgress(prev => ({
        ...prev,
        isComplete: true,
        currentAlphabet: null,
        totalCompanies: allStrykes.length
      }));

      if (allStrykes.length > 0) {
        toast.success(`Successfully loaded ${allStrykes.length} companies from ${completedAlphabets.length} alphabets`);
      } else {
        toast.error('No data was loaded. Please check your connection and try again.');
      }

    } catch (error) {
      console.error('Error in progressive loading:', error);
      toast.error('Failed to complete data loading. Please check your connection and try again.');
    } finally {
      setProgressiveLoading(false);
    }
  };


  // Determine badge color and tooltip for EMAs for a given timeframe
  const getEmaBadgeProps = (stryke: AnalysisResponse, label: string, timeframe: '15M' | '1H' | '4H' | '1D') => {
    let dto: EMADTO | null | undefined;
    let crossoverList: string[] | null | undefined;

    let ema8Raw: number | string | null | undefined;
    let ema30Raw: number | string | null | undefined;

    if (label.toLowerCase() === 'algo') {
      // Use algo EMA data from emacross
      dto = timeframe === '15M' ? stryke?.emacross?.emaData15M
        : timeframe === '1H' ? stryke?.emacross?.emaData1H
          : timeframe === '4H' ? stryke?.emacross?.emaData4H
            : stryke?.emacross?.emaDataDay;

      crossoverList = timeframe === '15M' ? stryke?.emacross?.emaCrossoverList15M
        : timeframe === '1H' ? stryke?.emacross?.emaCrossoverList1H
          : timeframe === '4H' ? stryke?.emacross?.emaCrossoverList4H
            : stryke?.emacross?.emaCrossoverListDay;

      ema8Raw = timeframe === '15M' ? stryke?.emacross?.emaData15M?.ema8
        : timeframe === '1H' ? stryke?.emacross?.emaData1H?.ema8
          : timeframe === '4H' ? stryke?.emacross?.emaData4H?.ema8
            : stryke?.emacross?.emaDataDay?.ema8;
      ema30Raw = timeframe === '15M' ? stryke?.emacross?.emaData15M?.ema30
        : timeframe === '1H' ? stryke?.emacross?.emaData1H?.ema30
          : timeframe === '4H' ? stryke?.emacross?.emaData4H?.ema30
            : stryke?.emacross?.emaDataDay?.ema30;
    } else {
      // Use stryke EMA data (original logic)
      dto = timeframe === '15M' ? stryke?.emacross?.emaData15M
        : timeframe === '1H' ? stryke?.emacross?.emaData1H
          : timeframe === '4H' ? stryke?.emacross?.emaData4H
            : stryke?.emacross?.emaDataDay;

      crossoverList = timeframe === '15M' ? stryke?.emacross?.emaCrossoverList15M
        : timeframe === '1H' ? stryke?.emacross?.emaCrossoverList1H
          : timeframe === '4H' ? stryke?.emacross?.emaCrossoverList4H
            : stryke?.emacross?.emaCrossoverListDay;

      ema8Raw = timeframe === '15M' ? stryke?.emacross?.emaData15M?.ema8
        : timeframe === '1H' ? stryke?.emacross?.emaData1H?.ema8
          : timeframe === '4H' ? stryke?.emacross?.emaData4H?.ema8
            : stryke?.emacross?.emaDataDay?.ema8;
      ema30Raw = timeframe === '15M' ? stryke?.emacross?.emaData15M?.ema30
        : timeframe === '1H' ? stryke?.emacross?.emaData1H?.ema30
          : timeframe === '4H' ? stryke?.emacross?.emaData4H?.ema30
            : stryke?.emacross?.emaDataDay?.ema30;
    }

    // Normalize array values (backend may return string[]); use last element if array
    const normalizeRaw = (v: any) => {
      if (Array.isArray(v) && v.length > 0) return v[v.length - 1];
      return v;
    };

    const ema8Num = Number(normalizeRaw(ema8Raw));
    const ema30Num = Number(normalizeRaw(ema30Raw));
    const hasValid = isFinite(ema8Num) && isFinite(ema30Num);
    if (!hasValid) return { cls: 'bg-gray-100 text-gray-600', title: `EMA data unavailable (${label} analysis)` };

    let cls = 'bg-gray-100 text-gray-600';
    if (ema8Num > ema30Num) cls = 'bg-green-100 text-green-800';
    else if (ema8Num === ema30Num) cls = 'bg-amber-100 text-amber-800';
    else cls = 'bg-red-100 text-red-800';

    const crossoverCount = crossoverList?.length ?? 0;
    const recentDates = (crossoverList ?? [])
      .slice(-3)
      .map(d => {
        if (!d) return 'N/A';
        const parsed = new Date(d);
        // If date is invalid, show the raw string instead of 'Invalid Date'
        if (isNaN(parsed.getTime())) return d;
        return formatReadableDate(d);
      })
      .reverse(); // show latest first in tooltip

    const ema8Fmt = ema8Num.toFixed(2);
    const ema30Fmt = ema30Num.toFixed(2);

    let title = `${label} Analysis - ${timeframe}`;
    title += `\nema8: ${ema8Fmt}, ema30: ${ema30Fmt}`;
    title += `\nCrossovers: ${crossoverCount}`;
    if (crossoverCount > 0) {
      const latest = crossoverList![crossoverList!.length - 1];
      const latestFmt = (() => {
        if (!latest) return 'N/A';
        const p = new Date(latest);
        return isNaN(p.getTime()) ? latest : formatReadableDate(latest);
      })();
      title += `; Latest: ${latestFmt}`;
      title += `; Recent: ${recentDates.join(', ')}`;
    }

    return { cls, title, count: crossoverCount };
  };

  const openCrossoverModal = (stryke: AnalysisResponse, label: string, timeframe: '15M' | '1H' | '4H' | '1D') => {
    const list: string[] =

      label.toLowerCase() === 'algo' ? (
        timeframe === '15M' ? (stryke?.emacross?.emaCrossoverList15M ?? [])
          : timeframe === '1H' ? (stryke?.emacross?.emaCrossoverList1H ?? [])
            : timeframe === '4H' ? (stryke?.emacross?.emaCrossoverList4H ?? [])
              : (stryke?.emacross?.emaCrossoverListDay ?? [])
      )
        : (
          timeframe === '15M' ? (stryke?.emacross?.emaCrossoverList15M ?? [])
            : timeframe === '1H' ? (stryke?.emacross?.emaCrossoverList1H ?? [])
              : timeframe === '4H' ? (stryke?.emacross?.emaCrossoverList4H ?? [])
                : (stryke?.emacross?.emaCrossoverListDay ?? [])
        );

    setCrossoverModal({ open: true, timeframe, companyName: stryke.companyName, list });
  };

  const closeCrossoverModal = () => setCrossoverModal({ open: false, timeframe: null, companyName: null, list: [] });

  // Function to navigate to chart page with parameters
  const navigateToChart = (instrumentKey: string, timeframe: string) => {
    const chartUrl = `/chart?instrumentKey=${encodeURIComponent(instrumentKey)}&timeframe=${encodeURIComponent(timeframe)}`;
    window.open(chartUrl, '_blank');
    setChartDropdownOpen(null); // Close dropdown after navigation
  };

  // Available timeframes for chart navigation
  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

  useEffect(() => {
    if (showAllStrykes && strykeList.length === 0 && !progressiveLoading && !dataLoadingAttempted) {
      fetchStrykes();
    }
  }, [showAllStrykes, strykeList.length, progressiveLoading, dataLoadingAttempted]);

  useEffect(() => {
    if (showSwingStats && strykeList.length === 0 && !progressiveLoading && !dataLoadingAttempted) {
      fetchStrykes();
    }
  }, [showSwingStats, strykeList.length, progressiveLoading, dataLoadingAttempted]);

  // Close chart dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chartDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setChartDropdownOpen(null);
        }
      }
    };

    if (chartDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [chartDropdownOpen]);

  // Close swing labels dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (swingLabelsDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setSwingLabelsDropdownOpen(false);
        }
      }
    };

    if (swingLabelsDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [swingLabelsDropdownOpen]);

  // Close ER-Gap dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (erGapDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setErGapDropdownOpen(false);
        }
      }
    };

    if (erGapDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [erGapDropdownOpen]);

  // Close Profits dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profitsDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setProfitsDropdownOpen(false);
        }
      }
    };

    if (profitsDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [profitsDropdownOpen]);

  // Close Support dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supportDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setSupportDropdownOpen(false);
        }
      }
    };

    if (supportDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [supportDropdownOpen]);

  // Close Resistance dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resistanceDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setResistanceDropdownOpen(false);
        }
      }
    };

    if (resistanceDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [resistanceDropdownOpen]);

  // Auto-recalculate metrics when filteredStrykeList changes and metrics view is active
  useEffect(() => {
    if (showMetrics && filteredAnalysisList.length > 0) {
      calculateMetrics(true); // Suppress toast for auto-calculation
    } else if (showMetrics && filteredAnalysisList.length === 0) {
      // Clear metrics when no data is available
      setStrykeMetrics(null);
      setAlgoMetrics(null);
      setFiboMetrics(null);
    }
  }, [filteredAnalysisList, showMetrics]);

  // Apply all active filters to create the filtered list
  useEffect(() => {
    let filtered = [...strykeAnalysisList, ...algoAnalysisList, ...fiboAnalysisList];

    // Filter by analysis type (ALGO, STRYKE, FIBO)
    const enabledTypes: string[] = [];
    if (showAlgoAnalysis) enabledTypes.push('ALGO');
    if (showStrykeAnalysis) enabledTypes.push('STRYKE');
    if (showFiboAnalysis) enabledTypes.push('FIBO');
    
    if (enabledTypes.length > 0) {
      filtered = filtered.filter(item => enabledTypes.includes(item.label));
    }

    // Filter by strykeType (OLD/APP/DISCORD) - only filter if not all three are enabled
    // If all three showOldAnalysis, showAppAnalysis, and showDiscordAnalysis are true, show all items regardless of strykeType
    if (!(showOldAnalysis && showAppAnalysis && showDiscordAnalysis)) {
      const enabledStrykeTypes: string[] = [];
      if (showOldAnalysis) enabledStrykeTypes.push('OLD');
      if (showAppAnalysis) enabledStrykeTypes.push('APP');
      if (showDiscordAnalysis) enabledStrykeTypes.push('DISCORD');
      
      if (enabledStrykeTypes.length > 0) {
        filtered = filtered.filter(item => {
          // If item doesn't have strykeType field, include it (for backward compatibility)
          if (!item.strykeType) return true;
          return enabledStrykeTypes.includes(item.strykeType);
        });
      }
    }

    setFilteredAnalysisList(filtered);
  }, [
    strykeAnalysisList, 
    algoAnalysisList, 
    fiboAnalysisList, 
    showAlgoAnalysis, 
    showStrykeAnalysis, 
    showFiboAnalysis,
    showOldAnalysis,
    showAppAnalysis,
    showDiscordAnalysis
  ]);

  const handleToggleView = (showForm: boolean, showAll: boolean, showStats: boolean, showSwing: boolean) => {
    setShowStrykeForm(showForm);
    //setShowAllStrykes(showAll);
    // setShowStrykeStats(showStats);
    setShowSwingStats(showSwing);

    // Update URL parameter to maintain tab state
    const newTab = showForm ? 'form' : showAll ? 'all' : showStats ? 'stats' : showSwing ? 'swing' : 'form';
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    router.replace(url.pathname + url.search);
  };

  // Handle URL parameter changes (for browser back/forward navigation)
  useEffect(() => {
    const tab = searchParams?.get('tab') || 'form';

    // Update states based on URL parameter
    setShowStrykeForm(tab === 'form');
    //setShowAllStrykes(tab === 'all');
    // setShowStrykeStats(tab === 'stats');
    setShowSwingStats(tab === 'swing');
  }, [searchParams]);

  // Utility function to parse date strings
  function parseDateString(dateString: string): Date {
    return new Date(dateString);
  }

  function calculateTimeDifference(startTime: string, endTime: string): number {
    const startDate = parseDateString(startTime);
    const endDate = parseDateString(endTime);
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    console.log('Time Difference (minutes):', Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60)));
    return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60));
  }


  function calculatePercentageDifference(baseValue: number, comparer: number): number {
    if (baseValue === comparer) return 0;
    return parseFloat(((comparer - baseValue) / baseValue * 100).toFixed(2));
  }



  // Readable date like '08 Sep 2025'
  function formatReadableDate(dateString: string | undefined | null): string {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'N/A';
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }



  // Build numeric-only rows for Excel for Swing Stats
  const buildSwingStatsRowsForExcel = () => {
    const header: string[] = [
      'Slno',
      'Analysis Type',
      'Name',
      'Entry Date',
      'Entry At',
      'Target',
      'Target %',
      'Stop Loss',
      'Stop Loss %',
      'Previous Swing Label',
      'Current Swing Label',
      'ER-Gap %',
      'Max Profits %',
      'Days to Max Profit',
      'Support Touch Days',
      'Resistance Touch Days',

    ];

    const rows: (string | number)[][] = [header];

    filteredAnalysisList.forEach((stryke, index) => {


      // Add Stryke Analysis Row if it exists and is shown

      const analysisType = stryke.label || 'N/A';

      const entryDate = stryke.entryTime ? new Date(stryke.entryTime).toLocaleDateString() : 'N/A';
      const entryPrice = Number(stryke.entryCandleClose ?? 0) || 0;
      const targetPrice = Number(stryke.target ?? 0) || 0;
      const stopLossPrice = Number(stryke.stopLoss ?? 0) || 0;

      // Calculate percentages
      const targetPct = entryPrice && targetPrice ? Number(((targetPrice - entryPrice) / entryPrice * 100).toFixed(2)) : '';
      const stopLossPct = entryPrice && stopLossPrice ? Number(((stopLossPrice - entryPrice) / entryPrice * 100).toFixed(2)) : '';

      const erGap = stryke?.minSwingProfits != null ? Number(stryke.minSwingProfits) : '';
      const maxProfits = stryke?.maxSwingProfits != null ? Number(stryke.maxSwingProfits) : '';
      const maxProfitDays = stryke?.daysTakenForMaxSwingProfits != null ? Number(stryke.daysTakenForMaxSwingProfits) : '';
      const supportDays = stryke?.daysTakenForSupportTouch != null ? Number(stryke.daysTakenForSupportTouch) : '';
      const resistanceDays = stryke?.daysTakenForResistanceTouch != null ? Number(stryke.daysTakenForResistanceTouch) : '';



      rows.push([
        `${index + 1}`,
        analysisType,
        String(stryke.companyName ?? ''),
        entryDate,
        Number(entryPrice.toFixed(2)),
        Number(targetPrice.toFixed(2)),
        targetPct as any,
        Number(stopLossPrice.toFixed(2)),
        stopLossPct as any,
        String(stryke?.prevSwingLabel ?? 'N/A'),
        String(stryke?.currentSwingLabel ?? 'N/A'),
        erGap as any,
        maxProfits as any,
        maxProfitDays as any,
        supportDays as any,
        resistanceDays as any,

      ]);
    });
    return rows;
  }


  const exportSwingStatsToExcel = async () => {
    // Use numeric-only rows for Excel
    const rows = buildSwingStatsRowsForExcel();
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Swing Stats');
    XLSX.writeFile(wb, `swing-stats-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (isLoading && !progressiveLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const calculateMetrics = (suppressToast = false) => {
    if (filteredAnalysisList.length === 0) {
      if (!suppressToast) {
        toast.error('No stryke data available to calculate metrics');
      }
      return;
    }

    // Helper function to calculate metrics for a given analysis type
    const calculateAnalysisMetrics = (getAnalysis: (stryke: AnalysisResponse) => any): metricsData => {
      const strykeDataWithAnalysis = filteredAnalysisList
        .map(stryke => ({
          stryke,
          analysis: getAnalysis(stryke)
        }))
        .filter(item => item.analysis != null);

      if (strykeDataWithAnalysis.length === 0) {
        return {
          minProfitsAchieved: 0,
          maxProfitsAchieved: 0,
          lessThanMinProfits: 0,
          supportsTouched: 0,
          resistancesTouched: 0,
          avgTimeTakenForProfits: 0,
          ErGap_L3: 0,
          ErGap_G3: 0,
          ER_Gap_AR: 0,
          minProfitValue: 0,
          maxProfitValue: 0,
          avgProfitValue: 0
        };
      }

      // Extract values
      const minProfits = strykeDataWithAnalysis
        .map(item => Number(item.analysis.minSwingProfits))
        .filter(val => isFinite(val));

      const maxProfits = strykeDataWithAnalysis
        .map(item => Number(item.analysis.maxSwingProfits))
        .filter(val => isFinite(val));

      // Debug: Check what fields are available in the analysis
      console.log('Sample analysis object:', strykeDataWithAnalysis[0]?.analysis);
      console.log('Available fields:', Object.keys(strykeDataWithAnalysis[0]?.analysis || {}));

      // Filter stocks where max profit is greater than ER (minSwingProfits) for time calculation
      const validStocksForTimeCalculation = strykeDataWithAnalysis.filter(item => {
        const maxProfit = Number(item.analysis.maxSwingProfits);
        const minProfit = Number(item.analysis.minSwingProfits); // ER gap
        return isFinite(maxProfit) && isFinite(minProfit) && maxProfit > minProfit;
      });

      const timeTakenForProfits = validStocksForTimeCalculation
        .map(item => {
          const value = Number(item.analysis.daysTakenForMaxSwingProfits);
          console.log(`Company: ${item.stryke.companyName}, daysTakenForMaxSwingProfits: ${item.analysis.daysTakenForMaxSwingProfits}, parsed: ${value}`);
          return value;
        })
        .filter(val => isFinite(val) && val >= 0);

      const supportTouchDays = strykeDataWithAnalysis
        .map(item => Number(item.analysis.daysTakenForSupportTouch))
        .filter(val => isFinite(val));

      const resistanceTouchDays = strykeDataWithAnalysis
        .map(item => Number(item.analysis.daysTakenForResistanceTouch))
        .filter(val => isFinite(val));

      // Calculate target percentages for comparison
      const getTargetPercentage = (stryke: any, analysisType: 'stryke' | 'algo') => {
        if (analysisType === 'stryke') {
          const entry = Number(stryke.entryCandleClose ?? 0);
          const target = Number(stryke.target ?? 0);
          return isFinite(entry) && isFinite(target) && entry > 0
            ? ((target - entry) / entry * 100)
            : 0;
        } else {
          const entry = Number(stryke.algoSwingAnalysis?.algoentryCandle.close ?? 0);
          const target = Number(stryke.algoSwingAnalysis?.algoResistance ?? 0);
          return isFinite(entry) && isFinite(target) && entry > 0
            ? ((target - entry) / entry * 100)
            : 0;
        }
      };

      const analysisType = getAnalysis === ((s: any) => s.strykeSwingAnalysis) ? 'stryke' : 'algo';

      // Count achievements based on mutually exclusive logic
      // Each stock should be counted in exactly one category:
      // 1. maxProfitsAchieved: when Max profits are greater than the target (highest priority)
      // 2. minProfitsAchieved: when Max Profits % is greater than the minProfits (ER Gap) but not target
      // 3. lessThanMinProfits: when max profits is less than ER gap (minSwingProfits)

      let maxProfitsAchieved = 0;
      let minProfitsAchieved = 0;
      let lessThanMinProfits = 0;

      strykeDataWithAnalysis.forEach(item => {
        const maxProfit = Number(item.analysis.maxSwingProfits);
        const minProfit = Number(item.analysis.minSwingProfits);
        const targetPercent = getTargetPercentage(item.stryke, analysisType);

        if (isFinite(maxProfit) && isFinite(minProfit)) {
          if (isFinite(targetPercent) && maxProfit > targetPercent) {
            // Highest priority: crossed target
            maxProfitsAchieved++;
          } else if (maxProfit > minProfit) {
            // Medium priority: crossed ER gap but not target
            minProfitsAchieved++;
          } else {
            // Lowest priority: didn't cross ER gap
            lessThanMinProfits++;
          }
        }
      });

      const supportsTouched = supportTouchDays.filter(val => val > 0).length;
      const resistancesTouched = resistanceTouchDays.filter(val => val > 0).length;

      // ER Gap categorization
      const ErGap_L3 = minProfits.filter(val => val >= 0 && val < 3).length;
      const ErGap_G3 = minProfits.filter(val => val >= 3).length;
      const ER_Gap_AR = minProfits.filter(val => val < 0 || !isFinite(val)).length;

      // Average calculations
      const avgTimeTakenForProfits = timeTakenForProfits.length > 0
        ? timeTakenForProfits.reduce((sum, val) => sum + val, 0) / timeTakenForProfits.length
        : 0;

      const minProfitValue = minProfits.length > 0 ? Math.min(...minProfits) : 0;
      const maxProfitValue = maxProfits.length > 0 ? Math.max(...maxProfits) : 0;
      const avgProfitValue = maxProfits.length > 0
        ? maxProfits.reduce((sum, val) => sum + val, 0) / maxProfits.length
        : 0;

      return {
        minProfitsAchieved,
        maxProfitsAchieved,
        lessThanMinProfits,
        supportsTouched,
        resistancesTouched,
        avgTimeTakenForProfits: Number(avgTimeTakenForProfits.toFixed(2)),
        ErGap_L3,
        ErGap_G3,
        ER_Gap_AR,
        minProfitValue: Number(minProfitValue.toFixed(2)),
        maxProfitValue: Number(maxProfitValue.toFixed(2)),
        avgProfitValue: Number(avgProfitValue.toFixed(2))
      };
    };

    // Calculate metrics for Stryke Analysis
    const strykeMetricsData = calculateAnalysisMetrics((stryke) => filteredAnalysisList);
    setStrykeMetrics(strykeMetricsData);

    // Calculate metrics for Algo Analysis
    const algoMetricsData = calculateAnalysisMetrics((stryke) => filteredAnalysisList);
    setAlgoMetrics(algoMetricsData);

    // Calculate metrics for Fibo Analysis
    const fiboMetricsData = calculateAnalysisMetrics((stryke) => filteredAnalysisList);
    setFiboMetrics(fiboMetricsData);

    if (!suppressToast) {
      toast.success('Metrics calculated successfully for Stryke, Algo, and Fibo analysis');
    }
  }


  return (
    <div className="flex justify-start py-4 px-4 bg-cream">
      <div className="w-full max-w-screen-2xl ml-24 mr-0">
        <Toaster position="top-right" />

        {globalLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center shadow-lg">
              <div className="animate-spin h-10 w-10 border-4 border-gray-300 border-t-transparent rounded-full mb-4" />
              <div className="text-gray-800 dark:text-gray-100 font-medium">Processing… Please wait</div>
            </div>
          </div>
        )}


        {!isLoading && (
          <>
            {/* Progressive Loading Progress Bar */}
            {progressiveLoading && (
              <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">Loading Companies...</h3>
                  <span className="text-sm text-gray-600">
                    {loadingProgress.loadedCompanies} companies loaded
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${(loadingProgress.completedAlphabets.length / 26) * 100}%`
                    }}
                  ></div>
                </div>

                {/* Alphabet Progress */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B', 'N', 'M'].map((letter) => (
                    <span
                      key={letter}
                      className={`px-2 py-1 text-xs font-medium rounded ${loadingProgress.completedAlphabets.includes(letter)
                        ? 'bg-green-100 text-green-800'
                        : loadingProgress.currentAlphabet === letter
                          ? 'bg-blue-100 text-blue-800 animate-pulse'
                          : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                      {letter}
                    </span>
                  ))}
                </div>

                {/* Current Status */}
                <div className="text-sm text-gray-600">
                  {loadingProgress.currentAlphabet && (
                    <span>Loading alphabet <strong>{loadingProgress.currentAlphabet}</strong>...</span>
                  )}
                  {loadingProgress.isComplete && (
                    <span className="text-green-600 font-medium">✓ All alphabets loaded successfully!</span>
                  )}
                  <span className="ml-2">
                    ({loadingProgress.completedAlphabets.length}/26 alphabets completed)
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center mb-4">
            
              <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                {/* Home button */}
                <a
                  href="/"
                  className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
                >
                  Home
                </a>
                {(!showStrykeForm) && (
                  <Button
                    onClick={() => handleToggleView(true, false, false, false)}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                  >
                    Show Stryke Form
                  </Button>
                )}

                {/* {(!showAllStrykes) && (
                  <Button
                    onClick={() => {
                      handleToggleView(false, true, false, false);
                      fetchStrykes();
                    }}
                    className={`bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 text-sm rounded-md transition ${
                      progressiveLoading ? 'bg-gray-400 cursor-not-allowed' : ''
                    }`}
                    disabled={progressiveLoading}
                  >
                    {progressiveLoading ? 'Loading Companies...' : 'Fetch All Stryke Analysis'}
                  </Button>
                )} */}


                {/* <Button
                  onClick={() => {
                    // Reset failure tracking before refetching data
                    (0);
                    setDataLoadingAttempted(false); // Reset the flag to allow fresh loading
                    fetchStrykes();
                  }}
                  className={`bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md transition ${progressiveLoading ? 'bg-gray-400 cursor-not-allowed' : ''
                    }`}
                  disabled={progressiveLoading}
                >
                  {progressiveLoading ? 'Loading...' : 'Refresh List'}
                </Button> */}


                {/* {!showStrykeStats && (
                  <Button
                    onClick={() => {
                      handleToggleView(false, false, true, false);
                      fetchStrykes();
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                  >
                    Show Stryke Stats
                  </Button>
                )} */}


                {showSwingStats && (
                  <Button
                    onClick={() => {
                      if (!showMetrics) {
                        calculateMetrics();
                      }
                      setShowMetrics(!showMetrics);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md transition ${showMetrics
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-purple-500 hover:bg-purple-600 text-white'
                      }`}
                  >
                    {showMetrics ? 'Hide Metrics' : 'Show Metrics'}
                  </Button>
                )}
              
                {/* 
                {showAllStrykes && (
                  <Button
                    onClick={async () => {
                      const confirmed = window.confirm(
                        'Recalculate all Stryke analysis? This may take a while.'
                      );
                      if (!confirmed) return;
                      await recalculateStrykeAnalysis();
                    }}
                    className={`bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md transition ${isLoading ? 'bg-gray-400 cursor-not-allowed' : ''}`}
                    disabled={isLoading}
                  >
                    Recalculate
                  </Button>
                )} */}
              </div>
            </div>

            {showStrykeForm && (
              <div className="flex flex-col md:flex-row gap-4">
                {/* Form Section */}
                <div className="w-full md:w-1/2">
                  <Card className="p-4 shadow-lg h-full">
                    <form onSubmit={handleSubmit} className="space-y-3">
                      {/* Company Search */}
                      <div className="space-y-2">
                        <Label htmlFor="company-search">Company</Label>
                        <div className="relative">
                          <Input
                            id="company-search"
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              setSelectedCompany('');
                              setSelectedInstrumentKey('');
                            }}
                            placeholder="Search for a company..."
                            className="w-full"
                          />
                          {suggestions.length > 0 && !selectedCompany && (
                            <ul className="absolute z-50 w-full mt-1 border border-gray-300 rounded-md max-h-60 overflow-auto bg-white shadow-lg">
                              {suggestions.map((name, index) => (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() => handleSelectCompany(name)}
                                  className="p-2 cursor-pointer hover:bg-gray-100 w-full text-left"
                                >
                                  {name}
                                </button>
                              ))}
                            </ul>
                          )}
                        </div>
                        {selectedCompany && (
                          <div className="text-sm text-gray-500">
                            Selected: <span className="font-semibold">{selectedCompany}</span>
                          </div>
                        )}
                      </div>

                      {/* Date & Time */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="date-select">Date</Label>
                          <Input
                            id="date-select"
                            type="date"
                            value={selectedDate.split('-').reverse().join('-')}
                            onChange={(e) => setSelectedDate(e.target.value.split('-').reverse().join('-'))}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="time-select">Time</Label>
                          <Input
                            id="time-select"
                            type="time"
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="w-full"
                            min="09:15"
                            max="15:30"
                            step="60" // 1-minute intervals
                          />
                        </div>
                      </div>

                      {/* Call Type */}
                      <div className="space-y-2">
                        <Label htmlFor="call-type">Call Type</Label>
                        <select
                          id="call-type"
                          value={callType}
                          onChange={(e) => setCallType(e.target.value as CallType)}
                          className="w-full border border-gray-300 rounded-md p-2"
                        >
                          <option value={CallType.INTRADAY}>Intraday</option>
                          <option value={CallType.POSITIONAL}>Positional</option>
                          <option value={CallType.SWING}>Swing</option>
                          <option value={CallType.LONGTERM}>Long Term</option>
                        </select>
                      </div>

                      {/* Stryke Type */}
                      <div className="space-y-2">
                        <Label htmlFor="stryke-type">Stryke Type</Label>
                        <select
                          id="stryke-type"
                          value={strykeType}
                          onChange={(e) => setStrykeType(e.target.value as 'OLD' | 'APP' | 'DISCORD')}
                          className="w-full border border-gray-300 rounded-md p-2"
                        >
                          <option value="OLD">OLD</option>
                          <option value="APP">APP</option>
                          <option value="DISCORD">DISCORD</option>
                        </select>
                      </div>

                      {/* Stop Loss & Target */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="stop-loss">Stop Loss</Label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">₹</span>
                            <Input
                              id="stop-loss"
                              type="text"
                              placeholder="0.00"
                              value={stopLoss}
                              onChange={(e) => setStopLoss(e.target.value)}
                              className="w-full pl-8"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="target">Target</Label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">₹</span>
                            <Input
                              id="target"
                              type="text"
                              placeholder="0.00"
                              value={target}
                              onChange={(e) => setTarget(e.target.value)}
                              className="w-full pl-8"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        className={`w-full text-white ${selectedCompany && selectedInstrumentKey && selectedDate && selectedTime !== "00:00" &&
                          stopLoss !== "0.00" &&
                          target !== "0.00"
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'bg-gray-400 cursor-not-allowed'
                          }`}
                        disabled={
                          isLoading ||
                          !selectedCompany &&
                          !selectedInstrumentKey &&
                          !selectedDate &&
                          selectedTime !== "00:00" &&
                          stopLoss !== "0.00" &&
                          target !== "0.00"
                        }
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                            Analyzing...
                          </div>
                        ) : (
                          'Run Stryke Analysis'
                        )}
                      </Button>
                    </form>
                  </Card>
                </div>

                {/* Results Section */}
                <div className="w-full md:w-1/2">
                  <Card className="p-4 shadow-lg h-full">
                    <h2 className="text-xl font-bold mb-4">Stryke Analysis Results</h2>

                    {!analysisResult ? (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-center">Fill in a company and run a stryke analysis to see the results here</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-1 border-b">
                          <span className="font-medium">Status:</span>
                          <span className={`font-semibold ${analysisResult != null ? 'text-green-600' : 'text-red-600'}`}>
                            {analysisResult != null ? 'Success' : 'Failed'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pb-1 border-b">
                          <span className="font-medium">Company:</span>
                          <span>{analysisResult.companyName}</span>
                        </div>

                        <div className="flex justify-between items-center pb-1 border-b">
                          <span className="font-medium">Date & Time:</span>
                          <span>{`${analysisResult.entryTime}`}</span>
                        </div>

                        <div className="flex justify-between items-center pb-1 border-b">
                          <span className="font-medium">Call Type:</span>
                          <span>{analysisResult.callType}</span>
                        </div>

                        <div className="flex justify-between items-center pb-1 border-b">
                          <span className="font-medium">Stryke Type:</span>
                          <span className={`font-semibold px-2 py-1 rounded text-xs ${
                            strykeType === 'OLD' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {strykeType}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pb-1 border-b">
                          <span
                            className={
                              analysisResult.preEntryTrend === 'BULLISH' ? 'text-green-600' :
                                analysisResult.preEntryTrend === 'BEARISH' ? 'text-red-600' :
                                  'text-orange-600'
                            }
                          >
                            Pre Entry Trend:
                          </span>
                          <span
                            className={
                              analysisResult.preEntryTrend === 'BULLISH' ? 'text-green-600' :
                                analysisResult.preEntryTrend === 'BEARISH' ? 'text-red-600' :
                                  'text-orange-600'
                            }
                          >
                            {analysisResult.preEntryTrend}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pb-1 border-b">
                          <span
                            className={
                              analysisResult.postEntryTrend === 'BULLISH' ? 'text-green-600' :
                                analysisResult.postEntryTrend === 'BEARISH' ? 'text-red-600' :
                                  'text-orange-600'
                            }
                          >
                            Post Entry Trend:
                          </span>
                          <span
                            className={
                              analysisResult.postEntryTrend === 'BULLISH' ? 'text-green-600' :
                                analysisResult.postEntryTrend === 'BEARISH' ? 'text-red-600' :
                                  'text-orange-600'
                            }
                          >
                            {analysisResult.postEntryTrend}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pb-1 border-b">
                          <span className="font-medium">Entry Price:</span>
                          <span>₹{analysisResult.entryCandle.close?.toFixed(2) || 'N/A'}</span>
                        </div>

                        <div className="flex justify-between items-center pb-1 border-b">
                          <span className="font-medium">Stop Loss:</span>
                          <span>₹{analysisResult.stopLoss?.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center pb-1 border-b">
                          <span className="font-medium">Target:</span>
                          <span>₹{analysisResult.target?.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}



            {/* Add a new stats page */}
            {showSwingStats && (
              <div className="container mx-auto py-4 px-4 max-w-screen-2xl">

                {/* Search, Sort, and Filter Controls */}
                <div className="flex flex-wrap gap-1 items-center mb-4">

                  {/* Search Input */}
                  <input
                    type="text"
                    placeholder="Search by name..."
                    className="border border-gray-300 rounded-md px-2 py-1"
                    onChange={(e) => {
                      const query = e.target.value.toLowerCase();
                      setFilteredAnalysisList(
                        strykeList.filter((stryke) =>
                          stryke.companyName.toLowerCase().includes(query)
                        )
                      );
                    }}
                  />

                  {/* Month Filter */}
                  <select
                    className="border border-gray-300 rounded-md px-2 py-1"
                    value={selectedMonth || ''}
                    onChange={(e) => {
                      const monthYear = e.target.value;
                      setSelectedMonth(monthYear || null);
                      setFilteredAnalysisList(
                        monthYear
                          ? strykeList.filter((stryke) => {
                            const addedMonthYear = new Date(stryke.entryTime).toLocaleString('default', { month: 'long', year: 'numeric' });
                            return addedMonthYear === monthYear;
                          })
                          : strykeList
                      );
                    }}
                  >
                    <option value="">All Months</option>
                    {Array.from(new Set(
                      strykeList.map((stryke) =>
                        new Date(stryke.entryTime).toLocaleString('default', { month: 'long', year: 'numeric' })
                      )
                    )).map((monthYear) => (
                      <option key={monthYear} value={monthYear}>
                        {monthYear}
                      </option>
                    ))}
                  </select>

                  {/* Export Buttons */}
                  {/* <button
                    className="px-3 py-1 rounded-md bg-emerald-500 text-white"
                    onClick={exportStrykeStatsToExcel}
                  >
                    Export As Excel
                  </button> */}

                  {/* Export Swing Stats Button */}
                  <button
                    className="px-3 py-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={exportSwingStatsToExcel}
                  >
                    Export Swing Stats
                  </button>


                  {/* Reset Filters Button */}
                  <button
                    className="px-3 py-1 rounded-md bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => {
                      // Reset all active filters to their default state
                      setActiveFilter({
                        date: null,
                        name: null,
                        avgVolume: null,
                        target: null,
                        entry: null,
                        stopLoss: null,
                        trend: null,
                        inResistanceZone: null,
                        onePercChange: null,
                        swingLabel: null,
                        swingLabel2: null,
                        swingLabelCombo: null,
                        erLabel: null,
                        erSort: null,
                        profitSort: null,
                        supportSort: null,
                        resistanceSort: null,
                        profitLabel: null,
                        supportLabel: null,
                        resistanceLabel: null,
                      });

                      setShowAlgoAnalysis(true)
                      setShowStrykeAnalysis(true)
                      setShowFiboAnalysis(true)
                      setShowOldAnalysis(true)   // Reset OLD toggle
                      setShowAppAnalysis(true)   // Reset APP toggle
                      setShowDiscordAnalysis(true)   // Reset DISCORD toggle

                      // Reset month selection
                      setSelectedMonth(null);

                      // Reset filtered list to original lists - this will be handled by the useEffect
                      // setFilteredAnalysisList([...strykeAnalysisList, ...algoAnalysisList, ...fiboAnalysisList]);
                    }}
                  >
                    Reset Filters
                  </button>


                  {/* Count */}

                  {/* Row 3: Analysis Toggle Buttons */}
                  <div className="inline-flex items-center gap-2">

                    <div className="flex flex-wrap gap-1 items-center">
                      {!showAlgoAnalysis && (
                        <Button
                          onClick={() => {
                            setShowAlgoAnalysis(true)
                            // Filtered list will be updated by useEffect
                          }}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 text-sm rounded-md transition"
                        >
                          Show Algo Analysis
                        </Button>
                      )}

                      {showAlgoAnalysis && (
                        <Button
                          onClick={() => {
                            setShowAlgoAnalysis(false)
                            // Filtered list will be updated by useEffect
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                        >
                          Hide Algo Analysis
                        </Button>
                      )}

                      {!showStrykeAnalysis && (
                        <Button
                          onClick={() => {
                            setShowStrykeAnalysis(true)
                            // Filtered list will be updated by useEffect
                          }}
                          className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                        >
                          Show Stryke Analysis
                        </Button>
                      )}

                      {showStrykeAnalysis && (
                        <Button
                          onClick={() => {
                            setShowStrykeAnalysis(false)
                            // Filtered list will be updated by useEffect
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                        >
                          Hide Stryke Analysis
                        </Button>
                      )}

                      {!showFiboAnalysis && (
                        <Button
                          onClick={() => {
                            setShowFiboAnalysis(true)
                            // Filtered list will be updated by useEffect
                          }}
                          className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                        >
                          Show Fibo Analysis
                        </Button>
                      )}

                      {showFiboAnalysis && (
                        <Button
                          onClick={() => {
                            setShowFiboAnalysis(false)
                            // Filtered list will be updated by useEffect
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                        >
                          Hide Fibo Analysis
                        </Button>
                      )}

                      {/* NEW: OLD/APP/DISCORD Analysis Toggles */}
                      {!showOldAnalysis && (
                        <Button
                          onClick={() => {
                            setShowOldAnalysis(true)
                            // Filtered list will be updated by useEffect
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                        >
                          Show OLD
                        </Button>
                      )}

                      {showOldAnalysis && (
                        <Button
                          onClick={() => {
                            setShowOldAnalysis(false)
                            // Filtered list will be updated by useEffect
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                        >
                          Hide OLD
                        </Button>
                      )}

                      {!showAppAnalysis && (
                        <Button
                          onClick={() => {
                            setShowAppAnalysis(true)
                            // Filtered list will be updated by useEffect
                          }}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                        >
                          Show APP
                        </Button>
                      )}

                      {showAppAnalysis && (
                        <Button
                          onClick={() => {
                            setShowAppAnalysis(false)
                            // Filtered list will be updated by useEffect
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                        >
                          Hide APP
                        </Button>
                      )}

                      {!showDiscordAnalysis && (
                        <Button
                          onClick={() => {
                            setShowDiscordAnalysis(true)
                            // Filtered list will be updated by useEffect
                          }}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                        >
                          Show Discord
                        </Button>
                      )}

                      {showDiscordAnalysis && (
                        <Button
                          onClick={() => {
                            setShowDiscordAnalysis(false)
                            // Filtered list will be updated by useEffect
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                        >
                          Hide Discord
                        </Button>
                      )}
                    </div>
                  </div>

                  <span className="text-lg font-bold">Count: {filteredAnalysisList.length}</span>



                  {/* Show metrics content when showMetrics is true */}
                  {showMetrics && (
                    <div className="bg-gray-100 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-6 text-center">Metrics Dashboard - Comparative Analysis</h3>

                      {/* Metrics Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {/* Min Profits Achieved Comparison */}
                        <div className="bg-white p-4 rounded-lg border shadow-sm">
                          <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">Min Profits Achieved  - Crossed ER-Gap</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-blue-600 font-medium">Stryke:</span>
                              <span className="text-xl font-bold text-blue-600">{strykeMetrics?.minProfitsAchieved || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-green-600 font-medium">Algo:</span>
                              <span className="text-xl font-bold text-green-600">{algoMetrics?.minProfitsAchieved || 0}</span>
                            </div>
                            <div className="border-t pt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Difference:</span>
                                <span className={`font-bold ${(strykeMetrics?.minProfitsAchieved || 0) > (algoMetrics?.minProfitsAchieved || 0) ? 'text-blue-600' : (strykeMetrics?.minProfitsAchieved || 0) < (algoMetrics?.minProfitsAchieved || 0) ? 'text-green-600' : 'text-amber-500'}`}>
                                  {Math.abs((strykeMetrics?.minProfitsAchieved || 0) - (algoMetrics?.minProfitsAchieved || 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Max Profits Achieved Comparison */}
                        <div className="bg-white p-4 rounded-lg border shadow-sm">
                          <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">Max Profits Achieved - Crossed the Target</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-blue-600 font-medium">Stryke:</span>
                              <span className="text-xl font-bold text-blue-600">{strykeMetrics?.maxProfitsAchieved || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-green-600 font-medium">Algo:</span>
                              <span className="text-xl font-bold text-green-600">{algoMetrics?.maxProfitsAchieved || 0}</span>
                            </div>
                            <div className="border-t pt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Difference:</span>
                                <span className={`font-bold ${(strykeMetrics?.maxProfitsAchieved || 0) > (algoMetrics?.maxProfitsAchieved || 0) ? 'text-blue-600' : (strykeMetrics?.maxProfitsAchieved || 0) < (algoMetrics?.maxProfitsAchieved || 0) ? 'text-green-600' : 'text-amber-500'}`}>
                                  {Math.abs((strykeMetrics?.maxProfitsAchieved || 0) - (algoMetrics?.maxProfitsAchieved || 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Less Than Min Profits Comparison */}
                        <div className="bg-white p-4 rounded-lg border shadow-sm">
                          <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">Less Than Min Profits - Less than ER-Gap</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-blue-600 font-medium">Stryke:</span>
                              <span className="text-xl font-bold text-red-600">{strykeMetrics?.lessThanMinProfits || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-green-600 font-medium">Algo:</span>
                              <span className="text-xl font-bold text-red-600">{algoMetrics?.lessThanMinProfits || 0}</span>
                            </div>
                            <div className="border-t pt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Difference:</span>
                                <span className={`font-bold ${(strykeMetrics?.lessThanMinProfits || 0) < (algoMetrics?.lessThanMinProfits || 0) ? 'text-green-600' : (strykeMetrics?.lessThanMinProfits || 0) > (algoMetrics?.lessThanMinProfits || 0) ? 'text-red-600' : 'text-amber-500'}`}>
                                  {Math.abs((strykeMetrics?.lessThanMinProfits || 0) - (algoMetrics?.lessThanMinProfits || 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ER Gap Distribution Comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white p-4 rounded-lg border shadow-sm">
                          <h4 className="text-lg font-semibold text-blue-700 mb-4 text-center">Stryke Analysis - ER Gap Distribution</h4>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-red-50 rounded">
                              <div className="text-2xl font-bold text-red-600">{strykeMetrics?.ErGap_L3 || 0}</div>
                              <div className="text-xs text-gray-600">{'< 3%'}</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded">
                              <div className="text-2xl font-bold text-green-600">{strykeMetrics?.ErGap_G3 || 0}</div>
                              <div className="text-xs text-gray-600">≥ 3%</div>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded">
                              <div className="text-2xl font-bold text-gray-600">{strykeMetrics?.ER_Gap_AR || 0}</div>
                              <div className="text-xs text-gray-600">Above Resistance</div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg border shadow-sm">
                          <h4 className="text-lg font-semibold text-green-700 mb-4 text-center">Algo Analysis - ER Gap Distribution</h4>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-red-50 rounded">
                              <div className="text-2xl font-bold text-red-600">{algoMetrics?.ErGap_L3 || 0}</div>
                              <div className="text-xs text-gray-600">{'< 3%'}</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded">
                              <div className="text-2xl font-bold text-green-600">{algoMetrics?.ErGap_G3 || 0}</div>
                              <div className="text-xs text-gray-600">≥ 3%</div>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded">
                              <div className="text-2xl font-bold text-gray-600">{algoMetrics?.ER_Gap_AR || 0}</div>
                              <div className="text-xs text-gray-600">Above Resistance</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Profit Values and Performance Metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Stryke Analysis Detailed Metrics */}
                        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                          <h4 className="text-lg font-semibold text-blue-700 mb-4">Stryke Analysis Metrics</h4>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="bg-white p-3 rounded">
                                <div className="font-medium text-gray-700">Supports Touched</div>
                                <div className="text-xl font-bold text-amber-500">{strykeMetrics?.supportsTouched || 0}</div>
                              </div>
                              <div className="bg-white p-3 rounded">
                                <div className="font-medium text-gray-700">Resistances Touched</div>
                                <div className="text-xl font-bold text-amber-500">{strykeMetrics?.resistancesTouched || 0}</div>
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded">
                              <div className="font-medium text-gray-700 mb-2">Profit Values (%)</div>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div className="text-center">
                                  <div className="text-blue-600 font-bold">{strykeMetrics?.minProfitValue || 0}%</div>
                                  <div className="text-xs">Min</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-green-600 font-bold">{strykeMetrics?.maxProfitValue || 0}%</div>
                                  <div className="text-xs">Max</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-amber-500 font-bold">{strykeMetrics?.avgProfitValue || 0}%</div>
                                  <div className="text-xs">Average</div>
                                </div>
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded">
                              <div className="font-medium text-gray-700">Avg Time to Profits</div>
                              <div className="text-xl font-bold text-blue-600">{strykeMetrics?.avgTimeTakenForProfits || 0} days</div>
                            </div>
                          </div>
                        </div>

                        {/* Algo Analysis Detailed Metrics */}
                        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                          <h4 className="text-lg font-semibold text-green-700 mb-4">Algo Analysis Metrics</h4>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="bg-white p-3 rounded">
                                <div className="font-medium text-gray-700">Supports Touched</div>
                                <div className="text-xl font-bold text-amber-500">{algoMetrics?.supportsTouched || 0}</div>
                              </div>
                              <div className="bg-white p-3 rounded">
                                <div className="font-medium text-gray-700">Resistances Touched</div>
                                <div className="text-xl font-bold text-amber-500">{algoMetrics?.resistancesTouched || 0}</div>
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded">
                              <div className="font-medium text-gray-700 mb-2">Profit Values (%)</div>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div className="text-center">
                                  <div className="text-blue-600 font-bold">{algoMetrics?.minProfitValue || 0}%</div>
                                  <div className="text-xs">Min</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-green-600 font-bold">{algoMetrics?.maxProfitValue || 0}%</div>
                                  <div className="text-xs">Max</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-amber-500 font-bold">{algoMetrics?.avgProfitValue || 0}%</div>
                                  <div className="text-xs">Average</div>
                                </div>
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded">
                              <div className="font-medium text-gray-700">Avg Time to Profits</div>
                              <div className="text-xl font-bold text-blue-600">{algoMetrics?.avgTimeTakenForProfits || 0} days</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Performance Comparison Progress Bar */}
                      <div className="mt-6">
                        <h4 className="text-lg font-semibold mb-4 text-center">Performance Comparison</h4>
                        {(() => {
                          const comparisons = [
                            // Min Profits Achieved (higher is better)
                            (strykeMetrics?.minProfitsAchieved || 0) > (algoMetrics?.minProfitsAchieved || 0) ? 'stryke' :
                              (algoMetrics?.minProfitsAchieved || 0) > (strykeMetrics?.minProfitsAchieved || 0) ? 'algo' : null,

                            // Max Profits Achieved (higher is better)
                            (strykeMetrics?.maxProfitsAchieved || 0) > (algoMetrics?.maxProfitsAchieved || 0) ? 'stryke' :
                              (algoMetrics?.maxProfitsAchieved || 0) > (strykeMetrics?.maxProfitsAchieved || 0) ? 'algo' : null,

                            // Less Than Min Profits (lower is better)
                            (strykeMetrics?.lessThanMinProfits || 0) < (algoMetrics?.lessThanMinProfits || 0) ? 'stryke' :
                              (algoMetrics?.lessThanMinProfits || 0) < (strykeMetrics?.lessThanMinProfits || 0) ? 'algo' : null,

                            // Supports Touched (higher is better)
                            (strykeMetrics?.supportsTouched || 0) > (algoMetrics?.supportsTouched || 0) ? 'stryke' :
                              (algoMetrics?.supportsTouched || 0) > (strykeMetrics?.supportsTouched || 0) ? 'algo' : null,

                            // Resistances Touched (higher is better)
                            (strykeMetrics?.resistancesTouched || 0) > (algoMetrics?.resistancesTouched || 0) ? 'stryke' :
                              (algoMetrics?.resistancesTouched || 0) > (strykeMetrics?.resistancesTouched || 0) ? 'algo' : null,

                            // Average Time to Profits (lower is better)
                            (strykeMetrics?.avgTimeTakenForProfits || 0) < (algoMetrics?.avgTimeTakenForProfits || 0) ? 'stryke' :
                              (algoMetrics?.avgTimeTakenForProfits || 0) < (strykeMetrics?.avgTimeTakenForProfits || 0) ? 'algo' : null,

                            // Min Profit Value (higher is better)
                            (strykeMetrics?.minProfitValue || 0) > (algoMetrics?.minProfitValue || 0) ? 'stryke' :
                              (algoMetrics?.minProfitValue || 0) > (strykeMetrics?.minProfitValue || 0) ? 'algo' : null,

                            // ER Gap < 3% (lower is better - fewer stocks below 3% gap is better)
                            (strykeMetrics?.ErGap_L3 || 0) < (algoMetrics?.ErGap_L3 || 0) ? 'stryke' :
                              (algoMetrics?.ErGap_L3 || 0) < (strykeMetrics?.ErGap_L3 || 0) ? 'algo' : null,

                            // Above Resistance (AR) (lower is better - fewer AR cases is better)
                            (strykeMetrics?.ER_Gap_AR || 0) < (algoMetrics?.ER_Gap_AR || 0) ? 'stryke' :
                              (algoMetrics?.ER_Gap_AR || 0) < (strykeMetrics?.ER_Gap_AR || 0) ? 'algo' : null,

                            // ER Gap >= 3% (higher is better)
                            (strykeMetrics?.ErGap_G3 || 0) > (algoMetrics?.ErGap_G3 || 0) ? 'stryke' :
                              (algoMetrics?.ErGap_G3 || 0) > (strykeMetrics?.ErGap_G3 || 0) ? 'algo' : null,

                            // Average Profit Value (higher is better)
                            (strykeMetrics?.avgProfitValue || 0) > (algoMetrics?.avgProfitValue || 0) ? 'stryke' :
                              (algoMetrics?.avgProfitValue || 0) > (strykeMetrics?.avgProfitValue || 0) ? 'algo' : null,

                            // Max Profit Value (higher is better)
                            (strykeMetrics?.maxProfitValue || 0) > (algoMetrics?.maxProfitValue || 0) ? 'stryke' :
                              (algoMetrics?.maxProfitValue || 0) > (strykeMetrics?.maxProfitValue || 0) ? 'algo' : null
                          ];

                          const strykeWins = comparisons.filter(result => result === 'stryke').length;
                          const algoWins = comparisons.filter(result => result === 'algo').length;
                          const totalComparisons = comparisons.filter(result => result !== null).length;

                          const strykePercentage = totalComparisons > 0 ? (strykeWins / totalComparisons) * 100 : 0;
                          const algoPercentage = totalComparisons > 0 ? (algoWins / totalComparisons) * 100 : 0;

                          return (
                            <div className="bg-white p-4 rounded-lg border shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-blue-600 font-semibold">Stryke: {strykeWins} wins</span>
                                <span className="text-green-600 font-semibold">Algo: {algoWins} wins</span>
                              </div>

                              <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-500 flex items-center justify-center"
                                  style={{ width: `${strykePercentage}%` }}
                                >
                                  {strykeWins > 0 && (
                                    <span className="text-white text-xs font-semibold">{strykeWins}</span>
                                  )}
                                </div>
                                <div
                                  className="absolute right-0 top-0 h-full bg-green-500 transition-all duration-500 flex items-center justify-center"
                                  style={{ width: `${algoPercentage}%` }}
                                >
                                  {algoWins > 0 && (
                                    <span className="text-white text-xs font-semibold">{algoWins}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex justify-between items-center mt-2">
                                <span className="text-sm text-gray-600">{strykePercentage.toFixed(1)}%</span>
                                <span className="text-sm font-medium text-gray-800">
                                  {strykeWins > algoWins ? '🏆 Stryke Leads' :
                                    algoWins > strykeWins ? '🏆 Algo Leads' :
                                      '🤝 Tied Performance'}
                                </span>
                                <span className="text-sm text-gray-600">{algoPercentage.toFixed(1)}%</span>
                              </div>

                              <div className="text-center mt-2">
                                <span className="text-xs text-gray-500">
                                  Based on {totalComparisons} performance metrics
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}


                  {/* Show table when showMetrics is false */}
                  {!showMetrics && (
                    <table className="table-auto w-full border-collapse border border-gray-700 text-center">
                      <thead>
                        <tr className="bg-gray-400 sticky top-0 z-10">
                          <th className="border border-gray-700 px-4 py-2">Slno</th>
                          <th className="border border-gray-700 px-12 py-2 min-w-[100px]">
                            <div className="flex items-center ml-10">
                              <span>Company</span>
                              <button
                                onClick={() => {
                                  const newOrder = activeFilter.name === 'asc' ? 'desc' : activeFilter.name === 'desc' ? null : 'asc';
                                  setActiveFilter({ ...activeFilter, name: newOrder });
                                  if (newOrder) {
                                    setFilteredAnalysisList(
                                      [...filteredAnalysisList].sort((a, b) =>
                                        newOrder === 'asc'
                                          ? a.companyName.localeCompare(b.companyName)
                                          : b.companyName.localeCompare(a.companyName)
                                      )
                                    );
                                  } else {

                                    setFilteredAnalysisList(filteredAnalysisList);
                                  }
                                }}
                                className="ml-1 p-1 hover:bg-gray-300 rounded"
                                title={`Sort by Company ${activeFilter.name === 'asc' ? '(A-Z)' : activeFilter.name === 'desc' ? '(Z-A)' : '(Off)'}`}
                              >
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.name === 'asc'
                                  ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                                  : activeFilter.name === 'desc'
                                    ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                                    : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                                  }`}>
                                  {activeFilter.name === 'asc' ? '▲' : activeFilter.name === 'desc' ? '▼' : '⇅'}
                                </span>
                              </button>
                            </div>
                          </th>
                          <th className="border border-gray-700 px-4 py-2 min-w-[60px]">Chart</th>
                          <th className="border border-gray-700 px-12 py-2 min-w-[160px]">
                            <div className="flex items-center justify-between">
                              <span>Entry Date</span>
                              <button
                                onClick={() => {
                                  const newOrder = activeFilter.date === 'asc' ? 'desc' : activeFilter.date === 'desc' ? null : 'asc';
                                  setActiveFilter({ ...activeFilter, date: newOrder });
                                  if (newOrder) {
                                    setFilteredAnalysisList(
                                      [...filteredAnalysisList].sort((a, b) =>
                                        newOrder === 'asc'
                                          ? new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime()
                                          : new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()
                                      )
                                    );
                                  } else {
                                    setFilteredAnalysisList([...filteredAnalysisList]);
                                  }
                                }}
                                className="hover:bg-gray-300 rounded"
                                title={`Sort by Date ${activeFilter.date === 'asc' ? '(Oldest First)' : activeFilter.date === 'desc' ? '(Newest First)' : '(Off)'}`}
                              >
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.date === 'asc'
                                  ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                                  : activeFilter.date === 'desc'
                                    ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                                    : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                                  }`}>
                                  {activeFilter.date === 'asc' ? '▲' : activeFilter.date === 'desc' ? '▼' : '⇅'}
                                </span>
                              </button>
                            </div>
                          </th>
                          <th className="border border-gray-700 px-8 py-2">
                            <div className="flex items-center justify-between">
                              <span>Entry</span>
                              <button
                                onClick={() => {
                                  const newOrder = activeFilter.entry === 'asc' ? 'desc' : activeFilter.entry === 'desc' ? null : 'asc';
                                  setActiveFilter({ ...activeFilter, entry: newOrder });
                                  if (newOrder) {
                                    setFilteredAnalysisList(
                                      [...filteredAnalysisList].sort((a, b) => {
                                        const aPrice = a.entryCandleClose ?? 0;
                                        const bPrice = b.entryCandleClose ?? 0;
                                        return newOrder === 'asc' ? aPrice - bPrice : bPrice - aPrice;
                                      })
                                    );
                                  } else {
                                    setFilteredAnalysisList([...filteredAnalysisList]);
                                  }
                                }}
                                className="ml-1 p-1 hover:bg-gray-300 rounded"
                                title={`Sort by Entry Price ${activeFilter.entry === 'asc' ? '(Low to High)' : activeFilter.entry === 'desc' ? '(High to Low)' : '(Off)'}`}
                              >
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.entry === 'asc'
                                  ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                                  : activeFilter.entry === 'desc'
                                    ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                                    : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                                  }`}>
                                  {activeFilter.entry === 'asc' ? '▲' : activeFilter.entry === 'desc' ? '▼' : '⇅'}
                                </span>
                              </button>
                            </div>
                          </th>
                          <th className="border border-gray-700 px-8 py-2 min-w-[180px]">
                            <div className="flex items-center justify-between">
                              <span>Target</span>
                              <button
                                onClick={() => {
                                  const newOrder = activeFilter.target === 'asc' ? 'desc' : activeFilter.target === 'desc' ? null : 'asc';
                                  setActiveFilter({ ...activeFilter, target: newOrder });
                                  if (newOrder) {
                                    setFilteredAnalysisList(
                                      [...filteredAnalysisList].sort((a, b) => {
                                        const aTarget = a.target || 0;
                                        const bTarget = b.target || 0;
                                        return newOrder === 'asc' ? aTarget - bTarget : bTarget - aTarget;
                                      })
                                    );
                                  } else {
                                    setFilteredAnalysisList([...filteredAnalysisList]);
                                  }
                                }}
                                className="ml-1 p-1 hover:bg-gray-300 rounded"
                                title={`Sort by Target ${activeFilter.target === 'asc' ? '(Low to High)' : activeFilter.target === 'desc' ? '(High to Low)' : '(Off)'}`}
                              >
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.target === 'asc'
                                  ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                                  : activeFilter.target === 'desc'
                                    ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                                    : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                                  }`}>
                                  {activeFilter.target === 'asc' ? '▲' : activeFilter.target === 'desc' ? '▼' : '⇅'}
                                </span>
                              </button>
                            </div>
                          </th>
                          <th className="border border-gray-700 px-8 py-2 min-w-[180px]">
                            <div className="flex items-center justify-between">
                              <span>Stop Loss</span>
                              <button
                                onClick={() => {
                                  const newOrder = activeFilter.stopLoss === 'asc' ? 'desc' : activeFilter.stopLoss === 'desc' ? null : 'asc';
                                  setActiveFilter({ ...activeFilter, stopLoss: newOrder });
                                  if (newOrder) {
                                    setFilteredAnalysisList(
                                      [...filteredAnalysisList].sort((a, b) => {
                                        const aStopLoss = a.stopLoss || 0;
                                        const bStopLoss = b.stopLoss || 0;
                                        return newOrder === 'asc' ? aStopLoss - bStopLoss : bStopLoss - aStopLoss;
                                      })
                                    );
                                  } else {
                                    setFilteredAnalysisList([...filteredAnalysisList]);
                                  }
                                }}
                                className="ml-1 p-1 hover:bg-gray-300 rounded"
                                title={`Sort by Stop Loss ${activeFilter.stopLoss === 'asc' ? '(Low to High)' : activeFilter.stopLoss === 'desc' ? '(High to Low)' : '(Off)'}`}
                              >
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.stopLoss === 'asc'
                                  ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                                  : activeFilter.stopLoss === 'desc'
                                    ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                                    : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                                  }`}>
                                  {activeFilter.stopLoss === 'asc' ? '▲' : activeFilter.stopLoss === 'desc' ? '▼' : '⇅'}
                                </span>
                              </button>
                            </div>
                          </th>
                          <th className="border border-gray-700 px-8 py-2 min-w-[150px] relative">
                            <div className="flex items-center justify-between">
                              <span>Swing Labels</span>
                              <button
                                onClick={() => setSwingLabelsDropdownOpen(!swingLabelsDropdownOpen)}
                                className="ml-1 p-1 hover:bg-gray-300 rounded relative"
                                title={`Filter by Swing Label Combination ${activeFilter.swingLabelCombo ? `(${activeFilter.swingLabelCombo})` : '(All)'}`}
                              >
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.swingLabelCombo
                                    ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm'
                                    : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                                  }`}>
                                  {activeFilter.swingLabelCombo ? '◆' : '⚏'}
                                </span>
                              </button>

                              {swingLabelsDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[200px] py-2">
                                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100 mb-1">
                                    Select Swing Pattern
                                  </div>
                                  <button
                                    onClick={() => {
                                      setActiveFilter({ ...activeFilter, swingLabelCombo: null });
                                      setSwingLabelsDropdownOpen(false);
                                      // Reset to show all items
                                      setFilteredAnalysisList(filteredAnalysisList);
                                    }}
                                    className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${!activeFilter.swingLabelCombo
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                  >
                                    All Patterns
                                  </button>
                                  {[
                                    'LL<-HH', 'HL<-HH',
                                    'HH<-HL', 'LH<-HL',
                                    'HH<-LH', 'LL<-LH',
                                    'HH<-LL', 'LH<-LL',
                                    'HH<-HH', 'HL<-HL', 'LH<-LH', 'LL<-LL'
                                  ]
                                    .map((combo) => (
                                      <button
                                        key={combo}
                                        onClick={() => {
                                          setActiveFilter({ ...activeFilter, swingLabelCombo: combo as any });
                                          setSwingLabelsDropdownOpen(false);
                                          // Apply filter to both lists
                                          const [prev, curr] = combo.split('<-');
                                       debugger
                                          setFilteredAnalysisList([...filteredAnalysisList].filter(item =>
                                            item.prevSwingLabel === prev && item.currentSwingLabel === curr
                                          ));  
                                        }}
                                        className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.swingLabelCombo === combo
                                            ? 'bg-blue-50 text-blue-600 font-medium'
                                            : 'text-gray-700 hover:bg-gray-50'
                                          }`}
                                      >
                                        <span className="font-mono text-xs">{combo}</span>
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          </th>
                          <th title='Entry - Resistance Gap' className="border border-gray-700 px-12 py-2 min-w-[130px] relative">
                            <div className="flex items-center justify-between">
                              <span>ER-Gap</span>
                              <div className="flex items-center">
                                {/* Sort Button */}
                                <button
                                  onClick={() => {
                                    const newOrder = activeFilter.erSort === 'asc' ? 'desc' : activeFilter.erSort === 'desc' ? null : 'asc';
                                    setActiveFilter({ ...activeFilter, erSort: newOrder });
                                    if (newOrder) {
                                      setFilteredAnalysisList(
                                        [...filteredAnalysisList].sort((a, b) => {
                                          const aGap = a.minSwingProfits ?? 0;
                                          const bGap = b.minSwingProfits ?? 0;
                                          return newOrder === 'asc' ? aGap - bGap : bGap - aGap;
                                        })
                                      );
                                    } else {
                                      setFilteredAnalysisList([...filteredAnalysisList]);
                                    }
                                  }}
                                  className="ml-1 p-1 hover:bg-gray-300 rounded"
                                  title={`Sort by ER-Gap ${activeFilter.erSort === 'asc' ? '(Low to High)' : activeFilter.erSort === 'desc' ? '(High to Low)' : '(Off)'}`}
                                >
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.erSort === 'asc'
                                      ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                                      : activeFilter.erSort === 'desc'
                                        ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                                        : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {activeFilter.erSort === 'asc' ? '▲' : activeFilter.erSort === 'desc' ? '▼' : '⇅'}
                                  </span>
                                </button>

                                {/* Filter Button */}
                                <button
                                  onClick={() => setErGapDropdownOpen(!erGapDropdownOpen)}
                                  className="ml-1 p-1 hover:bg-gray-300 rounded relative"
                                  title={`Filter by ER-Gap ${activeFilter.erLabel ? `(${activeFilter.erLabel})` : '(All)'}`}
                                >
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.erLabel
                                      ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm'
                                      : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {activeFilter.erLabel ? '◆' : '⚏'}
                                  </span>
                                </button>
                              </div>

                              {erGapDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[180px] py-2">
                                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100 mb-1">
                                    Filter by ER-Gap
                                  </div>
                                  <button
                                    onClick={() => {
                                      setActiveFilter({ ...activeFilter, erLabel: null });
                                      setErGapDropdownOpen(false);
                                      // Reset to show all items - restore original data
                                      setFilteredAnalysisList([...strykeAnalysisList, ...algoAnalysisList]);
                                    }}
                                    className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${!activeFilter.erLabel
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                  >
                                    All Values
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveFilter({ ...activeFilter, erLabel: 'BELOW_3' });
                                      setErGapDropdownOpen(false);
                                      // Filter for values < 3% from original data
                                      const filtered = filteredAnalysisList.filter(item =>
                                        (item.minSwingProfits ?? 0) > 0 && (item.minSwingProfits ?? 0) < 3
                                      );
                                      setFilteredAnalysisList(filtered);
                                    }}
                                    className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.erLabel === 'BELOW_3'
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                  >
                                    <span className="text-xs">&lt; 3%</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveFilter({ ...activeFilter, erLabel: 'ABOVE_3' });
                                      setErGapDropdownOpen(false);
                                      // Filter for values >= 3% from original data
                                      const filtered = filteredAnalysisList.filter(item =>
                                        (item.minSwingProfits ?? 0) >= 3
                                      );
                                      setFilteredAnalysisList(filtered);
                                    }}
                                    className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.erLabel === 'ABOVE_3'
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                  >
                                    <span className="text-xs">≥ 3%</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveFilter({ ...activeFilter, erLabel: 'AR' });
                                      setErGapDropdownOpen(false);
                                      // Filter for Above Resistance (value <= 0) from original data
                                      const filtered = filteredAnalysisList.filter(item =>
                                        (item.minSwingProfits ?? 0) <= 0
                                      );
                                      setFilteredAnalysisList(filtered);
                                    }}
                                    className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.erLabel === 'AR'
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                  >
                                    <span className="text-xs">Above Resistance</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </th>
                          <th className="border border-gray-700 px-12 py-2 min-w-[160px] relative">
                            <div className="flex items-center justify-between">
                              <span>Max Profits</span>
                              <div className="flex items-center">
                                {/* Sort Button */}
                                <button
                                  onClick={() => {
                                    const newOrder = activeFilter.profitSort === 'asc' ? 'desc' : activeFilter.profitSort === 'desc' ? null : 'asc';
                                    setActiveFilter({ ...activeFilter, profitSort: newOrder });
                                    if (newOrder) {
                                      setFilteredAnalysisList(
                                        [...filteredAnalysisList].sort((a, b) => {
                                          const aProfit = a.maxSwingProfits ?? 0;
                                          const bProfit = b.maxSwingProfits ?? 0;
                                          return newOrder === 'asc' ? aProfit - bProfit : bProfit - aProfit;
                                        })
                                      );
                                    } else {
                                      setFilteredAnalysisList([...filteredAnalysisList]);
                                    }
                                  }}
                                  className="ml-1 p-1 hover:bg-gray-300 rounded"
                                  title={`Sort by Max Profits ${activeFilter.profitSort === 'asc' ? '(Low to High)' : activeFilter.profitSort === 'desc' ? '(High to Low)' : '(Off)'}`}
                                >
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.profitSort === 'asc'
                                      ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                                      : activeFilter.profitSort === 'desc'
                                        ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                                        : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {activeFilter.profitSort === 'asc' ? '▲' : activeFilter.profitSort === 'desc' ? '▼' : '⇅'}
                                  </span>
                                </button>

                                {/* Filter Button */}
                                <button
                                  onClick={() => setProfitsDropdownOpen(!profitsDropdownOpen)}
                                  className="ml-1 p-1 hover:bg-gray-300 rounded relative"
                                  title={`Filter by Max Profits ${activeFilter.profitLabel ? `(${activeFilter.profitLabel})` : '(All)'}`}
                                >
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.profitLabel
                                      ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm'
                                      : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {activeFilter.profitLabel ? '◆' : '⚏'}
                                  </span>
                                </button>
                              </div>

                              {profitsDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[180px] py-2">
                                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100 mb-1">
                                    Filter by Max Profits
                                  </div>
                                  <button
                                    onClick={() => {
                                      setActiveFilter({ ...activeFilter, profitLabel: null });
                                      setProfitsDropdownOpen(false);
                                      // Reset to show all items - restore original data
                                      setFilteredAnalysisList([...strykeAnalysisList, ...algoAnalysisList]);
                                    }}
                                    className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${!activeFilter.profitLabel
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                  >
                                    All Values
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveFilter({ ...activeFilter, profitLabel: 'BELOW_3' });
                                      setProfitsDropdownOpen(false);
                                      // Filter for values < 3% from original data
                                      const filtered = filteredAnalysisList.filter(item =>
                                        (item.maxSwingProfits ?? 0) > 0 && (item.maxSwingProfits ?? 0) < 3
                                      );
                                      setFilteredAnalysisList(filtered);
                                    }}
                                    className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.profitLabel === 'BELOW_3'
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                  >
                                    <span className="text-xs">&lt; 3%</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveFilter({ ...activeFilter, profitLabel: 'ABOVE_3' });
                                      setProfitsDropdownOpen(false);
                                      // Filter for values >= 3% from original data
                                      const filtered = filteredAnalysisList.filter(item =>
                                        (item.maxSwingProfits ?? 0) >= 3
                                      );
                                      setFilteredAnalysisList(filtered);
                                    }}
                                    className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.profitLabel === 'ABOVE_3'
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                  >
                                    <span className="text-xs">≥ 3%</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveFilter({ ...activeFilter, profitLabel: 'NEGATIVE' });
                                      setProfitsDropdownOpen(false);
                                      // Filter for negative values (value <= 0) from original data
                                      const filtered = filteredAnalysisList.filter(item =>
                                        (item.maxSwingProfits ?? 0) <= 0
                                      );
                                      setFilteredAnalysisList(filtered);
                                    }}
                                    className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.profitLabel === 'NEGATIVE'
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                  >
                                    <span className="text-xs">Negative/Zero</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </th>
                          <th title='Time Take for Stock to Hit Support' className="border border-gray-700 px-8 py-2 relative">
                            <div className="flex items-center justify-between">
                              <span>Support</span>
                              <div className="flex items-center">
                                {/* Sort Button */}
                                <button
                                  onClick={() => {
                                    const newOrder = activeFilter.supportSort === 'asc' ? 'desc' : activeFilter.supportSort === 'desc' ? null : 'asc';
                                    setActiveFilter({ ...activeFilter, supportSort: newOrder });
                                    if (newOrder) {
                                      setFilteredAnalysisList(
                                        [...filteredAnalysisList].sort((a, b) => {
                                          const aSupport = a.daysTakenForSupportTouch ?? 0;
                                          const bSupport = b.daysTakenForSupportTouch ?? 0;
                                          return newOrder === 'asc' ? aSupport - bSupport : bSupport - aSupport;
                                        })
                                      );
                                    } else {
                                      setFilteredAnalysisList([...filteredAnalysisList]);
                                    }
                                  }}
                                  className="ml-1 p-1 hover:bg-gray-300 rounded"
                                  title={`Sort by Support ${activeFilter.supportSort === 'asc' ? '(Low to High)' : activeFilter.supportSort === 'desc' ? '(High to Low)' : '(Off)'}`}
                                >
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.supportSort === 'asc'
                                      ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                                      : activeFilter.supportSort === 'desc'
                                        ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                                        : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {activeFilter.supportSort === 'asc' ? '▲' : activeFilter.supportSort === 'desc' ? '▼' : '⇅'}
                                  </span>
                                </button>

                                {/* Filter Button */}
                                <button
                                  onClick={() => setSupportDropdownOpen(!supportDropdownOpen)}
                                  className="ml-1 p-1 hover:bg-gray-300 rounded relative"
                                  title={`Filter by Support ${activeFilter.supportLabel ? `(${activeFilter.supportLabel})` : '(All)'}`}
                                >
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.supportLabel
                                      ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm'
                                      : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {activeFilter.supportLabel ? '◆' : '⚏'}
                                  </span>
                                </button>
                              </div>

                              {supportDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[180px] py-2">
                                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100 mb-1">
                                    Filter by Support Hit
                                  </div>
                                  <button
                                    onClick={() => {
                                      setActiveFilter({ ...activeFilter, supportLabel: null });
                                      setSupportDropdownOpen(false);
                                      // Reset to show all items - restore original data
                                      setFilteredAnalysisList([...strykeAnalysisList, ...algoAnalysisList]);
                                    }}
                                    className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${!activeFilter.supportLabel
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                  >
                                    All Values
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveFilter({ ...activeFilter, supportLabel: 'HIT' });
                                      setSupportDropdownOpen(false);
                                      // Filter for items that hit support (value > 0) from original data
                                      const filtered = filteredAnalysisList.filter(item =>
                                        (item.daysTakenForSupportTouch ?? 0) > 0
                                      );
                                      setFilteredAnalysisList(filtered);
                                    }}
                                    className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.supportLabel === 'HIT'
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                  >
                                    <span className="text-xs">Hit Support</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveFilter({ ...activeFilter, supportLabel: 'NO_HIT' });
                                      setSupportDropdownOpen(false);
                                      // Filter for items that didn't hit support (value = 0) from original data
                                      const filtered = filteredAnalysisList.filter(item =>
                                        (item.daysTakenForSupportTouch ?? 0) === 0
                                      );
                                      setFilteredAnalysisList(filtered);
                                    }}
                                    className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.supportLabel === 'NO_HIT'
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                  >
                                    <span className="text-xs">No Hit</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </th>
                          <th title='Time Take for Stock to Hit Resistance' className="border border-gray-700 px-8 py-2 min-w-[80px] relative">
                            <div className="flex items-center justify-between">
                              <span>Resistance</span>
                              <div className="flex items-center">
                                {/* Sort Button */}
                                <button
                                  onClick={() => {
                                    const newOrder = activeFilter.resistanceSort === 'asc' ? 'desc' : activeFilter.resistanceSort === 'desc' ? null : 'asc';
                                    setActiveFilter({ ...activeFilter, resistanceSort: newOrder });
                                    if (newOrder) {
                                      setFilteredAnalysisList(
                                        [...filteredAnalysisList].sort((a, b) => {
                                          const aResistance = a.daysTakenForResistanceTouch ?? 0;
                                          const bResistance = b.daysTakenForResistanceTouch ?? 0;
                                          return newOrder === 'asc' ? aResistance - bResistance : bResistance - aResistance;
                                        })
                                      );
                                    } else {
                                      setFilteredAnalysisList([...filteredAnalysisList]);
                                    }
                                  }}
                                  className="ml-1 p-1 hover:bg-gray-300 rounded"
                                  title={`Sort by Resistance ${activeFilter.resistanceSort === 'asc' ? '(Low to High)' : activeFilter.resistanceSort === 'desc' ? '(High to Low)' : '(Off)'}`}
                                >
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.resistanceSort === 'asc'
                                      ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                                      : activeFilter.resistanceSort === 'desc'
                                        ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                                        : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {activeFilter.resistanceSort === 'asc' ? '▲' : activeFilter.resistanceSort === 'desc' ? '▼' : '⇅'}
                                  </span>
                                </button>

                                {/* Filter Button */}
                                <button
                                  onClick={() => setResistanceDropdownOpen(!resistanceDropdownOpen)}
                                  className="ml-1 p-1 hover:bg-gray-300 rounded relative"
                                  title={`Filter by Resistance ${activeFilter.resistanceLabel ? `(${activeFilter.resistanceLabel})` : '(All)'}`}
                                >
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.resistanceLabel
                                      ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm'
                                      : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {activeFilter.resistanceLabel ? '◆' : '⚏'}
                                  </span>
                                </button>
                              </div>

                              {resistanceDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[180px] py-2">
                                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100 mb-1">
                                    Filter by Resistance Hit
                                  </div>
                                  <button
                                    onClick={() => {
                                      setActiveFilter({ ...activeFilter, resistanceLabel: null });
                                      setResistanceDropdownOpen(false);
                                      // Reset to show all items - restore original data
                                      setFilteredAnalysisList([...strykeAnalysisList, ...algoAnalysisList]);
                                    }}
                                    className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${!activeFilter.resistanceLabel
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                  >
                                    All Values
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveFilter({ ...activeFilter, resistanceLabel: 'HIT' });
                                      setResistanceDropdownOpen(false);
                                      // Filter for items that hit resistance (value > 0) from original data
                                      const filtered = filteredAnalysisList.filter(item =>
                                        (item.daysTakenForResistanceTouch ?? 0) > 0
                                      );
                                      setFilteredAnalysisList(filtered);
                                    }}
                                    className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.resistanceLabel === 'HIT'
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                  >
                                    <span className="text-xs">Hit Resistance</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveFilter({ ...activeFilter, resistanceLabel: 'NO_HIT' });
                                      setResistanceDropdownOpen(false);
                                      // Filter for items that didn't hit resistance (value = 0) from original data
                                      const filtered = filteredAnalysisList.filter(item =>
                                        (item.daysTakenForResistanceTouch ?? 0) === 0
                                      );
                                      setFilteredAnalysisList(filtered);
                                    }}
                                    className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.resistanceLabel === 'NO_HIT'
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                  >
                                    <span className="text-xs">No Hit</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </th>
                          <th title='EMA Cross Overs' className="border border-gray-700 px-8 py-2 min-w-[200px]" colSpan={2}>Ema Position</th>
                          <th title='EMA Cross Overs' className="border border-gray-700 px-8 py-2">Ema Cross Overs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAnalysisList.map((stryke, index) => {

                          return (
                            <React.Fragment key={stryke.uuid || index}>

                              <tr className={`${
                                stryke.label === "STRYKE" ? 'bg-green-100 hover:bg-green-200 border-l-4 border-green-500' :
                                stryke.label === "ALGO" ? 'bg-blue-100 hover:bg-blue-200 border-l-4 border-blue-500' :
                                stryke.label === "FIBO" ? 'bg-purple-100 hover:bg-purple-200 border-l-4 border-purple-500' :
                                'bg-gray-100 hover:bg-gray-200 border-l-4 border-gray-500'
                              }`}>
                                <td className="border border-gray-700 px-4 py-2 text-center align-middle">{index + 1}</td>
                                <td className="border border-gray-700 px-4 py-2 text-center align-middle truncate max-w-[280px]" title={stryke.companyName}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{stryke.companyName}</span>
                                    <div className="flex flex-wrap gap-1 mt-1 justify-center">
                                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                        stryke.label === "STRYKE" ? 'bg-green-100 text-green-600' :
                                        stryke.label === "ALGO" ? 'bg-blue-100 text-blue-600' :
                                        stryke.label === "FIBO" ? 'bg-purple-100 text-purple-600' :
                                        'bg-gray-100 text-gray-600'
                                      }`}>{
                                        stryke.label === "STRYKE" ? "Stryke" :
                                        stryke.label === "ALGO" ? "Algo" :
                                        stryke.label === "FIBO" ? "Fibo" :
                                        "Unknown"
                                      }</span>
                                      {stryke.strykeType && (
                                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                          stryke.strykeType === "OLD" ? 'bg-amber-100 text-amber-600' :
                                          stryke.strykeType === "NEW" ? 'bg-emerald-100 text-emerald-600' :
                                          'bg-gray-100 text-gray-600'
                                        }`}>
                                          {stryke.strykeType}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Chart Dropdown */}
                                <td className="border border-gray-700 px-2 py-2 text-center align-middle relative">
                                  <div className="relative">
                                    <button
                                      onClick={() => setChartDropdownOpen(chartDropdownOpen === `algo-${stryke.uuid}` ? null : `algo-${stryke.uuid}`)}
                                      className="inline-flex items-center justify-center w-8 h-8 text-green-600 hover:text-green-800 hover:bg-green-50 transition-all duration-200 rounded-md border border-green-200 hover:border-green-400"
                                      title="View Chart"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                      </svg>
                                    </button>

                                    {chartDropdownOpen === `algo-${stryke.uuid}` && (
                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[120px] py-2">
                                        <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100 mb-1">
                                          Select Timeframe
                                        </div>
                                        {timeframes.map((tf) => (
                                          <button
                                            key={tf}
                                            onClick={() => navigateToChart(stryke.instrumentKey, tf)}
                                            className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors duration-150 first:rounded-t last:rounded-b"
                                          >
                                            <span className="font-medium">{tf.toUpperCase()}</span>
                                            <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="border border-gray-700 px-4 py-2 text-center align-middle">{stryke?.entryTime ? formatReadableDate(stryke?.entryTime) : 'N/A'}</td>
                                <td className="border border-gray-700 px-4 py-2 text-center align-middle">{stryke?.entryCandleClose ? `₹${stryke?.entryCandleClose.toFixed(2)}` : (stryke.entryTime ?? 'N/A')}</td>
                                <td className="border border-gray-700 px-4 py-2 text-center align-middle">{
                                  (() => {
                                    const entry = Number(stryke?.entryCandleClose ?? 0);
                                    const maxPct = stryke?.maxSwingProfits != null ? Number(stryke.maxSwingProfits) : NaN;
                                    const targetPct = isFinite(entry) && stryke?.target != null ? calculatePercentageDifference(entry, Number(stryke?.target)) : NaN;
                                    let cls = 'text-gray-700';
                                    if (isFinite(maxPct) && isFinite(targetPct)) {
                                      if (maxPct > targetPct) cls = 'text-green-700 font-semibold';
                                      else if (maxPct > 0 && maxPct < targetPct) cls = 'text-amber-500 font-semibold';
                                    }
                                    return <span className={cls}>₹{stryke?.target?.toFixed(2)} ({isFinite(targetPct) ? `${targetPct}` : 'N/A'} %)</span>;
                                  })()
                                }</td>
                                <td className="border border-gray-700 px-4 py-2 text-center align-middle">{
                                  (() => {
                                    const entry = Number(stryke?.entryCandleClose ?? 0);
                                    const maxPct = stryke?.maxSwingProfits != null ? Number(stryke.maxSwingProfits) : NaN;
                                    const stopPct = isFinite(entry) && stryke?.stopLoss != null ? calculatePercentageDifference(entry, Number(stryke?.stopLoss)) : NaN;
                                    let cls = 'text-gray-700';
                                    if (isFinite(maxPct) && isFinite(stopPct)) {
                                      if (maxPct < stopPct) cls = 'text-red-700 font-semibold';
                                      else if (maxPct < 0) cls = 'text-amber-500 font-semibold';
                                    }
                                    return <span className={cls}>₹{stryke?.stopLoss?.toFixed(2)} ({isFinite(stopPct) ? `${stopPct}` : 'N/A'} %)</span>;
                                  })()
                                }</td>
                                <td className="border border-gray-700 px-4 py-2 text-center align-middle">{
                                  (() => {
                                    const clsFor = (lab?: string | null) => {
                                      if (!lab) return 'text-gray-600';
                                      const v = (lab || '').toUpperCase();
                                      if (v === 'LL' || v === 'LH') return 'text-amber-500 font-semibold';
                                      if (v === 'HH' || v === 'HL') return 'text-green-700 font-semibold';
                                      return 'text-gray-600';
                                    };
                                    return (
                                      <>
                                        <span className={clsFor(stryke?.prevSwingLabel)}>{stryke?.prevSwingLabel ?? 'N/A'}</span>
                                        <span className="px-1">{' <- '}</span>
                                        <span className={clsFor(stryke?.currentSwingLabel)}>{stryke?.currentSwingLabel ?? 'N/A'}</span>
                                      </>
                                    );
                                  })()
                                }</td>

                                <td className="border border-gray-700 px-4 py-2 text-center align-middle">{
                                  (() => {
                                    const v = stryke?.minSwingProfits;
                                    if (v == null) return 'N/A';
                                    const num = Number(v);
                                    const value = stryke?.minSwingProfits && stryke.minSwingProfits > 0 ? `${num.toFixed(2)} %` : "Above Resistance";
                                    const cls = num > 3
                                      ? 'text-green-700 font-semibold'
                                      : (num >= 0.01 ? 'text-amber-500 font-semibold' : 'text-red-700 font-semibold');
                                    return <span className={cls}>{value}</span>;
                                  })()
                                }</td>
                                <td className="border border-gray-700 px-4 py-2 text-center align-middle">{
                                  (() => {
                                    const max = stryke?.maxSwingProfits != null ? Number(stryke.maxSwingProfits) : null;
                                    const min = stryke?.minSwingProfits != null ? Number(stryke.minSwingProfits) : null;
                                    const days = stryke?.daysTakenForMaxSwingProfits != null ? Number(stryke.daysTakenForMaxSwingProfits) : null;
                                    if (max == null || !isFinite(max)) return 'N/A';

                                    const display = Number(max).toFixed(2);
                                    let cls = 'text-amber-500 font-semibold';
                                    if (Number(max) === 0) cls = 'text-red-700 font-semibold';
                                    else if (min != null && isFinite(min) && max > min) cls = 'text-green-700 font-semibold';

                                    return (
                                      <span className={cls}>{display}{" % "} {days != null ? `(${days} d)` : '(N/A)'}</span>
                                    );
                                  })()
                                }</td>
                                <td className="border border-gray-700 px-4 py-2 text-center align-middle">{
                                  (() => {
                                    if (stryke?.daysTakenForSupportTouch == null) return 'N/A';
                                    if (Number(stryke.daysTakenForSupportTouch) === 0) {
                                      const cls = 'text-green-600 font-semibold';
                                      return <span className={cls}>{`No Hit`}</span>;
                                    }
                                    const supportDays = Number(stryke.daysTakenForSupportTouch);
                                    const maxDays = stryke?.daysTakenForMaxSwingProfits != null && isFinite(Number(stryke.daysTakenForMaxSwingProfits))
                                      ? Number(stryke.daysTakenForMaxSwingProfits)
                                      : null;
                                    const cls = (maxDays != null && supportDays < maxDays) ? 'text-red-700 font-semibold' : 'text-amber-500 font-semibold';
                                    return <span className={cls}>{`${supportDays} days`}</span>;
                                  })()
                                }</td>
                                <td className="border border-gray-700 px-4 py-2 text-center align-middle">{
                                  (() => {
                                    if (stryke?.daysTakenForResistanceTouch == null) return 'N/A';
                                    if (Number(stryke.daysTakenForResistanceTouch) === 0) {
                                      const cls = 'text-red-700 font-semibold';
                                      return <span className={cls}>{`No Hit`}</span>;
                                    }
                                    const resDays = Number(stryke.daysTakenForResistanceTouch);
                                    const maxDays = stryke?.daysTakenForMaxSwingProfits != null && isFinite(Number(stryke.daysTakenForMaxSwingProfits))
                                      ? Number(stryke.daysTakenForMaxSwingProfits)
                                      : null;
                                    let cls = 'text-amber-500 font-semibold';
                                    if (maxDays != null) {
                                      if (maxDays > resDays) cls = 'text-green-700 font-semibold';
                                      else if (maxDays < resDays) cls = 'text-red-700 font-semibold';
                                      else cls = 'text-green-700 font-semibold';
                                    }
                                    return <span className={cls}>{`${resDays} days`}</span>;
                                  })()
                                }</td>
                                <td className="border border-gray-700 px-4 py-2 text-center align-middle">

                                  {stryke && (() => {
                                    console.log('algoAnalysis:', stryke);
                                    console.log('algoAnalysis.emacross:', stryke.emacross);
                                    console.log('algoAnalysis.emacross.emaData1H:', stryke.emacross?.emaData1H);

                                    const cls = (stryke?.emacross?.emaData1H?.ema8 ?? 0) > (stryke?.entryCandleClose ?? 0) ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800';
                                    console.log('Ema 1H-8', stryke?.emacross?.emaData1H?.ema8, stryke?.entryCandleClose, cls);
                                    return (<span
                                      role="button"
                                      tabIndex={0}
                                      className={`relative inline-flex items-center text-xs px-2 py-0.5 rounded-md ${cls} cursor-pointer`}
                                    >
                                      <span>1H-8</span>
                                    </span>);
                                  })()}

                                  {stryke && (() => {
                                    const cls = (stryke?.emacross?.emaDataDay?.ema8 ?? 0) > (stryke?.entryCandleClose ?? 0) ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800';
                                    return (<span
                                      role="button"
                                      tabIndex={0}
                                      className={`relative inline-flex items-center text-xs px-2 py-0.5 rounded-md ${cls} cursor-pointer`}
                                    >
                                      <span>1D-8</span>
                                    </span>);
                                  })()}

                                </td>
                                <td className="border border-gray-700 px-4 py-2 text-center align-middle">

                                  {stryke && (() => {
                                    const cls = (stryke?.emacross?.emaData1H?.ema30 ?? 0) > (stryke?.entryCandleClose ?? 0) ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800';
                                    return (<span
                                      role="button"
                                      tabIndex={0}
                                      className={`relative inline-flex items-center text-xs px-2 py-0.5 rounded-md ${cls} cursor-pointer`}
                                    >
                                      <span>1H-30</span>
                                    </span>);
                                  })()}

                                  {stryke && (() => {
                                    const cls = (stryke?.emacross?.emaDataDay?.ema30 ?? 0) > (stryke?.entryCandleClose ?? 0) ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800';
                                    return (<span
                                      role="button"
                                      tabIndex={0}
                                      className={`relative inline-flex items-center text-xs px-2 py-0.5 rounded-md ${cls} cursor-pointer`}
                                    >
                                      <span>1D-30</span>
                                    </span>);
                                  })()}

                                </td>
                                <td className="border border-gray-700 px-4 py-2 text-center align-middle">
                                  <div className="flex items-center justify-center space-x-2">
                                    {(() => {
                                      const p = getEmaBadgeProps(stryke, "algo", '15M');
                                      return (
                                        <span
                                          title={p.title}
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => openCrossoverModal(stryke, "algo", '15M')}
                                          onKeyDown={(e) => { if (e.key === 'Enter') openCrossoverModal(stryke, "algo", '15M'); }}
                                          className={`relative inline-flex items-center text-xs px-2 py-0.5 rounded-md ${p.cls} cursor-pointer`}
                                        >
                                          <span>15M</span>
                                          {(p.count ?? 0) > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-gray-800 text-white text-[10px] px-1 rounded-full">{p.count}</span>
                                          )}
                                        </span>
                                      );
                                    })()}
                                    {(() => {
                                      const p = getEmaBadgeProps(stryke, "algo", '1H');
                                      return (
                                        <span
                                          title={p.title}
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => openCrossoverModal(stryke, "algo", '1H')}
                                          onKeyDown={(e) => { if (e.key === 'Enter') openCrossoverModal(stryke, "algo", '1H'); }}
                                          className={`relative inline-flex items-center text-xs px-2 py-0.5 rounded-md ${p.cls} cursor-pointer`}
                                        >
                                          <span>1H</span>
                                          {(p.count ?? 0) > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-gray-800 text-white text-[10px] px-1 rounded-full">{p.count}</span>
                                          )}
                                        </span>
                                      );
                                    })()}
                                    {(() => {
                                      const p = getEmaBadgeProps(stryke, "algo", '4H');
                                      return (
                                        <span
                                          title={p.title}
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => openCrossoverModal(stryke, "algo", '4H')}
                                          onKeyDown={(e) => { if (e.key === 'Enter') openCrossoverModal(stryke, "algo", '4H'); }}
                                          className={`relative inline-flex items-center text-xs px-2 py-0.5 rounded-md ${p.cls} cursor-pointer`}
                                        >
                                          <span>4H</span>
                                          {(p.count ?? 0) > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-gray-800 text-white text-[10px] px-1 rounded-full">{p.count}</span>
                                          )}
                                        </span>
                                      );
                                    })()}
                                    {(() => {
                                      const p = getEmaBadgeProps(stryke, "algo", '1D');
                                      return (
                                        <span
                                          title={p.title}
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => openCrossoverModal(stryke, "algo", '1D')}
                                          onKeyDown={(e) => { if (e.key === 'Enter') openCrossoverModal(stryke, "algo", '1D'); }}
                                          className={`relative inline-flex items-center text-xs px-2 py-0.5 rounded-md ${p.cls} cursor-pointer`}
                                        >
                                          <span>1D</span>
                                          {(p.count ?? 0) > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-gray-800 text-white text-[10px] px-1 rounded-full">{p.count}</span>
                                          )}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* Crossover Modal */}
                  {crossoverModal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-11/12 max-w-lg shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">{crossoverModal.companyName} — {crossoverModal.timeframe} Crossovers</h3>
                          <button onClick={closeCrossoverModal} className="text-gray-600 hover:text-gray-900">Close</button>
                        </div>
                        {crossoverModal.list.length === 0 ? (
                          <p className="text-sm text-gray-500">No crossover dates available.</p>
                        ) : (
                          <ul className="space-y-2 max-h-64 overflow-auto">
                            {crossoverModal.list.map((dt, i) => (
                              <li key={dt + i} className="text-sm">{(() => {
                                if (!dt) return 'N/A';
                                const p = new Date(dt);
                                if (isNaN(p.getTime())) return dt;
                                // Show human-friendly date and time (avoid repeating the date twice)
                                return `${formatReadableDate(dt)} — ${p.toLocaleTimeString()}`;
                              })()}</li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-4 flex justify-end">
                          <button onClick={closeCrossoverModal} className="px-3 py-1 rounded-md bg-blue-500 text-white">Close</button>
                        </div>
                      </div>
                    </div>
                  )}



                </div>

              </div>

            )}

          </>)}

      </div>
    </div>
  );
}

export default function StrikeAnalysisPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StrikeAnalysisContent />
    </Suspense>
  );
}

