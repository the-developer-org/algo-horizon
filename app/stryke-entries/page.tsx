"use client";

import { useEffect, useState } from "react";
import { StrykeEntries } from "@/types/analysis";

const ALPHABETS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

type EntriesResponse = {
  strykeInboundDataList?: StrykeEntries[];
  statusText?: string;
};

type EntryTab = "executed" | "pending" | "failed";

const isTrue = (value: unknown): boolean =>
  value === true || value === 1 || (typeof value === "string" && value.toLowerCase() === "true");

export default function StrykeEntriesPage() {
  const [entries, setEntries] = useState<StrykeEntries[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [currentAlphabet, setCurrentAlphabet] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EntryTab>("executed");
  const [searchTerm, setSearchTerm] = useState("");
  const [rerunningId, setRerunningId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadEntries = async () => {
      setIsLoading(true);
      setError(null);

      for (const alphabet of ALPHABETS) {
        if (cancelled) return;
        setCurrentAlphabet(alphabet);

        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL ?? ""}/api/stryke-inbound/fetch-all/${alphabet}`,
            { headers: { accept: "application/json" } }
          );

     
          if (!response.ok) {
            throw new Error(`Failed to load ${alphabet} (${response.status})`);
          }

          const data: EntriesResponse = await response.json();
          if (!cancelled) {
            setEntries((previous) => [
              ...previous,
              ...(data.strykeInboundDataList ?? []),
            ]);
            setCompleted((previous) => [...previous, alphabet]);
          }
        } catch (loadError) {
          if (!cancelled) {
            setError(loadError instanceof Error ? loadError.message : "Failed to load entries");
          }
        }
      }

      if (!cancelled) {
        setCurrentAlphabet(null);
        setIsLoading(false);
      }
    };

    loadEntries();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRerun = async (entry: StrykeEntries) => {
    const suffix = entry.companyName?.trim().charAt(0).toUpperCase();
    if (!entry.id || !suffix) {
      setError("Unable to re-run this entry: missing id or company suffix.");
      return;
    }

    setRerunningId(entry.id);
    setActionMessage(null);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL ?? ""}/api/stryke-inbound/re-run/${encodeURIComponent(entry.id)}/${encodeURIComponent(suffix)}`,
        { method: "POST", headers: { accept: "application/json" } }
      );

      if (!response.ok) {
        throw new Error(`Re-run failed (${response.status})`);
      }

      setEntries((previous) => previous.map((item) =>
        item.id === entry.id ? { ...item, executed: false, failed: false } : item
      ));
      setActionMessage(`${entry.companyName} re-run successfully.`);
    } catch (rerunError) {
      setError(rerunError instanceof Error ? rerunError.message : "Failed to re-run entry.");
    } finally {
      setRerunningId(null);
    }
  };

  const progress = Math.round((completed.length / ALPHABETS.length) * 100);
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredEntries = entries.filter((entry) => {
    const isExecuted = isTrue(entry.executed);
    const isFailed = isTrue(entry.failed);
    const matchesStatus = activeTab === "failed"
      ? isFailed
      : activeTab === "executed"
        ? isExecuted
        : !isExecuted;
    const matchesCompany = !normalizedSearchTerm || entry.companyName?.toLowerCase().includes(normalizedSearchTerm);
    return matchesStatus && matchesCompany;
  });
  const tabCounts = {
    executed: entries.filter((entry) => isTrue(entry.executed)).length,
    pending: entries.filter((entry) => !isTrue(entry.executed)).length,
    failed: entries.filter((entry) => isTrue(entry.failed)).length,
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto w-full max-w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-10">
        <h1 className="text-3xl font-semibold text-slate-900">Stryke Entries</h1>
        <p className="mt-2 text-sm text-slate-600">Entries loaded from the Stryke inbound feed.</p>

        {isLoading && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-live="polite">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>{currentAlphabet ? `Loading ${currentAlphabet}` : "Preparing..."}</span>
              <span>{completed.length}/{ALPHABETS.length} alphabets</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {ALPHABETS.map((alphabet) => (
                <span
                  key={alphabet}
                  className={`rounded px-2 py-1 text-xs font-medium ${completed.includes(alphabet) ? "bg-emerald-100 text-emerald-800" : currentAlphabet === alphabet ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"}`}
                >
                  {alphabet}
                </span>
              ))}
            </div>
          </section>
        )}

        {error && <p className="mt-6 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {actionMessage && <p className="mt-6 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{actionMessage}</p>}

        <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3" role="tablist" aria-label="Stryke entry status">
          {(["executed", "pending", "failed"] as EntryTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {tab} ({tabCounts[tab]})
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label htmlFor="stryke-entry-search" className="sr-only">Search companies</label>
          <input
            id="stryke-entry-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search companies..."
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Entry Time</th>
                <th className="px-4 py-3">Stop Loss</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="text-slate-700">
                  <td className="px-4 py-3 font-medium">{entry.companyName || "-"}</td>
                  <td className="px-4 py-3">{`${entry?.entryDate} - ${entry?.time}`}</td>
                  <td className="px-4 py-3">{entry.stopLoss ?? "-"}</td>
                  <td className="px-4 py-3">{entry.target ?? "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleRerun(entry)}
                      disabled={rerunningId === entry.id}
                      className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {rerunningId === entry.id ? "Re-running..." : "Re-run"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && filteredEntries.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No {activeTab} entries found.</p>}
        </div>
      </div>
    </main>
  );
}
