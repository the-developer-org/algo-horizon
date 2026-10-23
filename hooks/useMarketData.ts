'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { marketDataSocket, MarketDataStatus, RawMessage } from '@/lib/marketDataSocket';

/** Connection status only; rerenders only when status changes (not per message). */
export function useMarketDataStatus(enabled = true): { status: MarketDataStatus; error: string | null } {
  useEffect(() => {
    if (!enabled) return;
    marketDataSocket.acquire();
    return () => marketDataSocket.release();
  }, [enabled]);
  const status = useSyncExternalStore(
    marketDataSocket.subscribeStatus,
    marketDataSocket.getStatus,
    () => 'disconnected' as MarketDataStatus,
  );
  return { status, error: marketDataSocket.getError() };
}

/**
 * Subscribe to raw messages from the shared socket. The callback is invoked for
 * every message with the original payload; it never causes a rerender by itself.
 */
export function useMarketDataMessages(onMessage: (raw: RawMessage) => void) {
  const ref = useRef(onMessage);
  ref.current = onMessage;
  useEffect(() => marketDataSocket.subscribe((raw) => ref.current(raw)), []);
}

/** Optional parsing step, outside the transport. Returns null for non-JSON. */
export function useParsedMessage() {
  return useCallback((raw: RawMessage): unknown | null => {
    if (typeof raw !== 'string') return null;
    try { return JSON.parse(raw); } catch { return null; }
  }, []);
}
