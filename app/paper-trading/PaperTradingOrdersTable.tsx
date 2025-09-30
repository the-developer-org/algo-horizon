"use client";

import React, { useState } from 'react';
import { PaperTradeOrder } from '../../components/types/paper-trading';
import { exitPaperTradeOrder, cancelPaperTradeOrder } from '../../components/utils/paperTradeApi';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  Clock, 
  Target, 
  Shield, 
  ExternalLink,
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import toast from 'react-hot-toast';

interface PaperTradingOrdersTableProps {
  readonly orders: PaperTradeOrder[];
  readonly onOrderAction?: () => void;
  readonly showActions?: boolean;
  readonly user: string;
}

interface ExitOrderModalProps {
  readonly order: PaperTradeOrder;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
  readonly user: string;
}

function ExitOrderModal({ order, onClose, onSuccess, user }: ExitOrderModalProps) {
  const [exitReason, setExitReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const exitReasonOptions = [
    { value: 'Target Hit', label: 'Target Hit' },
    { value: 'StopLoss', label: 'Stop Loss' },
    { value: 'Manual Exit', label: 'Manual Exit' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!exitReason.trim()) {
      toast.error('Please select an exit reason');
      return;
    }

    setIsSubmitting(true);
    try {
      await exitPaperTradeOrder(user, order.id, {
        exitReason: exitReason.trim()
      });
      toast.success('Order exited successfully!');
      onSuccess();
    } catch (error) {
      //console.error('Error exiting order:', error);
      toast.error('Failed to exit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Exit Order</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm"><strong>{order.companyName}</strong></p>
          <p className="text-sm text-gray-600">
            Entry: ₹{order.entryPrice} × {order.quantity} shares
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Exit price will be determined automatically at current market price
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="exitReason">Exit Reason</Label>
            <Select value={exitReason} onValueChange={setExitReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select exit reason" />
              </SelectTrigger>
              <SelectContent>
                {exitReasonOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !exitReason}>
              {isSubmitting ? 'Exiting...' : 'Exit Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PaperTradingOrdersTable({ orders, onOrderAction, showActions = false, user }: PaperTradingOrdersTableProps) {
  const [exitingOrder, setExitingOrder] = useState<PaperTradeOrder | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    try {
      //console.log('Original date string:', dateString, 'Type:', typeof dateString);
      
      // Check if dateString is valid
      if (!dateString || typeof dateString !== 'string') {
        //console.error('Invalid dateString provided:', dateString);
        return 'Invalid Date';
      }
      
      // Trim the date string to just YYYY-MM-DDTHH:MM format
      const trimmedDateString = dateString.substring(0, 16); // "2025-09-18T09:59"
      //console.log('Trimmed date string:', trimmedDateString);
      
      const date = new Date(trimmedDateString);
      //console.log('Parsed date object:', date);
      //console.log('Date.getTime():', date.getTime());
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        //console.error('Invalid date detected for string:', trimmedDateString);
        return 'Invalid Date';
      }
      
      const formatted = date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
      });
      //console.log('Formatted date:', formatted);
      return formatted;
    } catch (error) {
      //console.error('Error formatting date:', error, 'Original string:', dateString);
      return 'Invalid Date';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Clock className="h-4 w-4 text-green-500" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPLColor = (value?: number) => {
    if (value === undefined || value === null) return 'text-gray-500';
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      await cancelPaperTradeOrder(user, orderId);
      toast.success('Order cancelled successfully!');
      onOrderAction?.();
    } catch (error) {
      //console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order. Please try again.');
    }
  };

  const handleExitSuccess = () => {
    setExitingOrder(null);
    onOrderAction?.();
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No orders found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-200 bg-gray-50">
            <th className="text-left p-3 font-semibold">Company</th>
            <th className="text-left p-3 font-semibold">Entry</th>
            <th className="text-left p-3 font-semibold">Quantity</th>
            <th className="text-left p-3 font-semibold">SL/Target</th>
            <th className="text-left p-3 font-semibold">Curr Value</th>
            <th className="text-left p-3 font-semibold">Exit</th>
            <th className="text-left p-3 font-semibold w-32">P&L</th>
            <th className="text-left p-3 font-semibold">Prediction</th>
            <th className="text-left p-3 font-semibold">Comments</th>
            <th className="text-left p-3 font-semibold">Status</th>
            {showActions && <th className="text-left p-3 font-semibold">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="p-3">
                <div>
                  <div className="font-medium">{order.companyName}</div>
                  <div className="text-xs text-gray-500">{order.instrumentKey}</div>
                  <div className="text-xs text-gray-500">
                    {formatDateTime(order.entryAt)}
                  </div>
                </div>
              </td>
              
              <td className="p-3">
                <div className="font-medium">{formatCurrency(order.entryPrice)}</div>
                <div className="text-xs text-gray-500">
                  Cap Used: {formatCurrency(order.amountInvested)}
                </div>
              </td>
              
              <td className="p-3">
                <span className="font-medium">{order.quantity}</span>
              </td>
              
              <td className="p-3">
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <Shield className="h-3 w-3" />
                  {formatCurrency(order.stopLoss)}
                </div>
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <Target className="h-3 w-3" />
                  {formatCurrency(order.targetPrice)}
                </div>
              </td>

                <td className="p-3">
                {order.lastRealTimePrice ? (
                  <div>
                    <div className="font-medium">{formatCurrency(order?.lastRealTimePrice)}</div>
          
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              
              <td className="p-3">
                {order.exitPrice ? (
                  <div>
                    <div className="font-medium">{formatCurrency(order.exitPrice)}</div>
                    <div className="text-xs text-gray-500">
                      {order?.exitAt && formatDateTime(order?.exitAt)}
                    </div>
                    <div className="text-xs text-blue-600">{order.exitReason}</div>
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>

          
              
              <td className="p-3">
                {order.netProfitLoss !== undefined ? (
                  <div>
                    <div className={`font-medium ${getPLColor(order.netProfitLoss)}`}>
                      {formatCurrency(order.netProfitLoss)}
                    </div>
                    {order.profitLossPercentage !== undefined && (
                      <div className={`text-xs ${getPLColor(order.netProfitLoss)}`}>
                        ({order.profitLossPercentage > 0 ? '+' : ''}{order.profitLossPercentage.toFixed(2)}%)
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              
              <td className="p-3">
                <div className="max-w-[150px] truncate">
                  {order.prediction || '-'}
                </div>
              </td>
              
              <td className="p-3">
                <div className="max-w-[150px]">
                  {order.comments && order.comments.length > 0 ? (
                    <ul className="text-xs list-disc list-inside">
                      {order.comments.slice(0, 2).map((comment, index) => (
                        <li key={`comment-${order.id}-${index}`} className="truncate" title={comment}>
                          {comment}
                        </li>
                      ))}
                      {order.comments.length > 2 && (
                        <li className="text-gray-500">+{order.comments.length - 2} more</li>
                      )}
                    </ul>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </td>
              
              <td className="p-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(order.status)}
                  <span className={`text-sm font-medium ${
                    order.status === 'ACTIVE' ? 'text-green-600' : 'text-grey-600'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </td>
              
              {showActions && (
                <td className="p-3">
                  {order.status === 'ACTIVE' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExitingOrder(order)}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Exit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelOrder(order.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Exit Order Modal */}
      {exitingOrder && (
        <ExitOrderModal
          order={exitingOrder}
          onClose={() => setExitingOrder(null)}
          onSuccess={handleExitSuccess}
          user={user}
        />
      )}
    </div>
  );
}