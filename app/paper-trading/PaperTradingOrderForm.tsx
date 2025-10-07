"use client";

import React, { useState, useEffect } from 'react';
import { CreateOrderRequest } from '../../components/types/paper-trading';
import { createPaperTradeOrder } from '../../components/utils/paperTradeApi';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, DollarSign, Shield, Target } from "lucide-react";
import { fetchUpstoxHistoricalData, fetchUpstoxIntradayData } from '../../components/utils/upstoxApi';
import toast from 'react-hot-toast';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Mic, MicOff } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Switch } from "../../components/ui/switch";

interface PaperTradingOrderFormProps {
  readonly onClose: () => void;
  readonly onSuccess: () => void;
  readonly currentCapital: number;
  readonly user: string;
}

export function PaperTradingOrderForm({ onClose, onSuccess, currentCapital, user }: PaperTradingOrderFormProps) {
  // Helper function to convert time string (HH:MM) to minutes since midnight
  const timeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const [prediction, setPrediction] = useState<'Profit' | 'Action-not-taken'>('Profit');
  const [formData, setFormData] = useState<CreateOrderRequest>({
    companyName: '',
    instrumentKey: '',
    entryDate: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
    entryTime: '09:15', // Default market opening time
    quantity: 0,
    stopLoss: 0,
    targetPrice: 0,
    comments: [],
    prediction: 'Profit',
    predictionPercentage: 0,
    trailingStopLossEnabled: false,
    trailingStopLossAt: 0,
    trailingStopLossQuantity: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [chartTimeframe, setChartTimeframe] = useState<string>('1d');
  
  // Speech recognition state
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  
  // Check if current time is within market hours (Mon-Fri, 9:15 AM - 3:30 PM IST)
  const isMarketOpen = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    
    const dayOfWeek = istTime.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();
    const currentMinutes = hours * 60 + minutes;
    
    // Market hours: Monday-Friday (1-5), 9:15 AM (555 minutes) to 3:30 PM (930 minutes)
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isMarketTime = currentMinutes >= 555 && currentMinutes <= 930;
    
    return isWeekday && isMarketTime;
  };

  const marketStatus = isMarketOpen();
  
  // Live Info Drawer State
  const [isLiveInfoOpen, setIsLiveInfoOpen] = useState(false);
  
  // Company search state
  const [keyMapping, setKeyMapping] = useState<{ [companyName: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  
  // Company price data state
  const [companyPrice, setCompanyPrice] = useState<number | null>(null);
  const [companyChange, setCompanyChange] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  // Trailing stop loss state
  const [trailingStopLossEnabled, setTrailingStopLossEnabled] = useState(false);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';

        recognitionInstance.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            }
          }

          if (finalTranscript) {
            // Add the transcript to existing comments
            const currentComments = formData.comments.join('\n');
            const newComments = currentComments ? `${currentComments}\n${finalTranscript.trim()}` : finalTranscript.trim();
            const lines = newComments.split('\n').slice(0, 5); // Limit to 5 lines
            handleInputChange('comments', lines);
          }
        };

        recognitionInstance.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            toast.error('Microphone access denied. Please allow microphone access and try again.');
          } else if (event.error === 'network') {
            toast.error('Network error. Please check your internet connection.');
          } else {
            toast.error('Speech recognition failed. Please try again.');
          }
        };

        recognitionInstance.onend = () => {
          setIsListening(false);
        };

        setRecognition(recognitionInstance);
      } else {
        setSpeechSupported(false);
      }
    }
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (recognition && isListening) {
        recognition.stop();
      }
    };
  }, [recognition, isListening]);

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

  // Fetch company price data function
  const fetchCompanyPrice = async () => {
    if (!selectedCompany || !formData.instrumentKey || !formData.entryDate || !formData.entryTime) {
      return;
    }

    // Skip fetching for weekends (Saturday = 6, Sunday = 0)
    const entryDate = new Date(formData.entryDate);
    const dayOfWeek = entryDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      setCompanyPrice(null);
      setCompanyChange(null);
      return;
    }

    setIsLoadingPrice(true);
    try {
      const apiKey = localStorage.getItem('upstoxApiKey');
      if (!apiKey) {
        console.warn('No Upstox API key found');
        setCompanyPrice(null);
        setCompanyChange(null);
        return;
      }
    
let result;
      // Fetch minute data for the selected date
      if(formData.entryDate === new Date().toISOString().split('T')[0]){
        result = await fetchUpstoxIntradayData(
          formData.instrumentKey,
          apiKey,
          'minutes',
          '1'
        );
      } else {
        result = await fetchUpstoxHistoricalData(
        formData.instrumentKey,
        'minutes',
        '1',
        formData.entryDate,
        formData.entryDate,
        apiKey
      );
    }

      let candles: any[] = [];
      if (Array.isArray(result)) {
        candles = result;
      } else if (result?.candles && Array.isArray(result.candles)) {
        candles = result.candles;
      }

      if (candles.length > 0) {
        // Find the candle closest to the entry time
        const entryTimeMinutes = timeToMinutes(formData.entryTime);
        let closestCandle = candles[0];
        let minTimeDiff = Infinity;

        for (const candle of candles) {
          // Parse the timestamp string to get hours and minutes
          const candleTime = new Date(candle.timestamp);
          const candleMinutes = candleTime.getHours() * 60 + candleTime.getMinutes();
          const timeDiff = Math.abs(candleMinutes - entryTimeMinutes);

          if (timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            closestCandle = candle;
          }
        }

        const currentPrice = closestCandle.close;

        // For change calculation, compare with the first candle of the day (oldest)
        const firstCandleOfDay = candles[candles.length - 1]; // oldest candle (assuming sorted newest first)
        const firstCandleOpen = firstCandleOfDay.open;
        const change = ((currentPrice - firstCandleOpen) / firstCandleOpen) * 100;

        setCompanyPrice(currentPrice);
        setCompanyChange(change);
      } else {
        setCompanyPrice(null);
        setCompanyChange(null);
      }
    } catch (error) {
      console.error('Failed to fetch company price:', error);
      setCompanyPrice(null);
      setCompanyChange(null);
    } finally {
      setIsLoadingPrice(false);
    }
  };

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

  // Fetch company price when date, time, or company changes
  useEffect(() => {
    if (selectedCompany && formData.entryDate && formData.entryTime) {
      fetchCompanyPrice();
    }
  }, [selectedCompany, formData.entryDate, formData.entryTime]);

  // Handle selection from suggestions
  const handleSelectCompany = (companyName: string) => {
    setSelectedCompany(companyName);
    const instrumentKey = keyMapping[companyName];
    setSearchTerm(companyName);
    setSuggestions([]);
    
    // Update form data with selected company and instrument key
    setFormData(prev => ({
      ...prev,
      companyName: companyName,
      instrumentKey: instrumentKey
    }));
    
    // Clear any existing errors for these fields
    setErrors(prev => ({
      ...prev,
      companyName: '',
      instrumentKey: ''
    }));
  };

  const navigateToChart = (instrumentKey: string, timeframe: string) => {
    if (!formData.entryDate || !formData.entryTime) {
      toast.error('Please enter entry date and time first.');
      return;
    }
    
    const chartUrl = `/chart?instrumentKey=${encodeURIComponent(instrumentKey)}&timeframe=${encodeURIComponent(timeframe)}&date=${encodeURIComponent(formData.entryDate)}&time=${encodeURIComponent(formData.entryTime)}`;
    window.open(chartUrl, '_blank');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.instrumentKey.trim()) {
      newErrors.instrumentKey = 'Instrument key is required';
    }

    if (!formData.entryDate) {
      newErrors.entryDate = 'Entry date is required';
    }

    if (!formData.entryTime) {
      newErrors.entryTime = 'Entry time is required';
    }

    // Only validate trading parameters if prediction is "Profit"
    if (formData.prediction === 'Profit') {
      if (formData.quantity <= 0) {
        newErrors.quantity = 'Quantity must be greater than 0';
      }

      if (companyPrice && currentCapital > 0) {
        const maxPurchasable = Math.floor(currentCapital / companyPrice);
        if (formData.quantity > maxPurchasable) {
          newErrors.quantity = `Quantity cannot exceed ${maxPurchasable} shares (available capital: ₹${currentCapital.toFixed(2)})`;
        }
      }

      if (formData.stopLoss <= 0) {
        newErrors.stopLoss = 'Stop loss must be greater than 0';
      }

      if (formData.targetPrice <= 0) {
        newErrors.targetPrice = 'Target price must be greater than 0';
      }

      if (companyPrice && formData.targetPrice <= companyPrice) {
        newErrors.targetPrice = 'Target price must be greater than current price';
      }

      if (companyPrice && formData.stopLoss >= companyPrice) {
        newErrors.stopLoss = 'Stop loss must be less than current price';
      }

      if (formData.stopLoss >= formData.targetPrice) {
        newErrors.stopLoss = 'Stop loss should be less than target price';
      }

      // Trailing stop loss validations - only if enabled
      if (formData.trailingStopLossEnabled) {
        if (formData.trailingStopLossQuantity <= 0) {
          newErrors.trailingStopLossQuantity = 'Trailing stop loss quantity must be greater than 0';
        }

        if (formData.trailingStopLossQuantity > formData.quantity) {
          newErrors.trailingStopLossQuantity = 'Trailing stop loss quantity cannot be greater than order quantity';
        }

        if (formData.trailingStopLossAt <= 0) {
          newErrors.trailingStopLossAt = 'Trailing stop loss price must be greater than 0';
        }

        if (companyPrice && formData.trailingStopLossAt <= companyPrice) {
          newErrors.trailingStopLossAt = 'Trailing stop loss must be greater than entry price';
        }

        if (formData.trailingStopLossAt >= formData.targetPrice) {
          newErrors.trailingStopLossAt = 'Trailing stop loss must be less than target price';
        }
      }
    }

    if (!formData.prediction || (formData.prediction !== 'Profit' && formData.prediction !== 'Action-not-taken')) {
      newErrors.prediction = 'Please select a prediction type';
    }

    // Note: We can't validate capital without knowing the actual entry price
    // The backend will handle this validation with real-time prices

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CreateOrderRequest, value: string | number | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };



  const startListening = () => {
    if (recognition && speechSupported) {
      try {
        setIsListening(true);
        recognition.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsListening(false);
        toast.error('Failed to start speech recognition');
      }
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    // Filter out empty comments before submitting
    const cleanedFormData = {
      ...formData,
      comments: formData.comments.filter(comment => comment.trim() !== '')
    };

    setIsSubmitting(true);
    try {
      await createPaperTradeOrder(cleanedFormData, user);
      toast.success('Order created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPrice = () => {
    if (isLoadingPrice) return <span className="text-gray-500">Loading...</span>;
    if (companyPrice) return <span className="text-green-600">₹{companyPrice.toFixed(2)}</span>;
    return <span className="text-gray-500">N/A</span>;
  };



  return (
    <>
      {/* Live Info Drawer - Independent of Modal */}
      <Sheet open={isLiveInfoOpen} onOpenChange={(open) => {
        setIsLiveInfoOpen(open);
        if (open) {
          fetchCompanyPrice();
        }
      }}>
        <SheetContent side="right" className="w-[500px] sm:w-[600px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${marketStatus ? 'bg-green-500' : 'bg-red-500'}`}></div>
              Live Market Info
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-full mt-6">
            {/* Content */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Market Status */}
              <div className={`border rounded-lg p-3 ${marketStatus ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">Market Status</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${marketStatus ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {marketStatus ? 'OPEN' : 'CLOSED'}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${marketStatus ? 'text-green-600' : 'text-red-600'}`}>
                  {marketStatus ? 'Market is currently open for trading' : 'Market is currently closed'}
                </p>
              </div>

              {/* Current Company Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Selected Company</h3>
                {selectedCompany ? (
                  <div className="space-y-1 text-xs">
                    <p><span className="font-medium">Name:</span> {selectedCompany}</p>
                    <p><span className="font-medium">Key:</span> {formData.instrumentKey}</p>
                    <p><span className="font-medium">{marketStatus ? 'Live at:' : 'Last traded at:'}</span> {renderPrice()}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">
                    Select a company from the order form to view historical data
                  </p>
                )}
              </div>

             
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 pt-3 mt-4">
              <p className="text-xs text-gray-500 text-center">
                Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Order Form Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Create New Paper Trade Order
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                onClick={() => {
                  setIsLiveInfoOpen(true);
                  fetchCompanyPrice();
                }}
              >
                Live Info
              </Button>
              <div className="flex items-center gap-2">
                <Select value={chartTimeframe} onValueChange={setChartTimeframe}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1m</SelectItem>
                    <SelectItem value="5m">5m</SelectItem>
                    <SelectItem value="15m">15m</SelectItem>
                    <SelectItem value="30m">30m</SelectItem>
                    <SelectItem value="1h">1h</SelectItem>
                    <SelectItem value="4h">4h</SelectItem>
                    <SelectItem value="1d">1d</SelectItem>
                    <SelectItem value="1w">1w</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                  onClick={() => {
                    if (formData.instrumentKey) {
                      navigateToChart(formData.instrumentKey, chartTimeframe);
                    } else {
                      toast.error('Please select a company first.');
                    }
                  }}
                  disabled={!formData.instrumentKey || !formData.entryDate || !formData.entryTime}
                >
                  Charts
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsLiveInfoOpen(false); // Close drawer when modal closes
                onClose();
              }}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      setFormData(prev => ({
                        ...prev,
                        companyName: '',
                        instrumentKey: ''
                      }));
                    }}
                    className={errors.companyName ? 'border-red-500' : ''}
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
                {errors.companyName && (
                  <p className="text-sm text-red-500">{errors.companyName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="instrumentKey">Instrument Key</Label>
                <Input
                  id="instrumentKey"
                  placeholder="Auto-populated when company is selected"
                  value={formData.instrumentKey}
                  onChange={(e) => handleInputChange('instrumentKey', e.target.value)}
                  className={errors.instrumentKey ? 'border-red-500' : ''}
                  readOnly={!!selectedCompany}
                />
                {errors.instrumentKey && (
                  <p className="text-sm text-red-500">{errors.instrumentKey}</p>
                )}
              </div>
            </div>

            {/* Trading Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entry Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.entryDate && "text-muted-foreground",
                        errors.entryDate && "border-red-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.entryDate ? format(new Date(formData.entryDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.entryDate ? new Date(formData.entryDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const dateString = format(date, 'yyyy-MM-dd');
                          handleInputChange('entryDate', dateString);
                        }
                      }}
                      disabled={(date) => date.getDay() === 0 || date.getDay() === 6}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.entryDate && (
                  <p className="text-sm text-red-500">{errors.entryDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="entryTime">Entry Time</Label>
                <Input
                  id="entryTime"
                  type="time"
                  value={formData.entryTime}
                  onChange={(e) => {
                    const selectedTime = e.target.value;
                    const [hours, minutes] = selectedTime.split(':').map(Number);
                    const totalMinutes = hours * 60 + minutes;
                    
                    // Market hours: 9:15 AM (555 minutes) to 3:30 PM (930 minutes)
                    const marketOpenMinutes = 9 * 60 + 15; // 555
                    const marketCloseMinutes = 15 * 60 + 30; // 930
                    
                    if (totalMinutes < marketOpenMinutes || totalMinutes > marketCloseMinutes) {
                      setErrors(prev => ({
                        ...prev,
                        entryTime: 'Entry time must be between 9:15 AM and 3:30 PM'
                      }));
                      return;
                    }
                    
                    // Clear any existing error
                    setErrors(prev => ({
                      ...prev,
                      entryTime: ''
                    }));
                    
                    handleInputChange('entryTime', e.target.value);
                  }}
                  className={errors.entryTime ? 'border-red-500' : ''}
                  min="09:15"
                  max="15:30"
                  step="60"
                />
                {errors.entryTime && (
                  <p className="text-sm text-red-500">{errors.entryTime}</p>
                )}
              </div>
            </div>

            {/* Price at Entry Time */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                Price at Entry Time (Closing Value)
              </Label>
              <div className="w-full px-3 py-3 text-sm border border-gray-300 rounded-md bg-gray-50 flex items-center justify-between">
                <span className="font-mono">
                  {selectedCompany ? renderPrice() : 'Select a company first'}
                </span>
                {selectedCompany && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={fetchCompanyPrice}
                    disabled={isLoadingPrice}
                    className="h-6 w-6 p-0"
                  >
                    {isLoadingPrice ? '⟳' : '↻'}
                  </Button>
                )}
              </div>
              {companyChange !== null && selectedCompany && (
                <p className={`text-xs ${companyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {companyChange >= 0 ? '+' : ''}{companyChange.toFixed(2)}% from day's open
                </p>
              )}
            </div>

            {/* Trading Parameters - Quantity, Stop Loss, Target Price */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                 <Label htmlFor="quantity" className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Quantity
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="0"
                  value={formData.quantity || ''}
                  onChange={(e) => {
                    const inputValue = parseInt(e.target.value) || 0;
                    
                    // Check if input exceeds max purchasable
                    if (companyPrice && currentCapital > 0) {
                      const maxPurchasable = Math.floor(currentCapital / companyPrice);
                      if (inputValue > maxPurchasable) {
                        // Don't update if it exceeds max purchasable
                        return;
                      }
                    }
                    
                    handleInputChange('quantity', inputValue);
                  }}
                  className={errors.quantity ? 'border-red-500' : ''}
                />
                {companyPrice && currentCapital > 0 && (
                  <div className="text-xs text-blue-600">
                    Max purchasable: {Math.floor(currentCapital / companyPrice)} shares
                    Capital Used : ₹{(formData.quantity * companyPrice).toFixed(2)}
                  </div>
                )}
                {errors.quantity && (
                  <p className="text-sm text-red-500">{errors.quantity}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="stopLoss" className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    Stop Loss (₹)
                  </Label>
                  {companyPrice && formData.stopLoss > 0 && (
                    <span className={`text-xs ${formData.stopLoss < companyPrice ? 'text-red-600' : 'text-green-600'}`}>
                      ({formData.stopLoss < companyPrice
                        ? `${((formData.stopLoss - companyPrice) / companyPrice * 100).toFixed(2)}%`
                        : `+${((formData.stopLoss - companyPrice) / companyPrice * 100).toFixed(2)}%`
                      })
                    </span>
                  )}
                </div>
                <Input
                  id="stopLoss"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.stopLoss || ''}
                  onChange={(e) => handleInputChange('stopLoss', parseFloat(e.target.value) || 0)}
                  className={errors.stopLoss ? 'border-red-500' : ''}
                />
                {errors.stopLoss && (
                  <p className="text-sm text-red-500">{errors.stopLoss}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="targetPrice" className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    Target Price (₹)
                  </Label>
                  {companyPrice && formData.targetPrice > 0 && (
                    <span className={`text-xs ${formData.targetPrice > companyPrice ? 'text-green-600' : 'text-red-600'}`}>
                      ({formData.targetPrice > companyPrice 
                        ? `+${((formData.targetPrice - companyPrice) / companyPrice * 100).toFixed(2)}%`
                        : `${((formData.targetPrice - companyPrice) / companyPrice * 100).toFixed(2)}%`
                      })
                    </span>
                  )}
                </div>
                <Input
                  id="targetPrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.targetPrice || ''}
                  onChange={(e) => handleInputChange('targetPrice', parseFloat(e.target.value) || 0)}
                  className={errors.targetPrice ? 'border-red-500' : ''}
                />
                {errors.targetPrice && (
                  <p className="text-sm text-red-500">{errors.targetPrice}</p>
                )}
              </div>
            </div>

            {/* Trailing Stop Loss Section */}
            <div className="space-y-4 border border-orange-200 rounded-lg p-4 bg-orange-50">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-semibold text-orange-800">Trailing Stop Loss</Label>
                </div>
                <Switch
                  checked={trailingStopLossEnabled}
                  disabled={
                    !selectedCompany || 
                    !formData.quantity || 
                    !formData.stopLoss || 
                    !formData.targetPrice ||
                    formData.prediction === 'Action-not-taken'
                  }
                  onCheckedChange={(checked: boolean) => {
                    setTrailingStopLossEnabled(checked);
                    setFormData(prev => ({
                      ...prev,
                      trailingStopLossEnabled: checked,
                      trailingStopLossAt: checked ? prev.trailingStopLossAt : 0,
                      trailingStopLossQuantity: checked ? prev.trailingStopLossQuantity : 0
                    }));
                    
                    if (!checked) {
                      // Clear trailing stop loss errors when disabled
                      setErrors(prev => ({
                        ...prev,
                        trailingStopLossAt: '',
                        trailingStopLossQuantity: ''
                      }));
                    }
                  }}
                />
              </div>

              {/* Trailing Stop Loss Input Fields - Only shown when enabled */}
              {trailingStopLossEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-orange-200">
                  <div className="space-y-2">
                    <Label htmlFor="trailingStopLossQuantity" className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      Trailing Stop Loss Quantity
                    </Label>
                    <Input
                      id="trailingStopLossQuantity"
                      type="number"
                      placeholder="0"
                      value={formData.trailingStopLossQuantity || ''}
                      onChange={(e) => {
                        const inputValue = parseInt(e.target.value) || 0;
                        handleInputChange('trailingStopLossQuantity', inputValue);
                      }}
                      className={errors.trailingStopLossQuantity ? 'border-red-500' : ''}
                    />
                    {formData.quantity > 0 && (
                      <div className="text-xs text-orange-600">
                        Max quantity: {formData.quantity} shares
                      </div>
                    )}
                    {errors.trailingStopLossQuantity && (
                      <p className="text-sm text-red-500">{errors.trailingStopLossQuantity}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="trailingStopLossAt" className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        Trailing Stop Loss At (₹)
                      </Label>
                      {companyPrice && formData.trailingStopLossAt > 0 && (
                        <span className={`text-xs ${formData.trailingStopLossAt < companyPrice ? 'text-red-600' : 'text-green-600'}`}>
                          ({formData.trailingStopLossAt < companyPrice
                            ? `${((formData.trailingStopLossAt - companyPrice) / companyPrice * 100).toFixed(2)}%`
                            : `+${((formData.trailingStopLossAt - companyPrice) / companyPrice * 100).toFixed(2)}%`
                          })
                        </span>
                      )}
                    </div>
                    <Input
                      id="trailingStopLossAt"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.trailingStopLossAt || ''}
                      onChange={(e) => handleInputChange('trailingStopLossAt', parseFloat(e.target.value) || 0)}
                      className={errors.trailingStopLossAt ? 'border-red-500' : ''}
                    />
                    {companyPrice && formData.targetPrice > 0 && (
                      <div className="text-xs text-orange-600">
                        Range: ₹{companyPrice.toFixed(2)} (entry) to ₹{formData.targetPrice.toFixed(2)} (target)
                      </div>
                    )}
                    {errors.trailingStopLossAt && (
                      <p className="text-sm text-red-500">{errors.trailingStopLossAt}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <div className="space-y-4">
                <Label>Prediction Type</Label>
                <RadioGroup
                  value={prediction}
                  onValueChange={(value: 'Profit' | 'Action-not-taken') => {
                    setPrediction(value);
                    // Update the prediction field with the string value
                    handleInputChange('prediction', value);
                    
                    if (value === 'Action-not-taken') {
                      // When "Action Not Taken" is selected, reset all trading-related fields and disable trailing stop loss
                      setFormData(prev => ({
                        ...prev,
                        predictionPercentage: 0,
                        quantity: 0,
                        stopLoss: 0,
                        targetPrice: 0,
                        trailingStopLossEnabled: false,
                        trailingStopLossAt: 0,
                        trailingStopLossQuantity: 0
                      }));
                      setTrailingStopLossEnabled(false);
                      
                      // Clear trailing stop loss errors when disabled
                      setErrors(prev => ({
                        ...prev,
                        trailingStopLossAt: '',
                        trailingStopLossQuantity: ''
                      }));
                    } else {
                      // For "Profit" type, only reset prediction percentage to 0
                      setFormData(prev => ({
                        ...prev,
                        predictionPercentage: 0
                      }));
                    }
                  }}
                  className="flex space-x-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Profit" id="profit" />
                    <Label htmlFor="profit" className="text-green-600 font-medium cursor-pointer">
                      Profit
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Action-not-taken" id="action-not-taken" />
                    <Label htmlFor="action-not-taken" className="text-gray-600 font-medium cursor-pointer">
                      Action Not Taken
                    </Label>
                  </div>
                </RadioGroup>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="comments">Analysis Comments (Bullet Points)</Label>
                  {speechSupported && (
                    <Button
                      type="button"
                      onClick={isListening ? stopListening : startListening}
                      variant="outline"
                      size="sm"
                      className={`flex items-center gap-1 px-2 py-1 text-xs ${isListening ? 'bg-red-50 border-red-200 text-red-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}
                    >
                      {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                      {isListening ? 'Stop' : 'Voice'}
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    id="comments"
                    placeholder={isListening ? 'Listening... Speak your analysis' : 'Enter comments'}
                    value={formData.comments.join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n');
                      // Limit to maximum 5 lines total
                      const limitedLines = lines.slice(0, 5);
                      handleInputChange('comments', limitedLines);
                    }}
                    className={`w-full min-h-[120px] max-h-[180px] px-3 py-3 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto ${
                      isListening 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                    style={{
                      backgroundImage: 'linear-gradient(transparent, transparent 23px, #e5e7eb 23px, #e5e7eb 24px)',
                      backgroundSize: '100% 24px',
                      lineHeight: '24px',
                      fontFamily: 'monospace',
                      paddingTop: '6px',
                      paddingBottom: '6px'
                    }}
                    rows={6}
                  />
                  {isListening && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-xs font-medium text-red-600">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      Recording
                    </div>
                  )}
                </div>
                
              </div>
            </div>
            </div>

            {/* Capital Validation Error */}
            {errors.capital && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{errors.capital}</p>
              </div>
            )}
            

            {/* Order Summary */}
            {formData.entryDate && formData.entryTime && formData.quantity > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-2">
                <h4 className="font-semibold text-blue-800">Order Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Entry Date:</span>
                    <span className="font-semibold ml-2">{formData.entryDate}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Entry Time:</span>
                    <span className="font-semibold ml-2">{formData.entryTime}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-semibold ml-2">{formData.quantity}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Available Capital:</span>
                    <span className="font-semibold ml-2">₹{currentCapital.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Stop Loss:</span>
                    <span className="font-semibold ml-2">₹{formData.stopLoss}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Target Price:</span>
                    <span className="font-semibold ml-2">₹{formData.targetPrice}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Prediction:</span>
                    <span className={`font-semibold ml-2 ${formData.prediction === 'Profit' ? 'text-green-600' : 'text-gray-600'}`}>
                      {formData.prediction}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Comments:</span>
                    <span className="font-semibold ml-2">{formData.comments.length} bullet points</span>
                  </div>
                  {trailingStopLossEnabled && (
                    <>
                      <div>
                        <span className="text-gray-600">Trailing SL Enabled:</span>
                        <span className="font-semibold ml-2 text-orange-600">Yes</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Trailing SL Quantity:</span>
                        <span className="font-semibold ml-2">{formData.trailingStopLossQuantity}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Trailing SL At:</span>
                        <span className="font-semibold ml-2">₹{formData.trailingStopLossAt}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  * Brokerage fees will be automatically calculated and applied by the system
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting || 
                  !selectedCompany ||
                  !formData.instrumentKey.trim() ||
                  !formData.entryDate ||
                  !formData.entryTime ||
                  !formData.prediction ||
                  (formData.prediction !== 'Profit' && formData.prediction !== 'Action-not-taken') ||
                  // Only validate trading parameters for "Profit" prediction
                  (formData.prediction === 'Profit' && (
                    formData.quantity <= 0 ||
                    formData.stopLoss <= 0 ||
                    formData.targetPrice <= 0 ||
                    (companyPrice && formData.stopLoss >= companyPrice) ||
                    formData.stopLoss >= formData.targetPrice ||
                    // Trailing stop loss validations when enabled
                    (formData.trailingStopLossEnabled && (
                      formData.trailingStopLossQuantity <= 0 ||
                      formData.trailingStopLossQuantity > formData.quantity ||
                      formData.trailingStopLossAt <= 0 ||
                      (companyPrice && formData.trailingStopLossAt <= companyPrice) ||
                      formData.trailingStopLossAt >= formData.targetPrice
                    ))
                  ))
                }
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating Order...' : 'Create Order'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>

    </>
  );
}