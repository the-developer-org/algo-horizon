'use client';

import { useRef, useState } from 'react';
import { useMarketDataMessages, useMarketDataStatus } from '@/hooks/useMarketData';
import type { RawMessage } from '@/lib/marketDataSocket';

const MAX_SHOWN = 50;
const describe = (m: RawMessage) =>
  typeof m === 'string' ? m : `[binary ${m.byteLength} bytes]`;

export default function MarketDataTestPage() {
  const { status, error } = useMarketDataStatus();
  const [latest, setLatest] = useState<string>('');
  const [recent, setRecent] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const buf = useRef<string[]>([]);
  const total = useRef(0);
  const raf = useRef<number | null>(null);

  // Batching is UI-only; every message is still received here unmodified.
  useMarketDataMessages((raw) => {
    buf.current.push(describe(raw));
    total.current++;
    if (raf.current === null) {
      raf.current = requestAnimationFrame(() => {
        raf.current = null;
        const batch = buf.current;
        buf.current = [];
        setLatest(batch[batch.length - 1]);
        setCount(total.current);
        setRecent((p) => [...batch.reverse(), ...p].slice(0, MAX_SHOWN));
      });
    }
  });

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">Market Data WebSocket Test</h1>
      <p>Status: <b>{status}</b>{error && <span className="text-red-600"> ({error})</span>} · Received: {count}</p>
      <div>
        <h2 className="font-medium">Latest message</h2>
        <pre className="bg-gray-100 p-2 text-xs overflow-auto max-h-48 whitespace-pre-wrap break-all">{latest || '—'}</pre>
      </div>
      <div>
        <h2 className="font-medium">Recent messages (last {MAX_SHOWN})</h2>
        <ul className="text-xs space-y-1 max-h-96 overflow-auto">
          {recent.map((m, i) => <li key={i} className="bg-gray-50 p-1 break-all">{m}</li>)}
        </ul>
      </div>
    </div>
  );
}
