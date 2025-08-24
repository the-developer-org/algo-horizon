"use client";

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  initialApiKey?: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  initialApiKey = ''
}) => {
  const [apiKey, setApiKey] = useState(initialApiKey);

  // Update local state when initialApiKey prop changes
  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('upstoxApiKey') || initialApiKey || '';
      setApiKey(savedKey);
    }
  }, [isOpen, initialApiKey]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error('API key cannot be empty');
      return;
    }

    // Save to localStorage for persistence
    localStorage.setItem('upstoxApiKey', apiKey);
    
    // Notify parent component
    onSave(apiKey);
    
    // Show success message
    toast.success('API key saved successfully');
    
    // Close the modal
    onClose();
  };

  const handleClear = () => {
    // Clear from localStorage
    localStorage.removeItem('upstoxApiKey');
    
    // Clear the input
    setApiKey('');
    
    // Notify parent component
    onSave('');
    
    // Show success message
    toast.success('API key cleared');
    
    // Close the modal
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upstox API Configuration</DialogTitle>
          <DialogDescription>
            Enter your Upstox API key to fetch historical data directly from Upstox API v3.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Upstox API key"
              className="w-full"
            />
          </div>
          <div className="text-xs text-gray-500">
            Your API key is stored locally in your browser and is never sent to our servers.
          </div>
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {apiKey && (
              <Button variant="destructive" onClick={handleClear}>
                Clear API Key
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save API Key
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
