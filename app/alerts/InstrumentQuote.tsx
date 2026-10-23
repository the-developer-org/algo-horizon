'use client';

import { useEffect, useState } from 'react';
import type { InstrumentTab } from './instrumentCatalog';

interface Quote {
  price: number;
  minute: string;
  lastMinutePrice: number;
  lastMinute: string;
  lastMinuteHigh?: number;
  lastMinuteLow?: number;
}

function money(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '—';
}

function clock(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(11, 16);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function InstrumentQuote({
  instrumentKey,
  tab,
}: {
  instrumentKey: string;
  tab: InstrumentTab;
}) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setQuote(null);
    const params = new URLSearchParams({ instrument_key: instrumentKey });
    fetch(`/api/upstox/intraday-quote?${params}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.statusText || 'Could not load price');
        return body as Quote;
      })
      .then((body) => {
        if (!controller.signal.aborted) setQuote(body);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : 'Could not load price');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [instrumentKey]);

  const tone = tab === 'options'
    ? 'border-red-800 bg-black text-red-100'
    : tab === 'indexes'
      ? 'border-zinc-700 bg-zinc-950 text-zinc-100'
      : 'border-green-200 bg-green-50 text-slate-800';
  const muted = tab === 'stocks' ? 'text-slate-500' : 'opacity-70';

  return (
    <div className={`rounded-md border px-3 py-2 text-xs ${tone}`}>
      {loading && <p className={muted}>Loading last traded price…</p>}
      {!loading && error && <p className={tab === 'stocks' ? 'text-red-600' : 'text-red-300'}>{error}</p>}
      {!loading && quote && (
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={`font-semibold uppercase tracking-wide ${muted}`}>Live price</p>
            <p className="text-lg font-bold leading-tight">{money(quote.price)}</p>
            <p className={muted}>{clock(quote.minute)} IST</p>
          </div>
          <div className="text-right">
            <p className={`font-semibold uppercase tracking-wide ${muted}`}>Last minute</p>
            <p className="text-lg font-bold leading-tight">{money(quote.lastMinutePrice)}</p>
            <p className={muted}>
              {clock(quote.lastMinute)} IST
              {typeof quote.lastMinuteLow === 'number' && typeof quote.lastMinuteHigh === 'number'
                ? ` · ${money(quote.lastMinuteLow)}–${money(quote.lastMinuteHigh)}`
                : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
