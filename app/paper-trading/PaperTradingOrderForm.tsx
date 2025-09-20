"use client";

import React, { useState, useEffect } from 'react';
import { CreateOrderRequest } from '../../components/types/paper-trading';
import { createPaperTradeOrder } from '../../components/utils/paperTradeApi';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, DollarSign, TrendingUp, Shield, Target } from "lucide-react";
import toast from 'react-hot-toast';

interface PaperTradingOrderFormProps {
  readonly onClose: () => void;
  readonly onSuccess: () => void;
  readonly currentCapital: number;
}

export function PaperTradingOrderForm({ onClose, onSuccess, currentCapital }: PaperTradingOrderFormProps) {
  const [formData, setFormData] = useState<CreateOrderRequest>({
    companyName: '',
    instrumentKey: '',
    entryDate: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
    entryTime: '09:15', // Default market opening time
    quantity: 0,
    stopLoss: 0,
    targetPrice: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Company search state
  const [keyMapping, setKeyMapping] = useState<{ [companyName: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');

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

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (formData.stopLoss <= 0) {
      newErrors.stopLoss = 'Stop loss must be greater than 0';
    }

    if (formData.targetPrice <= 0) {
      newErrors.targetPrice = 'Target price must be greater than 0';
    }

    if (formData.stopLoss >= formData.targetPrice) {
      newErrors.stopLoss = 'Stop loss should be less than target price';
    }

    // Note: We can't validate capital without knowing the actual entry price
    // The backend will handle this validation with real-time prices

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CreateOrderRequest, value: string | number) => {
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

  const calculateTotalCost = () => {
    // Since we don't have entry price at order creation time,
    // this will be calculated by the backend with real-time prices
    return 0;
  };

  const calculatePotentialProfit = () => {
    // Will be calculated by backend based on actual entry price vs target
    return 0;
  };

  const calculatePotentialLoss = () => {
    // Will be calculated by backend based on actual entry price vs stop loss
    return 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setIsSubmitting(true);
    try {
      await createPaperTradeOrder(formData);
      toast.success('Order created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Create New Paper Trade Order
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
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
                <Label htmlFor="entryDate">Entry Date</Label>
                <Input
                  id="entryDate"
                  type="date"
                  value={formData.entryDate}
                  onChange={(e) => handleInputChange('entryDate', e.target.value)}
                  className={errors.entryDate ? 'border-red-500' : ''}
                />
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
                  onChange={(e) => handleInputChange('entryTime', e.target.value)}
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
                  onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                  className={errors.quantity ? 'border-red-500' : ''}
                />
                {errors.quantity && (
                  <p className="text-sm text-red-500">{errors.quantity}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stopLoss" className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Stop Loss (₹)
                </Label>
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
                <Label htmlFor="targetPrice" className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  Target Price (₹)
                </Label>
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
                  formData.quantity <= 0 ||
                  formData.stopLoss <= 0 ||
                  formData.targetPrice <= 0 ||
                  formData.stopLoss >= formData.targetPrice
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
  );
}