"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, X, DollarSign } from "lucide-react";
import { resetPaperTradeAccount } from './utils/paperTradeApi';
import toast from 'react-hot-toast';

interface ResetAccountModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
  readonly currentCapital: number;
}

export function ResetAccountModal({ isOpen, onClose, onSuccess, currentCapital }: ResetAccountModalProps) {
  const [initialCapital, setInitialCapital] = useState<number>(3000000);
  const [confirmationText, setConfirmationText] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const CONFIRMATION_TEXT = 'RESET MY ACCOUNT';
  const isConfirmationValid = confirmationText === CONFIRMATION_TEXT;

  const handleReset = async () => {
    if (!isConfirmationValid) {
      toast.error('Please type the confirmation text correctly');
      return;
    }

    if (initialCapital <= 0) {
      toast.error('Initial capital must be greater than 0');
      return;
    }

    setIsResetting(true);
    try {
      const success = await resetPaperTradeAccount(initialCapital);
      if (success) {
        toast.success(`Account reset successfully with ₹${initialCapital.toLocaleString()} initial capital!`);
        onSuccess();
        onClose();
        // Reset form
        setConfirmationText('');
        setInitialCapital(3000000);
      } else {
        toast.error('Failed to reset account. Please try again.');
      }
    } catch (error) {
      console.error('Error resetting account:', error);
      toast.error('Failed to reset account. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleClose = () => {
    setConfirmationText('');
    setInitialCapital(3000000);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Reset Paper Trading Account
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
            disabled={isResetting}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Warning Section */}
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-semibold mb-2">Warning: This action cannot be undone!</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>All your current orders will be cancelled</li>
                  <li>Your trading history will be cleared</li>
                  <li>Your current capital (₹{currentCapital.toLocaleString()}) will be reset</li>
                  <li>All profit/loss records will be deleted</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Initial Capital Input */}
          <div className="space-y-2">
            <Label htmlFor="initialCapital" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              New Initial Capital (₹)
            </Label>
            <Input
              id="initialCapital"
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)}
              placeholder="3000000"
              min="1000"
              step="1000"
              className="text-lg"
            />
            <p className="text-xs text-gray-500">
              Minimum: ₹1,000 | Default: ₹30,00,000
            </p>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <span className="font-mono font-bold text-red-600">{CONFIRMATION_TEXT}</span> to confirm:
            </Label>
            <Input
              id="confirmation"
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={CONFIRMATION_TEXT}
              className={`font-mono ${isConfirmationValid ? 'border-green-500' : ''}`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleReset}
              disabled={!isConfirmationValid || initialCapital <= 0 || isResetting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isResetting ? 'Resetting...' : 'Reset Account'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}