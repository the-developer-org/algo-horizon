export type InstrumentTab = 'stocks' | 'options' | 'indexes';

export const INSTRUMENT_TABS: { id: InstrumentTab; label: string }[] = [
  { id: 'stocks', label: 'Stocks' },
  { id: 'options', label: 'Stock Options' },
  { id: 'indexes', label: 'Indexes' },
];

export const INDEXES: { name: string; key: string }[] = [
  { name: 'Nifty 50', key: 'NSE_INDEX|Nifty 50' },
  { name: 'Nifty Bank', key: 'NSE_INDEX|Nifty Bank' },
  { name: 'Nifty Fin Service', key: 'NSE_INDEX|Nifty Fin Service' },
  { name: 'Nifty Mid Select', key: 'NSE_INDEX|NIFTY MID SELECT' },
  { name: 'Nifty Next 50', key: 'NSE_INDEX|Nifty Next 50' },
  { name: 'Nifty 100', key: 'NSE_INDEX|Nifty 100' },
  { name: 'Sensex', key: 'BSE_INDEX|SENSEX' },
  { name: 'India VIX', key: 'NSE_INDEX|India VIX' },
];

export interface OptionContract {
  trading_symbol: string;
  instrument_key: string;
  strike_price?: number;
  instrument_type?: string;
  expiry?: string;
}

export function sessionClose(date: string) {
  return `${date.slice(0, 10)}T15:30:00`;
}

export function todaySessionClose() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  return sessionClose(today);
}

export function nextExpiryContracts(contracts: OptionContract[]): OptionContract[] {
  const chain = contracts.filter((item) => item.instrument_type === 'CE' || item.instrument_type === 'PE');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const nextExpiry = [...new Set(chain.map((item) => item.expiry).filter((expiry): expiry is string => Boolean(expiry)))]
    .filter((expiry) => expiry >= today)
    .sort()[0];
  const selected = nextExpiry ? chain.filter((item) => item.expiry === nextExpiry) : chain;
  return selected.sort(
    (a, b) => (a.strike_price ?? 0) - (b.strike_price ?? 0) || (a.instrument_type === 'CE' ? 0 : 1) - (b.instrument_type === 'CE' ? 0 : 1),
  );
}

export async function fetchOptionContracts(instrumentKey: string): Promise<OptionContract[]> {
  const url = `/api/upstox/option-contracts?instrument_key=${encodeURIComponent(instrumentKey)}`;
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.statusText || body?.message || 'Could not load option contracts');
  }
  return Array.isArray(body?.data) ? body.data : [];
}
