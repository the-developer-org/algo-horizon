'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useMarketDataMessages, useMarketDataStatus, useMarketFeedMessages, useMarketFeedStatus } from '@/hooks/useMarketData';
import { fetchKeyMapping } from '@/utils/apiUtils';
import { decodeUpstoxFeed } from '@/lib/upstoxFeed';
import type { RawMessage } from '@/lib/marketDataSocket';
import { InstrumentQuote } from '../InstrumentQuote';
import { DerivativePicker, InstrumentKindTabs, modalTheme } from '../InstrumentPicker';
import { INSTRUMENT_TABS, sessionClose, todaySessionClose, type InstrumentTab } from '../instrumentCatalog';

interface Quote {
  ltp?: number;
  cp?: number; // previous close
  ltt?: string;
  dir: 'up' | 'down' | 'flat';
  updatedAt: number;
}

interface MarketAlert {
  id: string;
  instrumentKey: string;
  companyName?: string;
  targetPrice?: number;
  entryPrice?: number;
  stopLoss?: number;
  tickSource?: string;
}

function normalizeKey(key: string) {
  return key.replace('-', '|');
}

async function readApiError(response: Response, fallback: string) {
  const text = await response.text();
  if (!text.trim()) return fallback;
  try {
    const body = JSON.parse(text) as { statusText?: unknown; message?: unknown; error?: unknown };
    const message = [body.statusText, body.message, body.error].find((value) => typeof value === 'string' && value.trim());
    if (typeof message === 'string') return message.trim();
  } catch {
    // Response is plain text.
  }
  return text.trim();
}

// Extracts ltp/cp per instrument from an Upstox-style JSON feed ({ feeds: { KEY: {...} } }).
// Parsing lives here, outside the transport; the raw message is untouched.
function extract(raw: RawMessage): Record<string, { ltp?: number; cp?: number; ltt?: string }> | null {
  if (typeof raw !== 'string') {
    const d = decodeUpstoxFeed(raw);
    if (!d) return null;
    const o: Record<string, { ltp?: number; cp?: number; ltt?: string }> = {};
    for (const [k, v] of Object.entries(d)) o[k] = { ltp: v.ltp, cp: v.cp, ltt: v.ltt !== undefined ? String(v.ltt) : undefined };
    return o;
  }
  let msg: any;
  try { msg = JSON.parse(raw); } catch { return null; }
  const feeds = msg?.feeds;
  if (!feeds || typeof feeds !== 'object') return null;
  const out: Record<string, { ltp?: number; cp?: number; ltt?: string }> = {};
  for (const key of Object.keys(feeds)) {
    const f = feeds[key];
    const ltpc =
      f?.fullFeed?.marketFF?.ltpc ?? f?.fullFeed?.indexFF?.ltpc ?? f?.ltpc ?? f?.firstLevelWithGreeks?.ltpc;
    if (ltpc) out[key] = { ltp: ltpc.ltp, cp: ltpc.cp, ltt: ltpc.ltt };
  }
  return out;
}

const STATUS_STYLE: Record<string, string> = {
  connected: 'bg-green-100 text-green-700 border-green-300',
  connecting: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  disconnected: 'bg-gray-100 text-gray-600 border-gray-300',
  error: 'bg-red-100 text-red-700 border-red-300',
};
const STATUS_LABEL: Record<string, string> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  disconnected: 'Disconnected',
  error: 'Not connected – retrying',
};

// Live window: Mon-Fri, 09:14 to 15:31 IST.
const START_MIN = 9 * 60 + 14;
const END_MIN = 15 * 60 + 31;

function isLiveWindow(): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  if (get('weekday') === 'Sat' || get('weekday') === 'Sun') return false;
  const mins = Number(get('hour')) * 60 + Number(get('minute'));
  return mins >= START_MIN && mins <= END_MIN;
}

