'use client';

import React, { useState, useEffect } from 'react';
import { AnalysisResponse, StrykeListResponse } from '@/types/analysis';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { setLoading, setAnalysisData } from '@/lib/store/analysisSlice';

export default function DeepDivePage() {
  // Deep Dive view mode: NONE | RR_1_1 | RR_1_2 - default to RR_1_2 (1:2 mode)
  const [deepDiveMode, setDeepDiveMode] = useState<'NONE' | 'RR_1_1' | 'RR_1_2'>('RR_1_2');
  
  // Filter state for label combinations
  const [filterLabelCombo, setFilterLabelCombo] = useState<string>('ALL');
  
  // Filter state for entry date month
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  
  // Filter state for support not touched
  const [filterSupportNotTouched, setFilterSupportNotTouched] = useState(false);
  
  // Filter state for analysis types (default all enabled)
  const [showStryke, setShowStryke] = useState(true);
  const [showAlgo, setShowAlgo] = useState(true);
  const [showFibo, setShowFibo] = useState(true);
  
  // Search state for company name
  const [companySearch, setCompanySearch] = useState('');
  
  // Comments state for each entry (key: `${uuid}-${label}`)
  const [comments, setComments] = useState<Record<string, string>>({});
  
  // State to track which entry is currently being edited (for row highlighting)
  const [editingItem, setEditingItem] = useState<{uuid: string; label: string} | null>(null);
  
  // Modal state for comment editing
  const [commentModal, setCommentModal] = useState<{
    isOpen: boolean;
    item: AnalysisResponse | null;
    comment: string;
    originalComment: string;
    isSaving: boolean;
  }>({
    isOpen: false,
    item: null,
    comment: '',
    originalComment: '',
    isSaving: false
  });

  // Function to open comment modal
  const openCommentModal = (item: AnalysisResponse, existingComment: string) => {
    setCommentModal({
      isOpen: true,
      item,
      comment: existingComment,
      originalComment: existingComment,
      isSaving: false
    });
    setEditingItem({ uuid: item.uuid, label: item.label });
  };

  // Function to close comment modal
  const closeCommentModal = () => {
    setCommentModal({
      isOpen: false,
      item: null,
      comment: '',
      originalComment: '',
      isSaving: false
    });
    setEditingItem(null);
  };

  // Function to save comment
  const saveComment = async () => {
    if (!commentModal.item) return;

    setCommentModal(prev => ({ ...prev, isSaving: true }));

    try {
      const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.post(`${backEndBaseUrl}/api/stryke/update-comments`, {
        objectId: commentModal.item.objectId,
        companyName: commentModal.item.companyName || 'Unknown',
        analysisType: commentModal.item.label,
        diveRatio: deepDiveMode === 'RR_1_1' ? 1 : 2,
        comments: commentModal.comment
      });
  
      if (response.status === 200) {
        // Update local state
        const commentKey = `${commentModal.item.objectId}-${commentModal.item.label}`;
        setComments(prev => ({
          ...prev,
          [commentKey]: commentModal.comment
        }));

        // Update the deepDiveData state to reflect the saved comment
        setDeepDiveData(prevData => 
          prevData.map(item => {
            if (item.objectId === commentModal?.item?.objectId && item.label === commentModal.item.label) {
              const updatedItem = { ...item };
              if (deepDiveMode === 'RR_1_1') {
                updatedItem.analysisDeepDive = {
                  ...updatedItem.analysisDeepDive,
                  commentsS1: commentModal.comment
                };
              } else {
                updatedItem.analysisDeepDive = {
                  ...updatedItem.analysisDeepDive,
                  commentsS2: commentModal.comment
                };
              }
              return updatedItem;
            }
            return item;
          })
        );

        toast.success('Comment saved successfully');
        closeCommentModal();
      } else {
        toast.error(response.data.message || 'Failed to save comment');
      }
    } catch (error) {
      console.error('Error saving comment:', error);
      toast.error('Failed to save comment');
    } finally {
      setCommentModal(prev => ({ ...prev, isSaving: false }));
    }
  };
  
  // Function to navigate to chart page with parameters
  const navigateToChart = (instrumentKey: string, timeframe: string) => {
    const chartUrl = `/chart?instrumentKey=${encodeURIComponent(instrumentKey)}&timeframe=${encodeURIComponent(timeframe)}`;
    window.open(chartUrl, '_blank');
  };
  
  const dispatch = useAppDispatch();
  
  // Get data from Redux store
  const {
    strykeAnalysisList: reduxStrykeAnalysisList,
    algoAnalysisList: reduxAlgoAnalysisList,
    fiboAnalysisList: reduxFiboAnalysisList,
    lastFetchedAt,
    isLoading: reduxIsLoading
  } = useAppSelector((state) => state.analysis);

  const [deepDiveData, setDeepDiveData] = useState<AnalysisResponse[]>([]);
  const [progressiveLoading, setProgressiveLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({
    completedAlphabets: [] as string[],
    currentAlphabet: null as string | null,
    totalCompanies: 0,
    loadedCompanies: 0,
    isComplete: false
  });

  // Load data from Redux cache on mount or fetch if empty
  useEffect(() => {
    if (reduxStrykeAnalysisList.length > 0) {
      const allAnalysis = [...reduxAlgoAnalysisList, ...reduxStrykeAnalysisList, ...reduxFiboAnalysisList];
      setDeepDiveData(allAnalysis);
    } else {
      // Auto-fetch data on first load if cache is empty
      fetchDeepDiveData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch data with alphabetical loading
  const fetchDeepDiveData = async (forceRefresh = false) => {
    // Check if we have cached data and it's not a forced refresh
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    const isCacheValid = lastFetchedAt && (Date.now() - lastFetchedAt < CACHE_DURATION);
    
    if (!forceRefresh && isCacheValid && reduxStrykeAnalysisList.length > 0) {
      const allCached = [...reduxAlgoAnalysisList, ...reduxStrykeAnalysisList, ...reduxFiboAnalysisList];
      setDeepDiveData(allCached);
      toast.success(`Loaded ${allCached.length} companies from cache`);
      return;
    }
    
    if (progressiveLoading || reduxIsLoading) {
      toast.error('Loading already in progress. Please wait...');
      return;
    }

    const alphabetOrder = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B', 'N', 'M'];

    dispatch(setLoading(true));
    setProgressiveLoading(true);
    setDeepDiveData([]);

    setLoadingProgress({
      completedAlphabets: [],
      currentAlphabet: null,
      totalCompanies: 0,
      loadedCompanies: 0,
      isComplete: false
    });

    const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    let allStrykes: AnalysisResponse[] = [];
    let allAlgoAnalysis: AnalysisResponse[] = [];
    let allStrykeAnalysis: AnalysisResponse[] = [];
    let allFiboAnalysis: AnalysisResponse[] = [];
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
          const response = await axios.get(`${backEndBaseUrl}/api/stryke/fetch-all-analysis/${alphabet}`);

          if (response.data) {
            const data: StrykeListResponse = response.data;

            if (data.swingStatsList && data.swingStatsList !== null) {
              const algoAnalysis: AnalysisResponse[] = data.swingStatsList["ALGO"] || [];
              const strykeAnalysis: AnalysisResponse[] = data.swingStatsList["STRYKE"] || [];
              const fiboAnalysis: AnalysisResponse[] = data.swingStatsList["FIBO"] || [];
              
              allAlgoAnalysis = [...allAlgoAnalysis, ...algoAnalysis];
              allStrykeAnalysis = [...allStrykeAnalysis, ...strykeAnalysis];
              allFiboAnalysis = [...allFiboAnalysis, ...fiboAnalysis];

              allStrykes = [...allStrykes, ...algoAnalysis, ...strykeAnalysis, ...fiboAnalysis];
              setDeepDiveData(allStrykes);

              consecutiveFailures = 0;
            } else {
              consecutiveFailures++;
            }
          } else {
            consecutiveFailures++;
          }
        } catch (error) {
          console.error(`Error fetching alphabet ${alphabet}:`, error);
          consecutiveFailures++;
        }

        if (consecutiveFailures >= maxConsecutiveFailures) {
          toast.error(`Stopped loading after ${consecutiveFailures} consecutive failures.`);
          break;
        }

        completedAlphabets = [...completedAlphabets, alphabet];

        setLoadingProgress(prev => ({
          ...prev,
          completedAlphabets: completedAlphabets,
          currentAlphabet: i === alphabetOrder.length - 1 ? null : alphabetOrder[i + 1],
          loadedCompanies: allStrykes.length,
          totalCompanies: allStrykes.length
        }));

        if (i < alphabetOrder.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Store in Redux
      dispatch(setAnalysisData({
        strykeAnalysisList: allStrykeAnalysis,
        algoAnalysisList: allAlgoAnalysis,
        fiboAnalysisList: allFiboAnalysis,
        keyMapping: {}
      }));

      setLoadingProgress(prev => ({
        ...prev,
        isComplete: true,
        currentAlphabet: null,
        totalCompanies: allStrykes.length
      }));

      if (allStrykes.length > 0) {
        toast.success(`Successfully loaded ${allStrykes.length} companies from ${completedAlphabets.length} alphabets`);
      } else {
        toast.error('No data was loaded.');
      }

    } catch (error) {
      console.error('Error in progressive loading:', error);
      toast.error('Failed to complete data loading.');
    } finally {
      setProgressiveLoading(false);
      dispatch(setLoading(false));
    }
  };


  // Derived deep dive list based on current mode & existing filtered list
  const deepDiveList = React.useMemo(() => {
    if (deepDiveMode === 'NONE') return [] as AnalysisResponse[];
    return deepDiveData.filter(item => {
      if (!item.analysisDeepDive) return false;
      
      // Check deep dive mode
      const hasSwingLabels = deepDiveMode === 'RR_1_1' 
        ? !!item.analysisDeepDive.swingLabels1 
        : !!item.analysisDeepDive.swingLabels2;
      if (!hasSwingLabels) return false;
      
      // Apply label combination filter
      if (filterLabelCombo !== 'ALL') {
        const [prevLabel, currentLabel] = filterLabelCombo.split('-');
        if (item.prevSwingLabel !== prevLabel || item.currentSwingLabel !== currentLabel) {
          return false;
        }
      }
      
      // Apply month filter
      if (selectedMonth) {
        const entryDate = new Date(item.entryTime);
        const entryMonth = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
        if (entryMonth !== selectedMonth) {
          return false;
        }
      }
      
      // Apply support not touched filter
      if (filterSupportNotTouched) {
        // Hide entries where support was touched (daysTakenForSupportTouch > 0)
        if (item.daysTakenForSupportTouch && item.daysTakenForSupportTouch > 0) {
          return false;
        }
      }
      
      // Apply analysis type filters
      if (item.label === 'STRYKE' && !showStryke) return false;
      if (item.label === 'ALGO' && !showAlgo) return false;
      if (item.label === 'FIBO' && !showFibo) return false;
      
      return true;
    });
  }, [deepDiveMode, deepDiveData, filterLabelCombo, selectedMonth, filterSupportNotTouched, showStryke, showAlgo, showFibo]);

  // Group deep dive entries by UUID (each UUID can have max 3 entries: ALGO, STRYKE, FIBO)
  const groupedByUUID = React.useMemo(() => {
    const groups = new Map<string, {
      companyName: string;
      uuid: string;
      entries: AnalysisResponse[];
    }>();
    
    deepDiveList.forEach(item => {
      const uuid = item.uuid;
      if (!groups.has(uuid)) {
        groups.set(uuid, {
          companyName: item.companyName || 'Unknown',
          uuid: uuid,
          entries: []
        });
      }
      
      // Add entry only if this analysis type doesn't exist for this UUID
      const group = groups.get(uuid)!;
      const hasAnalysisType = group.entries.some(e => e.label === item.label);
      if (!hasAnalysisType) {
        group.entries.push(item);
      }
    });
    
    // Sort entries within each group: STRYKE, ALGO, FIBO
    const analysisOrder = { 'STRYKE': 1, 'ALGO': 2, 'FIBO': 3 };
    groups.forEach(group => {
      group.entries.sort((a, b) => {
        const orderA = analysisOrder[a.label as keyof typeof analysisOrder] || 999;
        const orderB = analysisOrder[b.label as keyof typeof analysisOrder] || 999;
        return orderA - orderB;
      });
    });
    
    // Sort by company name, then by UUID
    let result = Array.from(groups.values()).sort((a, b) => {
      const companyCompare = a.companyName.localeCompare(b.companyName);
      if (companyCompare !== 0) return companyCompare;
      return a.uuid.localeCompare(b.uuid);
    });
    
    // Apply company search filter
    if (companySearch.trim()) {
      const searchTerm = companySearch.toLowerCase().trim();
      result = result.filter(group => 
        group.companyName.toLowerCase().includes(searchTerm)
      );
    }
    
    return result;
  }, [deepDiveList, companySearch]);

  return (
    <div className="flex justify-start py-4 px-4 bg-cream">
      <div className="w-full max-w-screen-2xl ml-24 mr-0">
        <Toaster position="top-right" />
        
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Deep Dive Analysis</h1>
            <div className="flex gap-2">
              <button
                onClick={() => fetchDeepDiveData(true)}
                className={`px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors ${progressiveLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={progressiveLoading}
                title="Force refresh data from API"
              >
                {progressiveLoading ? 'Loading...' : lastFetchedAt ? 'Refresh Data' : 'Load Data'}
              </button>
            </div>
          </div>
        </div>

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
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    loadingProgress.completedAlphabets.includes(letter)
                      ? 'bg-green-100 text-green-800'
                      : loadingProgress.currentAlphabet === letter
                      ? 'bg-blue-100 text-blue-800'
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

        {/* Deep Dive Controls */}
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-700">Deep Dive Mode:</span>

            {/* Deep Dive Buttons */}
            <div className="flex gap-2">
              <button
                className={`px-3 py-1 rounded-md text-white transition-colors ${deepDiveMode === 'RR_1_1' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 hover:bg-gray-600'}`}
                onClick={() => setDeepDiveMode(prev => prev === 'RR_1_1' ? 'NONE' : 'RR_1_1')}
                title="Toggle Deep Dive 1:1 (swingLabels1)"
              >
                Deep Dive 1:1
              </button>
              <button
                className={`px-3 py-1 rounded-md text-white transition-colors ${deepDiveMode === 'RR_1_2' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 hover:bg-gray-600'}`}
                onClick={() => setDeepDiveMode(prev => prev === 'RR_1_2' ? 'NONE' : 'RR_1_2')}
                title="Toggle Deep Dive 1:2 (swingLabels2)"
              >
                Deep Dive 1:2
              </button>
            </div>
          </div>

          {/* Label Combination Filter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Label Combination:</label>
              <select
                value={filterLabelCombo}
                onChange={(e) => setFilterLabelCombo(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All</option>
                <option value="HH-HH">HH ← HH</option>
                <option value="HH-HL">HH ← HL</option>
                <option value="HH-LH">HH ← LH</option>
                <option value="HH-LL">HH ← LL</option>
                <option value="HL-HH">HL ← HH</option>
                <option value="HL-HL">HL ← HL</option>
                <option value="HL-LH">HL ← LH</option>
                <option value="HL-LL">HL ← LL</option>
                <option value="LH-HH">LH ← HH</option>
                <option value="LH-HL">LH ← HL</option>
                <option value="LH-LH">LH ← LH</option>
                <option value="LH-LL">LH ← LL</option>
                <option value="LL-HH">LL ← HH</option>
                <option value="LL-HL">LL ← HL</option>
                <option value="LL-LH">LL ← LH</option>
                <option value="LL-LL">LL ← LL</option>
              </select>
            </div>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Entry Month:</label>
              <select
                value={selectedMonth || ''}
                onChange={(e) => setSelectedMonth(e.target.value || null)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Months</option>
                {(() => {
                  // Generate unique months from deepDiveData
                  const months = new Set<string>();
                  deepDiveData.forEach(item => {
                    if (item.entryTime) {
                      const date = new Date(item.entryTime);
                      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                      months.add(monthKey);
                    }
                  });
                  return Array.from(months).sort().reverse().map(monthKey => {
                    const [year, month] = monthKey.split('-');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const monthName = monthNames[parseInt(month) - 1];
                    return (
                      <option key={monthKey} value={monthKey}>
                        {monthName} {year}
                      </option>
                    );
                  });
                })()}
              </select>
            </div>
          </div>

          {/* Support Not Touched Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterSupportNotTouched(!filterSupportNotTouched)}
              className={`px-3 py-1 rounded-md text-white transition-colors ${
                filterSupportNotTouched 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-gray-500 hover:bg-gray-600'
              }`}
              title="Toggle to hide entries where support was touched"
            >
              {filterSupportNotTouched ? '✓ Support Not Touched' : 'Support Not Touched'}
            </button>
          </div>

          {/* Analysis Type Filters */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Show:</span>
            <button
              onClick={() => setShowStryke(!showStryke)}
              className={`px-3 py-1 rounded-md text-white transition-colors ${
                showStryke 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-gray-400 hover:bg-gray-500'
              }`}
              title="Toggle STRYKE entries"
            >
              {showStryke ? '✓ STRYKE' : 'STRYKE'}
            </button>
            <button
              onClick={() => setShowAlgo(!showAlgo)}
              className={`px-3 py-1 rounded-md text-white transition-colors ${
                showAlgo 
                  ? 'bg-indigo-600 hover:bg-indigo-700' 
                  : 'bg-gray-400 hover:bg-gray-500'
              }`}
              title="Toggle ALGO entries"
            >
              {showAlgo ? '✓ ALGO' : 'ALGO'}
            </button>
            <button
              onClick={() => setShowFibo(!showFibo)}
              className={`px-3 py-1 rounded-md text-white transition-colors ${
                showFibo 
                  ? 'bg-cyan-600 hover:bg-cyan-700' 
                  : 'bg-gray-400 hover:bg-gray-500'
              }`}
              title="Toggle FIBO entries"
            >
              {showFibo ? '✓ FIBO' : 'FIBO'}
            </button>
          </div>

          {/* Company Search */}
          <div className="flex items-center gap-2">
            <label htmlFor="company-search" className="text-sm font-medium text-gray-700">Search Company:</label>
            <input
              id="company-search"
              type="text"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Enter company name..."
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <span className="text-lg font-bold ml-auto">
            Total Companies: {groupedByUUID.length} | Total Entries: {deepDiveList.length}
            {showStryke && (() => {
              const strykeEntries = deepDiveList.filter(item => item.label === 'STRYKE');
              const strykePassingCount = strykeEntries.filter(item => {
                const dd = item.analysisDeepDive;
                const isOneOne = deepDiveMode === 'RR_1_1';
                const prelude = isOneOne ? dd?.prelude1 : dd?.prelude2;
                const passing = isOneOne ? dd?.passing1 : dd?.passing2;
                return prelude && passing;
              }).length;
              return ` | STRYKE: ${strykePassingCount}/${strykeEntries.length}`;
            })()}
            {showAlgo && (() => {
              const algoEntries = deepDiveList.filter(item => item.label === 'ALGO');
              const algoPassingCount = algoEntries.filter(item => {
                const dd = item.analysisDeepDive;
                const isOneOne = deepDiveMode === 'RR_1_1';
                const prelude = isOneOne ? dd?.prelude1 : dd?.prelude2;
                const passing = isOneOne ? dd?.passing1 : dd?.passing2;
                return prelude && passing;
              }).length;
              return ` | ALGO: ${algoPassingCount}/${algoEntries.length}`;
            })()}
            {showFibo && (() => {
              const fiboEntries = deepDiveList.filter(item => item.label === 'FIBO');
              const fiboPassingCount = fiboEntries.filter(item => {
                const dd = item.analysisDeepDive;
                const isOneOne = deepDiveMode === 'RR_1_1';
                const prelude = isOneOne ? dd?.prelude1 : dd?.prelude2;
                const passing = isOneOne ? dd?.passing1 : dd?.passing2;
                return prelude && passing;
              }).length;
              return ` | FIBO: ${fiboPassingCount}/${fiboEntries.length}`;
            })()}
          </span>
        </div>

        {/* Deep Dive Panel */}
        {deepDiveMode !== 'NONE' && (
          <div className="space-y-4">
            {deepDiveList.length === 0 ? (
              <div className="w-full bg-white border border-gray-300 rounded-md p-4 shadow-sm">
                <div className="text-sm text-gray-500 italic">
                  No Deep Dive candidates found for current filters.
                  {deepDiveData.length === 0 && " Please load data using the 'Load Data' button above."}
                </div>
              </div>
            ) : (
              groupedByUUID.map((group, groupIdx) => (
                <div key={group.uuid} className="w-full bg-white border border-gray-300 rounded-md p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-gray-800">
                        {group.companyName}
                      </h3>
                      <button
                        onClick={() => {
                          const firstEntry = group.entries[0];
                          if (firstEntry?.instrumentKey) {
                            navigateToChart(firstEntry.instrumentKey, '1d');
                          }
                        }}
                        className="p-1.5 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
                        title="View OHLC Chart"
                      >
                        📊
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-auto max-h-[400px]">
                    <table className="table-auto w-full border-collapse border border-gray-300 text-center text-sm">
                      <thead className="sticky top-0 bg-gray-100">
                        <tr>
                          <th className="border border-gray-300 px-3 py-2">Type</th>
                          <th className="border border-gray-300 px-3 py-2">Entry Date</th>
                          <th className="border border-gray-300 px-3 py-2">Entry Price</th>
                          <th className="border border-gray-300 px-3 py-2">Swing Label</th>
                          <th className="border border-gray-300 px-1 py-2">Support (days)</th>
                          <th className="border border-gray-300 px-1 py-2">Resistance (days)</th>
                          <th className="border border-gray-300 px-1 py-2">Max Profit %</th>
                          <th className="border border-gray-300 px-1 py-2">Absolute Profit %</th>
                          <th className="border border-gray-300 px-3 py-2">Prelude</th>
                          <th className="border border-gray-300 px-3 py-2">Passing</th>
                          <th className="border border-gray-300 px-5 py-2">Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.entries.map((item, entryIdx) => {
                          const dd = item.analysisDeepDive;
                          const isOneOne = deepDiveMode === 'RR_1_1';
                          const swingLabel = isOneOne ? dd?.swingLabels1 : dd?.swingLabels2;
                          const prelude = isOneOne ? dd?.prelude1 : dd?.prelude2;
                          const passing = isOneOne ? dd?.passing1 : dd?.passing2;
                          const entryDate = item.entryTime ? new Date(item.entryTime).toLocaleDateString('en-GB') : 'N/A';
                          const entryPrice = item.entryCandleClose ? Number(item.entryCandleClose).toFixed(2) : 'N/A';
                          let analysisComment = isOneOne ? item.analysisDeepDive?.commentsS1 || '' : item.analysisDeepDive?.commentsS2 || '';

                    
                          // New columns data
                          const supportDays = item?.daysTakenForSupportTouch ;
                          const resistanceDays = item.daysTakenForResistanceTouch;
                          const maxProfit = item.maxSwingProfits != null 
                            ? `${Number(item.maxSwingProfits).toFixed(2)}%` 
                            : 'N/A';
                          const absoluteProfit = item.absoluteProfitsPercentage != null 
                            ? `${Number(item.absoluteProfitsPercentage).toFixed(2)}%` 
                            : 'N/A';
                          
                          return (
                            <tr 
                              key={`${item.uuid}-${item.label}-${entryIdx}`} 
                              className={`${
                                editingItem && editingItem.uuid === item.uuid && editingItem.label === item.label
                                  ? 'bg-yellow-100 border-yellow-300 shadow-md' 
                                  : 'hover:bg-gray-50'
                              } transition-colors duration-200`}
                            >
                              <td className="border border-gray-200 px-3 py-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  item.label === 'ALGO' ? 'bg-indigo-100 text-indigo-700' :
                                  item.label === 'STRYKE' ? 'bg-purple-100 text-purple-700' :
                                  'bg-cyan-100 text-cyan-700'
                                }`}>
                                  {item.label}
                                </span>
                              </td>
                              <td className="border border-gray-200 px-3 py-1 text-xs">{entryDate}</td>
                              <td className="border border-gray-200 px-3 py-1 text-xs font-mono">{entryPrice}</td>
                              <td className="border border-gray-200 px-3 py-1 font-mono text-xs">{swingLabel || '—'}</td>
                              <td className="border border-gray-200 px-3 py-1 text-xs">{supportDays}</td>
                              <td className="border border-gray-200 px-3 py-1 text-xs">{resistanceDays}</td>
                              <td className="border border-gray-200 px-3 py-1 text-xs font-mono">{maxProfit}</td>
                              <td className="border border-gray-200 px-3 py-1 text-xs font-mono">{absoluteProfit}</td>
                              <td className="border border-gray-200 px-3 py-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${prelude ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {prelude ? 'Yes' : 'No'}
                                </span>
                              </td>
                              <td className="border border-gray-200 px-3 py-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${passing ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {passing ? 'Yes' : 'No'}
                                </span>
                              </td>
                              <td className="border border-gray-200 px-3 py-1">
                                <button
                                  onClick={() => openCommentModal(item, analysisComment)}
                                  className="w-full text-left px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                                  title="Click to edit comment"
                                >
                                  {analysisComment ? (
                                    <span className="text-gray-800 whitespace-pre-wrap">
                                      {analysisComment}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic">Add comment...</span>
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {deepDiveMode === 'NONE' && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Select a Deep Dive mode to view analysis</p>
          </div>
        )}

        {/* Comment Modal */}
        {commentModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Edit Comment - {commentModal.item?.companyName} {commentModal.item?.entryTime ? new Date(commentModal.item.entryTime).toLocaleDateString('en-GB') : 'N/A'} ({commentModal.item?.label})
                </h3>
                <button
                  onClick={closeCommentModal}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                  disabled={commentModal.isSaving}
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment
                </label>
                <textarea
                  value={commentModal.comment}
                  onChange={(e) => setCommentModal(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Enter your comment here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                  rows={6}
                  disabled={commentModal.isSaving}
                  style={{ whiteSpace: 'pre-wrap' }}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeCommentModal}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  disabled={commentModal.isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={saveComment}
                  disabled={commentModal.isSaving || commentModal.comment === commentModal.originalComment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {commentModal.isSaving && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {commentModal.isSaving ? 'Saving...' : 'Save Comment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}