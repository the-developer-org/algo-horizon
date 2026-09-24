"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, BarChart3, FileText, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";

type TradeEntry = {
  entryCandle?: { timestamp?: string; close?: number };
  profitCandle?: { timestamp?: string };
  absoluteProfitCandle?: { timestamp?: string; close?: number };
  prevSwing?: { label?: string };
  currentSwing?: { label?: string };
  hitTarget?: boolean;
  hitStop?: boolean;
  profitPercentage?: number;
  lossPercentage?: number;
  profitPercent?: number | null;
  lossPercent?: number | null;
  stopLoss?: number;
  target?: number;
  note?: string;
};

type NiftyHL = {
  id?: string;
  instrumentKey?: string;
  companyName?: string;
  stockGroupId?: string;
  entries_15M?: TradeEntry[];
  entries_1H?: TradeEntry[];
};

const strategyTabs = [
  { id: "nifty-nawaz", label: "Nifty Nawaz", icon: Activity },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "risk", label: "Risk analysis", icon: ShieldCheck },
];

export default function StrategyTestingPage() {
  const [activeTab, setActiveTab] = useState("nifty-nawaz");
  const [niftyHL, setNiftyHL] = useState<NiftyHL[]>([]);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());
  const [isLoadingNiftyHL, setIsLoadingNiftyHL] = useState(true);
  const [niftyHLError, setNiftyHLError] = useState<string | null>(null);

  const fetchNiftyHL = async () => {
    setIsLoadingNiftyHL(true);
    setNiftyHLError(null);
    try {
      const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/api/nifty-options/fetch-all-nifty-hl`);
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      const payload = await response.json() as { niftyHLList?: NiftyHL[] };
      setNiftyHL(Array.isArray(payload.niftyHLList) ? payload.niftyHLList : []);
    } catch (error) {
      console.error("Failed to load Nifty Nawaz data", error);
      setNiftyHLError("Nifty Nawaz data could not be loaded.");
    } finally {
      setIsLoadingNiftyHL(false);
    }
  };

  useEffect(() => { void fetchNiftyHL(); }, []);

  const entries = niftyHL.flatMap((item, groupIndex) => [
    ...(item.entries_15M ?? []).map((entry, entryIndex) => ({ entry, timeframe: "15M", companyName: item.companyName, instrumentKey: item.instrumentKey, groupIndex, entryIndex })),
    ...(item.entries_1H ?? []).map((entry, entryIndex) => ({ entry, timeframe: "1H", companyName: item.companyName, instrumentKey: item.instrumentKey, groupIndex, entryIndex })),
  ]);
  const companyGroups = entries.reduce<Map<string, typeof entries>>((groups, entry) => {
    const companyKey = entry.companyName || entry.instrumentKey || "Unknown company";
    const currentEntries = groups.get(companyKey) ?? [];
    currentEntries.push(entry);
    groups.set(companyKey, currentEntries);
    return groups;
  }, new Map());

  const formatTradeDate = (timestamp?: string) => {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getProfitPercentage = (entry: TradeEntry) => entry.profitPercent ?? entry.profitPercentage;
  const getAbsoluteProfitPercentage = (entry: TradeEntry) => {
    const entryClose = entry.entryCandle?.close;
    const absoluteClose = entry.absoluteProfitCandle?.close;
    if (entryClose == null || absoluteClose == null || entryClose === 0) return undefined;
    return ((absoluteClose - entryClose) / entryClose) * 100;
  };

  const getTargetHitClass = (companyEntries: typeof entries) => {
    const fifteenMinuteEntries = companyEntries.filter((item) => item.timeframe === "15M");
    const targetHits = fifteenMinuteEntries.filter((item) => (getProfitPercentage(item.entry) ?? 0) >= 2).length;
    const targetHitRate = fifteenMinuteEntries.length > 0 ? (targetHits / fifteenMinuteEntries.length) * 100 : 0;
    if (targetHitRate > 70) return "green";
    if (targetHitRate >= 40) return "amber";
    return "red";
  };

  const toggleCompany = (companyName: string) => {
    setExpandedCompanies((current) => {
      const next = new Set(current);
      if (next.has(companyName)) next.delete(companyName);
      else next.add(companyName);
      return next;
    });
  };

  const toggleSummary = (companyName: string) => {
    setExpandedSummaries((current) => {
      const next = new Set(current);
      if (next.has(companyName)) next.delete(companyName);
      else next.add(companyName);
      return next;
    });
  };

  const renderNiftyHLContent = () => {
    if (isLoadingNiftyHL) {
      return <div className="strategy-preview-state"><LoaderCircle className="size-5 animate-spin" /> Loading strategy data...</div>;
    }

    if (niftyHLError) {
      return <div className="strategy-preview-state strategy-preview-state-error"><p>{niftyHLError}</p><button type="button" onClick={() => void fetchNiftyHL()}>Try again</button></div>;
    }

    return (
      <>
        {niftyHL.length === 0 && <p className="strategy-preview-empty">No Nifty Nawaz records are available yet.</p>}
        {entries.length > 0 && (
          <div className="strategy-entry-list">
            <div className="strategy-entry-list-heading"><h3>Trade entries</h3><span>{entries.length} records</span></div>
            {[...companyGroups.entries()].map(([companyName, companyEntries]) => (
                <section className="strategy-company-group" key={companyName}>
              <div className="strategy-company-controls">
                <button type="button" className={`strategy-company-heading strategy-company-heading-${getTargetHitClass(companyEntries)}`} onClick={() => toggleCompany(companyName)} aria-expanded={expandedCompanies.has(companyName)} aria-controls={`entries-${companyName}`}>
                  <span className="strategy-company-title"><span className="strategy-company-chevron" aria-hidden="true">{expandedCompanies.has(companyName) ? "-" : "+"}</span><h4>{companyName}</h4></span>
                  <span className="strategy-company-metrics">
                    <span>15M entries <strong>{companyEntries.filter((item) => item.timeframe === "15M").length}</strong></span>
                    <span>Target hits <strong>{companyEntries.filter((item) => (getProfitPercentage(item.entry) ?? 0) >= 2).length}</strong></span>
                    <span>Absolute profit <strong>{companyEntries.filter((item) => (getAbsoluteProfitPercentage(item.entry) ?? 0) >= 2).length}</strong></span>
                  </span>
                </button>
                <button type="button" className="strategy-company-summary-button" onClick={() => toggleSummary(companyName)} aria-expanded={expandedSummaries.has(companyName)} aria-controls={`summary-${companyName}`}>
                  Summary
                </button>
              </div>
              {expandedSummaries.has(companyName) && <div id={`summary-${companyName}`} className="strategy-company-summary">
                {[...companyEntries.reduce((groups, item) => {
                  const combination = `${item.entry.prevSwing?.label || "-"} + ${item.entry.currentSwing?.label || "-"}`;
                  const current = groups.get(combination) ?? { total: 0, profits: 0 };
                  current.total += 1;
                  if ((getProfitPercentage(item.entry) ?? 0) >= 2) current.profits += 1;
                  groups.set(combination, current);
                  return groups;
                }, new Map<string, { total: number; profits: number }>()).entries()].map(([combination, counts]) => (
                  <div className="strategy-company-summary-row" key={combination}><strong>{combination}</strong><span>{counts.total} entries</span><span>{counts.profits} hit profits</span></div>
                ))}
              </div>}
              {expandedCompanies.has(companyName) && <div id={`entries-${companyName}`} className="strategy-entry-table" role="table" aria-label={`${companyName} trade entries`}>
                    <div className="strategy-entry-row strategy-entry-row-header" role="row">
                      <span>#</span><span>Entry date</span><span>Exit date</span><span>Entry value</span><span>Prev swing</span><span>Curr swing</span><span>Stop loss</span><span>Target</span><span>Result</span><span>Absolute profit</span><span>Note</span>
                    </div>
                    {companyEntries.map(({ entry, groupIndex, entryIndex }, companyEntryIndex) => {
                      const serialNumber = entries.indexOf(companyEntries[companyEntryIndex]);
                      const resultValue = getProfitPercentage(entry);
                      const absoluteProfit = getAbsoluteProfitPercentage(entry);
                      let absoluteProfitClass = "";
                      let absoluteProfitText = "-";
                      if (absoluteProfit != null) {
                        absoluteProfitClass = absoluteProfit >= 2 ? "strategy-entry-profit" : "strategy-entry-amber";
                        absoluteProfitText = `${absoluteProfit.toFixed(2)}%`;
                      }
                      let resultText = "-";
                      let resultClass = "";
                      if (entry.hitStop) {
                        resultText = "SL";
                        resultClass = "strategy-entry-loss";
                      } else if (resultValue != null) {
                        resultText = `${Number(resultValue).toFixed(2)}%`;
                        resultClass = resultValue >= 2 ? "strategy-entry-profit" : "strategy-entry-amber";
                      }
                      return (
                        <div className="strategy-entry-row" role="row" key={`${groupIndex}-${entryIndex}`}>
                          <span><strong>{serialNumber + 1}</strong></span>
                          <span>{formatTradeDate(entry.entryCandle?.timestamp)}</span>
                          <span>{formatTradeDate(entry.profitCandle?.timestamp)}</span>
                          <span>{entry.entryCandle?.close ?? "-"}</span>
                          <span>{entry.prevSwing?.label || "-"}</span>
                          <span>{entry.currentSwing?.label || "-"}</span>
                          <span>{entry.stopLoss ?? "-"}</span>
                          <span>{entry.target ?? "-"}</span>
                          <span className={resultClass}>{resultText}</span>
                          <span className={absoluteProfitClass}>{absoluteProfitText}</span>
                          <span className="strategy-entry-note">{entry.note || "-"}</span>
                        </div>
                      );
                    })}
                  </div>}
                </section>
              ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="backtesting-shell">
      <header className="backtesting-header">
        <div>
          <p className="backtesting-kicker">Intelligence workspace</p>
          <h1>Strategy testing</h1>
          <p>Review Nifty Nawaz strategy entries and outcomes.</p>
        </div>
        <Link href="/" className="backtesting-home-link"><FileText className="size-4" /> Home workspace</Link>
      </header>

      <nav className="strategy-testing-tabs" aria-label="Strategy statistics" role="tablist">
        {strategyTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} type="button" role="tab" aria-selected={isActive} className={`strategy-testing-tab${isActive ? " strategy-testing-tab-active" : ""}`} onClick={() => setActiveTab(tab.id)}>
              <Icon className="size-4" /> {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === "nifty-nawaz" ? <section className="strategy-preview-grid" aria-label="Strategy testing previews">
        <article className="strategy-preview-card strategy-preview-card-featured">
          <div className="strategy-preview-card-heading">
            <div><p className="strategy-preview-eyebrow">Live API strategy</p><h2>Nifty Nawaz</h2></div>
            <button type="button" className="strategy-preview-refresh" onClick={() => void fetchNiftyHL()} disabled={isLoadingNiftyHL} aria-label="Refresh Nifty Nawaz data" title="Refresh Nifty Nawaz data"><RefreshCw className={`size-4${isLoadingNiftyHL ? " animate-spin" : ""}`} /></button>
          </div>
          {renderNiftyHLContent()}
        </article>
      </section> : (
        <section className="strategy-tab-empty" role="tabpanel">
          <BarChart3 className="size-8" />
          <h2>{strategyTabs.find((tab) => tab.id === activeTab)?.label}</h2>
          <p>This tab is ready for the next set of strategy statistics.</p>
        </section>
      )}
    </div>
  );
}