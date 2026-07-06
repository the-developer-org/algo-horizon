"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const ALPHABET_ORDER = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
];

type AlphabetStatus = "pending" | "loading" | "completed" | "failed";

type LoadingState = {
  completedAlphabets: string[];
  currentAlphabet: string | null;
  statusByAlphabet: Record<string, AlphabetStatus>;
  loadedCompanies: number;
  error: string | null;
};

export default function StockMonitoringPage() {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    completedAlphabets: [],
    currentAlphabet: null,
    statusByAlphabet: ALPHABET_ORDER.reduce(
      (acc, letter) => ({ ...acc, [letter]: "pending" as AlphabetStatus }),
      {} as Record<string, AlphabetStatus>
    ),
    loadedCompanies: 0,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [monitoringMap, setMonitoringMap] = useState<Record<string, any[]>>({});
  const [activeTab, setActiveTab] = useState<string>("ALGO");
  const [sortBy, setSortBy] = useState<'name' | 'entryDate' | 'alphabet'>('name');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const completedCount = loadingState.completedAlphabets.length;
  const progressPercent = Math.round((completedCount / ALPHABET_ORDER.length) * 100);

  const selectedItemKey = selectedItem ? selectedItem.stockUuid || selectedItem.instrumentKey : null;

  const selectedDetails = useMemo(() => {
    if (!selectedItem) {
      return {
        entryDate: "",
        entryPrice: null,
        targetPrice: null,
        stopLossPrice: null,
        erGap: null,
        maxProfits: null,
        absoluteProfits: null,
        absoluteDays: null,
        supportDays: null,
        resistanceDays: null,
        prevLabel: "-",
        currLabel: "-",
      };
    }

    const entryRaw = selectedItem.entryTime
      || selectedItem.strykeSwingAnalysis?.currentSwing?.candle?.timestamp
      || selectedItem.strykeSwingAnalysis?.currentSwing?.time
      || selectedItem.entryCandle?.timestamp
      || selectedItem.id?.date;

    let entryDate = "";
    try {
      entryDate = entryRaw ? new Date(entryRaw).toLocaleDateString() : "";
    } catch (e) {
      entryDate = String(entryRaw || "");
    }

    const entryPrice =
      selectedItem.entryCandleClose ??
      selectedItem.entryPrice ??
      selectedItem.strykeSwingAnalysis?.currentSwing?.price ??
      selectedItem.algoSwingAnalysis?.currentSwing?.price ??
      selectedItem.entryCandle?.close ??
      null;

    const targetPrice =
      selectedItem.target ??
      selectedItem.algoSwingAnalysis?.algoResistance ??
      selectedItem.strykeSwingAnalysis?.algoResistance ??
      null;

    const stopLossPrice =
      selectedItem.stopLoss ??
      selectedItem.algoSwingAnalysis?.algoSupport ??
      selectedItem.strykeSwingAnalysis?.algoSupport ??
      null;

    const erGap =
      selectedItem.minSwingProfits ??
      selectedItem.strykeSwingAnalysis?.minSwingProfits ??
      selectedItem.algoSwingAnalysis?.minSwingProfits ??
      null;

    const maxProfits =
      selectedItem.maxSwingProfits ??
      selectedItem.strykeSwingAnalysis?.maxSwingProfits ??
      selectedItem.algoSwingAnalysis?.maxSwingProfits ??
      null;

    const absoluteProfits =
      selectedItem.absoluteProfitsPercentage ??
      selectedItem.strykeSwingAnalysis?.absoluteProfitsPercentage ??
      selectedItem.algoSwingAnalysis?.absoluteProfitsPercentage ??
      null;

    const absoluteDays =
      selectedItem.daysTakenForAbsoluteProfits ??
      selectedItem.strykeSwingAnalysis?.daysTakenForAbsoluteProfits ??
      selectedItem.algoSwingAnalysis?.daysTakenForAbsoluteProfits ??
      selectedItem.daysTakenForMaxSwingProfits ??
      null;

    const supportDays =
      selectedItem.daysTakenForSupportTouch ??
      selectedItem.strykeSwingAnalysis?.daysTakenForSupportTouch ??
      selectedItem.algoSwingAnalysis?.daysTakenForSupportTouch ??
      null;

    const resistanceDays =
      selectedItem.daysTakenForResistanceTouch ??
      selectedItem.strykeSwingAnalysis?.daysTakenForResistanceTouch ??
      selectedItem.algoSwingAnalysis?.daysTakenForResistanceTouch ??
      null;

    const prevLabel = selectedItem.strykeSwingAnalysis?.previousSwing?.label
      || selectedItem.algoSwingAnalysis?.previousSwing?.label
      || "-";
    const currLabel = selectedItem.strykeSwingAnalysis?.currentSwing?.label
      || selectedItem.algoSwingAnalysis?.currentSwing?.label
      || "-";

    return {
      entryDate,
      entryPrice,
      targetPrice,
      stopLossPrice,
      erGap,
      maxProfits,
      absoluteProfits,
      absoluteDays,
      supportDays,
      resistanceDays,
      prevLabel,
      currLabel,
    };
  }, [selectedItem]);

  const getItemKey = (item: any) => item.stockUuid || item.instrumentKey || "";

  const fetchMonitoringForAlphabet = async (alphabet: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const endpoint = `${baseUrl}/api/stock-monitoring/get-monitoring-data/${alphabet}`;

    const response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API failed for ${alphabet} with status ${response.status}`);
    }

    return response.json();
  };

  const didStartLoading = useRef(false);

  useEffect(() => {
    if (didStartLoading.current) return;
    didStartLoading.current = true;

    const loadAllAlphabets = async () => {
      setIsLoading(true);
      setLoadingState(prev => ({
        ...prev,
        completedAlphabets: [],
        currentAlphabet: null,
        statusByAlphabet: ALPHABET_ORDER.reduce(
          (acc, letter) => ({ ...acc, [letter]: "pending" as AlphabetStatus }),
          {} as Record<string, AlphabetStatus>
        ),
        loadedCompanies: 0,
        error: null,
      }));

      let totalCount = 0;
      const completedAlphabets: string[] = [];
      const statusByAlphabet = { ...loadingState.statusByAlphabet };

      for (const alphabet of ALPHABET_ORDER) {
        setLoadingState(prev => ({
          ...prev,
          currentAlphabet: alphabet,
          statusByAlphabet: { ...prev.statusByAlphabet, [alphabet]: "loading" },
        }));

        try {
          const result = await fetchMonitoringForAlphabet(alphabet);
          const count = Array.isArray(result)
            ? result.length
            : result?.monitoringResponseDTO?.dataMap
            ? Object.values(result.monitoringResponseDTO.dataMap).flat().length
            : 0;
          totalCount += count;
          completedAlphabets.push(alphabet);
          statusByAlphabet[alphabet] = "completed";

          // Merge monitoring data if present
          if (result?.monitoringResponseDTO?.dataMap) {
            const dataMap = result.monitoringResponseDTO.dataMap as Record<string, any[]>;
            setMonitoringMap(prev => {
              const next = { ...prev };
              for (const key of Object.keys(dataMap)) {
                next[key] = [...(next[key] || []), ...dataMap[key]];
              }
              return next;
            });
          } else if (Array.isArray(result)) {
            // Attempt to infer group from item shape
            setMonitoringMap(prev => {
              const next = { ...prev };
              for (const item of result) {
                const key = item?.algoV2 ? "ALGOV2" : "ALGO";
                next[key] = [...(next[key] || []), item];
              }
              return next;
            });
          }

          setLoadingState(prev => ({
            ...prev,
            loadedCompanies: totalCount,
            completedAlphabets: [...prev.completedAlphabets, alphabet],
            statusByAlphabet: { ...prev.statusByAlphabet, [alphabet]: "completed" },
          }));
        } catch (error) {
          statusByAlphabet[alphabet] = "failed";
          setLoadingState(prev => ({
            ...prev,
            error: error instanceof Error ? error.message : "Failed to load alphabet",
            statusByAlphabet: { ...prev.statusByAlphabet, [alphabet]: "failed" },
            completedAlphabets: [...prev.completedAlphabets, alphabet],
          }));
        }
      }

      setLoadingState(prev => ({
        ...prev,
        currentAlphabet: null,
        statusByAlphabet,
      }));
      setIsLoading(false);
    };

    loadAllAlphabets();
  }, []);

  const alphabetCells = useMemo(
    () =>
      ALPHABET_ORDER.map(letter => {
        const status = loadingState.statusByAlphabet[letter];
        const className = {
          pending: "bg-slate-200 text-slate-700",
          loading: "bg-amber-300 text-amber-900",
          completed: "bg-emerald-500 text-white",
          failed: "bg-rose-500 text-white",
        }[status];

        return (
          <div
            key={letter}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 font-semibold ${className}`}
          >
            {letter}
          </div>
        );
      }),
    [loadingState.statusByAlphabet]
  );

  const renderMonitoringRows = () => {
    const items = (monitoringMap[activeTab] || []).slice();
    const getEntryTs = (it: any) => {
      const raw = it.entryTime || it.entryCandle?.timestamp || it.id?.date;
      if (!raw) return 0;
      if (typeof raw === "number") return raw;
      const t = Date.parse(raw);
      return isNaN(t) ? 0 : t;
    };

    items.sort((a: any, b: any) => {
      if (sortBy === "name") {
        return String(a.companyName || "").localeCompare(String(b.companyName || ""));
      }
      if (sortBy === "entryDate") {
        return getEntryTs(b) - getEntryTs(a);
      }
      const aChar = String(a.companyName || "").charAt(0).toUpperCase();
      const bChar = String(b.companyName || "").charAt(0).toUpperCase();
      return aChar.localeCompare(bChar);
    });

    const rows: any[] = [];
    const rowSize = 4;

    for (let i = 0; i < items.length; i += rowSize) {
      const rowItems = items.slice(i, i + rowSize);

      rows.push(
        <div key={`row-${i}`} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rowItems.map((item: any) => {
            const entryRaw =
              item.entryTime ||
              item.strykeSwingAnalysis?.currentSwing?.candle?.timestamp ||
              item.strykeSwingAnalysis?.currentSwing?.time ||
              item.entryCandle?.timestamp ||
              item.id?.date;

            let entryDate = "";
            try {
              entryDate = entryRaw ? new Date(entryRaw).toLocaleDateString() : "";
            } catch {
              entryDate = String(entryRaw || "");
            }

            const prevLabel =
              item.strykeSwingAnalysis?.previousSwing?.label ||
              item.algoSwingAnalysis?.previousSwing?.label ||
              "-";

            const currLabel =
              item.strykeSwingAnalysis?.currentSwing?.label ||
              item.algoSwingAnalysis?.currentSwing?.label ||
              "-";

            const isSelected = selectedItemKey && getItemKey(item) === selectedItemKey;

            return (
              <div
                key={getItemKey(item) || `${i}-${item.companyName}`}
                className={`rounded-lg border p-3 bg-white transition duration-200 ${isSelected ? "border-emerald-500 shadow-lg" : "border-slate-200 hover:border-slate-300 hover:shadow-sm"} cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-300`}
                onClick={() => setSelectedItem(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedItem(item);
                  }
                }}
              >
                <div className="text-sm font-medium text-slate-700">{item.companyName}</div>
                <div className="mt-2 text-xs text-slate-500">
                  <span className="font-medium mr-1">Stryke entry:</span>
                  {entryDate ? <span className="mr-3">{entryDate}</span> : <span className="mr-3">-</span>}
                  <span className="font-medium">Stryke labels:</span>
                  <span className="ml-1">{prevLabel} &lt;- {currLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      );

      const selectedRowIndex = rowItems.findIndex(
        (item: any) => selectedItemKey && getItemKey(item) === selectedItemKey
      );
      if (selectedRowIndex !== -1) {
        rows.push(
          <div key={`selected-panel-${i}`}>
            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-emerald-700">Selected company</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{selectedItem?.companyName || "Unknown"}</p>
                  <p className="mt-1 text-sm text-slate-600">{selectedItem?.ticker || selectedItem?.symbol || ""}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Entry Date</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDetails.entryDate || "-"}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Entry</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDetails.entryPrice != null ? selectedDetails.entryPrice.toFixed(2) : "-"}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Target</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDetails.targetPrice != null ? selectedDetails.targetPrice.toFixed(2) : "-"}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Stop Loss</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDetails.stopLossPrice != null ? selectedDetails.stopLossPrice.toFixed(2) : "-"}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">ER-Gap</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDetails.erGap != null ? `${selectedDetails.erGap.toFixed(2)}%` : "-"}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Max Profits</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDetails.maxProfits != null ? `${selectedDetails.maxProfits.toFixed(2)}%` : "-"}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Absolute Profits</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDetails.absoluteProfits != null ? `${selectedDetails.absoluteProfits.toFixed(2)}%` : "-"}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Absolute Days</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDetails.absoluteDays != null ? selectedDetails.absoluteDays : "-"}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Support</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDetails.supportDays != null ? selectedDetails.supportDays : "-"}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Resistance</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDetails.resistanceDays != null ? selectedDetails.resistanceDays : "-"}</p>
                </div>
              </div>
            </div>
          </div>
        );
      }
    }

    return rows;
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto w-full max-w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:px-10 xl:px-12">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Stock Monitoring</h1>
            <p className="mt-2 text-sm text-slate-600">
              Automatically loading stock monitoring for all alphabets. This page tracks which alphabets have been processed.
            </p>
          </div>
          {/* Show alphabet progress and cells only while loading or not yet complete */}
          {!(progressPercent === 100 && !isLoading) && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Alphabet progress</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {completedCount}/26 alphabets completed
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700">
                    {loadingState.currentAlphabet
                      ? `Loading ${loadingState.currentAlphabet}`
                      : isLoading
                      ? "Finalizing..."
                      : "Complete"}
                  </div>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {alphabetCells}
              </div>
            </>
          )}

          {/* Removed total loaded companies card - counts are shown per-tab */}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("ALGO")}
                className={`px-3 py-1 rounded flex items-center gap-2 ${activeTab === "ALGO" ? "bg-emerald-500 text-white" : "bg-white text-slate-700 border"}`}
              >
                <span>ALGO</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{(monitoringMap['ALGO'] || []).length}</span>
              </button>
              <button
                onClick={() => setActiveTab("ALGOV2")}
                className={`px-3 py-1 rounded flex items-center gap-2 ${activeTab === "ALGOV2" ? "bg-emerald-500 text-white" : "bg-white text-slate-700 border"}`}
              >
                <span>ALGOV2</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{(monitoringMap['ALGOV2'] || []).length}</span>
              </button>

              <div className="ml-auto flex items-center gap-2">
                <label className="text-xs text-slate-600">Sort:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="text-sm border rounded px-2 py-1">
                  <option value="name">Company name</option>
                  <option value="entryDate">Stryke entry date</option>
                  <option value="alphabet">Alphabet</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <div className="space-y-4">
                {renderMonitoringRows()}
              </div>
              {(!monitoringMap[activeTab] || monitoringMap[activeTab].length === 0) && (
                <p className="mt-3 text-sm text-slate-500">No data for {activeTab}</p>
              )}
            </div>
          </div>

          {loadingState.error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              Error loading one or more alphabets: {loadingState.error}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
