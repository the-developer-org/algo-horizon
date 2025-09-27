export interface PaperTradeOrder {
  id: string;
  companyName: string;
  instrumentKey: string;
  entryAt: string; // ISO date string
  entryPrice: number;
  lastRealTimePrice: number;
  quantity: number;
  stopLoss: number;
  targetPrice: number;
  exitAt?: string; // ISO date string
  exitPrice?: number;
  exitReason?: string;
  profitLoss?: number;
  profitLossPercentage?: number;
  brokerageFees: number;
  netProfitLoss?: number;
  tradeDurationMinutes?: number;
  amountInvested: number;
  returnOnInvestment?: number;
  status: 'ACTIVE' | 'COMPLETED';
  comments: string[];
  prediction: number;
}

export interface PaperTradeDashboard {
  // Profit / Loss metrics
  totalProfit: number;
  totalLoss: number;
  largestProfit: number;
  largestLoss: number;
  averageProfit: number;
  averageLoss: number;
  netProfit: number;

  // Trade outcome counts
  successfulTrades: number;
  failedTrades: number;
  breakevenTrades: number;
  totalTrades: number;

  // Streaks
  consecutiveWins: number;
  consecutiveLosses: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;

  // Capital & risk
  initialCapital: number;
  currentCapital: number;
  maxCapital: number;
  maxDrawdown: number;

  // Performance ratios
  winRate: number;
  profitFactor: number;

  // Recent orders
  recentOrders: PaperTradeOrder[];
}

export interface CreateOrderRequest {
  companyName: string;
  instrumentKey: string;
  entryDate: string;
  entryTime: string;
  quantity: number;
  stopLoss: number;
  targetPrice: number;
  comments: string[];
  prediction: number;
}

export interface ExitOrderRequest {
  exitReason: string;
}

export interface PaperTradeApiResponse<T = any> {
  statusText: string;
  paperTradeOrderResponse?: PaperTradeOrder;
  paperTradeOrderResponseList?: PaperTradeOrder[];
  tradeDashboardResponse?: PaperTradeDashboard;
  capital?: number;
  data?: T;
}