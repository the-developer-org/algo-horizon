"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface KeyMapping {
  [companyName: string]: string;
}

interface CompanyInfo {
  name: string;
  symbol: string;
  lastLowFormedAt?: string;
  deadline?: string;
  deadlineTime?: string;
  lastLowPrice?: number;
}

interface LivePredictionResponse {
  liveStockBuffer: {
    id: any;
    strykeId: any;
    companyName: string;
    instrumentKey: string;
    nextSwingFormed: boolean;
    stockDipped: boolean;
    bufferActive: boolean;
    currentSwing: {
      timeStampLocal: number[];
      date: number[];
      timeStamp: number;
      price: number;
      label: string;
      type: string | null;
      index: number;
    };
    previousSwing: any;
    nextSwing: any;
    hourlyBuffers: {
      bufferStartCandle: {
        timestamp: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        openInterest: number;
        emaDto: any;
      };
      hourLevelRsi: number;
      farthestSwingDate: number[];
      swingDates: {
        swingStart: number[];
        swingEnd: number[];
      }[];
      bufferHitsList: {
        timeFrame: string;
        swingDates: {
          swingStart: number[];
          swingEnd: number[];
        };
        bufferPercentage: number;
        currentSwing: {
          timeStampLocal: number[];
          date: number[];
          timeStamp: number;
          price: number;
          label: string;
          type: string;
          index: number;
        };
        nextSwing: {
          timeStampLocal: number[];
          date: number[];
          timeStamp: number;
          price: number;
          label: string;
          type: string;
          index: number;
        };
        hourlyRsi: number;
        dailyRsi: number;
        mintue15Rsi: number;
      }[];
      entryPrice: number;
      etRatio: number;
      bufferActive: boolean;
      cocCandle: {
        timestamp: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        openInterest: number;
        emaDto: any;
      };
    }[];
    isSimulated: boolean;
  };
}

