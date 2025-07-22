export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest: number;
  ema?: number;
  rsi?: number;
  isHigherHigh?: boolean;
  isHigherLow?: boolean;
  isLowerHigh?: boolean;
  isLowerLow?: boolean;
  isSwingHigh?: boolean;
  isSwingLow?: boolean;
}

export interface FormattedCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
} 