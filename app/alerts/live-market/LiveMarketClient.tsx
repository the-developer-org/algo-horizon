'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useMarketDataMessages, useMarketDataStatus, useMarketFeedMessages, useMarketFeedStatus } from '@/hooks/useMarketData';
import { fetchKeyMapping } from '@/utils/apiUtils';
import { decodeUpstoxFeed } from '@/lib/upstoxFeed';
import type { RawMessage } from '@/lib/marketDataSocket';
import { InstrumentQuote } from '../InstrumentQuote';
import { DerivativePicker, InstrumentKindTabs, modalTheme } from '../InstrumentPicker';
import { indexForSector, INSTRUMENT_TABS, sessionClose, todaySessionClose, type InstrumentTab } from '../instrumentCatalog';

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

interface OpeningCandle {
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface GapUpInfo {
  prevClose?: number;
  todayOpen?: number;
  gapPercent?: number;
  candles: OpeningCandle[];
}

interface RawCandle {
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  timestamp?: string;
}

interface RawClosingEntry {
  instrumentKey?: string;
  candlesList?: RawCandle[];
  prevClose?: number;
  todayOpen?: number;
}

interface SectorialChange {
  sectorName: string;
  chgValue: number;
}

function normalizeKey(key: string) {
  return key.replace('-', '|');
}

function chartUrlForInstrument(instrumentKey: string, levels?: { entry?: number; target?: number; stopLoss?: number }) {
  const params = new URLSearchParams({
    instrumentKey,
    timeframe: '1d',
  });
  if (levels?.entry) params.set('entryPrice', String(levels.entry));
  if (levels?.target) params.set('targetPrice', String(levels.target));
  if (levels?.stopLoss) params.set('stopLossPrice', String(levels.stopLoss));
  return `/chart?${params.toString()}`;
}

function istToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function candleLabel(timestamp: string) {
  const [hour, minute] = timestamp.slice(11, 16).split(':');
  return `${Number(hour)}:${minute}`;
}

function toGapInfo(entry: RawClosingEntry): GapUpInfo | null {
  if (Array.isArray(entry.candlesList)) {
    const today = istToday();
    const candles = entry.candlesList
      .filter((candle): candle is RawCandle & { open: number; high: number; low: number; close: number; timestamp: string } =>
        typeof candle.timestamp === 'string' &&
        typeof candle.open === 'number' &&
        Number.isFinite(candle.open) &&
        typeof candle.high === 'number' &&
        Number.isFinite(candle.high) &&
        typeof candle.low === 'number' &&
        Number.isFinite(candle.low) &&
        typeof candle.close === 'number' &&
        Number.isFinite(candle.close),
      )
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const prior = [...candles].reverse().find((candle) => candle.timestamp.slice(0, 10) < today);
    const todays = candles.filter((candle) => candle.timestamp.slice(0, 10) === today);
    const prevClose = prior?.close;
    const todayOpen = todays[0]?.open;
    const gapPercent = prevClose !== undefined && prevClose > 0 && todayOpen !== undefined
      ? ((todayOpen - prevClose) / prevClose) * 100
      : undefined;
    const openingCandles = todays
      .filter((candle) => candle.open > 0)
      .map((candle) => ({
        label: candleLabel(candle.timestamp),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));
    if (gapPercent === undefined && openingCandles.length === 0) return null;
    return { prevClose, todayOpen, gapPercent, candles: openingCandles };
  }
  if (
    typeof entry.prevClose === 'number' &&
    Number.isFinite(entry.prevClose) &&
    entry.prevClose > 0 &&
    typeof entry.todayOpen === 'number' &&
    Number.isFinite(entry.todayOpen)
  ) {
    return {
      prevClose: entry.prevClose,
      todayOpen: entry.todayOpen,
      gapPercent: ((entry.todayOpen - entry.prevClose) / entry.prevClose) * 100,
      candles: [],
    };
  }
  return null;
}

function param3Value(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return param3Value(record.param_3 ?? record.param3 ?? record.value);
}

function indexParameterMapFromData(data: unknown): Record<string, Record<string, number>> {
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return {};
    try {
      return indexParameterMapFromData(JSON.parse(trimmed));
    } catch {
      return {};
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const record = data as Record<string, unknown>;
  if (record.data && typeof record.data === 'object' && ('status' in record || 'type' in record)) {
    return indexParameterMapFromData(record.data);
  }
  const next: Record<string, Record<string, number>> = {};
  for (const [indexName, stocks] of Object.entries(record)) {
    if (!stocks || typeof stocks !== 'object' || Array.isArray(stocks)) continue;
    const values: Record<string, number> = {};
    for (const [symbol, value] of Object.entries(stocks)) {
      const numeric = param3Value(value);
      if (!symbol || numeric === null) continue;
      values[symbol] = numeric;
    }
    if (Object.keys(values).length > 0) next[indexName] = values;
  }
  return next;
}

const INDEX_PARAM_ALIASES: Record<string, string[]> = {
  NIFTY_50: ['NIFTY 50', 'NIFTY'],
  NIFTY_BANK: ['NIFTY BANK', 'BANK NIFTY'],
  NIFTY_AUTO: ['NIFTY AUTO'],
  NIFTY_FINANCIAL_SERVICES: ['NIFTY FIN SERV', 'NIFTY FINANCIAL SERVICES'],
  NIFTY_FMCG: ['NIFTY FMCG'],
  NIFTY_IT: ['NIFTY IT'],
  NIFTY_MEDIA: ['NIFTY MEDIA'],
  NIFTY_METAL: ['NIFTY METAL', 'NITFY METAL'],
  NIFTY_PHARMA: ['NIFTY PHARMA'],
  NIFTY_PSU_BANK: ['NIFTY PSU BANK'],
  NIFTY_PRIVATE_BANK: ['NIFTY PVT BANK', 'NIFTY PVT BANKS', 'NIFTY PRIVATE BANK'],
  NIFTY_REALTY: ['NIFTY REALTY', 'NIFTY REALITY'],
  NIFTY_ENERGY: ['NIFTY ENERGY'],
};

function compactIndexName(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function stocksForIndex(map: Record<string, Record<string, number>>, selectedIndex: string | null) {
  if (!selectedIndex) return undefined;
  if (map[selectedIndex]) return map[selectedIndex];
  const selected = compactIndexName(selectedIndex.replace(/^NSE_INDEX\|/i, ''));
  const wanted = new Set([selected]);
  for (const [key, aliases] of Object.entries(INDEX_PARAM_ALIASES)) {
    const group = [key, ...aliases].map(compactIndexName);
    if (group.includes(selected)) group.forEach((name) => wanted.add(name));
  }
  return Object.entries(map).find(([name]) => wanted.has(compactIndexName(name)))?.[1];
}

const COMPANY_NAME_SKIP = new Set(['LTD', 'LIMITED', 'INC', 'CORP', 'CORPORATION', 'CO', 'COMPANY', 'OF', 'THE', 'AND', 'PVT', 'PRIVATE']);

function companyWords(companyName: string) {
  return companyName
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((word) => word && !COMPANY_NAME_SKIP.has(word));
}

function lettersInOrder(needle: string, haystack: string) {
  let index = 0;
  for (const letter of haystack) {
    if (letter === needle[index]) index += 1;
    if (index === needle.length) return true;
  }
  return needle.length === 0;
}

const R_FACTOR_SYMBOL_BY_COMPANY: Record<string, string> = {
  'STATE BANK OF INDIA': 'SBIN',
  'MAHINDRA AND MAHINDRA': 'M&M',
  'INFOSYS': 'INFY',
  'TATA CONSULTANCY SERVICES': 'TCS',
  'LARSEN AND TOUBRO': 'LT',
  'OIL AND NATURAL GAS CORPORATION': 'ONGC',
  'HINDUSTAN UNILEVER': 'HINDUNILVR',
  'ULTRATECH CEMENT': 'ULTRACEMCO',
  'BAJAJ FINANCE': 'BAJFINANCE',
  'JIO FINANCIAL': 'JIOFIN',
  'JIO FINANCIAL SERVICES': 'JIOFIN',
  'INTERGLOBE AVIATION': 'INDIGO',
  'TECH MAHINDRA': 'TECHM',
};

const R_FACTOR_SYMBOL_LOOKUP: Record<string, string> = {};
for (const [name, symbol] of Object.entries(R_FACTOR_SYMBOL_BY_COMPANY)) {
  R_FACTOR_SYMBOL_LOOKUP[name] = symbol;
  R_FACTOR_SYMBOL_LOOKUP[companyWords(name).join(' ')] = symbol;
}

function symbolFromCompanyMap(companyName: string) {
  const raw = companyName.trim().toUpperCase().replace(/\s+/g, ' ');
  return R_FACTOR_SYMBOL_LOOKUP[raw] ?? R_FACTOR_SYMBOL_LOOKUP[companyWords(companyName).join(' ')];
}

function rFactorEntry(stocks: Record<string, number>, symbol: string) {
  const wanted = compactIndexName(symbol);
  for (const [key, value] of Object.entries(stocks)) {
    if (compactIndexName(key) === wanted) return { symbol: key, value };
  }
  return undefined;
}

function matchRFactor(stocks: Record<string, number> | undefined, companyName: string) {
  if (!stocks || !companyName) return undefined;
  const mappedSymbol = symbolFromCompanyMap(companyName);
  if (mappedSymbol) return rFactorEntry(stocks, mappedSymbol);
  const words = companyWords(companyName);
  const [firstWord, ...restWords] = words;
  if (!firstWord) return undefined;
  const rest = restWords.join('');
  let match: { symbol: string; value: number } | undefined;
  let bestScore = -1;
  for (const [symbol, value] of Object.entries(stocks)) {
    const keyword = compactIndexName(symbol);
    const firstAt = keyword.indexOf(firstWord);
    if (firstAt < 0) continue;
    const before = keyword.slice(0, firstAt);
    const after = keyword.slice(firstAt + firstWord.length);
    if (before && !lettersInOrder(before, words.join('').slice(0, words.join('').indexOf(firstWord)))) continue;
    if (after && !lettersInOrder(after, rest)) continue;
    const score = keyword.length + (firstAt === 0 ? 20 : 0) + after.length;
    if (score > bestScore) {
      bestScore = score;
      match = { symbol, value };
    }
  }
  return match;
}

function param3ForCompany(stocks: Record<string, number> | undefined, companyName: string) {
  return matchRFactor(stocks, companyName)?.value;
}

function unmatchedRFactorStocks(
  maps: Array<[string, Record<string, number>]>,
  companyNames: string[],
) {
  const claimed = new Set<string>();
  for (const [, stocks] of maps) {
    for (const companyName of companyNames) {
      const match = matchRFactor(stocks, companyName);
      if (match) claimed.add(compactIndexName(match.symbol));
    }
  }
  const seen = new Set<string>();
  const leftovers: Array<{ symbol: string; value: number; indexName: string }> = [];
  for (const [indexName, stocks] of maps) {
    for (const [symbol, value] of Object.entries(stocks)) {
      const compact = compactIndexName(symbol);
      if (claimed.has(compact) || seen.has(compact)) continue;
      seen.add(compact);
      leftovers.push({ symbol, value, indexName });
    }
  }
  return leftovers.sort((a, b) => b.value - a.value || a.symbol.localeCompare(b.symbol));
}

type SectorialSocketAction =
  | { kind: 'ignore' }
  | { kind: 'index-map'; map: Record<string, Record<string, number>>; raw: unknown }
  | { kind: 'sectorial'; rows: unknown[] | null };

function sectorialSocketAction(message: unknown): SectorialSocketAction {
  if (message && typeof message === 'object' && !Array.isArray(message)) {
    const messageType = (message as { type?: unknown }).type;
    if (messageType === 'CONNECTION_TEST') return { kind: 'ignore' };
    if (messageType === 'INDEX_PARAMETER_MAP') {
      const raw = (message as { data?: unknown }).data;
      return { kind: 'index-map', raw, map: indexParameterMapFromData(raw) };
    }
    if (messageType && messageType !== 'SECTORIAL_FLOW') return { kind: 'ignore' };
  }
  return { kind: 'sectorial', rows: sectorRowsFromPayload(message) };
}

function sectorRowsFromPayload(value: unknown, depth = 0): unknown[] | null {
  if (depth > 4 || value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
    try {
      return sectorRowsFromPayload(JSON.parse(trimmed), depth + 1);
    } catch {
      return null;
    }
  }
  if (Array.isArray(value)) {
    return value.some((item) => item && typeof item === 'object' && 'Symbol' in (item as object)) ? value : null;
  }
  if (typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (record.type === 'CONNECTION_TEST') return null;
  if (Array.isArray(record.data)) return record.data;
  for (const nested of Object.values(record)) {
    const rows = sectorRowsFromPayload(nested, depth + 1);
    if (rows) return rows;
  }
  return null;
}

function gapMapFromClosingValues(data: unknown): Record<string, GapUpInfo> {
  const map: Record<string, GapUpInfo> = {};
  const put = (key: string | undefined, info: GapUpInfo | null) => {
    if (!key || !info) return;
    const normalized = normalizeKey(key);
    map[normalized] = info;
    const suffix = normalized.split('|').pop();
    if (suffix && suffix !== normalized) map[suffix] = info;
  };
  if (Array.isArray(data)) {
    for (const item of data) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as RawClosingEntry;
      put(entry.instrumentKey, toGapInfo(entry));
    }
    return map;
  }
  if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const entry = value as RawClosingEntry;
      put(entry.instrumentKey || key, toGapInfo(entry));
    }
  }
  return map;
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

const SECTORIAL_WS_URL = 'wss://abrars-macbook-pro.tail901a6f.ts.net';
const SECTORIAL_SOCKET_LABEL: Record<string, string> = {
  connected: 'Stream live',
  connecting: 'Connecting stream…',
  disconnected: 'Reconnecting stream…',
  error: 'Stream error',
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
  const [gapByInstrument, setGapByInstrument] = useState<Record<string, GapUpInfo>>({});
  const [autoExpire, setAutoExpire] = useState(false);
  const [liveIndexes, setLiveIndexes] = useState<Record<string, string[]>>({});
  const [selectedIndex, setSelectedIndex] = useState<string | null>(null);
  const [sectorialChanges, setSectorialChanges] = useState<SectorialChange[]>([]);
  const [sectorialLoading, setSectorialLoading] = useState(true);
  const [sectorialError, setSectorialError] = useState<string | null>(null);
  const [sectorialSocketStatus, setSectorialSocketStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [indexParameterMap, setIndexParameterMap] = useState<Record<string, Record<string, number>>>({});

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
      .catch(() => { });
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

  const loadClosingPrices = async () => {
    const response = await fetch(`${backendBase}/api/alerts/closing-prices`);
    if (!response.ok) {
      throw new Error(await readApiError(response, `Could not load closing prices (${response.status})`));
    }
    const data = await response.json();
    setGapByInstrument(gapMapFromClosingValues(data));
  };

  const loadLiveIndexes = async () => {
    try {
      const response = await fetch(`${backendBase}/api/alerts/live-indexes`);
      if (!response.ok) return {};
      const data = await response.json() as Record<string, string[]>;
      const next = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
      setLiveIndexes(next);
      return next;
    } catch (e) {
      console.error('Could not load live indexes:', e);
      return {};
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      loadActiveAlerts().catch((e) => {
        if (active) toast.error(e instanceof Error ? e.message : 'Could not load active alerts');
      }),
      loadClosingPrices().catch((e) => {
        if (active) toast.error(e instanceof Error ? e.message : 'Could not load closing prices');
      }),
      loadLiveIndexes()
    ]);
    return () => { active = false; };
  }, [backendBase]);

  useEffect(() => {
    if (!inWindow) return;
    const id = setInterval(() => {
      void loadClosingPrices().catch(() => { });
    }, 60_000);
    return () => clearInterval(id);
  }, [backendBase, inWindow]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      setSectorialSocketStatus('connecting');
      try {
        socket = new WebSocket(SECTORIAL_WS_URL);
      } catch (error) {
        setSectorialSocketStatus('error');
        setSectorialError(error instanceof Error ? error.message : 'Could not create sectorial stream connection');
        reconnectTimer = setTimeout(connect, 3000);
        return;
      }

      socket.onopen = () => {
        if (unmounted) return;
        setSectorialSocketStatus('connected');
        setSectorialError(null);
      };

      socket.onmessage = (event) => {
        if (unmounted) return;
        if (typeof event.data !== 'string') return;
        let message: unknown;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        const action = sectorialSocketAction(message);
        if (action.kind === 'ignore') return;
        if (action.kind === 'index-map') {
          setIndexParameterMap(action.map);
          if (process.env.NODE_ENV !== 'production') {
            console.info('INDEX_PARAMETER_MAP param_3', { raw: action.raw, stored: action.map });
          }
          return;
        }
        const rows = action.rows;
        if (!rows) return;

        const changes = rows.flatMap((item) => {
          if (!item || typeof item !== 'object') return [];
          const row = item as { Symbol?: unknown; param_0?: unknown };
          const sectorName = typeof row.Symbol === 'string' ? row.Symbol.trim() : '';
          const chgValue = typeof row.param_0 === 'number' ? row.param_0 : Number(row.param_0);
          return sectorName && Number.isFinite(chgValue) ? [{ sectorName, chgValue }] : [];
        });
        if (changes.length === 0) return;
        setSectorialChanges(changes);
        setSectorialLoading(false);
        setSectorialError(null);
      };

      socket.onerror = () => {
        if (unmounted) return;
        setSectorialSocketStatus('error');
        setSectorialError('Sectorial stream connection error');
      };

      socket.onclose = () => {
        if (unmounted) return;
        setSectorialSocketStatus('disconnected');
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, []);

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

  const addIndexAlerts = async (indexKey: string, name: string, instrumentKey: string) => {
    setBusyKey(indexKey);
    try {
      const indexResponse = await fetch(`${backendBase}/api/alerts/add/index/${encodeURIComponent(instrumentKey)}`, {
        method: 'POST',
      });
      if (!indexResponse.ok) {
        throw new Error(await readApiError(indexResponse, `Could not add index alerts (${indexResponse.status})`));
      }

      const alertResponse = await fetch(`${backendBase}/api/alerts/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: name,
          instrumentKey,
          alertType: 'INDEX_MONITORING',
          tickSource: 'INDEX_MONITORING',
          expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19),
          toBeExpiredInDays: 1,
          priceBasedExit: false,
        }),
      });
      if (!alertResponse.ok) {
        console.error('Could not save index alert record:', await readApiError(alertResponse, 'Unknown error'));
      }

      try {
        await Promise.all([loadActiveAlerts(), loadLiveIndexes(), loadClosingPrices()]);
      } catch {
        setTrackedKeys((current) => current.includes(indexKey) ? current : [...current, indexKey]);
        void loadClosingPrices().catch(() => { });
      }
      toast.success(`${name} added. Click it again to view its stocks.`);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add index');
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const indexIdentity = (value: string) => value
    .trim()
    .toUpperCase()
    .replace(/^NSE_INDEX\|/, '')
    .replace(/[_|]+/g, ' ')
    .replace(/\s+/g, ' ');

  const liveKeyFor = (index: { key: string; name: string; instrumentKey: string }) => {
    const wanted = new Set([index.key, index.name, index.instrumentKey].map(indexIdentity));
    return Object.keys(liveIndexes).find((key) => wanted.has(indexIdentity(key)));
  };

  const isIndexLive = (index: { key: string; name: string; instrumentKey: string }) => {
    if (liveKeyFor(index)) return true;
    return alerts.some((alert) => indexIdentity(alert.instrumentKey) === indexIdentity(index.instrumentKey));
  };

  const showLiveIndex = (index: { key: string; name: string; instrumentKey: string }) => {
    const liveKey = liveKeyFor(index) ?? index.key;
    setTab('indexes');
    setSelectedIndex(liveKey);
    if (liveIndexes[liveKey]?.length) return;

    setBusyKey(index.key);
    void (async () => {
      try {
        const indexResponse = await fetch(`${backendBase}/api/alerts/add/index/${encodeURIComponent(index.instrumentKey)}`, {
          method: 'POST',
        });
        if (!indexResponse.ok) {
          console.error('Could not add index alerts:', await readApiError(indexResponse, `Could not add index alerts (${indexResponse.status})`));
        }
        const alertResponse = await fetch(`${backendBase}/api/alerts/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: index.name,
            instrumentKey: index.instrumentKey,
            alertType: 'INDEX_MONITORING',
            tickSource: 'INDEX_MONITORING',
            expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19),
            toBeExpiredInDays: 1,
            priceBasedExit: false,
          }),
        });
        if (!alertResponse.ok) {
          console.error('Could not save index alert record:', await readApiError(alertResponse, 'Unknown error'));
        }
        const [, live] = await Promise.all([
          loadActiveAlerts(),
          loadLiveIndexes(),
          loadClosingPrices(),
        ]);
        const wanted = new Set([index.key, index.name, index.instrumentKey, liveKey].map(indexIdentity));
        const freshKey = Object.keys(live).find((key) => wanted.has(indexIdentity(key))) ?? index.key;
        setSelectedIndex(freshKey);
        if (!live[freshKey]?.length) {
          toast.error(`${index.name} is added, but its stock list has not come back yet.`);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not add index');
      } finally {
        setBusyKey(null);
      }
    })();
  };

  const addSectorIndex = (sectorName: string) => {
    const index = indexForSector(sectorName);
    if (!index) {
      toast.error(`No Trendlyne mapping for "${sectorName}". Add its tredCodeKey, or add the index manually.`);
      setAddOpen(true);
      return;
    }
    if (isIndexLive(index)) {
      showLiveIndex(index);
      return;
    }
    void addIndexAlerts(index.key, index.name, index.instrumentKey);
  };

  const addInstrument = async () => {
    if (!selectedStock || !hasAnyPrice) return;
    const { key, name, expiry: contractExpiry } = selectedStock;
    if (tab === 'indexes') {
      const added = await addIndexAlerts(key, name, selectedStock.instrumentKey || `NSE_INDEX|${key}`);
      if (added) resetAddForm();
      return;
    }
    setBusyKey(key);
    try {
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
          priceBasedExit: !autoExpire,
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
        await Promise.all([loadActiveAlerts(), loadClosingPrices()]);
      } catch {
        setTrackedKeys((current) => current.includes(key) ? current : [...current, key]);
        if (saved?.id) {
          setAlerts((current) => [...current.filter((alert) => alert.id !== saved.id), saved]);
        }
        void loadClosingPrices().catch(() => { });
      }
      setLevels((current) => ({
        ...current,
        [key]: { targetPrice: parsedTarget, entryPrice: parsedEntry, stopLoss: parsedStopLoss },
      }));
      resetAddForm();
      toast.success(`${name} added to Live Market`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add instrument');
    } finally {
      setBusyKey(null);
    }
  };

  const removeInstrument = async (alert: MarketAlert) => {
    if (!alert.id) return;
    const key = normalizeKey(alert.instrumentKey);
    const isIndex = key.includes('NIFTY');
    if (isIndex) return; // Don't allow deletion of indexes
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
  const feedMessageCount = useRef(0);
  const stompMessageCount = useRef(0);

  useMarketFeedMessages((raw) => {
    feedMessageCount.current++;
    onMarketMessage(raw);
  });

  useMarketDataMessages((raw) => {
    stompMessageCount.current++;
    onMarketMessage(raw);
  }, inWindow);

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
  const selectedConstituents = new Set(
    (selectedIndex ? liveIndexes[selectedIndex] ?? [] : []).map((companyName) => companyName.trim().toUpperCase()),
  );
  const rows = allRows
    .filter(([key]) => {
      const alert = alertFor(key);
      const companyNameUpper = (alert?.companyName ?? nameOf(key) ?? '').trim().toUpperCase();
      const addedAsStock = alert?.tickSource === 'REGULAR_MONITORING' || alert?.tickSource === 'ALGO_ALERTS';

      if (tab === 'stocks') {
        return (
          addedAsStock &&
          !companyNameUpper.includes(' CE') &&
          !companyNameUpper.includes(' PE') &&
          !normalizeKey(key).startsWith('NSE_INDEX|')
        );
      }
      if (tab === 'indexes') {
        if (!selectedIndex || selectedConstituents.size === 0) return false;
        return selectedConstituents.has(companyNameUpper);
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
  const positiveSectorialChanges = sectorialChanges
    .filter(({ chgValue }) => chgValue > 0)
    .sort((a, b) => b.chgValue - a.chgValue);
  const nonPositiveSectorialChanges = sectorialChanges
    .filter(({ chgValue }) => chgValue <= 0)
    .sort((a, b) => a.chgValue - b.chgValue);
  const selectedRFactorStocks = stocksForIndex(indexParameterMap, selectedIndex);
  const selectedIndexNames = (selectedIndex ? liveIndexes[selectedIndex] ?? [] : []).filter((name) => name.trim());
  const unmatchedRFactor = tab === 'indexes' && selectedIndex && selectedRFactorStocks && selectedIndexNames.length > 0
    ? unmatchedRFactorStocks([[selectedIndex, selectedRFactorStocks]], selectedIndexNames)
    : [];

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
              <span className={`rounded-full border px-3 py-2 text-sm font-semibold ${STATUS_STYLE[sectorialSocketStatus]}`}>
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-current" />
                {SECTORIAL_SOCKET_LABEL[sectorialSocketStatus]}
              </span>
              <span className="text-xs font-medium text-slate-500">{allRows.length} subscribed</span>
              <div className="rounded-md border border-slate-200 bg-white">
                {INSTRUMENT_TABS.map((tabItem, index) => (
                  <button
                    key={tabItem.id}
                    type="button"
                    onClick={() => setTab(tabItem.id)}
                    aria-pressed={tab === tabItem.id}
                    className={`px-3 py-1.5 text-xs font-semibold transition ${index === 0 ? 'rounded-l-md border-r border-slate-200' : index === INSTRUMENT_TABS.length - 1 ? 'rounded-r-md' : 'border-r border-slate-200'
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
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${selectedIndex === indexKey
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
        {tab === 'indexes' && (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur md:p-5" aria-labelledby="sectorial-performance-title">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id="sectorial-performance-title" className="text-lg font-extrabold tracking-tight text-slate-900">
                  Sector performance
                </h2>
                <p className="text-xs font-medium text-slate-500">Live sectorial change</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[sectorialSocketStatus]}`}>
                {SECTORIAL_SOCKET_LABEL[sectorialSocketStatus]}
              </span>
            </div>
            {sectorialError && sectorialChanges.length === 0 ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-medium text-rose-700">
                {sectorialError}
              </p>
            ) : sectorialLoading && sectorialChanges.length === 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ) : sectorialChanges.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-500">
                No sectorial changes available.
              </p>
            ) : (
              <div className="space-y-4">
                {[
                  {
                    label: 'Positive',
                    changes: positiveSectorialChanges,
                    rowBorder: 'border-emerald-500 bg-emerald-50',
                    blockBorder: 'border-emerald-300',
                    blockBackground: 'bg-emerald-100',
                  },
                  {
                    label: 'Negative / flat',
                    changes: nonPositiveSectorialChanges,
                    rowBorder: 'border-rose-500 bg-rose-50',
                    blockBorder: 'border-rose-300',
                    blockBackground: 'bg-rose-100',
                  },
                ].map(({ label, changes, rowBorder, blockBorder, blockBackground }) => {
                  const typedChanges = changes;
                  return (
                    <div key={label} className={`rounded-xl border-l-4 ${rowBorder} p-3`}>
                      <div className="mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-600">{label}</div>
                      {typedChanges.length === 0 ? (
                        <p className="text-sm font-medium text-slate-400">No sectors in this group.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {typedChanges.map(({ sectorName, chgValue }) => {
                            const mapped = indexForSector(sectorName);
                            const adding = busyKey === mapped?.key;
                            return (
                              <button
                                key={sectorName}
                                type="button"
                                disabled={busyKey !== null}
                                onClick={() => addSectorIndex(sectorName)}
                                title={mapped ? (isIndexLive(mapped) ? `View ${mapped.name} stocks` : `Add ${mapped.name}`) : `No mapping for ${sectorName}. Add it manually.`}
                                className={`flex min-h-20 items-center justify-between gap-3 rounded-xl border-2 ${blockBorder} ${blockBackground} px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60`}
                              >
                                <span className="min-w-0 truncate text-base font-bold text-black">
                                  {adding ? 'Adding…' : sectorName}
                                </span>
                                <span className="shrink-0 text-lg font-extrabold tabular-nums text-black">
                                  {chgValue > 0 ? '+' : ''}{chgValue.toFixed(2)}%
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
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
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${momentumFilter === value
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
            {tab === 'indexes'
              ? selectedIndex
                ? 'This index is added, but its stock list has not come back yet.'
                : 'Click an index again to view only its stocks.'
              : 'No instruments match this momentum filter.'}
          </div>
        ) : (
          <>
          {tab === 'indexes' && selectedIndex && unmatchedRFactor.length > 0 && (
            <section className="mb-4 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm" aria-label="Unmatched R factor">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Unmatched R factor</h2>
                <span className="text-xs font-semibold text-slate-500">
                  {unmatchedRFactor.length} with no company match · {selectedIndex}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {unmatchedRFactor.map(({ symbol, value, indexName }) => (
                  <div key={`${indexName}-${symbol}`} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="truncate text-sm font-bold text-slate-800" title={symbol}>{symbol}</div>
                    <div className={`mt-1 text-sm font-extrabold tabular-nums ${value >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {value >= 0 ? '+' : ''}{value.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map(([key, q]) => {
              const change = q.ltp !== undefined && q.cp ? q.ltp - q.cp : undefined;
              const pct = change !== undefined && q.cp ? (change / q.cp) * 100 : undefined;
              const alert = alertFor(key);
              const gapKey = normalizeKey(alert?.instrumentKey ?? key);
              const gapInfo = gapByInstrument[gapKey] ?? gapByInstrument[gapKey.split('|').pop() ?? ''];
              const gapPercent = gapInfo?.gapPercent;
              const openingCandles = gapInfo?.candles ?? [];
              const color = change === undefined ? 'text-gray-700' : change >= 0 ? 'text-green-600' : 'text-red-600';
              const border = change === undefined ? 'border-slate-200' : change >= 0 ? 'border-emerald-200' : 'border-rose-200';
              const target = alert?.targetPrice || levels[key]?.targetPrice;
              const entry = alert?.entryPrice || levels[key]?.entryPrice;
              const sl = alert?.stopLoss || levels[key]?.stopLoss;
              const isIndex = key.includes('NIFTY');
              const canDelete = !isIndex;
              const param3 = param3ForCompany(stocksForIndex(indexParameterMap, selectedIndex), nameOf(key) ?? '');
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
                    <div className={`flex items-center gap-2 ${canDelete ? 'pr-16' : ''}`}>
                      <div className="min-w-0 truncate text-sm font-bold tracking-wide text-slate-700">{nameOf(key) ?? key}</div>
                      {!isIndex && (
                        <a
                          href={chartUrlForInstrument(normalizeKey(alert?.instrumentKey || key), {
                            entry: entry || undefined,
                            target: target || undefined,
                            stopLoss: sl || undefined,
                          })}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-[11px] font-bold text-cyan-700 underline underline-offset-2 hover:text-cyan-900"
                        >
                          Chart
                        </a>
                      )}
                    </div>
                    {param3 !== undefined && (
                      <div className={`mt-1 text-xs font-bold tabular-nums ${param3 >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        R factor {param3 >= 0 ? '+' : ''}{param3.toFixed(2)}
                      </div>
                    )}
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
                    {openingCandles.length > 0 && (
                      <div className={`mt-5 grid gap-3 border-y-2 border-slate-300 py-3 ${openingCandles.length === 1 ? 'grid-cols-1' : openingCandles.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        {openingCandles.map((candle) => {
                          const up = candle.close >= candle.open;
                          const tone = up ? 'text-green-700' : 'text-red-700';
                          const ink = up ? 'bg-green-600' : 'bg-red-600';
                          const frame = up ? 'border-green-700' : 'border-red-700';
                          const box = `mx-auto flex h-5 w-16 items-center justify-center rounded border text-center text-[11px] font-bold leading-none tabular-nums ${tone} ${frame}`;
                          const topValue = up ? candle.close : candle.open;
                          const bottomValue = up ? candle.open : candle.close;
                          const ocPct = candle.open > 0 ? ((candle.close - candle.open) / candle.open) * 100 : undefined;
                          return (
                            <div key={candle.label} className="pt-1">
                              <div className={box}>{candle.label}</div>
                              <div className={`${box} mb-4 mt-1`}>
                                {ocPct === undefined ? '—' : `${ocPct >= 0 ? '+' : ''}${ocPct.toFixed(2)}%`}
                              </div>
                              <div className={`mb-1 text-center text-[10px] font-bold leading-none tabular-nums ${tone}`}>{candle.high.toFixed(2)}</div>
                              <div className={`relative flex h-32 justify-center ${tone}`}>
                                <div className="flex h-32 flex-col items-center">
                                  <div className={`h-6 w-px ${ink}`} />
                                  <div className={`h-20 w-3 rounded-[2px] ${ink}`} />
                                  <div className={`h-6 w-px ${ink}`} />
                                </div>
                                <span className="absolute top-6 left-1/2 ml-2 -translate-y-1/2 text-[10px] font-bold leading-none tabular-nums">{topValue.toFixed(2)}</span>
                                <span className="absolute bottom-6 left-1/2 ml-2 translate-y-1/2 text-[10px] font-bold leading-none tabular-nums">{bottomValue.toFixed(2)}</span>
                              </div>
                              <div className={`mt-1 text-center text-[10px] font-bold leading-none tabular-nums ${tone}`}>{candle.low.toFixed(2)}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {gapPercent !== undefined && gapPercent !== 0 ? (
                      <div className={`mt-2 flex items-center justify-between border-b-2 border-slate-300 pb-2`}>
                        <span className={`text-[11px] font-bold uppercase tracking-wide ${gapPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {gapPercent >= 0 ? 'Gap up' : 'Gap down'}
                        </span>
                        <span className={`text-xs font-extrabold tabular-nums ${gapPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {gapPercent >= 0 ? '+' : ''}{gapPercent.toFixed(2)}%
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2 border-b-2 border-slate-300 pb-2 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        No price change
                      </div>
                    )}
                    <div className="flex items-center justify-between border-b-2 border-slate-300 py-2">
                      <span className="text-xs font-medium text-slate-400">DAY CHANGE</span>
                      <span className={`text-sm font-bold tabular-nums ${color}`}>
                        {change !== undefined && pct !== undefined ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}  (${pct.toFixed(2)}%)` : '—'}
                      </span>
                    </div>

                    {(target || entry || sl) && (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500 border-b-2 pb-2 border-slate-300">
                        <span className="text-green-600">T {target || '—'}</span>
                        <span className="text-amber-600">E {entry || '—'}</span>
                        <span className="text-red-600">SL {sl || '—'}</span>
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
          </>
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
