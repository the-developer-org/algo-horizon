export interface LiveCandle {
  instrumentKey: string;
  interval: string;
  startTime: string; // e.g. "09:15:00", "09:20:00", "09:25:00"
  endTime: string;   // e.g. "09:20:00", "09:25:00", "09:30:00"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  firstTradeTimestamp?: number;
  lastTradeTimestamp?: number;
  tradeCount?: number;
  complete: boolean;
  reliable: boolean;
}

export interface LiveCandleUpdateMessage {
  event: 'LIVE_CANDLE_UPDATE' | string;
  timestamp: number;
  candles: LiveCandle[];
}
