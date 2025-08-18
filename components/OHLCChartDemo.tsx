"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { OHLCChart } from './OHLCChart';
import { BoomDaysTable } from './BoomDaysTable';
import { Candle } from './types/candle';
import { calculateIndicators } from './utils/indicators';
import { BackTest } from './types/backtest';

export const OHLCChartDemo: React.FC = () => {
  const [candles, setCandles] = useState<Candle[]>([]);
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
  const [showEMA, setShowEMA] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showVIX, setShowVIX] = useState(false);
  const [showSwingPoints, setShowSwingPoints] = useState(false);

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
  const handleSelectCompany = (companyName: string) => {
    setSelectedCompany(companyName);
    setSelectedInstrumentKey(keyMapping[companyName]);
    setSearchTerm(companyName);
    setSuggestions([]);

    // We preserve the current view (either chart view or boom days) when selecting a new company
  };

  // Fetch candles for selected company/instrument
  const handleFetchData = () => {
    if (!selectedCompany || !selectedInstrumentKey) return;
    setIsLoading(true);
    const formattedInstrumentKey = selectedInstrumentKey.replace(/\|/g, '-');
    const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const url = `${backEndBaseUrl}/api/chart-historical-data/get-candles/${selectedCompany}/${formattedInstrumentKey}`;
    axios.get(url)
      .then(res => {
        const candlesData = res.data.historicalDataLocal.candles;
        const analysisData = res.data.historicalDataLocal.analysisList || [];
        const supportData = res.data.historicalDataLocal.support || null;
        const resistanceData = res.data.historicalDataLocal.resistance || null;
        const boomDays = res.data.historicalDataLocal.backTestDataList || [];
        const avgVolume = res.data.historicalDataLocal.avgVolume || 0;

        // Calculate EMA and RSI indicators before setting the candles
        const candlesWithIndicators = calculateIndicators(candlesData, 200, 14);
        setCandles(candlesWithIndicators);
        setAnalysisList(analysisData);
        setBoomDaysData(boomDays);
        
        // Set hasBoomDaysData based on whether we have boom days data
        const hasBoomDaysDataValue = boomDays && boomDays.length > 0;
        setHasBoomDaysData(hasBoomDaysDataValue);
        setAvgVolume(avgVolume);
        
        // If this is the first load of the application and we have no view preference yet
        if (isFirstLoad) {
          setShowBoomDays(false);
          setIsFirstLoad(false);
        } 
        // If we're showing boom days but new data has no boom days, switch to chart view
        else if (showBoomDays && !hasBoomDaysDataValue) {
          setShowBoomDays(false);
          // No toast message - just switch to chart view silently
        }
        // Otherwise preserve the current view

        // Extract support and resistance values
        // Check if the data structure is as expected (either an array or an object with value)
        if (Array.isArray(supportData) && supportData.length > 0) {
          // If it's an array, use the first item
          setSupport({ value: supportData[0] });
        } else if (supportData && typeof supportData === 'object' && 'value' in supportData) {
          // If it's an object with a value property
          setSupport(supportData);
        } else if (typeof supportData === 'number') {
          // If it's a direct number
          setSupport({ value: supportData });
        } else {
          setSupport(null);
        }

        // Same logic for resistance
        if (Array.isArray(resistanceData) && resistanceData.length > 0) {
          setResistance({ value: resistanceData[0] });
        } else if (resistanceData && typeof resistanceData === 'object' && 'value' in resistanceData) {
          setResistance(resistanceData);
        } else if (typeof resistanceData === 'number') {
          setResistance({ value: resistanceData });
        } else {
          setResistance(null);
        }

        setVixData([]);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        setIsLoading(false);
        toast.error('Failed to fetch data');
      });
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
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
          >
            Load Data
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

          {/* Stats button - always visible */}
          <a
            href="/backtest-stats"
            className="px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            Overall Stats
          </a>

          {/* <div className="flex gap-2 bg-white bg-opacity-90 p-2 rounded-lg border border-gray-300 shadow-sm">
            <label className="flex items-center gap-1 text-sm font-semibold">
              <input
                type="checkbox"
                checked={showEMA}
                onChange={e => setShowEMA(e.target.checked)}
              />
              EMA (200)
            </label>
            <label className="flex items-center gap-1 text-sm font-semibold">
              <input
                type="checkbox"
                checked={showRSI}
                onChange={e => setShowRSI(e.target.checked)}
              />
              RSI (14)
            </label>
            <label className="flex items-center gap-1 text-sm font-semibold">
              <input
                type="checkbox"
                checked={showVIX}
                onChange={e => {
                  if (e.target.checked && (!vixData || vixData.length === 0)) {
                    toast.error('Insufficient VIX data available', { duration: 4000 });
                    setShowVIX(false);
                  } else {
                    setShowVIX(e.target.checked);
                  }
                }}
              />
              VIX
            </label>
            <label className="flex items-center gap-1 text-sm font-semibold">
              <input
                type="checkbox"
                checked={showSwingPoints}
                onChange={e => setShowSwingPoints(e.target.checked)}
              />
              SWING
            </label>
          </div> */}
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
            <OHLCChart
              candles={candles}
              vixData={vixData}
              title="OHLC Chart"
              height={500}
              showVolume={true}
              showEMA={showEMA}
              showRSI={showRSI}
              showVIX={showVIX}
              showSwingPoints={showSwingPoints}
              analysisList={analysisList}
              supportLevel={support?.value}
              resistanceLevel={resistance?.value}
              avgVolume={avgVolume}
            />
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
    </div>
  );
};