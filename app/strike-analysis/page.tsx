"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { CallType, Trend, StrikeAnalysisRequest } from '@/components/types/strike-analysis';
import Link from 'next/link';
import StrykeFormPage from './StrykeFormPage';
import StrykeListPage from './StrykeListPage';

// Define the Stryke interface based on the provided model
interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  time: string;
  volume?: number;
}

interface EMADTO {
  ema5: number;
  ema8: number;
  ema13: number;
  ema21: number;
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
  emadto: EMADTO;
  stopLoss: number;
  target: number;
  dipAfterEntry20M: boolean;
  hitStopLoss: boolean;
  hitTarget: boolean;
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
  stockUuid: string; // Add stockUuid property
}

interface StrykeListResponse {
  strykeList: Stryke[];
  statusText: string;
}

export default function StrikeAnalysisPage() {
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [keyMapping, setKeyMapping] = useState<{ [companyName: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedInstrumentKey, setSelectedInstrumentKey] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toLocaleDateString('en-GB').split('/').reverse().join('-') // Format as DD-MM-YYYY
  );
  const [selectedTime, setSelectedTime] = useState<string>('09:15');
  const [callType, setCallType] = useState<CallType>(CallType.INTRADAY);
  const [stopLoss, setStopLoss] = useState<string>('0.00');
  const [target, setTarget] = useState<string>('0.00');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [strykeList, setStrykeList] = useState<Stryke[]>([]);
  const [selectedStryke, setSelectedStryke] = useState<Stryke | null>(null);
  const [showStrykeForm, setShowStrykeForm] = useState(true);
  const [showAllStrykes, setShowAllStrykes] = useState(false);

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

    const stopLossValue = parseFloat(stopLoss);
    const targetValue = parseFloat(target);

    if (isNaN(stopLossValue) || isNaN(targetValue)) {
      toast.error('Stop Loss and Target must be valid numbers');
      return;
    }

    setIsLoading(true);

    const strykeInbound = {
      instrumentKey: selectedInstrumentKey,
      entryDate: selectedDate,
      time: selectedTime,
      callType,
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
      const response = await axios.post('http://localhost:8090/api/stryke/add-stock', strykeInbound);
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
    } catch (error) {
      console.error('Error adding new stock:', error);
      toast.error('Failed to add stock');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all strykes from API
  const fetchStrykes = async () => {
    setIsLoading(true);
    try {
        const response = await axios.get('http://localhost:8090/api/stryke/fetch-all');
        const data: StrykeListResponse = response.data;
        
        setStrykeList(data.strykeList.map((stryke) => ({
            ...stryke,
            stockUuid: stryke.stockUuid, // Add stockUuid key
            entryDate: new Date(stryke.entryTime).toLocaleDateString('en-GB'),
            emadto: {
                ema5: stryke.emadto?.ema5 ?? '-',
                ema8: stryke.emadto?.ema8 ?? '-',
                ema13: stryke.emadto?.ema13 ?? '-',
                ema21: stryke.emadto?.ema21 ?? '-',
            },
            rsi: stryke.rsi ?? '-',
            stopLoss: stryke.stopLoss ?? '-',
            target: stryke.target ?? '-',
            dipAfterEntry20M: stryke.dipAfterEntry20M ?? '-',
            hitStopLoss: stryke.hitStopLoss ?? '-',
            hitTarget: stryke.hitTarget ?? '-',
            peakIn30M: stryke.peakIn30M ?? '-',
            dipIn30M: stryke.dipIn30M ?? '-',
            profit: stryke.profit ?? '-',
            daysTakenToProfit: stryke.daysTakenToProfit ?? '-',
            loss: stryke.loss ?? '-',
            daysTakenToLoss: stryke.daysTakenToLoss ?? '-',
            highestPrice: stryke.highestPrice ?? '-',
            lowestPrice: stryke.lowestPrice ?? '-',
            maxDrawDownPercentage: stryke.maxDrawDownPercentage ?? '-',
            highestPriceTime: stryke.highestPriceTime ?? '-',
            lowestPriceTime: stryke.lowestPriceTime ?? '-',
            remarks: stryke.remarks ?? '-',
        })));

        toast.success(data.statusText || 'Stryke list fetched successfully');
    } catch (error) {
        console.error('Error fetching stryke list:', error);
        toast.error('Failed to fetch stryke list');
    } finally {
        setIsLoading(false);
    }
};

  // Helper functions for conditional rendering
  const getCallTypeClasses = (stryke: Stryke): string => {
    if (stryke?.hitTarget) {
      return 'bg-green-300 text-green-900';
    } else if (stryke?.hitStopLoss) {
      return 'bg-red-300 text-red-900';
    } else {
      return 'bg-gray-300 text-gray-900';
    }
  };

  const getStatusText = (stryke: Stryke): string => {
    if (stryke?.hitTarget) {
      return `Profit: ₹${stryke?.profit.toFixed(2)}`;
    } else if (stryke?.hitStopLoss) {
      return `Loss: ₹${stryke?.loss.toFixed(2)}`;
    } else {
      return 'In progress';
    }
  };

  // Restore state from localStorage
  useEffect(() => {
    // Restore state from localStorage
    const savedShowStrykeForm = localStorage.getItem('showStrykeForm');
    const savedShowAllStrykes = localStorage.getItem('showAllStrykes');

    if (savedShowStrykeForm !== null) {
      setShowStrykeForm(savedShowStrykeForm === 'true');
    }

    if (savedShowAllStrykes !== null) {
      setShowAllStrykes(savedShowAllStrykes === 'true');
      if (savedShowAllStrykes === 'true') {
        fetchStrykes();
      }
    }
  }, []);

  const handleToggleView = (showForm: boolean, showAll: boolean) => {
    setShowStrykeForm(showForm);
    setShowAllStrykes(showAll);

    // Save state to localStorage
    localStorage.setItem('showStrykeForm', showForm.toString());
    localStorage.setItem('showAllStrykes', showAll.toString());
  };

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

  const deleteStryke = async (stockUuid: string) => {
    try {
      
        await axios.get(`http://localhost:8090/api/stryke/delete-stryke/${stockUuid}`);
        setStrykeList((prevList) => prevList.filter((stryke) => stryke.stockUuid !== stockUuid));
        toast.success('Stryke analysis deleted successfully');
    } catch (error) {
        console.error('Error deleting stryke analysis:', error);
        toast.error('Failed to delete stryke analysis');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4">
      <Toaster position="top-right" />

    
      {!isLoading && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Stryke Analysis</h1>
            </div>
            <div className="flex gap-2">
              {(showStrykeForm && !showAllStrykes) ? (
                <Button
                  onClick={() => {
                    handleToggleView(false, true);
                    fetchStrykes();
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                >
                  Fetch All Stryke Analysis
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    handleToggleView(true, false);
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                >
                  Show Stryke Form
                </Button>
              )}
              <Button
                onClick={() => {
                  fetchStrykes();
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md transition"
              >
                Refresh List
              </Button>
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
                              key={`${name}-${index}`}
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
                  <div className="grid grid-cols-2 gap-4">
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

                  {/* Stop Loss & Target */}
                  <div className="grid grid-cols-2 gap-4">
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
                    className={`w-full text-white ${
                      selectedCompany && selectedInstrumentKey && selectedDate && selectedTime && stopLoss && target
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                    disabled={
                      isLoading ||
                      !selectedCompany ||
                      !selectedInstrumentKey ||
                      !selectedDate ||
                      !selectedTime ||
                      !stopLoss ||
                      !target
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
                      <span>₹{analysisResult.entryPrice?.toFixed(2) || 'N/A'}</span>
                    </div>

                    <div className="flex justify-between items-center pb-1 border-b">
                      <span className="font-medium">Stop Loss:</span>
                      <span>₹{analysisResult.stopLoss?.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center pb-1 border-b">
                      <span className="font-medium">Target:</span>
                      <span>₹{analysisResult.target?.toFixed(2)}</span>
                    </div>

                    <div className="mt-2 p-3 bg-gray-100 rounded-md">
                      <h3 className="font-medium mb-2">Analysis Message:</h3>
                      <p className="text-gray-700">{analysisResult.message || 'No additional information available.'}</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
          )}

          {showAllStrykes && (
            <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] border rounded-lg overflow-hidden">
              {/* Left Sidebar - Stryke List (WhatsApp-like) */}
              <div className="w-full md:w-1/3 border-r bg-indigo-50 overflow-y-auto">
                <div className="p-3 bg-indigo-100 border-b sticky top-0 z-10">
                  <Input
                    type="text"
                    placeholder="Search strykes..."
                    className="w-full bg-white"
                    onChange={(e) => {
                      const query = e.target.value.toLowerCase();
                      // Filter strykes (would implement if needed)
                    }}
                  />
                </div>
                
                {strykeList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <p className="text-center">No stryke analyses available</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {strykeList.map((stryke, index) => (
                      <button 
                        key={`${stryke?.id}-${index}`} 
                        className={`w-full text-left p-3 hover:bg-teal-100 cursor-pointer transition-colors ${selectedStryke?.id === stryke?.id ? 'bg-teal-50 border-l-4 border-teal-500' : ''}`}
                        onClick={() => setSelectedStryke(stryke)}
                        aria-pressed={selectedStryke?.id === stryke?.id}
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-gray-800">{stryke?.companyName}</h3>
                          <span className="text-xs text-gray-500">
                             <span>{`${stryke?.entryTime}`}</span>
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteStryke(stryke.stockUuid);
                            }}
                            className="text-red-500 hover:text-red-700 ml-2"
                            aria-label="Delete Stryke"
                          >
                            🗑️
                          </button>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            stryke?.hitTarget 
                              ? 'bg-green-200 text-green-800' 
                              : stryke?.hitStopLoss 
                                ? 'bg-red-200 text-red-800' 
                                : 'bg-gray-200 text-gray-800'
                          }`}>
                            {stryke?.callType}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            stryke?.postEntryTrend === 'BULLISH' 
                              ? 'bg-green-200 text-green-800' 
                              : stryke?.postEntryTrend === 'BEARISH' 
                                ? 'bg-yellow-300 text-yellow-800' 
                                : 'bg-yellow-300 text-yellow-800'
                          }`}>
                            {stryke?.postEntryTrend}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1 truncate">
                          {stryke?.hitTarget 
                            ? `Profit: ₹${stryke?.profit.toFixed(2)}` 
                            : stryke?.hitStopLoss 
                              ? `Loss: ₹${stryke?.loss.toFixed(2)}` 
                              : 'In progress'
                          }
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Content - Stryke Details */}
              <div className="w-full md:w-2/3 overflow-y-auto">
                {selectedStryke ? (
                  <div className="p-4 bg-teal-50">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b">
                      <h2 className="text-xl font-bold text-gray-800">{selectedStryke?.companyName}</h2>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 text-sm rounded-md ${selectedStryke?.preEntryTrend === 'BULLISH' ? 'bg-green-200 text-green-800' : selectedStryke?.preEntryTrend === 'BEARISH' ? 'bg-yellow-300 text-yellow-800' : 'bg-yellow-300 text-yellow-800'}`}>
                          Pre Trend: {selectedStryke?.preEntryTrend}
                        </span>
                        <span className={`px-2 py-1 text-sm rounded-md ${selectedStryke?.postEntryTrend === 'BULLISH' ? 'bg-green-200 text-green-800' : selectedStryke?.postEntryTrend === 'BEARISH' ? 'bg-yellow-300 text-yellow-800' : 'bg-yellow-300 text-yellow-800'}`}>
                          Post Trend: {selectedStryke?.postEntryTrend}
                        </span>
                        <span className="px-2 py-1 text-sm bg-gray-200 rounded-md">
                          {selectedStryke?.callType}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Entry Date & Time</h3>
                          <span>{`${selectedStryke?.entryTime}`}</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Instrument Key</h3>
                          <p className="font-mono text-sm text-gray-800">{selectedStryke?.instrumentKey}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">RSI</h3>
                          <p>{selectedStryke?.rsi?.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Stop Loss & Target</h3>
                          <p>SL: ₹{selectedStryke?.stopLoss?.toFixed(2)} | Target: ₹{selectedStryke?.target?.toFixed(2)}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Status</h3>
                          <div className="flex gap-2">
                            {selectedStryke?.hitTarget && (
                              <span className="px-2 py-0.5 text-sm bg-green-200 text-green-800 rounded">Target Hit</span>
                            )}
                            {selectedStryke?.hitStopLoss && (
                              <span className="px-2 py-0.5 text-sm bg-red-200 text-red-800 rounded">Stop Loss Hit</span>
                            )}
                            {!selectedStryke?.hitTarget && !selectedStryke?.hitStopLoss && (
                              <span className="px-2 py-0.5 text-sm bg-yellow-200 text-yellow-800 rounded">In Progress</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Peak & Dip (30m)</h3>
                          <p>
                            Highest Price: ₹{selectedStryke.highestPrice?.toFixed(2)}
                            <span className="block text-xs text-gray-500 mt-1">
                              Time Taken: {calculateTimeDifference(selectedStryke.entryTime, selectedStryke.highestPriceTime)} minutes
                            </span>
                          </p>
                          <p>
                            Lowest Price: ₹{selectedStryke.lowestPrice?.toFixed(2)}
                            <span className="block text-xs text-gray-500 mt-1">
                              Time Taken: {calculateTimeDifference(selectedStryke.entryTime, selectedStryke.lowestPriceTime)} minutes
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {(selectedStryke.profit > 0 || selectedStryke.loss > 0) && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          {selectedStryke.profit > 0 ? 'Profit Details' : 'Loss Details'}
                        </h3>
                        <div className="bg-teal-100 p-3 rounded">
                          {selectedStryke.profit > 0 ? (
                            <div className="flex justify-between">
                              <span>Profit: <span className="text-green-600 font-medium">₹{selectedStryke?.profit?.toFixed(2)}</span></span>
                              <span>Days to Profit: {selectedStryke?.daysTakenToProfit}</span>
                            </div>
                          ) : (
                            <div className="flex justify-between">
                              <span>Loss: <span className="text-red-600 font-medium">₹{selectedStryke?.loss?.toFixed(2)}</span></span>
                              <span>Days to Loss: {selectedStryke?.daysTakenToLoss}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Price Extremes</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-teal-100 p-3 rounded">
                          <span className="block text-gray-500">Highest Price</span>
                          <span className="font-medium">₹{selectedStryke?.highestPrice?.toFixed(2)}</span>
                          <span className="block text-xs text-gray-500 mt-1">
                            {new Date(selectedStryke?.highestPriceTime).toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-teal-100 p-3 rounded">
                          <span className="block text-gray-500">Lowest Price</span>
                          <span className="font-medium">₹{selectedStryke?.lowestPrice?.toFixed(2)}</span>
                          <span className="block text-xs text-gray-500 mt-1">
                            {new Date(selectedStryke?.lowestPriceTime).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedStryke?.remarks && (
                      <div className="mt-4 p-3 bg-teal-100 rounded-md">
                        <h3 className="font-medium mb-2">Remarks:</h3>
                        <p className="text-gray-700">{selectedStryke?.remarks}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p>Select a stryke from the list to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