export default function LiveMarketPage() {
  const [momentumFilter, setMomentumFilter] = useState<'all' | 'up' | 'down'>('all');
  const [changeOrder, setChangeOrder] = useState<'default' | 'positive' | 'negative'>('default');
  const [inWindow, setInWindow] = useState(false);
  useEffect(() => {
    const check = () => setInWindow(isLiveWindow());
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, []);
  const feed = useMarketFeedStatus(inWindow);
  const stomp = useMarketDataStatus(inWindow);
  const status = feed.status === 'connected' || stomp.status === 'connected' ? 'connected' : feed.status;
  const error = status === 'connected' ? null : feed.error ?? stomp.error;
  const [baseline, setBaseline] = useState<Record<string, number>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [trackedKeys, setTrackedKeys] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<InstrumentTab>('stocks');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<{ key: string; name: string; expiry?: string; instrumentKey?: string } | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [levels, setLevels] = useState<Record<string, { targetPrice?: number; entryPrice?: number; stopLoss?: number }>>({});
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [autoExpire, setAutoExpire] = useState(false);
  const [liveIndexes, setLiveIndexes] = useState<Record<string, string[]>>({});
  const [selectedIndex, setSelectedIndex] = useState<string | null>(null);

  // Names from the Redis KeyMapping (name -> key).
  useEffect(() => {
    let active = true;
    fetchKeyMapping()
      .then((m) => {
        if (!active) return;
        const rev: Record<string, string> = {};
        for (const [name, key] of Object.entries(m)) rev[String(key)] = name;
        setNames(rev);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const backendBase = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');

  const applyActiveAlerts = (list: MarketAlert[]) => {
    setAlerts(list);
    setTrackedKeys(list.map((alert) => normalizeKey(alert.instrumentKey)).filter(Boolean));
  };

  const loadActiveAlerts = async () => {
    const response = await fetch(`${backendBase}/api/alerts/active`);
    if (!response.ok) {
      throw new Error(await readApiError(response, `Could not load active alerts (${response.status})`));
    }
    const data = await response.json();
    const list = Array.isArray(data) ? data as MarketAlert[] : [];
    applyActiveAlerts(list);
    return list;
  };

  const loadLiveIndexes = async () => {
    try {
      const response = await fetch(`${backendBase}/api/alerts/live-indexes`);
      if (response.ok) {
        const data = await response.json() as Record<string, string[]>;
        setLiveIndexes(data);
        const firstIndex = Object.keys(data)[0];
        if (firstIndex) {
          setSelectedIndex(firstIndex);
        }
      }
    } catch (e) {
      console.error('Could not load live indexes:', e);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      loadActiveAlerts().catch((e) => {
        if (active) toast.error(e instanceof Error ? e.message : 'Could not load active alerts');
      }),
      loadLiveIndexes()
    ]);
    return () => { active = false; };
  }, [backendBase]);

  const companyOptions = Object.entries(names)
    .map(([key, name]) => ({ key, name }))
    .filter(({ key, name }) =>
      !trackedKeys.includes(key) &&
      `${name} ${key}`.toLowerCase().includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 30);

  const parsePrice = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const parsedTarget = parsePrice(targetPrice);
  const parsedEntry = parsePrice(entryPrice);
  const parsedStopLoss = parsePrice(stopLoss);
  const hasAnyPrice = tab === 'indexes' || autoExpire || parsedTarget !== undefined || parsedEntry !== undefined || parsedStopLoss !== undefined;

  const resetAddForm = () => {
    setAddOpen(false);
    setSearch('');
    setSelectedStock(null);
    setTargetPrice('');
    setEntryPrice('');
    setStopLoss('');
  };

  const theme = modalTheme(tab);
  const mappedCompanies = Object.entries(names).map(([key, name]) => ({ key, name }));

  const addInstrument = async () => {
    if (!selectedStock || !hasAnyPrice) return;
    const { key, name, expiry: contractExpiry } = selectedStock;
    setBusyKey(key);
    try {
      if (tab === 'indexes') {
        // For indexes, key is like NIFTY_50, instrumentKey is like NSE_INDEX|Nifty 50
        const indexKey = key; // e.g., NIFTY_50
        const indexInstrumentKey = selectedStock.instrumentKey || `NSE_INDEX|${key}`; // Fallback if not provided
        
        // Call the index API to add alerts for all constituent stocks
        const indexResponse = await fetch(`${backendBase}/api/alerts/add/index/${encodeURIComponent(indexKey)}`, {
          method: 'POST',
        });
        if (!indexResponse.ok) {
          throw new Error(await readApiError(indexResponse, `Could not add index alerts (${indexResponse.status})`));
        }
        
        // Also save an index alert record with the correct instrument key
        // For indexes, always expire in 1 day
        const alertResponse = await fetch(`${backendBase}/api/alerts/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: name,
            instrumentKey: indexInstrumentKey,
            alertType: 'INDEX_MONITORING',
            tickSource: 'INDEX_MONITORING',
            expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19),
            toBeExpiredInDays: 1,
          }),
        });
        if (!alertResponse.ok) {
          console.error('Could not save index alert record:', await readApiError(alertResponse, 'Unknown error'));
        }
        
        try {
          await Promise.all([loadActiveAlerts(), loadLiveIndexes()]);
        } catch {
          setTrackedKeys((current) => current.includes(key) ? current : [...current, key]);
        }
        resetAddForm();
        toast.success(`${name} index alerts added`);
      } else {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + (autoExpire ? 1 : 30));
        const tickSource = tab === 'options' ? 'STOCK_OPTIONS' : 'REGULAR_MONITORING';
        const expiryDate = tab === 'options'
          ? (contractExpiry ? sessionClose(contractExpiry) : undefined)
          : expiry.toISOString().slice(0, 19);
        if (!expiryDate) {
          throw new Error('Option expiry is missing');
        }
        const alertResponse = await fetch(`${backendBase}/api/alerts/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: name,
            instrumentKey: key,
            alertType: 'PRICE_REACHED',
            ...(parsedTarget !== undefined ? { targetPrice: parsedTarget } : {}),
            ...(parsedEntry !== undefined ? { entryPrice: parsedEntry } : {}),
            ...(parsedStopLoss !== undefined ? { stopLoss: parsedStopLoss } : {}),
            priceBasedExit: true,
            tickSource,
            expiryDate,
            ...(autoExpire ? { toBeExpiredInDays: 1 } : {}),
          }),
        });
        if (!alertResponse.ok) {
          throw new Error(await readApiError(alertResponse, `Could not save prices (${alertResponse.status})`));
        }
        const saved = await alertResponse.json().catch(() => null) as MarketAlert | null;
        try {
          await loadActiveAlerts();
        } catch {
          setTrackedKeys((current) => current.includes(key) ? current : [...current, key]);
          if (saved?.id) {
            setAlerts((current) => [...current.filter((alert) => alert.id !== saved.id), saved]);
          }
        }
        setLevels((current) => ({
          ...current,
          [key]: { targetPrice: parsedTarget, entryPrice: parsedEntry, stopLoss: parsedStopLoss },
        }));
        resetAddForm();
        toast.success(`${name} added to Live Market`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add instrument');
    } finally {
      setBusyKey(null);
    }
  };

  const removeInstrument = async (alert: MarketAlert) => {
    if (alert.tickSource !== 'REGULAR_MONITORING' || !alert.id) return;
    const key = normalizeKey(alert.instrumentKey);
    setBusyKey(key);
    try {
      const response = await fetch(`${backendBase}/api/alerts/delete/${encodeURIComponent(alert.id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, `Could not delete alert (${response.status})`));
      }
      setAlerts((current) => current.filter((item) => item.id !== alert.id));
      setTrackedKeys((current) => current.filter((item) => item !== key));
      setBaseline((current) => {
        const next = { ...current };
        delete next[key];
        delete next[key.replace('|', '-')];
        return next;
      });
      setQuotes((current) => {
        const next = { ...current };
        delete next[key];
        latest.current = next;
        return next;
      });
      toast.success(`${alert.companyName ?? names[key] ?? key} removed from Live Market`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove instrument');
    } finally {
      setBusyKey(null);
    }
  };
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [binarySeen, setBinarySeen] = useState(false);
  const [received, setReceived] = useState(0);
  const [sample, setSample] = useState('');
  const receivedRef = useRef(0);
  const pending = useRef<Record<string, { ltp?: number; cp?: number; ltt?: string }>>({});
  const latest = useRef<Record<string, Quote>>({});
  const raf = useRef<number | null>(null);

  // Updates are coalesced per animation frame in the UI layer only.
  const onMarketMessage = (raw: RawMessage) => {
    receivedRef.current++;
    if (receivedRef.current <= 3 || receivedRef.current % 50 === 0) {
      setReceived(receivedRef.current);
      setSample(typeof raw === 'string' ? raw.slice(0, 600) : `[binary ${raw.byteLength} bytes]`);
    }
    const data = extract(raw);
    if (!data) {
      if (typeof raw !== 'string') setBinarySeen(true);
      return;
    }
    Object.assign(pending.current, data);
    if (raf.current !== null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      const batch = pending.current;
      pending.current = {};
      const next = { ...latest.current };
      const now = Date.now();
      for (const [rawKey, v] of Object.entries(batch)) {
        const k = normalizeKey(rawKey);
        const prev = next[k];
        const ltp = v.ltp ?? prev?.ltp;
        const dir = prev?.ltp !== undefined && ltp !== undefined
          ? ltp > prev.ltp ? 'up' : ltp < prev.ltp ? 'down' : prev.dir
          : 'flat';
        next[k] = { ltp, cp: v.cp ?? prev?.cp, ltt: v.ltt ?? prev?.ltt, dir, updatedAt: now };
      }
      latest.current = next;
      setQuotes(next);
    });
  };
  useMarketFeedMessages(onMarketMessage);
  useMarketDataMessages(onMarketMessage);

  useEffect(() => () => { if (raf.current !== null) cancelAnimationFrame(raf.current); }, []);

  // Live ticks override the last-known backend prices.
  const merged: Record<string, Quote> = {};
  for (const [k, v] of Object.entries(baseline)) {
    if (typeof v === 'number') merged[k.replace('-', '|')] = { ltp: v, dir: 'flat', updatedAt: 0 };
  }
  for (const [k, q] of Object.entries(quotes)) merged[k] = q;
  for (const k of trackedKeys) {
    if (!merged[k]) merged[k] = { dir: 'flat', updatedAt: 0 };
  }
  const alertFor = (k: string) => alerts.find((alert) => normalizeKey(alert.instrumentKey) === normalizeKey(k));
  const nameOf = (k: string) => alertFor(k)?.companyName || names[k] || names[k.replace('|', '-')];
  const allRows = Object.entries(merged);
  const rows = allRows
    .filter(([key]) => {
      const alert = alertFor(key);
      const companyNameUpper = alert?.companyName?.toUpperCase() || '';
      const normalizedKey = key.toUpperCase();
      
      if (tab === 'stocks') {
        return !companyNameUpper.includes(' CE') && !companyNameUpper.includes(' PE') && !normalizedKey.includes('NIFTY');
      }
      if (tab === 'indexes') {
        // Only show companies that belong to the selected index
        if (selectedIndex && liveIndexes[selectedIndex]) {
          const companyName = nameOf(key);
          return liveIndexes[selectedIndex].includes(companyName);
        }
        return false;
      }
      if (tab === 'options') {
        return companyNameUpper.includes(' CE') || companyNameUpper.includes(' PE');
      }
      return true;
    })
    .filter(([, quote]) => momentumFilter === 'all' || quote.dir === momentumFilter)
    .sort(([keyA, quoteA], [keyB, quoteB]) => {
      // For indexes tab, always sort by change percentage (highest first)
      if (tab === 'indexes') {
        const changeA = quoteA.ltp !== undefined && quoteA.cp ? ((quoteA.ltp - quoteA.cp) / quoteA.cp) * 100 : null;
        const changeB = quoteB.ltp !== undefined && quoteB.cp ? ((quoteB.ltp - quoteB.cp) / quoteB.cp) * 100 : null;
        if (changeA === null && changeB !== null) return 1;
        if (changeB === null && changeA !== null) return -1;
        if (changeA !== null && changeB !== null && changeA !== changeB) {
          return changeB - changeA; // Sort descending (highest change first)
        }
      }
      
      if (changeOrder !== 'default') {
        const changeA = quoteA.ltp !== undefined && quoteA.cp ? quoteA.ltp - quoteA.cp : null;
        const changeB = quoteB.ltp !== undefined && quoteB.cp ? quoteB.ltp - quoteB.cp : null;
        if (changeA === null && changeB !== null) return 1;
        if (changeB === null && changeA !== null) return -1;
        if (changeA !== null && changeB !== null && changeA !== changeB) {
          return changeOrder === 'positive' ? changeB - changeA : changeA - changeB;
        }
      }
      return (nameOf(keyA) ?? keyA).localeCompare(nameOf(keyB) ?? keyB);
    });

  return (
    <div className="min-h-screen bg-[#f3f7fb] bg-[radial-gradient(ellipse_at_top_right,_rgba(34,211,238,0.12),_transparent_38%),linear-gradient(135deg,#f8fafc_0%,#eef5f7_55%,#f0fdf4_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-5 border-b border-slate-100 px-6 py-5 md:px-8">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.18em] text-red-700">
                  <span className="lm-live-dot inline-block h-2 w-2 rounded-full bg-red-600" />
                  LIVE FEED
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Live Market</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full border px-3 py-2 text-sm font-semibold ${STATUS_STYLE[status]}`}>
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-current" />
                {inWindow ? STATUS_LABEL[status] : 'Market closed'}
              </span>
              <span className="text-xs font-medium text-slate-500">{allRows.length} subscribed</span>
              <div className="rounded-md border border-slate-200 bg-white">
                {INSTRUMENT_TABS.map((tabItem, index) => (
                  <button
                    key={tabItem.id}
                    type="button"
                    onClick={() => setTab(tabItem.id)}
                    aria-pressed={tab === tabItem.id}
                    className={`px-3 py-1.5 text-xs font-semibold transition ${
                      index === 0 ? 'rounded-l-md border-r border-slate-200' : index === INSTRUMENT_TABS.length - 1 ? 'rounded-r-md' : 'border-r border-slate-200'
                    } ${tab === tabItem.id ? 'bg-green-600 text-black border-green-600' : 'bg-slate-50 text-black hover:bg-slate-100'}`}
                  >
                    {tabItem.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
              >
                + Add stock
              </button>
            </div>
          </div>
        </header>
        {tab === 'indexes' && Object.keys(liveIndexes).length > 0 && (
          <div className="mb-6 overflow-x-auto rounded-lg border border-slate-200 bg-white/50 backdrop-blur">
            <div className="flex gap-1 p-2 md:p-3" role="tablist" aria-label="Select Nifty index">
              {Object.keys(liveIndexes).map((indexKey) => (
                <button
                  key={indexKey}
                  type="button"
                  role="tab"
                  aria-selected={selectedIndex === indexKey}
                  onClick={() => setSelectedIndex(indexKey)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    selectedIndex === indexKey
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {indexKey}
                </button>
              ))}
            </div>
          </div>
        )}
        {!inWindow && rows.length > 0 && (
          <p className="mb-4 text-sm text-gray-500">Market closed – showing last known prices. Live feed runs Mon–Fri, 9:14 AM – 3:31 PM IST.</p>
        )}
        {allRows.length > 0 && tab !== 'indexes' && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" aria-label="Filter by tick momentum">
              {([
                ['all', 'All stocks'],
                ['up', 'Upward momentum'],
                ['down', 'Downward momentum'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMomentumFilter(value)}
                  aria-pressed={momentumFilter === value}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    momentumFilter === value
                      ? value === 'up'
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : value === 'down'
                          ? 'border-rose-600 bg-rose-600 text-white'
                          : 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
              Sort day change
              <select
                value={changeOrder}
                onChange={(event) => setChangeOrder(event.target.value as typeof changeOrder)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-500"
              >
                <option value="default">Company name</option>
                <option value="positive">Most positive first</option>
                <option value="negative">Most negative first</option>
              </select>
            </label>
          </div>
        )}
        {allRows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white/80 py-20 text-center text-slate-500 shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-400">⌁</div>
            {!inWindow
              ? 'Market closed. No instruments subscribed.'
              : status === 'connected'
                ? 'Connected. No prices yet.'
                : 'Not connected.'}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white/80 py-16 text-center text-slate-500 shadow-sm">
            No instruments match this momentum filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map(([key, q]) => {
              const change = q.ltp !== undefined && q.cp ? q.ltp - q.cp : undefined;
              const pct = change !== undefined && q.cp ? (change / q.cp) * 100 : undefined;
              const color = change === undefined ? 'text-gray-700' : change >= 0 ? 'text-green-600' : 'text-red-600';
              const border = change === undefined ? 'border-slate-200' : change >= 0 ? 'border-emerald-200' : 'border-rose-200';
              const alert = alertFor(key);
              const target = alert?.targetPrice || levels[key]?.targetPrice;
              const entry = alert?.entryPrice || levels[key]?.entryPrice;
              const sl = alert?.stopLoss || levels[key]?.stopLoss;
              const canDelete = alert?.tickSource === 'REGULAR_MONITORING';
              return (
                <div
                  key={key}
                  className={`group relative overflow-hidden rounded-2xl border ${border} bg-white p-5 shadow-[0_5px_20px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(15,23,42,0.12)]`}
                >
                  <div className={`absolute inset-x-0 top-0 h-1 ${change === undefined ? 'bg-slate-200' : change >= 0 ? 'bg-gradient-to-r from-emerald-300 to-teal-500' : 'bg-gradient-to-r from-rose-300 to-red-500'}`} />
                  {canDelete && (
                    <button
                      type="button"
                      disabled={busyKey === key}
                      onClick={() => alert && void removeInstrument(alert)}
                      className="absolute right-3 top-3 z-10 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      {busyKey === key ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                  {/* key=updatedAt restarts the flash animation on every tick */}
                  <div
                    key={q.updatedAt}
                    className={`rounded-lg px-1 py-2 ${q.dir === 'up' ? 'lm-flash-up' : q.dir === 'down' ? 'lm-flash-down' : ''}`}
                  >
                    <div className={`truncate text-sm font-bold tracking-wide text-slate-700 ${canDelete ? 'pr-16' : ''}`}>{nameOf(key) ?? key}</div>
                    <div className="mb-4 mt-5 flex items-end justify-between gap-2">
                      <div className={`text-3xl font-extrabold tracking-tight tabular-nums ${color}`}>
                        {q.ltp?.toFixed(2) ?? '—'}
                      </div>
                      {q.dir !== 'flat' && (
                        <span className={`mb-1 rounded-md px-2 py-1 text-xs font-bold ${q.dir === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {q.dir === 'up' ? '▲ TICK UP' : '▼ TICK DOWN'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-xs font-medium text-slate-400">DAY CHANGE</span>
                      <span className={`text-sm font-bold tabular-nums ${color}`}>
                        {change !== undefined ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}  (${pct!.toFixed(2)}%)` : '—'}
                      </span>
                    </div>
                    {(target || entry || sl) && (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
                        <span className="text-green-600">T {target || '—'}</span>
                        <span className="text-amber-600">E {entry || '—'}</span>
                        <span className="text-red-600">SL {sl || '—'}</span>
                      </div>
                    )}
                    {alert?.tickSource && alert.tickSource !== 'REGULAR_MONITORING' && (
                      <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {alert.tickSource.replace(/_/g, ' ')}
                      </div>
                    )}
                    {q.dir === 'flat' && (
                      <div className="mt-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Waiting for tick</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {addOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) resetAddForm();
          }}>
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-stock-title"
              className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${theme.shell}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 id="add-stock-title" className={`text-lg font-bold ${theme.title}`}>
                  {selectedStock ? selectedStock.name : 'Add to Live Market'}
                </h2>
                <button type="button" onClick={resetAddForm} className={`text-2xl leading-none ${theme.close}`} aria-label="Close">×</button>
              </div>
              {selectedStock ? (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={tab === 'indexes' ? true : autoExpire}
                      onChange={(event) => setAutoExpire(event.target.checked)}
                      disabled={tab === 'indexes'}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 disabled:opacity-50"
                    />
                    <span className="text-sm font-medium text-slate-700">Auto expire in 1 day</span>
                  </label>
                  <InstrumentQuote instrumentKey={selectedStock.instrumentKey || selectedStock.key} tab={tab} />
                  {tab !== 'indexes' && (
                    <>
                      <input
                        autoFocus
                        type="number"
                        value={targetPrice}
                        onChange={(event) => setTargetPrice(event.target.value)}
                        placeholder="Target Price"
                        disabled={autoExpire}
                        className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 ${theme.input}`}
                      />
                      <input
                        type="number"
                        value={entryPrice}
                        onChange={(event) => setEntryPrice(event.target.value)}
                        placeholder="Entry Price"
                        disabled={autoExpire}
                        className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 ${theme.input}`}
                      />
                      <input
                        type="number"
                        value={stopLoss}
                        onChange={(event) => setStopLoss(event.target.value)}
                        placeholder="Stop Loss"
                        disabled={autoExpire}
                        className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 ${theme.input}`}
                      />
                      <p className={`text-xs ${theme.muted}`}>
                        At least one price is required.
                        {tab === 'options' ? ' Expiry is the option expiry at 3:30pm.' : ' Expiry is set to 30 days.'}
                      </p>
                    </>
                  )}
                  {tab === 'indexes' && (
                    <p className={`text-xs ${theme.muted}`}>
                      Index alerts will be added for all constituent stocks.
                    </p>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedStock(null)}
                      className={`rounded-md border px-3 py-2 text-sm font-semibold ${theme.tabIdle}`}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={busyKey !== null || !hasAnyPrice}
                      onClick={() => void addInstrument()}
                      className={`rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50 ${theme.button}`}
                    >
                      {busyKey === selectedStock.key ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <InstrumentKindTabs
                    tab={tab}
                    onChange={(next) => {
                      setTab(next);
                      setSearch('');
                    }}
                  />
                  {tab === 'stocks' ? (
                    <>
                  <input
                    autoFocus
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search companies…"
                    className={`mb-3 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 ${theme.input}`}
                  />
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {companyOptions.map(({ key, name }) => (
                      <div key={key} className="flex items-center justify-between gap-3 rounded-md border border-gray-100 px-3 py-2">
                        <span className="truncate text-sm text-gray-800">{name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStock({ key, name });
                            setTargetPrice('');
                            setEntryPrice('');
                            setStopLoss('');
                          }}
                          className="shrink-0 rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                    {companyOptions.length === 0 && (
                      <p className={`py-8 text-center text-sm ${theme.muted}`}>
                        {Object.keys(names).length === 0 ? 'Loading company list…' : 'No matching companies found.'}
                      </p>
                    )}
                  </div>
                    </>
                  ) : (
                    <DerivativePicker
                      key={tab}
                      tab={tab}
                      companies={mappedCompanies}
                      onPick={(item) => {
                        setSelectedStock(item);
                        setTargetPrice('');
                        setEntryPrice('');
                        setStopLoss('');
                      }}
                    />
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
