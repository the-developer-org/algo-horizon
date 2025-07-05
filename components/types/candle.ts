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
}

export interface FormattedCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
} 