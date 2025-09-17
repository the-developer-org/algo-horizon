"use client";

import React from 'react';
import { PaperTradeDashboard } from '../../components/types/paper-trading';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Award, 
  AlertTriangle,
  BarChart3
} from "lucide-react";

interface PaperTradingDashboardProps {
  readonly data: PaperTradeDashboard;
}

export function PaperTradingDashboard({ data }: PaperTradingDashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getPerformanceColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPerformanceBg = (value: number) => {
    if (value > 0) return 'bg-green-50 border-green-200';
    if (value < 0) return 'bg-red-50 border-red-200';
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Capital Overview */}
      <Card className={`${getPerformanceBg(data.netProfit)} border-2`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Capital</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.currentCapital)}</div>
          <p className="text-xs text-muted-foreground">
            Initial: {formatCurrency(data.initialCapital)}
          </p>
          <div className={`text-sm ${getPerformanceColor(data.netProfit)}`}>
            {data.netProfit >= 0 ? '+' : ''}{formatCurrency(data.netProfit)} 
            ({formatPercentage((data.netProfit / data.initialCapital) * 100)})
          </div>
        </CardContent>
      </Card>

      {/* Win Rate */}
      <Card className="border-2 bg-blue-50 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          <Target className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {formatPercentage(data.winRate)}
          </div>
          <p className="text-xs text-muted-foreground">
            {data.successfulTrades} wins of {data.totalTrades} trades
          </p>
          <div className="text-sm text-blue-600">
            {data.failedTrades} losses, {data.breakevenTrades} breakeven
          </div>
        </CardContent>
      </Card>

      {/* Profit Factor */}
      <Card className="border-2 bg-purple-50 border-purple-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
          <BarChart3 className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {data.profitFactor.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total Profit ÷ Total Loss
          </p>
          <div className="text-sm text-purple-600">
            {formatCurrency(data.totalProfit)} ÷ {formatCurrency(data.totalLoss)}
          </div>
        </CardContent>
      </Card>

      {/* Max Drawdown */}
      <Card className="border-2 bg-orange-50 border-orange-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(data.maxDrawdown)}
          </div>
          <p className="text-xs text-muted-foreground">
            Maximum peak-to-trough decline
          </p>
          <div className="text-sm text-orange-600">
            Peak: {formatCurrency(data.maxCapital)}
          </div>
        </CardContent>
      </Card>

      {/* Average Profit */}
      <Card className="border-2 bg-green-50 border-green-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Profit</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(data.averageProfit)}
          </div>
          <p className="text-xs text-muted-foreground">
            Per winning trade
          </p>
          <div className="text-sm text-green-600">
            Largest: {formatCurrency(data.largestProfit)}
          </div>
        </CardContent>
      </Card>

      {/* Average Loss */}
      <Card className="border-2 bg-red-50 border-red-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Loss</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(data.averageLoss)}
          </div>
          <p className="text-xs text-muted-foreground">
            Per losing trade
          </p>
          <div className="text-sm text-red-600">
            Largest: {formatCurrency(data.largestLoss)}
          </div>
        </CardContent>
      </Card>

      {/* Win Streak */}
      <Card className="border-2 bg-emerald-50 border-emerald-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Win Streak</CardTitle>
          <Award className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            {data.consecutiveWins}
          </div>
          <p className="text-xs text-muted-foreground">
            Current consecutive wins
          </p>
          <div className="text-sm text-emerald-600">
            Max: {data.maxConsecutiveWins} wins
          </div>
        </CardContent>
      </Card>

      {/* Loss Streak */}
      <Card className="border-2 bg-rose-50 border-rose-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Loss Streak</CardTitle>
          <AlertTriangle className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-rose-600">
            {data.consecutiveLosses}
          </div>
          <p className="text-xs text-muted-foreground">
            Current consecutive losses
          </p>
          <div className="text-sm text-rose-600">
            Max: {data.maxConsecutiveLosses} losses
          </div>
        </CardContent>
      </Card>
    </div>
  );
}