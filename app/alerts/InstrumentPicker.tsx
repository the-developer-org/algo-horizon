'use client';

import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  INDEXES,
  INSTRUMENT_TABS,
  fetchOptionContracts,
  nextExpiryContracts,
  type InstrumentTab,
  type OptionContract,
} from './instrumentCatalog';

export function modalTheme(tab: InstrumentTab) {
  if (tab === 'options') {
    return {
      shell: 'border-red-700 bg-black text-red-50 [&>button]:text-red-400',
      title: 'text-red-500',
      close: 'text-red-400',
      input: 'border-red-800 !bg-black !text-red-50 caret-red-400 placeholder:!text-red-300/70 focus:!border-red-500 focus:!bg-black focus:!text-red-50 focus:!ring-red-900',
      muted: 'text-red-300/80',
      row: 'border-red-900 bg-black',
      name: 'text-red-50',
      button: 'bg-red-600 text-black hover:bg-red-500',
      tabActive: 'border-red-500 bg-red-600 text-black',
      tabIdle: 'border-red-900 bg-black text-red-300 hover:border-red-600',
    };
  }
  if (tab === 'indexes') {
    return {
      shell: 'border-zinc-700 bg-black text-zinc-100 [&>button]:text-zinc-300',
      title: 'text-white',
      close: 'text-zinc-400',
      input: 'border-zinc-700 !bg-zinc-950 !text-white caret-white placeholder:!text-zinc-500 focus:!border-zinc-400 focus:!bg-zinc-950 focus:!text-white focus:!ring-zinc-800',
      muted: 'text-zinc-400',
      row: 'border-zinc-800 bg-black',
      name: 'text-zinc-100',
      button: 'bg-white text-black hover:bg-zinc-200',
      tabActive: 'border-white bg-white text-black',
      tabIdle: 'border-zinc-700 bg-black text-zinc-300 hover:border-zinc-400',
    };
  }
  return {
    shell: 'border-slate-200 bg-white text-slate-900',
    title: 'text-slate-900',
    close: 'text-gray-500',
    input: 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:ring-green-100',
    muted: 'text-gray-500',
    row: 'border-gray-100',
    name: 'text-gray-800',
    button: 'bg-green-600 text-white hover:bg-green-700',
    tabActive: 'border-green-600 bg-green-600 text-white',
    tabIdle: 'border-slate-200 bg-white text-slate-600 hover:border-slate-400',
  };
}

export function InstrumentKindTabs({
  tab,
  onChange,
}: {
  tab: InstrumentTab;
  onChange: (tab: InstrumentTab) => void;
}) {
  const theme = modalTheme(tab);
  return (
    <div className="mb-3 grid grid-cols-3 gap-2">
      {INSTRUMENT_TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`rounded-md border px-2 py-2 text-xs font-bold ${tab === item.id ? theme.tabActive : theme.tabIdle}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function DerivativePicker({
  tab,
  companies,
  onPick,
}: {
  tab: Exclude<InstrumentTab, 'stocks'>;
  companies: { name: string; key: string }[];
  onPick: (item: { name: string; key: string; expiry?: string }) => void;
}) {
  const theme = modalTheme(tab);
  const [search, setSearch] = useState('');
  const [underlying, setUnderlying] = useState<{ name: string; key: string } | null>(null);
  const [contracts, setContracts] = useState<OptionContract[]>([]);
  const [loading, setLoading] = useState(false);

  const query = search.trim().toLowerCase();
  const underlyings = useMemo(
    () => query
      ? companies.filter((item) => `${item.name} ${item.key}`.toLowerCase().includes(query)).slice(0, 30)
      : [],
    [companies, query],
  );
  const indexes = useMemo(
    () => INDEXES.filter((item) => `${item.name} ${item.key}`.toLowerCase().includes(query)),
    [query],
  );
  const visibleContracts = useMemo(
    () => contracts.filter((item) => `${item.trading_symbol} ${item.strike_price ?? ''} ${item.instrument_type ?? ''}`.toLowerCase().includes(query)),
    [contracts, query],
  );
  const nextExpiry = contracts[0]?.expiry;

  const loadContracts = async (item: { name: string; key: string }) => {
    setUnderlying(item);
    setSearch('');
    setLoading(true);
    try {
      const data = nextExpiryContracts(await fetchOptionContracts(item.key));
      setContracts(data);
      if (data.length === 0) toast.error('No contracts for the next expiry');
    } catch (error) {
      setContracts([]);
      toast.error(error instanceof Error ? error.message : 'Could not load option contracts');
    } finally {
      setLoading(false);
    }
  };

  if (tab === 'indexes') {
    return (
      <>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search indexes…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={`alert-dark-field index-field mb-3 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 ${theme.input}`}
        />
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {indexes.map((item) => (
            <div key={item.key} className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${theme.row}`}>
              <span className={`truncate text-sm ${theme.name}`}>{item.name}</span>
              <button type="button" onClick={() => onPick(item)} className={`shrink-0 rounded px-3 py-1 text-xs font-semibold ${theme.button}`}>
                Select
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={underlying ? 'Filter contracts…' : 'Search underlying stock…'}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className={`alert-dark-field mb-3 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 ${theme.input}`}
      />
      {underlying && (
        <button
          type="button"
          onClick={() => {
            setUnderlying(null);
            setContracts([]);
            setSearch('');
          }}
          className={`mb-2 text-xs font-semibold ${theme.muted}`}
        >
          ← {underlying.name}{nextExpiry ? ` · ${nextExpiry}` : ''}
        </button>
      )}
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {loading && <p className={`py-6 text-center text-sm ${theme.muted}`}>Loading contracts…</p>}
        {!loading && !underlying && underlyings.map((item) => (
          <div key={item.key} className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${theme.row}`}>
            <span className={`truncate text-sm ${theme.name}`}>{item.name}</span>
            <button type="button" onClick={() => void loadContracts(item)} className={`shrink-0 rounded px-3 py-1 text-xs font-semibold ${theme.button}`}>
              Options
            </button>
          </div>
        ))}
        {!loading && underlying && visibleContracts.map((item) => (
          <div key={item.instrument_key} className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${theme.row}`}>
            <span className={`truncate text-sm ${theme.name}`}>
              {item.trading_symbol}
              <span className={`ml-2 text-[11px] ${theme.muted}`}>{item.instrument_type} {item.strike_price}</span>
            </span>
            <button
              type="button"
              onClick={() => onPick({ name: item.trading_symbol, key: item.instrument_key, expiry: item.expiry })}
              className={`shrink-0 rounded px-3 py-1 text-xs font-semibold ${theme.button}`}
            >
              Select
            </button>
          </div>
        ))}
        {!loading && !underlying && query && underlyings.length === 0 && (
          <p className={`py-6 text-center text-sm ${theme.muted}`}>No matching stocks.</p>
        )}
      
        {!loading && underlying && visibleContracts.length === 0 && (
          <p className={`py-6 text-center text-sm ${theme.muted}`}>No matching contracts.</p>
        )}
      </div>
    </>
  );
}
