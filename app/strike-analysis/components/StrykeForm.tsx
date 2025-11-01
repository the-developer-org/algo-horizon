import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import toast from 'react-hot-toast';
import axios from 'axios';
import { CallType, AnalysisResult } from '@/components/types/strike-analysis';

type StrykeType = 'OLD' | 'APP' | 'DISCORD';

interface Stryke {
  instrumentKey: string;
  companyName: string;
  entryDate: string;
  time: string;
  callType: CallType;
  strykeType: StrykeType;
  stopLoss: number;
  target: number;
}

interface StrykeFormProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const StrykeForm: React.FC<StrykeFormProps> = ({
  onAnalysisComplete,
  isLoading,
  setIsLoading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedInstrumentKey, setSelectedInstrumentKey] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('00:00');
  const [callType, setCallType] = useState<CallType>(CallType.INTRADAY);
  const [strykeType, setStrykeType] = useState<StrykeType>('OLD');
  const [stopLoss, setStopLoss] = useState('0.00');
  const [target, setTarget] = useState('0.00');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Fetch company suggestions based on search term
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const response = await axios.get(`${backEndBaseUrl}/api/stryke/search-companies`, {
          params: { query: searchTerm }
        });
        setSuggestions(response.data.companies || []);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSelectCompany = async (companyName: string) => {
    setSelectedCompany(companyName);
    setSearchTerm(companyName);
    setSuggestions([]);

    try {
      const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.get(`${backEndBaseUrl}/api/stryke/get-instrument-key`, {
        params: { companyName }
      });
      setSelectedInstrumentKey(response.data.instrumentKey);
    } catch (error) {
      console.error('Error fetching instrument key:', error);
      toast.error('Failed to get instrument key for selected company');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCompany || !selectedInstrumentKey || !selectedDate || selectedTime === "00:00" || stopLoss === "0.00" || target === "0.00") {
      toast.error('Please fill in all required fields');
      return;
    }

    const stopLossValue = Number.parseFloat(stopLoss);
    const targetValue = Number.parseFloat(target);

    if (Number.isNaN(stopLossValue) || Number.isNaN(targetValue)) {
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
      const result: AnalysisResult = {
        ...addedStock,
        entryDate: new Date(addedStock.entryTime).toLocaleDateString('en-GB'),
      };
      onAnalysisComplete(result);
      toast.success('Stock added successfully');
    } catch (error: any) {
      console.error('Error adding new stock:', error);
      toast.error(error?.response?.data?.statusText || 'Failed to add stock');
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
  );
};

export default StrykeForm;