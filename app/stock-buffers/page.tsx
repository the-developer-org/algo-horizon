"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { EMACROSS } from '@/types/analysis';

interface BufferHits {
  date?: string;
  hitPrice?: number;
  [key: string]: any;
}

interface SwingDates {
  swingStart?: string;
  swingEnd?: string;
  label?: string;
  price?: number;
  date?: string;
  [key: string]: any;
}

interface Candle {
  timestamp?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  [key: string]: any;
}

interface LightSwingDTO {
  swingStart?: string;
  swingEnd?: string;
  label?: string;
  [key: string]: any;
}

interface SwingAnalysis {
  previousSwing?: LightSwingDTO;
  currentSwing?: LightSwingDTO;
  COCCandle?: Candle;
  minSwingProfits?: number;
  maxSwingProfits?: number;
  absoluteProfits?: number;
  daysTakenForAbsoluteProfits?: number;
  daysTakenForMaxSwingProfits?: number;
  maxProfitCandle?: Candle;
  algoEntryCandle?: Candle;
  supportTouchCandle?: Candle;
  resistanceTouchCandle?: Candle;
  absoluteProfitCandle?: Candle;
  daysTakenForSupportTouch?: number;
  daysTakenForResistanceTouch?: number;
  algoSupport?: number;
  algoResistance?: number;
  emacross?: EMACROSS;
  entryCandleRsi?: number;
}

interface StockBuffer {
  id: string;
  companyName: string;
  etRatio: number;
  instrumentKey: string;
  backTestStartSwing: LightSwingDTO;
  backTestPrevSwing: LightSwingDTO;
  algoSwingAnalysis?: SwingAnalysis;
  didHourRSIQualify: boolean;
  dayLevelRSICandleTime: string;
  dayLevelRSI: number;
  hourLevelRSICandleTime: string;
  hourLevelRSI: number;
  didDayRSIQualify: boolean;
  swingDates: SwingDates[];
  bufferHitsList: BufferHits[];
  etRatioCrossed: boolean;
}

interface LoadingProgress {
  completedAlphabets: string[];
  currentAlphabet: string | null;
  totalCompanies: number;
  loadedCompanies: number;
  isComplete: boolean;
}

