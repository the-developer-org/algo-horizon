"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { OHLCChart } from './OHLCChart';
import { Candle } from './types/candle';
import { calculateIndicators } from './utils/indicators';

export const OHLCChartDemo: React.FC = () => {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [vixData, setVixData] = useState<{ timestamp: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [keyMapping, setKeyMapping] = useState<{ [companyName: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedInstrumentKey, setSelectedInstrumentKey] = useState<string>('');
  
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
  };

  // Fetch candles for selected company/instrument
  const handleFetchData = () => {
    if (!selectedCompany || !selectedInstrumentKey) return;
    setIsLoading(true);
    const formattedInstrumentKey = selectedInstrumentKey.replace(/\|/g, '-');
    const url = `http://localhost:8090/api/local-historical-data/get-candles/${selectedCompany}/${formattedInstrumentKey}`;
    axios.get(url)
      .then(res => {
        const candlesData = res.data.historicalDataLocal.candles;
        // Calculate EMA and RSI indicators before setting the candles
        const candlesWithIndicators = calculateIndicators(candlesData, 200, 14);
        setCandles(candlesWithIndicators);
        setVixData([]);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
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
      <div className="mb-4 flex flex-col items-center">
        {/* Centered title */}
        <div className="flex justify-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">OHLC Chart Demo</h1>
        </div>
        
        {/* Indicator toggles in separate div */}
        <div className="flex justify-center mb-4">
          <div className="flex gap-4 bg-white bg-opacity-90 p-3 rounded-lg border-2 border-gray-300 shadow-md">
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
          </div>
        </div>
        <div className="w-full max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setSelectedCompany('');
              setSelectedInstrumentKey('');
            }}
            placeholder="Search for a company..."
            className="p-2 border border-gray-300 rounded-md w-full"
          />
          {/* Only show suggestions if not selected */}
          {suggestions.length > 0 && !selectedCompany && (
            <ul className="mt-2 border border-gray-300 rounded-md max-h-60 overflow-auto">
              {suggestions.map((name) => (
                <li
                  key={name}
                  onClick={() => handleSelectCompany(name)}
                  className="p-2 cursor-pointer hover:bg-gray-100"
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={handleFetchData}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md"
        >
          Load Data
        </button>
      </div>
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
      />
    </div>
  );
};