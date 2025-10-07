"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, User, AlertCircle } from "lucide-react";
import toast from 'react-hot-toast';

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAccountName: string) => void;
  baseUsername: string; // e.g., "Abrar"
}

export function CreateAccountModal({ isOpen, onClose, onSuccess, baseUsername }: CreateAccountModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedAccountName, setSuggestedAccountName] = useState<string>('');
  const [customAccountName, setCustomAccountName] = useState<string>('');
  const [useCustomName, setUseCustomName] = useState(false);

  // Generate the next available account name
  const generateNextAccountName = () => {
    const existingAccounts = JSON.parse(localStorage.getItem('paperTradingAccounts') || '[]');
    let counter = 1;
    let suggestedName = `${baseUsername}-${counter}`;
    
    while (existingAccounts.includes(suggestedName)) {
      counter++;
      suggestedName = `${baseUsername}-${counter}`;
    }
    
    return suggestedName;
  };

  // Initialize suggested account name when modal opens
  useEffect(() => {
    if (isOpen) {
      const nextName = generateNextAccountName();
      setSuggestedAccountName(nextName);
      setCustomAccountName('');
      setUseCustomName(false);
    }
  }, [isOpen, baseUsername]);

  // Validate account name format
  const validateAccountName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Account name is required';
    }
    
    if (name.length < 3) {
      return 'Account name must be at least 3 characters';
    }
    
    if (name.length > 20) {
      return 'Account name must be less than 20 characters';
    }
    
    // Check if name follows pattern: Base-Number or Base format
    const pattern = /^[a-zA-Z]+(-\d+)?$/;
    if (!pattern.test(name)) {
      return 'Account name must follow pattern: Username or Username-Number (e.g., Abrar-1)';
    }
    
    // Check if account already exists
    const existingAccounts = JSON.parse(localStorage.getItem('paperTradingAccounts') || '[]');
    if (existingAccounts.includes(name)) {
      return 'Account name already exists';
    }
    
    return null;
  };

  const handleCreateAccount = async () => {
    const accountName = useCustomName ? customAccountName.trim() : suggestedAccountName;
    
    // Validate account name
    const validationError = validateAccountName(accountName);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsLoading(true);
    
    try {
      // Get existing accounts from localStorage
      const existingAccounts = JSON.parse(localStorage.getItem('paperTradingAccounts') || '[]');
      
      // Add new account to the list
      const updatedAccounts = [...existingAccounts, accountName];
      localStorage.setItem('paperTradingAccounts', JSON.stringify(updatedAccounts));
      
      // Initialize account data with default values
      const defaultAccountData = {
        currentCapital: 100000, // Default starting capital
        totalPnL: 0,
        totalInvestment: 100000,
        totalReturns: 0,
        totalTrades: 0,
        winRate: 0,
        avgGainPercent: 0,
        avgLossPercent: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        profitFactor: 0,
        orders: []
      };
      
      // Store initial account data
      localStorage.setItem(`paperTradingDashboard_${accountName}`, JSON.stringify(defaultAccountData));
      localStorage.setItem(`paperTradingOrders_${accountName}`, JSON.stringify([]));
      
      toast.success(`Account "${accountName}" created successfully!`);
      onSuccess(accountName);
      onClose();
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentAccountName = useCustomName ? customAccountName : suggestedAccountName;
  const validationError = currentAccountName ? validateAccountName(currentAccountName) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle>Create New Account</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Create a new paper trading account with virtual capital
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Account Name Selection */}
          <div className="space-y-3">
            <Label>Account Name</Label>
            
            {/* Suggested Name Option */}
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="suggested"
                name="nameOption"
                checked={!useCustomName}
                onChange={() => setUseCustomName(false)}
                className="h-4 w-4 text-blue-600"
              />
              <label htmlFor="suggested" className="text-sm font-medium">
                Use suggested: <span className="text-blue-600 font-semibold">{suggestedAccountName}</span>
              </label>
            </div>
            
            {/* Custom Name Option */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="custom"
                  name="nameOption"
                  checked={useCustomName}
                  onChange={() => setUseCustomName(true)}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="custom" className="text-sm font-medium">
                  Use custom name
                </label>
              </div>
              
              {useCustomName && (
                <Input
                  type="text"
                  placeholder="Enter custom account name"
                  value={customAccountName}
                  onChange={(e) => setCustomAccountName(e.target.value)}
                  className="ml-6"
                />
              )}
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
              <AlertCircle className="h-4 w-4" />
              {validationError}
            </div>
          )}

          {/* Account Info */}
          <div className="bg-blue-50 p-3 rounded-lg space-y-1">
            <p className="text-sm font-medium text-blue-900">New Account Details:</p>
            <p className="text-sm text-blue-700">• Starting Capital: ₹1,00,000</p>
            <p className="text-sm text-blue-700">• Account Name: {currentAccountName}</p>
            <p className="text-sm text-blue-700">• Account Type: Virtual Trading</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAccount}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isLoading || !!validationError || !currentAccountName}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}