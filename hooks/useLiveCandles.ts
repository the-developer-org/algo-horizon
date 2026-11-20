'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LiveCandle, LiveCandleUpdateMessage } from '@/types/liveCandle';
import { useMarketDataStatus, useStompTopicMessages } from './useMarketData';
import { RawMessage } from '@/lib/marketDataSocket';

export type CandleGlowType = 'high-up' | 'low-down' | 'close-up' | 'close-down';

export interface EnrichedLiveCandle extends LiveCandle {
  label: string; // e.g. "09:15", "09:20", "09:25"
  lastGlow?: CandleGlowType;
  lastGlowTimestamp?: number;
}

function normalizeKey(key: string): string {
  return key.replace(/-/g, '|').trim();
}

function formatLabel(startTime: string): string {
  // startTime is formatted as "09:15:00" -> extract "09:15"
  const parts = startTime.split(':');
  if (parts.length >= 2) {
    return `${Number(parts[0])}:${parts[1]}`;
  }
  return startTime;
}

/**
 * Manages 5-minute real-time candles (09:15, 09:20, 09:25) from backend stream and snapshot.
 */
export function useLiveCandles(backendBase: string, enabled = true) {
  // Map of normalizedKey -> array of EnrichedLiveCandle sorted by startTime
  const [candlesByInstrument, setCandlesByInstrument] = useState<Record<string, EnrichedLiveCandle[]>>({});
  const candlesRef = useRef<Record<string, Record<string, EnrichedLiveCandle>>>({});
  const { status: socketStatus } = useMarketDataStatus(enabled);

  const applyCandleList = useCallback((list: LiveCandle[]) => {
    if (!Array.isArray(list) || list.length === 0) return;
    const now = Date.now();
    let hasChanges = false;
    const currentStore = candlesRef.current;

    for (const rawCandle of list) {
      if (!rawCandle?.instrumentKey || !rawCandle?.startTime) continue;
      const key = normalizeKey(rawCandle.instrumentKey);
      if (!currentStore[key]) {
        currentStore[key] = {};
      }

      const existing = currentStore[key][rawCandle.startTime];
      let glow: CandleGlowType | undefined = existing?.lastGlow;
      let glowTimestamp = existing?.lastGlowTimestamp;

      if (existing) {
        if (rawCandle.high > existing.high) {
          glow = 'high-up';
          glowTimestamp = now;
        } else if (rawCandle.low < existing.low) {
          glow = 'low-down';
          glowTimestamp = now;
        } else if (rawCandle.close > existing.close) {
          glow = 'close-up';
          glowTimestamp = now;
        } else if (rawCandle.close < existing.close) {
          glow = 'close-down';
          glowTimestamp = now;
        }
      }

      currentStore[key][rawCandle.startTime] = {
        ...rawCandle,
        instrumentKey: key,
        label: formatLabel(rawCandle.startTime),
        lastGlow: glow,
        lastGlowTimestamp: glowTimestamp,
      };
      hasChanges = true;
    }

    if (hasChanges) {
      const nextState: Record<string, EnrichedLiveCandle[]> = {};
      for (const [k, candleMap] of Object.entries(currentStore)) {
        nextState[k] = Object.values(candleMap).sort((a, b) => a.startTime.localeCompare(b.startTime));
      }
      setCandlesByInstrument(nextState);
    }
  }, []);

  // Fetch initial snapshot on mount or socket reconnect
  const fetchSnapshot = useCallback(async () => {
    if (!backendBase) return;
    try {
      const res = await fetch(`${backendBase}/api/candles/snapshot`);
      if (!res.ok) {
        console.warn(`Could not fetch candles snapshot: ${res.status}`);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        applyCandleList(data);
      }
    } catch (e) {
      console.warn('Failed to load /api/candles/snapshot:', e);
    }
  }, [backendBase, applyCandleList]);

  // Initial load
  useEffect(() => {
    if (enabled) {
      void fetchSnapshot();
    }
  }, [enabled, fetchSnapshot]);

  // Re-fetch snapshot when reconnecting
  const prevStatus = useRef(socketStatus);
  useEffect(() => {
    if (prevStatus.current !== 'connected' && socketStatus === 'connected' && enabled) {
      void fetchSnapshot();
    }
    prevStatus.current = socketStatus;
  }, [socketStatus, enabled, fetchSnapshot]);

  // Handle incoming STOMP message on /topic/candles
  const onCandleMessage = useCallback((raw: RawMessage) => {
    if (typeof raw !== 'string') return;
    try {
      const payload = JSON.parse(raw) as LiveCandleUpdateMessage;
      if (payload && Array.isArray(payload.candles)) {
        applyCandleList(payload.candles);
      }
    } catch (err) {
      console.warn('Error parsing /topic/candles message:', err);
    }
  }, [applyCandleList]);

  useStompTopicMessages('/topic/candles', onCandleMessage, enabled);

  return {
    candlesByInstrument,
    refreshSnapshot: fetchSnapshot,
  };
}
