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
  AlertCircle,
  MessageSquare,
  Eye
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
  readonly onSuccess: (order?: PaperTradeOrder) => void;
  readonly user: string;
}

interface CommentsModalProps {
  readonly comments: string[];
  readonly companyName: string;
  readonly onClose: () => void;
}

function ExitOrderModal({ order, onClose, onSuccess, user }: ExitOrderModalProps) {
  const [exitReason, setExitReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New state for exit date and time
  const entryDate = new Date(order.entryAt);
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Helper: is weekend
  const isWeekend = (date: Date) => [0, 6].includes(date.getDay());

  // Initial exit date: today if not weekend, else next weekday
  let initialExitDate = now;
  if (isWeekend(now)) {
    // Find next Monday
    initialExitDate = new Date(now);
    initialExitDate.setDate(now.getDate() + ((8 - now.getDay()) % 7));
  }
  // If entry date is after today, use entry date
  if (entryDate > initialExitDate) initialExitDate = entryDate;

  const [exitDate, setExitDate] = useState(initialExitDate.toISOString().slice(0, 10));
  // Initial exit time: now - 1 min if today, else entry time if same day as entry, else 09:15
  const getInitialExitTime = () => {
    if (exitDate === todayStr) {
      const d = new Date(now.getTime() - 60000);
      return d.toTimeString().slice(0, 5);
    }
    if (exitDate === order.entryAt.slice(0, 10)) {
      return order.entryAt.slice(11, 16);
    }
    return "09:15";
  };
  const [exitTime, setExitTime] = useState(getInitialExitTime());

  // Update exitTime if exitDate changes
  React.useEffect(() => {
    setExitTime(getInitialExitTime());
    // eslint-disable-next-line
  }, [exitDate]);

  // Helper: min/max for date input
  const minDate = entryDate.toISOString().slice(0, 10);
  // Max date: today if not weekend, else last weekday
  let maxDateObj = now;
  if (isWeekend(now)) {
    maxDateObj = new Date(now);
    maxDateObj.setDate(now.getDate() - (now.getDay() === 6 ? 1 : 2));
  }
  const maxDate = maxDateObj.toISOString().slice(0, 10);

  // Helper: min/max for time input
  // Market hours: 09:15 to 15:30
  const MARKET_OPEN = "09:15";
  const MARKET_CLOSE = "15:30";

  let minTime = MARKET_OPEN;
  if (exitDate === minDate) {
    const entryTime = order.entryAt.slice(11, 16);
    const [h, m] = entryTime.split(":").map(Number);
    const minDateObj = new Date(0, 0, 0, h, m + 1);
    const entryPlusOne = minDateObj.toTimeString().slice(0, 5);
    // The later of entry+1min or market open
    minTime = entryPlusOne > MARKET_OPEN ? entryPlusOne : MARKET_OPEN;
  }
  if (exitDate === todayStr && minTime < MARKET_OPEN) {
    minTime = MARKET_OPEN;
  }
  let maxTime = MARKET_CLOSE;
  if (exitDate === todayStr) {
    const d = new Date(now.getTime() - 60000);
    const nowMinusOne = d.toTimeString().slice(0, 5);
    maxTime = nowMinusOne < MARKET_CLOSE ? nowMinusOne : MARKET_CLOSE;
  }

  // Validate selected date/time
  const selectedDateObj = new Date(`${exitDate}T${exitTime}`);
  const isDateValid = (
    exitDate >= minDate &&
    exitDate <= maxDate &&
    !isWeekend(new Date(exitDate))
  );
  // Only allow time within market hours
  const isTimeWithinMarket = exitTime >= MARKET_OPEN && exitTime <= MARKET_CLOSE;
  const isTimeValid = (
    exitTime >= minTime &&
    exitTime <= maxTime &&
    isTimeWithinMarket &&
    (exitDate !== minDate || exitTime > order.entryAt.slice(11, 16))
  );
  const isBeforeMarketOpenToday = exitDate === todayStr && exitTime < MARKET_OPEN;
  const isExitDateTimeValid = isDateValid && isTimeValid && selectedDateObj > entryDate && selectedDateObj <= now && !isBeforeMarketOpenToday;

  const exitReasonOptions = [
    { value: 'Early Exit', label: 'Early Exit' },
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
    if (!isExitDateTimeValid) {
      toast.error('Invalid exit date or time');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use correct property name for exitPaperTradeOrder
      const exited = await exitPaperTradeOrder(user, order.id, {
        exitReason: exitReason.trim(),
        exitDate: `${exitDate}T${exitTime}`
      });
      toast.success('Order exited successfully!');
      onSuccess(exited); // Pass the exited order to parent
    } catch (error) {
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

        {/* Show selected exit date/time */}
        <div className="mb-4 p-2 bg-blue-50 rounded text-xs text-blue-700">
          Selected Exit: <span className="font-medium">{exitDate} {exitTime}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date and Time Pickers */}
          <div className="flex gap-2">
            <div>
              <Label htmlFor="exitDate">Exit Date</Label>
              <input
                type="date"
                id="exitDate"
                value={exitDate}
                min={minDate}
                max={maxDate}
                onChange={e => setExitDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
                required
              />
            </div>
            <div>
              <Label htmlFor="exitTime">Exit Time</Label>
              <input
                type="time"
                id="exitTime"
                value={exitTime}
                min={minTime}
                max={maxTime}
                step={60}
                onChange={e => setExitTime(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
                required
              />
            </div>
          </div>
          {!isExitDateTimeValid && (
            <div className="text-xs text-red-600">
              {isBeforeMarketOpenToday
                ? "You cannot exit before market opens (09:15 AM) on the current date."
                : "Please select a valid exit date and time (not before entry, not on weekends, not in the future, and within market hours)."}
            </div>
          )}

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
            <Button type="submit" disabled={isSubmitting || !exitReason || !isExitDateTimeValid}>
              {isSubmitting ? 'Exiting...' : 'Exit Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CommentsModal({ comments, companyName, onClose }: CommentsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments - {companyName}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {comments.length > 0 ? (
            <ul className="space-y-3">
              {comments.map((comment, index) => (
                <li key={`comment-${index}-${comment.substring(0, 10)}`} className="p-3 bg-gray-50 rounded-md">
                  <div className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                      {index + 1}
                    </span>
                    <p className="text-sm text-gray-700 flex-1">{comment}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No comments available</p>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

/*
Problem:
The ExitSuccessModal is closing immediately because both setExitSuccessOrder(order) and setExitingOrder(null) are called in the same render tick (inside the onSuccess handler).
This causes the parent to re-render, and if the orders prop changes (e.g., after onOrderAction), the exitSuccessOrder may be cleared if the exited order is not present in the new orders list.

Solution:
- Do NOT call setExitingOrder(null) in the same tick as setExitSuccessOrder(order).
- Only call setExitingOrder(null) in the ExitSuccessModal's onClose handler, so the modal stays open until the user closes it.
*/

export function PaperTradingOrdersTable({ orders, onOrderAction, showActions = false, user }: PaperTradingOrdersTableProps) {
  const [exitingOrder, setExitingOrder] = useState<PaperTradeOrder | null>(null);
  const [viewingComments, setViewingComments] = useState<{ comments: string[]; companyName: string } | null>(null);
  const [exitSuccessOrder, setExitSuccessOrder] = useState<PaperTradeOrder | null>(null);

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
      ////console.log('Original date string:', dateString, 'Type:', typeof dateString);

      // Check if dateString is valid
      if (!dateString || typeof dateString !== 'string') {
        //console.error('Invalid dateString provided:', dateString);
        return 'Invalid Date';
      }

      // Trim the date string to just YYYY-MM-DDTHH:MM format
      const trimmedDateString = dateString.substring(0, 16); // "2025-09-18T09:59"
      ////console.log('Trimmed date string:', trimmedDateString);

      const date = new Date(trimmedDateString);
      ////console.log('Parsed date object:', date);
      ////console.log('Date.getTime():', date.getTime());

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
      ////console.log('Formatted date:', formatted);
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

  const handleExitSuccess = async () => {
    setExitingOrder(null);
    // Refetch or update orders if needed
    if (onOrderAction) onOrderAction();
    // Find the latest exited order (assuming orders are refreshed)
    // If not, you can pass the exited order directly from ExitOrderModal
    // Here, we assume ExitOrderModal can pass the order
    // For now, setExitSuccessOrder(exitingOrder) is not reliable, so we update ExitOrderModal to pass the order
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
            <th className="text-left p-3 font-semibold w-40">P&L Details</th>
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
                    {order.trailingStopLossEnabled && order.trailingStopLossProfits !== undefined ? (
                      // Show trailing stop loss breakdown
                      <div className="space-y-1">
                        <div className="text-xs text-orange-600">
                          TSL: {formatCurrency(order.trailingStopLossProfits)}
                        </div>
                        <div className="text-xs text-blue-600">
                          Post TSL: {formatCurrency(order.netProfitLoss - order.trailingStopLossProfits)}
                        </div>
                        <div className={`font-medium text-sm ${getPLColor(order.netProfitLoss)}`}>
                          Final: {formatCurrency(order.netProfitLoss)}
                        </div>
                        {order.profitLossPercentage !== undefined && (
                          <div className={`text-xs ${getPLColor(order.netProfitLoss)}`}>
                            ({order.profitLossPercentage > 0 ? '+' : ''}{order.profitLossPercentage.toFixed(2)}%)
                          </div>
                        )}
                      </div>
                    ) : (
                      // Show regular P&L
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
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-600">
                          {order.comments.length} comment{order.comments.length > 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-gray-400 truncate max-w-[100px]">
                          {order.comments[0].length > 30
                            ? `${order.comments[0].substring(0, 30)}...`
                            : order.comments[0]
                          }
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewingComments({
                          comments: order.comments || [],
                          companyName: order.companyName
                        })}
                        className="p-1 h-6 w-6 flex-shrink-0"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </td>

              <td className="p-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(order.status)}
                  <span className={`text-sm font-medium ${order.status === 'ACTIVE' ? 'text-green-600' : 'text-grey-600'
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
          onSuccess={(order?: PaperTradeOrder) => {
            if (order) setExitSuccessOrder(order);
            setExitingOrder(null); // Close the exit modal
            onOrderAction?.();     // Refresh the orders list
          }}

          user={user}
        />
      )}


      {/* Comments Modal */}
      {viewingComments && (
        <CommentsModal
          comments={viewingComments.comments}
          companyName={viewingComments.companyName}
          onClose={() => setViewingComments(null)}
        />
      )}
    </div>
  );
}