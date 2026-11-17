'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMarketDataMessages, useMarketDataStatus, useMarketFeedMessages, useMarketFeedStatus } from '@/hooks/useMarketData';
import { decodeMarketFeed, instrumentFeed, mergeFeedRecords, type FeedRecord } from '@/lib/upstoxFeed';
import type { RawMessage } from '@/lib/marketDataSocket';
import { currentMonthOptionContracts, fetchOptionContracts, strikesNearPrice, type OptionContract } from '../../instrumentCatalog';

type ContractsState =
  | { key: string; status: 'loading' }
  | { key: string; status: 'empty' }
  | { key: string; status: 'available'; items: OptionContract[] }
  | { key: string; status: 'error'; message: string };

interface StrikeSelection {
  key: string;
  type: 'CE' | 'PE';
  price: number;
  expiry: string;
  items: OptionContract[];
}

function record(value: unknown): FeedRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as FeedRecord : {};
}

function display(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number' && Number.isFinite(value)) return value.toLocaleString('en-IN', { maximumFractionDigits: 4 });
  if (typeof value === 'string' && value.trim()) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString('en-IN', { maximumFractionDigits: 4 }) : value;
  }
  return '—';
}

function time(value: unknown): string {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '—';
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium',
  }).format(date);
}

function Fields({ fields }: { fields: [string, unknown][] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {fields.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs font-semibold text-slate-500">{label}</dt>
          <dd className="mt-1 break-words text-sm font-bold tabular-nums text-slate-900">{display(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

export default function ProfileClient({ instrumentKey, name }: { instrumentKey: string; name: string }) {
  const [feedData, setFeedData] = useState<{ key: string; value: FeedRecord }>({ key: instrumentKey, value: {} });
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [contracts, setContracts] = useState<ContractsState | null>(null);
  const [selection, setSelection] = useState<StrikeSelection | null>(null);
  const feed = useMarketFeedStatus(Boolean(instrumentKey));
  const stomp = useMarketDataStatus(Boolean(instrumentKey));

  useEffect(() => {
    setFeedData({ key: instrumentKey, value: {} });
    setUpdatedAt(null);
  }, [instrumentKey]);

  const underlyingKey = instrumentKey.replace('-', '|');
  const supportsContracts = /^(NSE|BSE)_(EQ|INDEX)\|.+/i.test(underlyingKey);
  const onMessage = (raw: RawMessage) => {
    const feeds = decodeMarketFeed(raw);
    if (!feeds) return;
    const selected = Object.entries(feeds).find(([key]) => key.replace('-', '|') === instrumentKey.replace('-', '|'))?.[1];
    if (!selected) return;
    const update = instrumentFeed(selected);
    if (!Object.keys(update).length) return;
    setFeedData((current) => ({
      key: instrumentKey,
      value: mergeFeedRecords(current.key === instrumentKey ? current.value : {}, update),
    }));
    setUpdatedAt(Date.now());
  };

  useMarketFeedMessages(onMessage, Boolean(instrumentKey));
  useMarketDataMessages((raw) => {
    if (typeof raw === 'string') onMessage(raw);
  }, Boolean(instrumentKey));

  const connected = feed.status === 'connected' || stomp.status === 'connected';
  const connecting = feed.status === 'connecting' || stomp.status === 'connecting';
  const data = feedData.key === instrumentKey ? feedData.value : {};
  const ltpc = record(data.ltpc);
  const depth = record(data.marketLevel).bidAskQuote;
  const firstDepth = record(data.firstDepth);
  const depthRows = Array.isArray(depth) ? depth.map(record) : Object.keys(firstDepth).length ? [firstDepth] : [];
  const lastPrice = Number(ltpc.ltp);
  const previousClose = Number(ltpc.cp);
  const hasChange = ltpc.ltp !== undefined && ltpc.cp !== undefined && Number.isFinite(lastPrice) && Number.isFinite(previousClose) && previousClose > 0;
  const change = hasChange ? lastPrice - previousClose : undefined;
  const percent = change !== undefined ? `${((change / previousClose) * 100).toFixed(2)}%` : undefined;
  const priceReady = connected && ltpc.ltp !== undefined && Number.isFinite(lastPrice) && lastPrice > 0;
  useEffect(() => {
    if (!supportsContracts || !priceReady) return;
    let active = true;
    setContracts({ key: underlyingKey, status: 'loading' });
    fetchOptionContracts(underlyingKey)
      .then((items) => {
        if (!active) return;
        const selected = currentMonthOptionContracts(items);
        setContracts(selected.length ? { key: underlyingKey, status: 'available', items } : { key: underlyingKey, status: 'empty' });
      })
      .catch((error: unknown) => {
        if (active) setContracts({ key: underlyingKey, status: 'error', message: error instanceof Error ? error.message : 'Could not load option contracts' });
      });
    return () => { active = false; };
  }, [supportsContracts, underlyingKey, priceReady]);

  const pullStrikes = (type: 'CE' | 'PE') => {
    if (!priceReady || !contracts || contracts.key !== underlyingKey || contracts.status !== 'available') return;
    const currentContracts = currentMonthOptionContracts(contracts.items);
    setSelection({
      key: underlyingKey,
      type,
      price: lastPrice,
      expiry: currentContracts[0]?.expiry ?? '',
      items: strikesNearPrice(currentContracts, lastPrice, type),
    });
  };

  return (
    <div className="min-h-screen bg-[#f3f7fb] px-4 py-8 md:px-8">
      <Link href="/alerts/live-market" className="text-sm font-bold text-cyan-700 hover:text-cyan-900">← Back to Live Market</Link>
      <header className="mb-6 mt-4 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-700">Live instrument profile</p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900 md:text-3xl">{name || instrumentKey || 'Instrument profile'}</h1>
          {instrumentKey && <p className="mt-1 break-all text-sm text-slate-500">{instrumentKey}</p>}
        </div>
        {instrumentKey && (
          <div className="text-sm">
            <span className={`rounded-full px-3 py-1 font-semibold ${connected ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {connected ? 'Feed connected' : connecting ? 'Connecting…' : 'Feed unavailable'}
            </span>
            {updatedAt && <p className="mt-3 text-xs text-slate-500">Last update: {time(updatedAt)} IST</p>}
          </div>
        )}
      </header>
      {!instrumentKey ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No instrument was specified. Return to Live Market and select Profile on an instrument.</p>
      ) : (
        <div className="space-y-4">
          <Section title="Option contracts">
            {!supportsContracts ? (
              <p className="text-sm text-slate-500">Option contracts are checked for stock and index profiles only.</p>
            ) : !priceReady ? (
              <p className="text-sm text-slate-500" role="status">{connected ? 'Waiting for a live price before fetching option contracts.' : 'Waiting for a connected feed and live price before fetching option contracts.'}</p>
            ) : !contracts || contracts.key !== underlyingKey || contracts.status === 'loading' ? (
              <p className="text-sm text-slate-500" role="status">Loading option contracts…</p>
            ) : contracts.status === 'error' ? (
              <p className="text-sm text-rose-700" role="alert">Could not load option contracts: {contracts.message}</p>
            ) : contracts.status === 'empty' ? (
              <p className="text-sm text-slate-500">No option contracts available for the current month.</p>
            ) : (
              <div>
                <p className="text-sm font-semibold text-emerald-700">Option contracts available for expiry {currentMonthOptionContracts(contracts.items)[0]?.expiry}.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['CE', 'PE'] as const).map((type) => (
                    <button key={type} type="button" disabled={!priceReady} onClick={() => pullStrikes(type)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">Pull {type}</button>
                  ))}
                </div>
                {!priceReady && <p className="mt-2 text-xs text-slate-500">A connected feed and live price are required to select strikes.</p>}
                {selection?.key === underlyingKey && (
                  <div className="mt-4" aria-live="polite">
                    <p className="text-sm font-semibold text-slate-700">{selection.type} strikes {selection.type === 'CE' ? 'above' : 'below'} {display(selection.price)}{selection.expiry ? ` · expiry ${selection.expiry}` : ''}</p>
                    {selection.items.length ? (
                      <>
                        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
                          {selection.items.map((item) => (
                            <li key={item.instrument_key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <span className="block text-sm font-bold text-slate-900">{display(item.strike_price)}</span>
                              <span className="block break-words text-xs text-slate-600">{item.trading_symbol}</span>
                            </li>
                          ))}
                        </ul>
                        {selection.items.length < 3 && <p className="mt-2 text-xs text-slate-500">Only {selection.items.length} matching {selection.items.length === 1 ? 'strike is' : 'strikes are'} available.</p>}
                      </>
                    ) : <p className="mt-2 text-sm text-slate-500">No matching strikes available for the current month.</p>}
                  </div>
                )}
              </div>
            )}
          </Section>
          {!updatedAt && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {connected ? 'Waiting for this instrument’s next feed update. Data may be unavailable outside market hours or if it is not subscribed.' : feed.error ?? stomp.error ?? 'Connecting to the market feed. Data may be unavailable outside market hours.'}
          </p>}
          {updatedAt && !connected && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Feed disconnected. Showing the last received values; they may be stale.</p>}
          <Section title="Quote">
            <Fields fields={[
              ['Last traded price', ltpc.ltp], ['Previous close', ltpc.cp], ['Day change', change],
              ['Day change %', percent], ['Last traded quantity', ltpc.ltq], ['Last traded time (IST)', time(ltpc.ltt)],
            ]} />
          </Section>
          <Section title="Market activity">
            <Fields fields={[
              ['Average traded price', data.atp], ['Volume traded', data.vtt], ['Total buy quantity', data.tbq],
              ['Total sell quantity', data.tsq],
            ]} />
          </Section>
          <Section title="Market depth">
            {depthRows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-500"><tr><th className="p-2">Level</th><th className="p-2">Bid quantity</th><th className="p-2">Bid price</th><th className="p-2">Ask price</th><th className="p-2">Ask quantity</th></tr></thead>
                  <tbody>{depthRows.map((row, i) => <tr key={i} className="border-t border-slate-100 tabular-nums"><td className="p-2">{i + 1}</td><td className="p-2">{display(row.bidQ)}</td><td className="p-2">{display(row.bidP)}</td><td className="p-2">{display(row.askP)}</td><td className="p-2">{display(row.askQ)}</td></tr>)}</tbody>
                </table>
              </div>
            ) : <p className="text-sm text-slate-500">Market depth has not been received.</p>}
          </Section>
          <p className="text-xs text-slate-500">Only data supplied by the live feed is shown. A dash means the field has not been received.</p>
        </div>
      )}
    </div>
  );
}