export default function BufferCheckPage() {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [lastLowDate, setLastLowDate] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [predictionResponse, setPredictionResponse] = useState<LivePredictionResponse | null>(null);
  
  // Company search state
  const [keyMapping, setKeyMapping] = useState<{ [companyName: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError('Failed to load company data');
      })
      .finally(() => {
        setLoading(false);
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

  const handleFetchBufferHits = async () => {
    setIsLoadingPrediction(true);
    
    try {
      // Prepare the request body
      const requestBody = {
        "stockBuffer": {
          "isSimulated": true,
          "companyName": companyInfo?.name || "",
          "instrumentKey": companyInfo?.symbol || "",
          "nextSwingFormed": true,
          "stockDipped": false,
          "bufferActive": true,
          "currentSwing": {
            "timeStampLocal": `${companyInfo?.lastLowFormedAt}T00:00:00`,
            "date": companyInfo?.lastLowFormedAt || "",
            "price": companyInfo?.lastLowPrice || 0, // Price will be fetched from current swing data
            "label": "LL"
          },
          "hourlyBuffers": []
        },
        "deadLine": `${companyInfo?.deadline}T${companyInfo?.deadlineTime || '11:30'}:00`
      };

      console.log('Sending request to live-prediction API:', requestBody);
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const context = "/api/prediction/live-prediction";

      const response = await fetch(
        `${backendUrl}${context}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Live prediction response:', data);
      setPredictionResponse(data);
      
    } catch (error) {
      console.error('Error fetching live prediction:', error);
      // Show user-friendly error message
      setPredictionResponse(null);
    } finally {
      setIsLoadingPrediction(false);
    }
  };

  // Helper function to format date arrays
  const formatDateArray = (dateArray: number[]) => {
    if (dateArray.length >= 3) {
      return `${dateArray[2].toString().padStart(2, '0')}/${dateArray[1].toString().padStart(2, '0')}/${dateArray[0]}`;
    }
    return 'Invalid Date';
  };

  const formatDateTimeArray = (dateTimeArray: number[]) => {
    if (dateTimeArray.length >= 5) {
      const date = `${dateTimeArray[2].toString().padStart(2, '0')}/${dateTimeArray[1].toString().padStart(2, '0')}/${dateTimeArray[0]}`;
      const time = `${dateTimeArray[3].toString().padStart(2, '0')}:${dateTimeArray[4].toString().padStart(2, '0')}`;
      return `${date} ${time}`;
    }
    return 'Invalid DateTime';
  };

  // Handle selection from suggestions
  const handleSelectCompany = (companyName: string) => {
    setSelectedCompany(companyName);
    setSearchTerm(companyName);
    setSuggestions([]);
    
    // Set basic company info immediately when selected
    setCompanyInfo({
      name: companyName,
      symbol: keyMapping[companyName] || '',
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Buffer Check</h1>
        <p>Loading companies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Buffer Check</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Buffer Check</h1>

      {/* Company Search */}
      <div className="mb-8 p-4 border rounded">
        <div className="space-y-2">
          <Label htmlFor="companySearch">Company Name</Label>
          <div className="relative">
            <Input
              id="companySearch"
              type="text"
              placeholder="Search for a company..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedCompany('');
                setCompanyInfo(null);
              }}
            />
            {suggestions.length > 0 && !selectedCompany && (
              <ul className="absolute z-50 w-full mt-1 border border-gray-300 rounded-md max-h-60 overflow-auto bg-white shadow-lg">
                {suggestions.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSelectCompany(name)}
                    >
                      {name}
                    </button>
                  </li>
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
      </div>

      {/* Results at the bottom */}
      {companyInfo && (
        <div className="p-4 border rounded">
          <h2 className="text-xl font-semibold mb-4">Company Information</h2>
          <p><strong>Name:</strong> {companyInfo.name}</p>
          <p><strong>Symbol:</strong> {companyInfo.symbol}</p>

          <div className="mt-4">
            <Label htmlFor="lastLow">Last Low Formed</Label>
            <Input
              id="lastLow"
              type="date"
              value={lastLowDate}
              onChange={(e) => {
                const newDate = e.target.value;
                setLastLowDate(newDate);
                // Auto-save when date changes
                if (companyInfo && newDate) {
                  console.log('Auto-saving last low for', companyInfo.name, 'at', newDate);
                  setCompanyInfo({ ...companyInfo, lastLowFormedAt: newDate });
                }
              }}
              placeholder="dd/mm/yyyy"
            />
          </div>

        

          <div className="mt-4">
            <Label htmlFor="deadline">Deadline Date</Label>
            <Input
              id="deadline"
              type="date"
              value={deadlineDate}
              onChange={(e) => {
                const newDate = e.target.value;
                setDeadlineDate(newDate);
                // Auto-save when date changes
                if (companyInfo && newDate) {
                  console.log('Auto-saving deadline date for', companyInfo.name, 'at', newDate);
                  setCompanyInfo({ ...companyInfo, deadline: newDate });
                }
              }}
              placeholder="dd/mm/yyyy"
            />
          </div>

          <div className="mt-4">
            <Label htmlFor="deadlineTime">Deadline Time</Label>
            <Input
              id="deadlineTime"
              type="time"
              value={deadlineTime}
              onChange={(e) => {
                const newTime = e.target.value;
                setDeadlineTime(newTime);
                // Auto-save when time changes
                if (companyInfo && newTime) {
                  console.log('Auto-saving deadline time for', companyInfo.name, 'at', newTime);
                  setCompanyInfo({ ...companyInfo, deadlineTime: newTime });
                }
              }}
              placeholder="HH:MM"
            />
          </div>

          {/* Fetch Buffer Data Button */}
          {selectedCompany && companyInfo?.lastLowFormedAt && companyInfo?.deadline && companyInfo?.deadlineTime && (
            <div className="mt-6">
              <Button 
                onClick={handleFetchBufferHits} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoadingPrediction}
              >
                {isLoadingPrediction ? 'Fetching...' : 'Fetch Buffer Data'}
              </Button>
            </div>
          )}
    
        </div>
      )}

      {/* Prediction Results */}
      {predictionResponse && (
        <div className="p-4 border rounded mt-8">
          <h2 className="text-2xl font-bold mb-6">Buffer Analysis Results</h2>
          
          {/* Stock Information */}
          <div className="bg-blue-50 p-4 rounded mb-6">
            <h3 className="text-lg font-semibold mb-3">Stock Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Company:</strong> {predictionResponse.liveStockBuffer.companyName}</div>
              <div><strong>Stock Dipped:</strong> <span className={predictionResponse.liveStockBuffer.stockDipped ? 'text-red-600' : 'text-green-600'}>{predictionResponse.liveStockBuffer.stockDipped ? 'Yes' : 'No'}</span></div>
            </div>
          </div>

          {/* Current Swing */}
          <div className="bg-green-50 p-4 rounded mb-6">
            <h3 className="text-lg font-semibold mb-3">Stryke Swing</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><strong>Date:</strong> {formatDateArray(predictionResponse.liveStockBuffer.currentSwing.date)}</div>
              <div><strong>Price:</strong> ₹{predictionResponse.liveStockBuffer.currentSwing.price.toFixed(2)}</div>
              <div><strong>Label:</strong> <span className="px-2 py-1 bg-blue-100 rounded">{predictionResponse.liveStockBuffer.currentSwing.label}</span></div>
            </div>
          </div>

          {/* Hourly Buffers */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Hourly Buffer Analysis</h3>
            
            {predictionResponse.liveStockBuffer.hourlyBuffers.map((buffer, bufferIndex) => (
              <div key={`buffer-${bufferIndex}-${buffer.hourLevelRsi}`} className="border border-gray-300 rounded p-4">
                <h4 className="text-lg font-semibold mb-4">Buffer #{bufferIndex + 1}</h4>
                
                {/* Buffer Overview */}
                <div className="bg-yellow-50 p-4 rounded mb-4">
                  <h5 className="font-semibold mb-2">Buffer Overview</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Hour Level RSI:</strong> {buffer.hourLevelRsi.toFixed(2)}</div>
                    <div><strong>Farthest Swing Date:</strong> {formatDateArray(buffer.farthestSwingDate)}</div>
                  </div>
                </div>

                {/* Buffer Start Candle */}
                <div className="bg-gray-50 p-4 rounded mb-4">
                  <h5 className="font-semibold mb-2">Buffer Start Candle</h5>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><strong>Timestamp:</strong> {new Date(buffer.bufferStartCandle.timestamp).toLocaleString()}</div>
                    <div><strong>Open:</strong> ₹{buffer.bufferStartCandle.open}</div>
                    <div><strong>High:</strong> ₹{buffer.bufferStartCandle.high}</div>
                    <div><strong>Low:</strong> ₹{buffer.bufferStartCandle.low}</div>
                    <div><strong>Close:</strong> ₹{buffer.bufferStartCandle.close}</div>
                    <div><strong>Volume:</strong> {buffer.bufferStartCandle.volume.toLocaleString()}</div>
                  </div>
                </div>

                {/* COC Candle */}
                <div className="bg-purple-50 p-4 rounded mb-4">
                  <h5 className="font-semibold mb-2">COC Candle</h5>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><strong>Timestamp:</strong> {new Date(buffer.cocCandle.timestamp).toLocaleString()}</div>
                    <div><strong>High:</strong> ₹{buffer.cocCandle.high}</div>
                    <div><strong>Volume:</strong> {buffer.cocCandle.volume}</div>
                  </div>
                </div>

                {/* Swing Dates */}
                <div className="bg-indigo-50 p-4 rounded mb-4">
                  <h5 className="font-semibold mb-2">Swing Dates ({buffer.swingDates.length} swings)</h5>
                  <div className="space-y-2">
                    {buffer.swingDates.map((swing, swingIndex) => (
                      <div key={`swing-${swingIndex}-${swing.swingStart.join('')}`} className="text-sm flex justify-between">
                        <span><strong>Swing {swingIndex + 1}:</strong></span>
                        <span>{formatDateArray(swing.swingStart)} → {formatDateArray(swing.swingEnd)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Buffer Hits List */}
                <div className="bg-red-50 p-4 rounded">
                  <h5 className="font-semibold mb-3">Buffer Hits ({buffer.bufferHitsList.length} hits)</h5>
                  <div className="space-y-4">
                    {buffer.bufferHitsList.map((hit, hitIndex) => (
                      <div key={`hit-${hitIndex}-${hit.bufferPercentage}-${hit.currentSwing.timeStamp}`} className="border border-red-200 p-3 rounded">
                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div><strong>Time Frame:</strong> {hit.timeFrame}</div>
                          <div><strong>Buffer %:</strong> {(hit.bufferPercentage * 100).toFixed(1)}%</div>
                          <div><strong>Swing Period:</strong> {formatDateArray(hit.swingDates.swingStart)} → {formatDateArray(hit.swingDates.swingEnd)}</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div className="bg-white p-2 rounded">
                            <h6 className="font-medium mb-1">Current Swing</h6>
                            <div className="text-xs">
                              <div>Date: {formatDateTimeArray(hit.currentSwing.timeStampLocal)}</div>
                              <div>Price: ₹{hit.currentSwing.price}</div>
                              <div>Label: {hit.currentSwing.label} | Type: {hit.currentSwing.type}</div>
                            </div>
                          </div>
                          
                          <div className="bg-white p-2 rounded">
                            <h6 className="font-medium mb-1">Next Swing</h6>
                            <div className="text-xs">
                              <div>Date: {formatDateTimeArray(hit.nextSwing.timeStampLocal)}</div>
                              <div>Price: ₹{hit.nextSwing.price}</div>
                              <div>Label: {hit.nextSwing.label} | Type: {hit.nextSwing.type}</div>
                            </div>
                          </div>
                        </div>

                        {/* <div className="grid grid-cols-3 gap-4 mt-3 text-xs">
                          <div><strong>Hourly RSI:</strong> {hit.hourlyRsi}</div>
                          <div><strong>Daily RSI:</strong> {hit.dailyRsi}</div>
                          <div><strong>15min RSI:</strong> {hit.mintue15Rsi}</div>
                        </div> */}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}