export default function StockBuffersPage() {
  const [stockBuffers, setStockBuffers] = useState<StockBuffer[]>([]);
  const [filteredBuffers, setFilteredBuffers] = useState<StockBuffer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progressiveLoading, setProgressiveLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({
    completedAlphabets: [],
    currentAlphabet: null,
    totalCompanies: 0,
    loadedCompanies: 0,
    isComplete: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'dayRsi' | 'hourRsi' | 'bufferHits'>('name');
  const [filterRSIQualified, setFilterRSIQualified] = useState(false);
  const [filterSwingDates, setFilterSwingDates] = useState(false);
  const [filterBufferHits, setFilterBufferHits] = useState(false);
  const [maxDayRSI, setMaxDayRSI] = useState<string>('');
  const [maxHourRSI, setMaxHourRSI] = useState<string>('');
  const [selectedSwingTransition, setSelectedSwingTransition] = useState<string>('');
  const [selectedEtRatioFilter, setSelectedEtRatioFilter] = useState<string>('');

  // Fetch data for all alphabets
  const fetchAllStockBuffers = async () => {
    const alphabetOrder = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B', 'N', 'M'];
    
    setProgressiveLoading(true);
    setIsLoading(false);
    setStockBuffers([]);
    setFilteredBuffers([]);

    setLoadingProgress({
      completedAlphabets: [],
      currentAlphabet: null,
      totalCompanies: 0,
      loadedCompanies: 0,
      isComplete: false
    });

    const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    let allBuffers: StockBuffer[] = [];
    let completedAlphabets: string[] = [];
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 5;

    try {
      for (let i = 0; i < alphabetOrder.length; i++) {
        const alphabet = alphabetOrder[i];

        setLoadingProgress(prev => ({
          ...prev,
          currentAlphabet: alphabet,
          completedAlphabets: completedAlphabets
        }));

        try {
          const response = await fetch(`${backEndBaseUrl}/api/prediction/get-prediction-data/${alphabet}`, {
            headers: {
              'accept': 'application/json',
            },
          });

          if (response.ok) {
            const data: StockBuffer[] = await response.json();

            if (data && Array.isArray(data)) {
              allBuffers = [...allBuffers, ...data];
              setStockBuffers(allBuffers);
              
              // Update filtered list
              applyFilters(allBuffers, searchTerm, filterRSIQualified, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, selectedEtRatioFilter);

              setLoadingProgress(prev => ({
                ...prev,
                loadedCompanies: allBuffers.length
              }));

              // Reset consecutive failures on success
              consecutiveFailures = 0;
            }
          } else {
            consecutiveFailures++;
            if (consecutiveFailures >= maxConsecutiveFailures) {
              console.log(`Stopped loading after ${maxConsecutiveFailures} consecutive failures`);
              break;
            }
          }
        } catch (error) {
          console.error(`Error loading alphabet ${alphabet}:`, error);
          consecutiveFailures++;
          if (consecutiveFailures >= maxConsecutiveFailures) {
            console.log(`Stopped loading after ${maxConsecutiveFailures} consecutive failures`);
            break;
          }
        }

        completedAlphabets.push(alphabet);
        setLoadingProgress(prev => ({
          ...prev,
          completedAlphabets: completedAlphabets
        }));
      }

      setLoadingProgress(prev => ({
        ...prev,
        isComplete: true,
        currentAlphabet: null
      }));

      toast.success(`Loaded ${allBuffers.length} stock buffers`);
    } catch (error) {
      console.error('Error fetching stock buffers:', error);
      toast.error('Failed to fetch stock buffers');
    } finally {
      setProgressiveLoading(false);
    }
  };

  // Apply filters and sorting
  const applyFilters = (data: StockBuffer[], search: string, rsiFilter: boolean, swingFilter: boolean, bufferFilter: boolean, sort: string, maxDay?: number, maxHour?: number, swingTransition?: string, etRatioFilter?: string) => {
    let filtered = [...data];

    // Search filter
    if (search.trim()) {
      filtered = filtered.filter(item =>
        item.companyName.toLowerCase().includes(search.toLowerCase()) ||
        item.instrumentKey.toLowerCase().includes(search.toLowerCase())
      );
    }

    // RSI Qualification filter
    if (rsiFilter) {
      filtered = filtered.filter(item =>
        item.didDayRSIQualify || item.didHourRSIQualify
      );
    }

    // Max Day RSI and Hour RSI filter (only consider if value > 0)
    const hasDayRSIFilter = maxDay !== undefined && maxDay > 0;
    const hasHourRSIFilter = maxHour !== undefined && maxHour > 0;

    if (hasDayRSIFilter || hasHourRSIFilter) {
      filtered = filtered.filter(item => {
        // If both filters are provided, both must pass (AND logic)
        // If only one is provided, that one must pass
        if (hasDayRSIFilter && hasHourRSIFilter) {
          // Both provided: keep if both pass
          return item.dayLevelRSI <= maxDay && item.hourLevelRSI <= maxHour;
        } else if (hasDayRSIFilter) {
          // Only Day RSI provided
          return item.dayLevelRSI <= maxDay;
        } else {
          // Only Hour RSI provided
          return maxHour !== undefined && item.hourLevelRSI <= maxHour;
        }
      });
    }

    // Swing Dates filter
    if (swingFilter) {
      filtered = filtered.filter(item =>
        item.swingDates && item.swingDates.length > 0
      );
    }

    // Buffer Hits filter
    if (bufferFilter) {
      filtered = filtered.filter(item =>
        item.bufferHitsList && item.bufferHitsList.length > 0
      );
    }

    // Swing Transition filter
    if (swingTransition && swingTransition.trim()) {
      filtered = filtered.filter(item => {
        const prevLabel = item.backTestPrevSwing?.label || '';
        const currLabel = item.backTestStartSwing?.label || '';
        const transition = `${prevLabel}-${currLabel}`;
        return transition === swingTransition;
      });
    }

    // ET Ratio filter
    if (etRatioFilter && etRatioFilter.trim()) {
      if (etRatioFilter === '<1x') {
        filtered = filtered.filter(item => item.etRatio < 1);
      } else {
        const minRatio = parseInt(etRatioFilter.replace('x', ''));
        const maxRatio = minRatio + 1;
        filtered = filtered.filter(item => item.etRatio >= minRatio && item.etRatio < maxRatio);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sort) {
        case 'dayRsi':
          return b.dayLevelRSI - a.dayLevelRSI;
        case 'hourRsi':
          return b.hourLevelRSI - a.hourLevelRSI;
        case 'bufferHits':
          return (b.bufferHitsList?.length || 0) - (a.bufferHitsList?.length || 0);
        case 'name':
        default:
          return a.companyName.localeCompare(b.companyName);
      }
    });

    setFilteredBuffers(filtered);
  };

  // Handle search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const search = e.target.value;
    setSearchTerm(search);
    applyFilters(stockBuffers, search, filterRSIQualified, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, selectedEtRatioFilter);
  };

  // Handle RSI filter change
  const handleRSIFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setFilterRSIQualified(checked);
    applyFilters(stockBuffers, searchTerm, checked, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, selectedEtRatioFilter);
  };

  // Handle Swing Dates filter change
  const handleSwingDatesFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setFilterSwingDates(checked);
    applyFilters(stockBuffers, searchTerm, filterRSIQualified, checked, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, selectedEtRatioFilter);
  };

  // Handle Buffer Hits filter change
  const handleBufferHitsFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setFilterBufferHits(checked);
    applyFilters(stockBuffers, searchTerm, filterRSIQualified, filterSwingDates, checked, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, selectedEtRatioFilter);
  };

  // Handle sort change
  const handleSortChange = (newSort: 'name' | 'dayRsi' | 'hourRsi' | 'bufferHits') => {
    setSortBy(newSort);
    applyFilters(stockBuffers, searchTerm, filterRSIQualified, filterSwingDates, filterBufferHits, newSort, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, selectedEtRatioFilter);
  };

  // Get unique swing transitions from data
  const getUniqueSwingTransitions = () => {
    const transitions = new Set<string>();
    stockBuffers.forEach(buffer => {
      const prevLabel = buffer.backTestPrevSwing?.label || '';
      const currLabel = buffer.backTestStartSwing?.label || '';
      if (prevLabel && currLabel) {
        transitions.add(`${prevLabel}-${currLabel}`);
      }
    });
    return Array.from(transitions).sort();
  };

  // Export to Excel
  const exportToExcel = () => {
    const rows = filteredBuffers.map(item => ({
      'Company Name': item.companyName,
      'Instrument Key': item.instrumentKey,
      'Day Level RSI': item.dayLevelRSI.toFixed(2),
      'Day RSI Qualified': item.didDayRSIQualify ? 'Yes' : 'No',
      'Hour Level RSI': item.hourLevelRSI.toFixed(2),
      'Hour RSI Qualified': item.didHourRSIQualify ? 'Yes' : 'No',
      'Buffer Hits Count': item.bufferHitsList?.length || 0,
      'Day RSI Candle Time': item.dayLevelRSICandleTime || 'N/A',
      'Hour RSI Candle Time': item.hourLevelRSICandleTime || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Buffers');
    XLSX.writeFile(wb, 'stock-buffers.xlsx');
    toast.success('Exported to Excel');
  };

  // Auto-load on mount
  useEffect(() => {
    fetchAllStockBuffers();
  }, []);

  return (
    <div className="container mx-auto py-4 px-4 max-w-screen-2xl">
      <Toaster />
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Stock Buffers Analysis</h1>
        <p className="text-gray-600">View and analyze stock prediction data and buffer hits</p>
      </div>

      {/* Controls */}
      <Card className="p-4 mb-6">
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by company name or instrument key..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="min-w-40">
              <label className="block text-sm font-medium mb-2">Max Day RSI</label>
              <input
                type="number"
                placeholder="e.g., 45"
                value={maxDayRSI}
                onChange={(e) => setMaxDayRSI(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="min-w-40">
              <label className="block text-sm font-medium mb-2">Max Hour RSI</label>
              <input
                type="number"
                placeholder="e.g., 70"
                value={maxHourRSI}
                onChange={(e) => setMaxHourRSI(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Button
              onClick={() => applyFilters(stockBuffers, searchTerm, filterRSIQualified, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, selectedEtRatioFilter)}
              className="text-sm"
            >
              Apply RSI Filter
            </Button>

            <div className="min-w-40">
              <label className="block text-sm font-medium mb-2">Swing Transition</label>
              <select
                value={selectedSwingTransition}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSwingTransition(val);
                  applyFilters(stockBuffers, searchTerm, filterRSIQualified, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, val, selectedEtRatioFilter);
                }}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Transitions</option>
                {getUniqueSwingTransitions().map((transition) => (
                  <option key={transition} value={transition}>
                    {transition}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rsiFilter"
                  checked={filterRSIQualified}
                  onChange={handleRSIFilterChange}
                  className="w-4 h-4"
                />
                <label htmlFor="rsiFilter" className="text-sm font-medium">
                  RSI Qualified Only
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="swingFilter"
                  checked={filterSwingDates}
                  onChange={handleSwingDatesFilterChange}
                  className="w-4 h-4"
                />
                <label htmlFor="swingFilter" className="text-sm font-medium">
                  Swing Dates Only
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="bufferFilter"
                  checked={filterBufferHits}
                  onChange={handleBufferHitsFilterChange}
                  className="w-4 h-4"
                />
                <label htmlFor="bufferFilter" className="text-sm font-medium">
                  Buffer Hits Only
                </label>
              </div>
            </div>
          </div>

          {/* Sort Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={sortBy === 'name' ? 'default' : 'outline'}
              onClick={() => handleSortChange('name')}
              className="text-sm"
            >
              Sort by Name
            </Button>
            <Button
              variant={sortBy === 'dayRsi' ? 'default' : 'outline'}
              onClick={() => handleSortChange('dayRsi')}
              className="text-sm"
            >
              Sort by Day RSI
            </Button>
            <Button
              variant={sortBy === 'hourRsi' ? 'default' : 'outline'}
              onClick={() => handleSortChange('hourRsi')}
              className="text-sm"
            >
              Sort by Hour RSI
            </Button>
            <Button
              variant={sortBy === 'bufferHits' ? 'default' : 'outline'}
              onClick={() => handleSortChange('bufferHits')}
              className="text-sm"
            >
              Sort by Buffer Hits
            </Button>
            <Button
              onClick={fetchAllStockBuffers}
              disabled={progressiveLoading}
              className="text-sm"
            >
              Reload Data
            </Button>
            <Button
              onClick={exportToExcel}
              variant="outline"
              className="text-sm"
            >
              Export to Excel
            </Button>
          </div>

          {/* Loading Progress */}
          {progressiveLoading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="text-sm font-medium">
                  {loadingProgress.currentAlphabet ? `Loading alphabet: ${loadingProgress.currentAlphabet}` : 'Finalizing...'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(loadingProgress.completedAlphabets.length / 26) * 100}%`
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-600">
                Completed: {loadingProgress.completedAlphabets.length}/26 | Loaded: {loadingProgress.loadedCompanies} companies
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-gray-600 font-medium">Total Buffers</p>
              <p className="text-2xl font-bold text-blue-600">{filteredBuffers.length}</p>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-gray-600 font-medium">RSI Qualified</p>
              <div className="space-y-2">
                <div className="flex gap-4 items-center">
                  <div>
                    <p className="text-xs text-gray-500">Day RSI</p>
                    <p className="text-xl font-bold text-green-600">
                      {filteredBuffers.filter(b => b.didDayRSIQualify).length}
                    </p>
                  </div>
                  <div className="border-l border-green-300"></div>
                  <div>
                    <p className="text-xs text-gray-500">Hour RSI</p>
                    <p className="text-xl font-bold text-green-600">
                      {filteredBuffers.filter(b => b.didHourRSIQualify).length}
                    </p>
                  </div>
                </div>
                <div className="border-t border-green-300 pt-2">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-lg font-bold text-green-600">
                    {filteredBuffers.filter(b => b.didDayRSIQualify || b.didHourRSIQualify).length}/{filteredBuffers.length}
                    {filteredBuffers.length > 0 && ` (${((filteredBuffers.filter(b => b.didDayRSIQualify || b.didHourRSIQualify).length / filteredBuffers.length) * 100).toFixed(1)}%)`}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs text-gray-600 font-medium">Swing Crossing</p>
              <p className="text-2xl font-bold text-orange-600">
                {filteredBuffers.filter(b => b.swingDates && b.swingDates.length > 0).length}/{filteredBuffers.length}
                {filteredBuffers.length > 0 && ` (${((filteredBuffers.filter(b => b.swingDates && b.swingDates.length > 0).length / filteredBuffers.length) * 100).toFixed(1)}%)`}
              </p>
            </div>
            <div className="p-3 bg-pink-50 border border-pink-200 rounded-lg">
              <p className="text-xs text-gray-600 font-medium">Buffer Hits</p>
              <div className="space-y-2">
                <div className="flex gap-4 items-center">
                  <div>
                    <p className="text-xs text-gray-500">1H Timeframe</p>
                    <p className="text-xl font-bold text-pink-600">
                      {filteredBuffers.filter(b => b.bufferHitsList?.some(hit => hit.timeFrame === '1h')).length}
                    </p>
                  </div>
                  <div className="border-l border-pink-300"></div>
                  <div>
                    <p className="text-xs text-gray-500">15M Timeframe</p>
                    <p className="text-xl font-bold text-pink-600">
                      {filteredBuffers.filter(b => b.bufferHitsList?.some(hit => hit.timeFrame === '15m')).length}
                    </p>
                  </div>
                </div>
                <div className="border-t border-pink-300 pt-2">
                  <p className="text-xs text-gray-500">Stocks w/ Hits</p>
                  <p className="text-lg font-bold text-pink-600">
                    {filteredBuffers.filter(b => b.bufferHitsList && b.bufferHitsList.length > 0).length}/{filteredBuffers.length}
                    {filteredBuffers.length > 0 && ` (${((filteredBuffers.filter(b => b.bufferHitsList && b.bufferHitsList.length > 0).length / filteredBuffers.length) * 100).toFixed(1)}%)`}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-xs text-gray-600 font-medium">
                ET Ratio Crossed {selectedEtRatioFilter ? `(${selectedEtRatioFilter})` : '(All)'}
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {filteredBuffers.filter(b => b.etRatioCrossed).length}/{filteredBuffers.length}
                {filteredBuffers.length > 0 && ` (${((filteredBuffers.filter(b => b.etRatioCrossed).length / filteredBuffers.length) * 100).toFixed(1)}%)`}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-xs text-gray-600 font-medium">ET Ratio Distribution</p>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="space-y-1">
                  <Button
                    variant={selectedEtRatioFilter === '' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedEtRatioFilter('');
                      applyFilters(stockBuffers, searchTerm, filterRSIQualified, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, '');
                    }}
                    className="w-full text-xs"
                  >
                    All ({stockBuffers.length})
                  </Button>
                  <Button
                    variant={selectedEtRatioFilter === '<1x' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedEtRatioFilter('<1x');
                      applyFilters(stockBuffers, searchTerm, filterRSIQualified, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, '<1x');
                    }}
                    className="w-full text-xs"
                  >
                    &lt;1x ({stockBuffers.filter(b => b.etRatio < 1).length})
                  </Button>
                </div>
                <div className="space-y-1">
                  <Button
                    variant={selectedEtRatioFilter === '1x' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedEtRatioFilter('1x');
                      applyFilters(stockBuffers, searchTerm, filterRSIQualified, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, '1x');
                    }}
                    className="w-full text-xs"
                  >
                    1x ({stockBuffers.filter(b => b.etRatio >= 1 && b.etRatio < 2).length})
                  </Button>
                  <Button
                    variant={selectedEtRatioFilter === '2x' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedEtRatioFilter('2x');
                      applyFilters(stockBuffers, searchTerm, filterRSIQualified, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, '2x');
                    }}
                    className="w-full text-xs"
                  >
                    2x ({stockBuffers.filter(b => b.etRatio >= 2 && b.etRatio < 3).length})
                  </Button>
                  <Button
                    variant={selectedEtRatioFilter === '3x' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedEtRatioFilter('3x');
                      applyFilters(stockBuffers, searchTerm, filterRSIQualified, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, '3x');
                    }}
                    className="w-full text-xs"
                  >
                    3x ({stockBuffers.filter(b => b.etRatio >= 3 && b.etRatio < 4).length})
                  </Button>
                  <Button
                    variant={selectedEtRatioFilter === '4x' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedEtRatioFilter('4x');
                      applyFilters(stockBuffers, searchTerm, filterRSIQualified, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, '4x');
                    }}
                    className="w-full text-xs"
                  >
                    4x ({stockBuffers.filter(b => b.etRatio >= 4 && b.etRatio < 5).length})
                  </Button>
                  <Button
                    variant={selectedEtRatioFilter === '5x' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedEtRatioFilter('5x');
                      applyFilters(stockBuffers, searchTerm, filterRSIQualified, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, '5x');
                    }}
                    className="w-full text-xs"
                  >
                    5x ({stockBuffers.filter(b => b.etRatio >= 5 && b.etRatio < 6).length})
                  </Button>
                </div>
                <div className="space-y-1">
                  <Button
                    variant={selectedEtRatioFilter === '6x' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedEtRatioFilter('6x');
                      applyFilters(stockBuffers, searchTerm, filterRSIQualified, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, '6x');
                    }}
                    className="w-full text-xs"
                  >
                    6x ({stockBuffers.filter(b => b.etRatio >= 6 && b.etRatio < 7).length})
                  </Button>
                  <Button
                    variant={selectedEtRatioFilter === '7x' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedEtRatioFilter('7x');
                      applyFilters(stockBuffers, searchTerm, filterRSIQualified, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, '7x');
                    }}
                    className="w-full text-xs"
                  >
                    7x ({stockBuffers.filter(b => b.etRatio >= 7 && b.etRatio < 8).length})
                  </Button>
                  <Button
                    variant={selectedEtRatioFilter === '8x' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedEtRatioFilter('8x');
                      applyFilters(stockBuffers, searchTerm, filterRSIQualified, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, '8x');
                    }}
                    className="w-full text-xs"
                  >
                    8x ({stockBuffers.filter(b => b.etRatio >= 8 && b.etRatio < 9).length})
                  </Button>
                  <Button
                    variant={selectedEtRatioFilter === '9x' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedEtRatioFilter('9x');
                      applyFilters(stockBuffers, searchTerm, filterRSIQualified, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, '9x');
                    }}
                    className="w-full text-xs"
                  >
                    9x ({stockBuffers.filter(b => b.etRatio >= 9 && b.etRatio < 10).length})
                  </Button>
                  <Button
                    variant={selectedEtRatioFilter === '10x' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedEtRatioFilter('10x');
                      applyFilters(stockBuffers, searchTerm, filterRSIQualified, filterSwingDates, filterBufferHits, sortBy, maxDayRSI ? parseFloat(maxDayRSI) : undefined, maxHourRSI ? parseFloat(maxHourRSI) : undefined, selectedSwingTransition, '10x');
                    }}
                    className="w-full text-xs"
                  >
                    10x+ ({stockBuffers.filter(b => b.etRatio >= 10).length})
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Rows Layout */}
      <div className="space-y-4">
        {filteredBuffers.length === 0 ? (
          <div className="w-full bg-white border border-gray-300 rounded-lg p-6 text-center">
            <p className="text-gray-500 text-lg">
              {stockBuffers.length === 0 ? 'Loading data...' : 'No stock buffers found matching your criteria'}
            </p>
          </div>
        ) : (
          filteredBuffers.map((buffer, index) => (
            <div key={`${buffer.instrumentKey}-${index}`} className="w-full bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <span className="inline-block bg-blue-500 text-white text-xs px-2 py-1 rounded font-semibold">
                        {index + 1}
                      </span>
                      {buffer.companyName}
                    </h3>
                    <p className="text-sm text-blue-100 mt-1">{buffer.instrumentKey}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-blue-100">Day RSI</p>
                      <p className="text-2xl font-bold">{buffer.dayLevelRSI.toFixed(2)}</p>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mt-1 ${
                        buffer.didDayRSIQualify ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'
                      }`}>
                        {buffer.didDayRSIQualify ? 'Qualified' : 'Not Qualified'}
                      </span>
                    </div>
                    {!buffer.didDayRSIQualify && <div className="text-right">
                      <p className="text-xs text-blue-100">Hour RSI</p>
                      <p className="text-2xl font-bold">{buffer.hourLevelRSI.toFixed(2)}</p>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mt-1 ${
                        buffer.didHourRSIQualify ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'
                      }`}>
                        {buffer.didHourRSIQualify ? 'Qualified' : 'Not Qualified'}
                      </span>
                    </div>}
                    {buffer.bufferHitsList?.length > 0 && <div className="text-right">
                      <p className="text-xs text-blue-100">Buffer Hits</p>
                      <p className="text-3xl font-bold">{buffer.bufferHitsList?.length || 0}</p>
                    </div>}
                  </div>
                </div>

                {/* Status Message - Centered Both Horizontally and Vertically */}
                {(!buffer.didDayRSIQualify && !buffer.didHourRSIQualify) ? (
                  <div className="flex items-center justify-center py-3">
                  </div>
                ) : (!buffer.swingDates || buffer.swingDates.length === 0) ? (
                  <div className="flex items-center justify-center py-3">
                    <p className="text-sm text-yellow-200 font-semibold">⚠️ No Swings found in the Zone</p>
                  </div>
                ) : (buffer.bufferHitsList && buffer.bufferHitsList.length === 0) ? (
                  <div className="flex items-center justify-center py-3">
                    <p className="text-sm text-gray-300 font-semibold">ℹ️ No buffer hits recorded</p>
                  </div>
                ) : null}
              </div>
                {/* Swing Analysis Table */}
                {buffer.algoSwingAnalysis && (
                  <div className="p-4 border-t border-gray-200">
                    <div className="mb-3">
                      <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        Swing Analysis - {buffer?.etRatio.toFixed(2) ?? 0}
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse border border-gray-300">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Entry Date</th>
                            <th className="border border-gray-300 px-4 py-2 text-right font-semibold">Entry Price</th>
                            <th className="border border-gray-300 px-4 py-2 text-right font-semibold">Target</th>
                            <th className="border border-gray-300 px-4 py-2 text-right font-semibold">SL</th>
                            <th className="border border-gray-300 px-4 py-2 text-center font-semibold">Swing Label</th>
                            <th className="border border-gray-300 px-4 py-2 text-right font-semibold">Support (days)</th>
                            <th className="border border-gray-300 px-4 py-2 text-right font-semibold">Resistance (days)</th>
                            <th className="border border-gray-300 px-4 py-2 text-right font-semibold">Max Profit %</th>
                            <th className="border border-gray-300 px-4 py-2 text-right font-semibold">Absolute Profit %</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">
                              {buffer.algoSwingAnalysis.algoEntryCandle?.timestamp
                                ? new Date(buffer.algoSwingAnalysis.algoEntryCandle.timestamp).toLocaleDateString('en-GB')
                                : 'N/A'
                              }
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-mono text-gray-700">
                              {buffer.algoSwingAnalysis.algoEntryCandle?.close ? buffer.algoSwingAnalysis.algoEntryCandle.close.toFixed(2) : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-mono text-gray-700">
                              {(() => {
                                const entryPrice = buffer.algoSwingAnalysis.algoEntryCandle?.close;
                                const target = buffer.algoSwingAnalysis.algoResistance;
                                if (entryPrice && target) {
                                  const pct = ((target - entryPrice) / entryPrice * 100);
                                  return <span className="text-green-600">{target.toFixed(2)} ({pct.toFixed(2)}%)</span>;
                                }
                                return 'N/A';
                              })()}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-mono text-gray-700">
                              {(() => {
                                const entryPrice = buffer.algoSwingAnalysis.algoEntryCandle?.close;
                                const sl = buffer.algoSwingAnalysis.algoSupport;
                                if (entryPrice && sl) {
                                  const pct = ((sl - entryPrice) / entryPrice * 100);
                                  return <span className="text-red-600">{sl.toFixed(2)} ({pct.toFixed(2)}%)</span>;
                                }
                                return 'N/A';
                              })()}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center text-gray-700 font-semibold">
                              {buffer.backTestPrevSwing?.label || 'N/A'} → {buffer.backTestStartSwing?.label || 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-mono text-gray-700">
                              {buffer.algoSwingAnalysis.daysTakenForSupportTouch ?? 0}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-mono text-gray-700">
                              {buffer.algoSwingAnalysis.daysTakenForResistanceTouch ?? 0}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-mono font-semibold">
                              <span className={buffer.algoSwingAnalysis.maxSwingProfits && buffer.algoSwingAnalysis.maxSwingProfits > 0 ? 'text-green-600' : 'text-red-600'}>
                              {buffer.algoSwingAnalysis.maxProfitCandle?.close}  ({buffer.algoSwingAnalysis.maxSwingProfits ? buffer.algoSwingAnalysis.maxSwingProfits.toFixed(2) : '0.00'}%)
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-mono font-semibold">
                              <span className={buffer.algoSwingAnalysis.absoluteProfits && buffer.algoSwingAnalysis.absoluteProfits > 0 ? 'text-green-600' : 'text-red-600'}>
                                {(() => {
                                  const entryPrice = buffer.algoSwingAnalysis.algoEntryCandle?.close;
                                  const pct = buffer.algoSwingAnalysis.absoluteProfits;
                                  if (entryPrice && pct !== undefined) {
                                    const price = entryPrice * (1 + pct / 100);
                                    return `${price.toFixed(2)} (${pct.toFixed(2)}%)`;
                                  }
                                  return 'N/A';
                                })()}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              {/* Buffer Hits Table */}
              {buffer.bufferHitsList && buffer.bufferHitsList.length > 0 && buffer.swingDates && buffer.swingDates.length > 0 && (
                <div className="p-4">
                  {/* Group buffer hits by swing dates */}
                  {buffer.bufferHitsList.reduce((groups: any[], hit: any) => {
                    const swingKey = hit.swingDates 
                      ? `${hit.swingDates.swingStart}-${hit.swingDates.swingEnd}`
                      : 'no-swing';
                    const existingGroup = groups.find(g => g.key === swingKey);
                    if (existingGroup) {
                      existingGroup.hits.push(hit);
                    } else {
                      groups.push({
                        key: swingKey,
                        swingDates: hit.swingDates,
                        hits: [hit]
                      });
                    }
                    return groups;
                  }, []).map((group: any, groupIdx: number) => (
                    <div key={groupIdx} className="mb-6 last:mb-0">
                      {/* Swing Period Header */}
                      <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                        <p className="text-sm font-semibold text-gray-800">
                          Swing Period: <span className="text-blue-600">
                            {group.swingDates?.swingStart 
                              ? new Date(group.swingDates.swingStart).toLocaleDateString('en-GB')
                              : 'N/A'
                            } to {group.swingDates?.swingEnd 
                              ? new Date(group.swingDates.swingEnd).toLocaleDateString('en-GB')
                              : 'N/A'
                            }
                          </span>
                        </p>
                      </div>

                      {/* Hits Table for this Swing Period */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border border-gray-300">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="border border-gray-300 px-4 py-2 text-left font-semibold">TimeFrame</th>
                              <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Hit Date</th>
                              <th className="border border-gray-300 px-4 py-2 text-right font-semibold">Low Price</th>
                              <th className="border border-gray-300 px-4 py-2 text-right font-semibold">Buffer %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.hits.map((hit: any, hitIdx: number) => (
                              <tr key={hitIdx} className="hover:bg-gray-50 transition-colors border-b">
                                <td className="border border-gray-300 px-4 py-2 text-gray-700 font-semibold">
                                  {hit.timeFrame || 'N/A'}
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-gray-700">
                                  {hit.currentSwing?.date 
                                    ? new Date(hit.currentSwing.date).toLocaleDateString('en-GB')
                                    : 'N/A'
                                  }
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-right font-mono text-gray-700">
                                  {hit.currentSwing?.price ? hit.currentSwing.price.toFixed(2) : 'N/A'}
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-right font-mono font-semibold">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                    {hit.bufferPercentage ? hit.bufferPercentage.toFixed(2) : '0.00'}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
