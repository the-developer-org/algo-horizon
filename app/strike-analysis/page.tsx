"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { CallType } from '@/components/types/strike-analysis';
import Link from 'next/link';
import { debug } from 'console';

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
  stockUuid: string;
  lastClosingValue: number;
  dayStatsMap: { [key: string]: DayStats };
  lastClosingValueDate: string;

}

interface DayStats {
  peak: number;
  dip: number;
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
  const [analysisResult, setAnalysisResult] = useState<Stryke | null>(null);
  const [strykeList, setStrykeList] = useState<Stryke[]>([]);
  const [filteredStrykeList, setFilteredStrykeList] = useState<Stryke[]>([]);
  const [selectedStryke, setSelectedStryke] = useState<Stryke | null>(null);
  const [showStrykeForm, setShowStrykeForm] = useState(() => true);
  const [showAllStrykes, setShowAllStrykes] = useState(() => false);
  const [showStrykeStats, setShowStrykeStats] = useState(() => false);


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
      fetchStrykes();
    } catch (error) {
      console.error('Error recalculating stryke analysis:', error);
      toast.error('Failed to recalculate stryke analysis');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all strykes from API
  const fetchStrykes = async () => {
    setIsLoading(true);
    try {
      const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${backEndBaseUrl}/api/stryke/fetch-all`, {
        headers: {
          'accept': 'application/json',
        },
      });
      const data: StrykeListResponse = await response.json();
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

      // Set the filtered list to initially show all strykes
      setFilteredStrykeList(data.strykeList);

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

  const getTrendClass = (trend: string) => {
    if (trend === 'BULLISH') return 'text-green-600';
    if (trend === 'BEARISH') return 'text-red-600';
    return 'text-orange-600';
  };

  const getStatusClass = (status: string) => {
    if (status === 'Closed') return 'text-green-600';
    if (status === 'In Progress') return 'text-orange-600';
    return 'text-red-600';
  };

  useEffect(() => {
    if (showAllStrykes && strykeList.length === 0) {
      fetchStrykes();
    }
  }, [showAllStrykes]);

  const handleToggleView = (showForm: boolean, showAll: boolean, showStats: boolean) => {
    setShowStrykeForm(showForm);
    setShowAllStrykes(showAll);
    setShowStrykeStats(showStats);
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
      const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      await axios.get(`${backEndBaseUrl}/api/stryke/delete-stryke/${stockUuid}`, {
        headers: {
          'accept': 'application/json',
        },
      });
      setStrykeList((prevList) => prevList.filter((stryke) => stryke.stockUuid !== stockUuid));
      toast.success('Stryke analysis deleted successfully');
    } catch (error) {
      console.error('Error deleting stryke analysis:', error);
      toast.error('Failed to delete stryke analysis');
    }
  };

  function calculatePercentageDifference(baseValue: number, comparer: number): number {
    return parseFloat(((comparer - baseValue) / baseValue * 100).toFixed(2));
  }

  // Format date from 'Fri Aug 01 00:00:00 IST 2025' to 'dd-mm-yyyy'
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const shouldShowEarlyProfits = (stryke: Stryke): boolean => {

    const peakPerc: number = calculatePercentageDifference(stryke?.entryCandle.close, stryke?.highestPrice);
    if( peakPerc === 0) return false;
    const dipPerc : number = calculatePercentageDifference(stryke?.entryCandle.close, stryke?.lowestPrice);
    if ((stryke.lowestPriceTime < stryke.highestPriceTime) && dipPerc < 1) {
      return true;
    }

    return stryke.highestPriceTime < stryke.lowestPriceTime;
  }
  const refreshStrykeData = async (stockUuid: string) => {
    try {
      setIsLoading(true);
      const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      await axios.get(`${backEndBaseUrl}/api/stryke/recalculate/${stockUuid}`, {
        headers: {
          'accept': 'application/json',
        },
      });
      fetchStrykes();
      toast.success('Stryke data recalculated successfully');
    } catch (error) {
      console.error('Error recalculating stryke data:', error);
      toast.error('Failed to recalculate stryke data');
    } finally {
      setIsLoading(false);
    }
  };

  // Define the handleRowClick function to fix the error
  function handleRowClick(stryke: Stryke) {
    setSelectedStryke(stryke);

    // Ensure the selected row is scrolled into view on mobile
    const rowElement = document.getElementById(`stryke-row-${stryke.id}`);
    if (rowElement) {
      rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 bg-cream">
      <Toaster position="top-right" />


      {!isLoading && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Stryke Analysis</h1>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
              {(!showStrykeForm) && (
                <Button
                  onClick={() => handleToggleView(true, false, false)}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                >
                  Show Stryke Form
                </Button>
              )}

              {(!showAllStrykes) && (
                <Button
                  onClick={() => {
                    handleToggleView(false, true, false);
                    fetchStrykes();
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                >
                  Fetch All Stryke Analysis
                </Button>
              )}

              {(showAllStrykes || showStrykeStats) && (
                <Button
                  onClick={() => fetchStrykes()}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                >
                  Refresh List
                </Button>
              )}

              {!showStrykeStats && (
                <Button
                  onClick={() => {
                    handleToggleView(false, false, true);
                    fetchStrykes();
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 text-sm rounded-md transition"
                >
                  Show Stryke Stats
                </Button>
              )}

              {showAllStrykes && (
                <Button
                  onClick={async () => {
                    setIsLoading(true);
                    await recalculateStrykeAnalysis();
                    setIsLoading(false);
                  }}
                  className={`bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md transition ${isLoading ? 'bg-gray-400 cursor-not-allowed' : ''}`}
                  disabled={isLoading}
                >
                  Recalculate
                </Button>
              )}
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
                      className={`w-full text-white ${selectedCompany && selectedInstrumentKey && selectedDate && selectedTime && stopLoss && target
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

          {showAllStrykes && (
            <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-120px)] border rounded-lg overflow-hidden w-full md:w-[calc(100vw-350px)] mx-auto">
              {/* Left Sidebar - Stryke List */}
              <div className="w-full md:w-1/3 border-r bg-indigo-50 overflow-y-auto">
                <div className="p-3 bg-indigo-100 border-b sticky top-0 z-10 flex flex-col md:flex-row items-start md:items-center gap-4">
                  <Input
                    type="text"
                    placeholder="Search strykes..."
                    className="w-full md:w-1/2 bg-white"
                    onChange={(e) => {
                      const query = e.target.value.toLowerCase();
                      setFilteredStrykeList(
                        strykeList.filter((stryke) =>
                          stryke.companyName.toLowerCase().includes(query)
                        )
                      );
                    }}
                  />
                  <select
                    className="bg-white border rounded-md px-2 py-1 w-full md:w-auto"
                    onChange={(e) => {
                      const sortOption = e.target.value;
                      if (sortOption === "date") {
                        setFilteredStrykeList(
                          [...filteredStrykeList].sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime())
                        );
                      } else if (sortOption === "name") {
                        setFilteredStrykeList(
                          [...filteredStrykeList].sort((a, b) => a.companyName.localeCompare(b.companyName))
                        );
                      }
                    }}
                  >
                    <option value="">Sort By</option>
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                  </select>
                  <select
                    className="bg-white border rounded-md px-2 py-1 w-full md:w-auto"
                    onChange={(e) => {
                      const selectedMonth = e.target.value;
                      if (selectedMonth) {
                        setFilteredStrykeList(
                          strykeList.filter((stryke) => {
                            const monthYear = new Date(stryke.entryTime).toLocaleString("default", { month: "long", year: "numeric" });
                            return monthYear === selectedMonth;
                          })
                        );
                      } else {
                        setFilteredStrykeList(strykeList);
                      }
                    }}
                  >
                    <option value="">All Months</option>
                    {[...new Set(
                      strykeList.map((stryke) =>
                        new Date(stryke.entryTime).toLocaleString("default", { month: "long", year: "numeric" })
                      )
                    )]
                      .sort((a, b) => new Date(`1 ${a}`).getTime() - new Date(`1 ${b}`).getTime())
                      .map((monthYear) => (
                        <option key={monthYear} value={monthYear}>
                          {monthYear}
                        </option>
                      ))}
                  </select>
                  <span className="text-lg font-bold">Count: {filteredStrykeList.length}</span>
                </div>

                {filteredStrykeList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <p className="text-center">No stryke analyses available</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredStrykeList.map((stryke) => (
                      <button
                        key={stryke.id}
                        id={`stryke-row-${stryke.id}`}
                        className={`w-full text-left p-3 hover:bg-teal-100 cursor-pointer transition-colors ${selectedStryke?.id === stryke?.id ? 'bg-teal-50 border-l-4 border-teal-500' : ''}`}
                        onClick={() => handleRowClick(stryke)}
                        aria-pressed={selectedStryke?.id === stryke?.id}
                      >
                        <div className="flex justify-between items-start">
                          <h5 className="font-bold text-gray-800 bg-gradient-to-r from-teal-400 via-blue-500 to-purple-600 text-transparent bg-clip-text">{stryke?.companyName}</h5>
                          <div className="flex gap-2">
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                refreshStrykeData(stryke.stockUuid);
                              }}
                              className="text-blue-500 hover:text-blue-700 ml-2"
                              aria-label="Refresh Stryke"
                            >
                              🔄
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <span className={`text-sm px-3 py-1 rounded-md ${stryke?.hitTarget
                            ? 'bg-green-200 text-green-800'
                            : stryke?.hitStopLoss
                              ? 'bg-red-300 text-red-800'
                              : 'bg-yellow-300 text-yellow-800'
                            }`}>
                            {stryke?.hitTarget
                              ? `IN PROFITS`
                              : stryke?.hitStopLoss
                                ? `IN LOSS`
                                : 'IN PROGRESS'
                            }
                          </span>

                        </div>

                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Content - Stryke Details */}
              <div className="w-full md:w-2/3 overflow-y-auto">
                {selectedStryke ? (
                  <div className="p-6 bg-teal-50 rounded-lg shadow-md">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b">
                      <h2 className="text-2xl font-bold text-gray-800 bg-gradient-to-r from-teal-400 via-blue-500 to-purple-600 text-transparent bg-clip-text">{selectedStryke?.companyName}</h2>
                      <h2 className="text-left text-xl font-semibold text-gray-800 bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-600 text-transparent bg-clip-text">Listed {Math.max(calculateTimeDifference(selectedStryke?.entryTime, new Date().toDateString()) / (60 * 24), 0).toFixed(0)} days ago</h2>
                      <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
                        <span
                          className={`px-3 py-1 text-sm rounded-md ${selectedStryke?.preEntryTrend === 'BULLISH' ? 'bg-green-200 text-green-800' : selectedStryke?.preEntryTrend === 'BEARISH' ? 'bg-red-300 text-red-800' : 'bg-yellow-300 text-yellow-800'}`}
                        >
                          Pre Trend: {selectedStryke?.preEntryTrend}
                        </span>
                        <span
                          className={`px-3 py-1 text-sm rounded-md ${selectedStryke?.postEntryTrend === 'BULLISH' ? 'bg-green-200 text-green-800' : selectedStryke?.postEntryTrend === 'BEARISH' ? 'bg-red-300 text-red-800' : 'bg-yellow-300 text-yellow-800'}`}
                        >
                          Post Trend: {selectedStryke?.postEntryTrend}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Group 1: Profit Details */}
                      {(selectedStryke.profit > 0 || selectedStryke.loss < 0) && (
                        <div className="mb-6">
                          <h3 className="text-sm font-medium text-gray-500 mb-2">
                            {selectedStryke.profit > 0 ? 'Profit Details' : 'Loss Details'}
                          </h3>
                          <div className="bg-teal-100 p-4 rounded">
                            {selectedStryke.profit > 0 && (
                              <div className="flex justify-between">
                                <span>
                                  Profit: <span className="text-green-600 font-medium">₹{selectedStryke?.profit?.toFixed(2)} ({calculatePercentageDifference(selectedStryke?.entryCandle.close, (selectedStryke?.entryCandle.close + selectedStryke?.profit))}%)</span>
                                </span>
                                <span>Days to Profit: {selectedStryke?.daysTakenToProfit}</span>
                              </div>
                            )}
                            {selectedStryke.loss < 0 && (
                              <div className="flex justify-between">
                                <span>
                                  Loss: <span className="text-red-600 font-medium">₹{selectedStryke?.loss?.toFixed(2)} ({calculatePercentageDifference(selectedStryke?.entryCandle.close, (selectedStryke?.entryCandle.close - selectedStryke?.loss))}%)</span>
                                </span>
                                <span>Days to Loss: {selectedStryke?.daysTakenToLoss}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                       {shouldShowEarlyProfits(selectedStryke) &&(
                        <div className="mb-6">
                          <h3 className="text-sm font-medium text-gray-500 mb-2">
                            Minimum Profit Details
                          </h3>
                          <div className="bg-teal-100 p-4 rounded">
                            { (
                              <div className="flex justify-between">
                                <span>
                                  Earliest Profit: <span className="text-green-600 font-medium">₹{((selectedStryke.highestPrice - selectedStryke.entryCandle.close).toFixed(2))} ({((selectedStryke.highestPrice - selectedStryke.entryCandle.close) / selectedStryke.entryCandle.close * 100).toFixed(2)}%) in {(calculateTimeDifference(selectedStryke?.entryTime, selectedStryke?.highestPriceTime) / (60 * 24)).toFixed(2)} Days</span>
                                </span>
                                <span>If invested 1,00,000 then it would be  <span className="text-green-600 font-medium">₹{((100000 / selectedStryke.entryCandle.close) * selectedStryke.highestPrice).toFixed(2)}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Group 2: Entry Details */}
                      <div className="space-y-4 bg-gray-100 p-4 rounded-md">
                        <h3 className="text-lg font-medium text-gray-700">Entry Details</h3>
                        {[
                          { label: "Entry Date & Time", value: selectedStryke?.entryTime },
                          { label: "Entry Time Zone", value: selectedStryke?.entryTimeZone },
                          { label: "Entry Taken At", value: `₹ ${selectedStryke?.entryCandle.close?.toFixed(2)}` },
                        ].map((item, index) => (
                          <div key={index} className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-sm font-medium text-gray-600">{item.label}</h3>
                            <span className="text-base font-semibold text-gray-700">{item.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Group 3: Performance Metrics */}
                      <div className="space-y-4 bg-sky-100 p-4 rounded-md">
                        <h3 className="text-lg font-medium text-gray-700">Performance Metrics</h3>
                        {[
                          { label: "Status", value: selectedStryke?.hitTarget ? "Closed" : selectedStryke?.hitStopLoss ? "Closed" : "In Progress", textColor: selectedStryke?.hitTarget ? "text-green-600" : selectedStryke?.hitStopLoss ? "text-red-600" : "text-orange-600" },
                          { label: "Last Closing Value", value: `₹${selectedStryke?.lastClosingValue?.toFixed(2)} (${calculatePercentageDifference(selectedStryke?.entryCandle.close, selectedStryke?.lastClosingValue)}%)` },
                          { label: "Last Closing Value Date", value: formatDate(selectedStryke?.lastClosingValueDate) },
                          { label: "Volume", value: selectedStryke?.entryCandle.volume ?
                              selectedStryke.entryCandle.volume >= 1000000 ? `${(selectedStryke.entryCandle.volume / 1000000).toFixed(2)}M` :
                                selectedStryke.entryCandle.volume >= 1000 ? `${(selectedStryke.entryCandle.volume / 1000).toFixed(2)}K` :
                                  selectedStryke.entryCandle.volume : 'N/A' },
                          { label: "Peak in 30 Minutes", value: selectedStryke?.peakIn30M === selectedStryke?.entryCandle.close ? "No Change" : `₹${selectedStryke?.peakIn30M?.toFixed(2)} (${calculatePercentageDifference(selectedStryke?.entryCandle.close, selectedStryke?.peakIn30M)}%)` },
                          { label: "Dip in 30 Minutes", value: selectedStryke?.dipIn30M === selectedStryke?.entryCandle.close ? "No Change" : `₹${selectedStryke?.dipIn30M?.toFixed(2)} (${calculatePercentageDifference(selectedStryke?.entryCandle.close, selectedStryke?.dipIn30M)}%)` },
                        ].map((item, index) => (
                          <div key={index} className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-sm font-medium text-gray-600">{item.label}</h3>
                            <span className="text-base font-semibold text-gray-700">{item.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Group 4: Target Details */}
                      <div className="space-y-4 bg-pink-50 p-4 rounded-md">
                        <h3 className="text-lg font-medium text-gray-700">Target Details</h3>
                        {[
                          { label: "Stop Loss", value: `₹${selectedStryke?.stopLoss?.toFixed(2)} (${calculatePercentageDifference(selectedStryke?.entryCandle.close, selectedStryke?.stopLoss)}%)` },
                          { label: "Target", value: `₹${selectedStryke?.target?.toFixed(2)} (${calculatePercentageDifference(selectedStryke?.entryCandle.close, selectedStryke?.target)}%)` },
                          { label: "Peak Price", value: selectedStryke?.highestPrice === selectedStryke?.entryCandle.close ? "No Change" : `₹${selectedStryke?.highestPrice?.toFixed(2)} (${calculatePercentageDifference(selectedStryke?.entryCandle.close, selectedStryke?.highestPrice)}%)` },
                          { label: "Time Taken (Peak)", value: selectedStryke?.highestPrice > selectedStryke?.entryCandle.close ? `${(calculateTimeDifference(selectedStryke?.entryTime, selectedStryke?.highestPriceTime) / (60 * 24)).toFixed(2)} Days` : "N/A" },
                          { label: "Dip Price", value: selectedStryke?.lowestPrice === selectedStryke?.entryCandle.close ? "No Change" : `₹${selectedStryke?.lowestPrice?.toFixed(2)} (${calculatePercentageDifference(selectedStryke?.entryCandle.close, selectedStryke?.lowestPrice)}%)` },
                          { label: "Time Taken (Dip)", value: selectedStryke?.lowestPrice < selectedStryke?.entryCandle.close ? `${(calculateTimeDifference(selectedStryke?.entryTime, selectedStryke?.lowestPriceTime) / (60 * 24)).toFixed(2)} Days` : "N/A" },
                        ].map((item, index) => (
                          <div key={index} className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-sm font-medium text-gray-600">{item.label}</h3>
                            <span className="text-base font-semibold text-gray-700">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>



                    {selectedStryke?.remarks && (
                      <div className="mt-6 p-4 bg-teal-100 rounded-md">
                        <h3 className="font-medium mb-3">Remarks:</h3>
                        <p className="text-gray-700">{selectedStryke?.remarks}</p>
                      </div>
                    )}

                    {/* Day Stats Table */}
                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-gray-700 mb-4">Day Stats</h3>
                      <div className="overflow-x-auto">
                        <table className="table-auto w-full border-collapse border border-gray-300 text-center">
                          <thead>
                            <tr className="bg-gray-200">
                              <th className="border border-gray-300 px-4 py-2">Date</th>
                              <th className="border border-gray-300 px-4 py-2">Peak</th>
                              <th className="border border-gray-300 px-4 py-2">Dip</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(selectedStryke?.dayStatsMap || {})
                              .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                              .map(([date, stats]) => (
                                <tr key={date} className="hover:bg-gray-100">
                                  <td className="border border-gray-300 px-4 py-2 text-center align-middle">{new Date(date).toLocaleDateString()}</td>
                                  <td className="border border-gray-300 px-4 py-2 text-center align-middle">₹{stats.peak.toFixed(2)}</td>
                                  <td className="border border-gray-300 px-4 py-2 text-center align-middle">₹{stats.dip.toFixed(2)}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
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





          {/* Add a new stats page */}
          {showStrykeStats && (
            <div className="container mx-auto py-4 px-4">
              <h2 className="text-xl font-bold mb-4">Stryke Stats</h2>

              {/* Search, Sort, and Filter Controls */}
              <div className="flex gap-2 items-center mb-4">
                <input
                  type="text"
                  placeholder="Search by name..."
                  className="border border-gray-300 rounded-md px-2 py-1"
                  onChange={(e) => {
                    const query = e.target.value.toLowerCase();
                    setFilteredStrykeList(
                      strykeList.filter((stryke) =>
                        stryke.companyName.toLowerCase().includes(query)
                      )
                    );
                  }}
                />
                <select
                  className="border border-gray-300 rounded-md px-2 py-1"
                  onChange={(e) => {
                    const sortOption = e.target.value;
                    if (sortOption === "date") {
                      setFilteredStrykeList(
                        [...filteredStrykeList].sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime())
                      );
                    } else if (sortOption === "name") {
                      setFilteredStrykeList(
                        [...filteredStrykeList].sort((a, b) => a.companyName.localeCompare(b.companyName))
                      );
                    }
                  }}
                >
                  <option value="">Sort By</option>
                  <option value="date">Date</option>
                  <option value="name">Name</option>
                </select>
                <select
                  className="border border-gray-300 rounded-md px-2 py-1"
                  onChange={(e) => {
                    const selectedMonth = e.target.value;
                    if (selectedMonth) {
                      setFilteredStrykeList(
                        strykeList.filter((stryke) => {
                          const monthYear = new Date(stryke.entryTime).toLocaleString("default", { month: "long", year: "numeric" });
                          return monthYear === selectedMonth;
                        })
                      );
                    } else {
                      setFilteredStrykeList(strykeList);
                    }
                  }}
                >
                  <option value="">All Months</option>
                  {[...new Set(
                    strykeList.map((stryke) =>
                      new Date(stryke.entryTime).toLocaleString("default", { month: "long", year: "numeric" })
                    )
                  )]
                    .sort((a, b) => new Date(`1 ${a}`).getTime() - new Date(`1 ${b}`).getTime())
                    .map((monthYear) => (
                      <option key={monthYear} value={monthYear}>
                        {monthYear}
                      </option>
                    ))}
                </select>
                <span className="text-lg font-bold">Count: {filteredStrykeList.length}</span>
              </div>

              <table className="table-auto w-full border-collapse border border-gray-700 text-center">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-700 px-4 py-2">Slno</th>
                    <th className="border border-gray-700 px-4 py-2">Name</th>
                    <th className="border border-gray-700 px-4 py-2">Added On</th>
                    <th className="border border-gray-700 px-4 py-2">Entry At</th>
                    <th className="border border-gray-700 px-4 py-2">Target</th>
                    <th className="border border-gray-700 px-4 py-2">Stop Loss</th>
                    <th className='border border-gray-700 px-4 py-2'>Early Profits</th>
                    <th className="border border-gray-700 px-4 py-2">Last Closing Value</th>
                    <th className="border border-gray-700 px-4 py-2">Last Closing Value Date</th>
                    {Object.keys(strykeList[0]?.dayStatsMap || {}).map((date) => (
                      <th key={date} colSpan={2} className="border border-gray-700 px-4 py-2">
                        {new Date(date).toLocaleDateString()}
                        <span className="block h-px bg-gray-400 w-full"></span>
                        <div className="flex justify-center space-x-2 mt-1">
                          <td key={`${date}-peak`} className="px-4 py-2">Peak</td>
                          <td className="px-0">
                            <span className="block w-px h-full bg-gray-400 mr-3"></span>
                          </td>
                          <td key={`${date}-dip`} className="px-4 py-2">Dip</td>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStrykeList.map((stryke, index) => (
                    <tr key={stryke.stockUuid} className="hover:bg-gray-100">
                      <td className="border border-gray-700 px-4 py-2 text-center align-middle">{index + 1}</td>
                      <td className="border border-gray-700 px-4 py-2 text-center align-middle">{stryke.companyName}</td>
                      <td className="border border-gray-700 px-4 py-2 text-center align-middle">
                        {formatDate(stryke.entryTime)} {new Date(stryke.entryTime).toLocaleTimeString()}
                      </td>
                      <td className="border border-gray-700 px-4 py-2 text-center align-middle">₹{stryke.entryCandle.close?.toFixed(2)}</td>
                      <td className="border border-gray-700 px-4 py-2 text-center align-middle">₹{stryke.target?.toFixed(2)}</td>
                      <td className="border border-gray-700 px-4 py-2 text-center align-middle">₹{stryke.stopLoss?.toFixed(2)}</td>
                      <td className="border border-gray-700 px-4 py-2 text-center align-middle">
                        {shouldShowEarlyProfits(stryke) ? (
                          <span className="text-green-600 font-medium">
                            ₹{((stryke.highestPrice - stryke.entryCandle.close).toFixed(2))} ({((stryke.highestPrice - stryke.entryCandle.close) / stryke.entryCandle.close * 100).toFixed(2)}%)
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="border border-gray-700 px-4 py-2 text-center align-middle">
                        ₹{stryke.lastClosingValue?.toFixed(2)} ({calculatePercentageDifference(stryke.entryCandle.close, stryke.lastClosingValue)}%)
                      </td>
                      <td className="border border-gray-700 px-4 py-2 text-center align-middle">{formatDate(stryke.lastClosingValueDate)}</td>
                      {Object.values(stryke.dayStatsMap || {}).flatMap((stats, index) => [
                        <td key={`${index}-peak-value`} className="border border-gray-700 px-4 py-2">₹{stats.peak.toFixed(2)}</td>,
                        <td key={`${index}-dip-value`} className="border border-gray-700 px-4 py-2">₹{stats.dip.toFixed(2)}</td>,
                      ])}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
