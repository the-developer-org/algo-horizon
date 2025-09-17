"use client";

import React, { useState } from 'react';
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
    entryPrice: 0,
    quantity: 0,
    stopLoss: 0,
    targetPrice: 0,
    brokerageFees: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.instrumentKey.trim()) {
      newErrors.instrumentKey = 'Instrument key is required';
    }

    if (formData.entryPrice <= 0) {
      newErrors.entryPrice = 'Entry price must be greater than 0';
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

    if (formData.stopLoss >= formData.entryPrice) {
      newErrors.stopLoss = 'Stop loss should be less than entry price';
    }

    if (formData.targetPrice <= formData.entryPrice) {
      newErrors.targetPrice = 'Target price should be greater than entry price';
    }

    const totalCost = formData.entryPrice * formData.quantity + (formData.brokerageFees || 0);
    if (totalCost > currentCapital) {
      newErrors.capital = `Insufficient capital. Required: ₹${totalCost.toFixed(2)}, Available: ₹${currentCapital.toFixed(2)}`;
    }

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
    return (formData.entryPrice * formData.quantity) + (formData.brokerageFees || 0);
  };

  const calculatePotentialProfit = () => {
    return (formData.targetPrice - formData.entryPrice) * formData.quantity - (formData.brokerageFees || 0);
  };

  const calculatePotentialLoss = () => {
    return (formData.entryPrice - formData.stopLoss) * formData.quantity + (formData.brokerageFees || 0);
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
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="e.g., RELIANCE"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className={errors.companyName ? 'border-red-500' : ''}
                />
                {errors.companyName && (
                  <p className="text-sm text-red-500">{errors.companyName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="instrumentKey">Instrument Key</Label>
                <Input
                  id="instrumentKey"
                  placeholder="e.g., NSE_EQ|INE002A01018"
                  value={formData.instrumentKey}
                  onChange={(e) => handleInputChange('instrumentKey', e.target.value)}
                  className={errors.instrumentKey ? 'border-red-500' : ''}
                />
                {errors.instrumentKey && (
                  <p className="text-sm text-red-500">{errors.instrumentKey}</p>
                )}
              </div>
            </div>

            {/* Trading Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryPrice" className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Entry Price (₹)
                </Label>
                <Input
                  id="entryPrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.entryPrice || ''}
                  onChange={(e) => handleInputChange('entryPrice', parseFloat(e.target.value) || 0)}
                  className={errors.entryPrice ? 'border-red-500' : ''}
                />
                {errors.entryPrice && (
                  <p className="text-sm text-red-500">{errors.entryPrice}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="brokerageFees">Brokerage Fees (₹) - Optional</Label>
              <Input
                id="brokerageFees"
                type="number"
                step="0.01"
                placeholder="0.00 (auto-calculated if empty)"
                value={formData.brokerageFees || ''}
                onChange={(e) => handleInputChange('brokerageFees', parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Capital Validation Error */}
            {errors.capital && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{errors.capital}</p>
              </div>
            )}

            {/* Order Summary */}
            {formData.entryPrice > 0 && formData.quantity > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-2">
                <h4 className="font-semibold text-blue-800">Order Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Cost:</span>
                    <span className="font-semibold ml-2">₹{calculateTotalCost().toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Available Capital:</span>
                    <span className="font-semibold ml-2">₹{currentCapital.toFixed(2)}</span>
                  </div>
                  {formData.targetPrice > 0 && (
                    <div>
                      <span className="text-gray-600">Potential Profit:</span>
                      <span className="font-semibold ml-2 text-green-600">₹{calculatePotentialProfit().toFixed(2)}</span>
                    </div>
                  )}
                  {formData.stopLoss > 0 && (
                    <div>
                      <span className="text-gray-600">Potential Loss:</span>
                      <span className="font-semibold ml-2 text-red-600">₹{calculatePotentialLoss().toFixed(2)}</span>
                    </div>
                  )}
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
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
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