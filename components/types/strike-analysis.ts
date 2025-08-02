// strike-analysis.ts
export enum Trend {
  BULLISH = 'BULLISH',
  BEARISH = 'BEARISH',
  CONSOLIDATED = 'CONSOLIDATED'
}

export enum CallType {
  INTRADAY = 'INTRADAY',
  POSITIONAL = 'POSITIONAL',
  SWING = 'SWING',
  LONGTERM = 'LONGTERM'
}

export interface StrikeAnalysisRequest {
  symbol: string;
  instrumentKey: string;
  date: string; // ISO format
  time: string;
  callType: CallType;
  trend: Trend;
  stopLoss: number;
  target: number;
}

export interface StrikeAnalysisResponse {
  id: string;
  symbol: string;
  instrumentKey: string;
  date: string;
  time: string;
  callType: CallType;
  trend: Trend;
  stopLoss: number;
  target: number;
  entryPrice: number;
  success: boolean;
  message: string;
  timestamp: string;
}
