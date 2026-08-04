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

type QuarterAnalysis = {
  quarter: string;
  openingPrice: number;
  closingPrice: number;
  maxRisePercent: number;
  maxFallPercent: number;
};

type DayAnalysis = {
  dayNumber: number;
  date: string;
  maxRisePercent: number;
  maxRise: number;
  maxFallPercent: number;
  maxFall: number;
  openingPrice: number;
  closingPrice: number;
  quarters?: QuarterAnalysis[];
};

const formatScalpingDate = (raw: any): string => {
  if (Array.isArray(raw) && raw.length >= 3) {
    const [year, month, day] = raw;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return String(raw || "");
};

const formatChartDate = (raw: any): string | null => {
  const value = formatScalpingDate(raw).trim();
  if (!value || value === "-") return null;
  return value;
};

type ScalpingDto = {
  entryDate: string;
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  dailyAnalysis: DayAnalysis[];
  absoluteProfitsPercentage?: number;
  prevSwingLabel?: string;
  currentSwingLabel?: string;
  minSwingProfits?: number;
  maxSwingProfits?: number;
  daysTakenForMaxSwingProfits?: number;
  daysTakenForSupportTouch?: number;
  daysTakenForResistanceTouch?: number;
  daysTakenForAbsoluteProfits?: number;
  didCOCBreak?: boolean;
};

type ScalpingCompany = {
  companyName?: string;
  instrumentKey?: string;
  uuid?: string;
  strykeScalping?: ScalpingDto | null;
  algoScalping?: ScalpingDto | null;
  algoV2Scalping?: ScalpingDto | null;
  algoV3Scalping?: ScalpingDto | null;
  [key: string]: any;
};

type ScalpingTabKey = "strykeScalping" | "algoScalping" | "algoV2Scalping" | "algoV3Scalping";

const SCALPING_TABS: { key: ScalpingTabKey; label: string; badge: string }[] = [
  { key: "strykeScalping", label: "Stryke", badge: "S" },
  { key: "algoScalping", label: "Algo", badge: "A" },
  { key: "algoV2Scalping", label: "AlgoV2", badge: "A2" },
  { key: "algoV3Scalping", label: "AlgoV3", badge: "A3" },
];

type ScalpingPerformance = "up" | "down" | "flat" | "none";
type DayHitState = "target" | "stop-loss" | "none";
type GapState = "none" | "up" | "down" | "flat";

const performanceLabel: Record<ScalpingPerformance, string> = {
  up: "Steady Growth",
  down: "Gradual Decline",
  flat: "Sideways Movement",
  none: "No Clear Data",
};

const createAlphabetStatusMap = () =>
  ALPHABET_ORDER.reduce(
    (acc, letter) => ({ ...acc, [letter]: "pending" as AlphabetStatus }),
    {} as Record<string, AlphabetStatus>
  );

export default function ScalpingPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    completedAlphabets: [],
    currentAlphabet: null,
    statusByAlphabet: createAlphabetStatusMap(),
    loadedCompanies: 0,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCompleteBanner, setShowCompleteBanner] = useState(false);
  const didStartLoading = useRef(false);

  const [companiesMap, setCompaniesMap] = useState<Record<string, ScalpingCompany>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanyKey, setSelectedCompanyKey] = useState<string | null>(null);
  const [activeScalpingTab, setActiveScalpingTab] = useState<ScalpingTabKey>("strykeScalping");
  const [expandedDayNumber, setExpandedDayNumber] = useState<number | null>(null);

  const completedCount = loadingState.completedAlphabets.length;
  const progressPercent = Math.round((completedCount / ALPHABET_ORDER.length) * 100);

  const getCompanyKey = (item: any) => item?.instrumentKey || item?.uuid || item?.companyName || "";

  const buildScalpingDto = (item: any, tabKey: ScalpingTabKey): ScalpingDto | null => {
    const nested = item?.[tabKey];

    if (nested && typeof nested === "object") {
      const dailyAnalysis = Array.isArray(nested?.dailyAnalysis)
        ? nested.dailyAnalysis.map((day: any) => ({
            dayNumber: Number(day?.dayNumber ?? 0),
            date: formatScalpingDate(day?.date),
            maxRisePercent: Number(day?.maxRisePercent ?? 0),
            maxRise: Number(day?.maxRise ?? 0),
            maxFallPercent: Number(day?.maxFallPercent ?? 0),
            maxFall: Number(day?.maxFall ?? 0),
            openingPrice: Number(day?.openingPrice ?? 0),
            closingPrice: Number(day?.closingPrice ?? 0),
            quarters: Array.isArray(day?.quarters)
              ? day.quarters.map((quarter: any) => ({
                  quarter: String(quarter?.quarter ?? ""),
                  openingPrice: Number(quarter?.openingPrice ?? 0),
                  closingPrice: Number(quarter?.closingPrice ?? 0),
                  maxRisePercent: Number(quarter?.maxRisePercent ?? 0),
                  maxFallPercent: Number(quarter?.maxFallPercent ?? 0),
                }))
              : [],
          }))
        : [];

      return {
        entryDate: formatScalpingDate(nested?.entryDate ?? item?.entryTime),
        entryPrice: Number(nested?.entryPrice ?? item?.entryCandleClose ?? 0),
        targetPrice: Number(nested?.targetPrice ?? item?.target ?? 0),
        stopLossPrice: Number(nested?.stopLossPrice ?? item?.stopLoss ?? 0),
        dailyAnalysis,
        absoluteProfitsPercentage: Number(item?.absoluteProfitsPercentage ?? 0),
        prevSwingLabel: item?.prevSwingLabel ?? "-",
        currentSwingLabel: item?.currentSwingLabel ?? "-",
        minSwingProfits: Number(item?.minSwingProfits ?? 0),
        maxSwingProfits: Number(item?.maxSwingProfits ?? 0),
        daysTakenForMaxSwingProfits: Number(item?.daysTakenForMaxSwingProfits ?? 0),
        daysTakenForSupportTouch: Number(item?.daysTakenForSupportTouch ?? 0),
        daysTakenForResistanceTouch: Number(item?.daysTakenForResistanceTouch ?? 0),
        daysTakenForAbsoluteProfits: Number(item?.daysTakenForAbsoluteProfits ?? 0),
        didCOCBreak: Boolean(item?.didCOCBreak),
      };
    }

    if (!item) return null;

    return {
      entryDate: formatScalpingDate(item?.entryTime),
      entryPrice: Number(item?.entryCandleClose ?? 0),
      targetPrice: Number(item?.target ?? 0),
      stopLossPrice: Number(item?.stopLoss ?? 0),
      dailyAnalysis: [],
      absoluteProfitsPercentage: Number(item?.absoluteProfitsPercentage ?? 0),
      prevSwingLabel: item?.prevSwingLabel ?? "-",
      currentSwingLabel: item?.currentSwingLabel ?? "-",
      minSwingProfits: Number(item?.minSwingProfits ?? 0),
      maxSwingProfits: Number(item?.maxSwingProfits ?? 0),
      daysTakenForMaxSwingProfits: Number(item?.daysTakenForMaxSwingProfits ?? 0),
      daysTakenForSupportTouch: Number(item?.daysTakenForSupportTouch ?? 0),
      daysTakenForResistanceTouch: Number(item?.daysTakenForResistanceTouch ?? 0),
      daysTakenForAbsoluteProfits: Number(item?.daysTakenForAbsoluteProfits ?? 0),
      didCOCBreak: Boolean(item?.didCOCBreak),
    };
  };

  const normalizeScalpingResponse = (result: any): Record<string, ScalpingCompany> => {
    const buckets = result?.swingStatsList;
    if (!buckets || typeof buckets !== "object") return {};

    const merged: Record<string, ScalpingCompany> = {};
    const bucketToTab: Record<string, ScalpingTabKey> = {
      STRYKE: "strykeScalping",
      ALGO: "algoScalping",
      ALGOV2: "algoV2Scalping",
      ALGOV3: "algoV3Scalping",
    };

    for (const [bucketKey, bucketValue] of Object.entries(buckets)) {
      const list = Array.isArray(bucketValue) ? bucketValue : [];
      const tabKey = bucketToTab[(bucketKey || "").toUpperCase()] as ScalpingTabKey | undefined;

      for (const item of list) {
        const companyKey = getCompanyKey(item);
        if (!companyKey) continue;

        const existing = merged[companyKey] || {};
        merged[companyKey] = {
          ...existing,
          companyName: item?.companyName || existing.companyName || companyKey,
          instrumentKey: item?.instrumentKey || existing.instrumentKey,
          uuid: item?.uuid || existing.uuid,
          ...(tabKey ? { [tabKey]: buildScalpingDto(item, tabKey) } : {}),
        };
      }
    }

    return merged;
  };

  const fetchScalpingDataForAlphabet = async (alphabet: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const endpoint = `${baseUrl}/api/stryke/fetch-all-analysis/${alphabet}`;

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

  const formatDate = (raw: any) => {
    try {
      return raw ? new Date(raw).toLocaleDateString() : "-";
    } catch {
      return String(raw || "-");
    }
  };

  const formatNumber = (value: any, suffix = "") => {
    return value != null && Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}${suffix}` : "-";
  };

  const getScalpingPerformance = (dto?: ScalpingDto | null): ScalpingPerformance => {
    if (!dto) return "none";
    const days = Array.isArray(dto.dailyAnalysis) ? dto.dailyAnalysis : [];
    const lastDay = days.length > 0 ? days.at(-1) ?? null : null;
    if (lastDay && Number.isFinite(dto.entryPrice)) {
      if (lastDay.closingPrice > dto.entryPrice) return "up";
      if (lastDay.closingPrice < dto.entryPrice) return "down";
      return "flat";
    }

    if ((dto.absoluteProfitsPercentage ?? 0) > 0) return "up";
    if ((dto.absoluteProfitsPercentage ?? 0) < 0) return "down";
    return "flat";
  };

  const isHHtoHLTransition = (dto?: ScalpingDto | null): boolean => {
    if (!dto) return false;
    const prev = String(dto.prevSwingLabel || "").trim().toUpperCase();
    const current = String(dto.currentSwingLabel || "").trim().toUpperCase();
    return prev === "HH" && current === "HL";
  };

  const getSwingTransitionText = (dto?: ScalpingDto | null): string => {
    if (!dto) return "-";
    const prev = dto.prevSwingLabel || "-";
    const current = dto.currentSwingLabel || "-";
    return `${prev} → ${current}`;
  };

  const performanceBadgeClass: Record<ScalpingPerformance, string> = {
    up: "bg-emerald-500 text-white",
    down: "bg-rose-500 text-white",
    flat: "bg-amber-300 text-amber-900",
    none: "bg-slate-200 text-slate-400",
  };

  const dayHitClassByState: Record<DayHitState, string> = {
    target: "border-emerald-300 bg-emerald-50",
    "stop-loss": "border-rose-300 bg-rose-50",
    none: "",
  };

  const gapBadgeClassByState: Record<Exclude<GapState, "none">, string> = {
    up: "bg-emerald-100 text-emerald-800",
    down: "bg-rose-100 text-rose-800",
    flat: "bg-amber-100 text-amber-900",
  };

  const gapLabelByState: Record<Exclude<GapState, "none">, string> = {
    up: "Gap up",
    down: "Gap down",
    flat: "Flat open",
  };

  const getDayHitState = (day: DayAnalysis, dto: ScalpingDto): DayHitState => {
    const isTargetCrossed = Number.isFinite(dto.targetPrice) && (day.maxRise ?? 0) >= dto.targetPrice;
    const isStopLossCrossed = Number.isFinite(dto.stopLossPrice) && (day.maxFall ?? Infinity) <= dto.stopLossPrice;

    if (isStopLossCrossed) return "stop-loss";
    if (isTargetCrossed) return "target";
    return "none";
  };

  const getGapOpeningState = (day: DayAnalysis, index: number, days: DayAnalysis[]): { gapState: GapState; gapPercent: number } => {
    const previousClose = index > 0 ? days[index - 1]?.closingPrice : null;
    const hasPreviousClose = previousClose != null && Number.isFinite(Number(previousClose));
    if (!hasPreviousClose) {
      return { gapState: "none", gapPercent: 0 };
    }

    const previousCloseNumber = Number(previousClose);
    const gapDiff = (day.openingPrice ?? 0) - previousCloseNumber;
    const gapPercent = previousCloseNumber !== 0 ? (gapDiff / previousCloseNumber) * 100 : 0;

    if (gapDiff > 0) return { gapState: "up", gapPercent };
    if (gapDiff < 0) return { gapState: "down", gapPercent };
    return { gapState: "flat", gapPercent };
  };

  const buildChartUrl = (company: ScalpingCompany): string | null => {
    if (!company?.instrumentKey) return null;

    let chartUrl = `/chart?instrumentKey=${encodeURIComponent(company.instrumentKey)}&timeframe=1d`;
    const strykeDate = formatChartDate(company?.strykeScalping?.entryDate);
    const algoDate = formatChartDate(
      company?.algoScalping?.entryDate || company?.algoV2Scalping?.entryDate || company?.algoV3Scalping?.entryDate
    );

    if (strykeDate) {
      chartUrl += `&strykeDate=${encodeURIComponent(strykeDate)}`;
    }

    if (algoDate) {
      chartUrl += `&algoDate=${encodeURIComponent(algoDate)}`;
    }

    return chartUrl;
  };

  const openChart = (company: ScalpingCompany) => {
    const chartUrl = buildChartUrl(company);
    if (!chartUrl) return;
    window.open(chartUrl, "_blank");
  };

  useEffect(() => {
    setIsHydrated(true);

    if (didStartLoading.current) return;
    didStartLoading.current = true;

    const loadAllAlphabets = async () => {
      setIsLoading(true);
      setLoadingState(prev => ({
        ...prev,
        completedAlphabets: [],
        currentAlphabet: null,
        statusByAlphabet: createAlphabetStatusMap(),
        loadedCompanies: 0,
        error: null,
      }));

      let totalCount = 0;
      const statusByAlphabet = { ...loadingState.statusByAlphabet };

      for (const alphabet of ALPHABET_ORDER) {
        setLoadingState(prev => ({
          ...prev,
          currentAlphabet: alphabet,
          statusByAlphabet: { ...prev.statusByAlphabet, [alphabet]: "loading" },
        }));

        try {
          const result = await fetchScalpingDataForAlphabet(alphabet);
          const normalized = normalizeScalpingResponse(result);
          const count = Object.keys(normalized).length;
          totalCount += count;
          statusByAlphabet[alphabet] = "completed";

          setCompaniesMap(prev => ({ ...prev, ...normalized }));

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

  useEffect(() => {
    if (isLoading || progressPercent !== 100) return;

    setShowCompleteBanner(true);
    const timer = setTimeout(() => setShowCompleteBanner(false), 4000);
    return () => clearTimeout(timer);
  }, [isLoading, progressPercent]);

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

  const allCompanies = useMemo(() => Object.values(companiesMap), [companiesMap]);

  const filteredCompanies = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allCompanies;
    return allCompanies.filter(company => String(company.companyName || "").toLowerCase().includes(term));
  }, [allCompanies, searchTerm]);

  const selectedCompany = selectedCompanyKey ? companiesMap[selectedCompanyKey] || null : null;
  const selectedDto = selectedCompany ? (selectedCompany[activeScalpingTab] as ScalpingDto | undefined) : undefined;
  const selectedDays = Array.isArray(selectedDto?.dailyAnalysis) ? selectedDto.dailyAnalysis : [];
  const expandedDay = selectedDays.find(day => day.dayNumber === expandedDayNumber) || null;

  const handleSelectCompany = (companyKey: string) => {
    setSelectedCompanyKey(companyKey);
    setActiveScalpingTab("strykeScalping");
    setExpandedDayNumber(null);
  };

  const getTabColorClass = (performance: ScalpingPerformance) => {
    return {
      up: "border-emerald-300 bg-emerald-500 text-white hover:bg-emerald-600",
      down: "border-rose-300 bg-rose-500 text-white hover:bg-rose-600",
      flat: "border-amber-300 bg-amber-300 text-amber-900 hover:bg-amber-400",
      none: "border-slate-200 bg-slate-200 text-slate-500 hover:bg-slate-300",
    }[performance];
  };

  const renderSelectedCompanyPanel = () => {
    if (!selectedCompany || !selectedDto) return null;

    const swingText = getSwingTransitionText(selectedDto);
    const isSelectedHHtoHL = isHHtoHLTransition(selectedDto);

    return (
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Selected company</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{selectedCompany.companyName || "Unknown"}</p>
          </div>
          <div className="flex items-center gap-3 sm:justify-end">
            <p className={`text-sm font-semibold ${isSelectedHHtoHL ? "rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-emerald-800" : "text-slate-700"}`}>
              {swingText}
            </p>
            <button
              type="button"
              onClick={() => openChart(selectedCompany)}
              className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!selectedCompany.instrumentKey}
              title="Open OHLC chart"
            >
              Chart
            </button>
            <button
              type="button"
              onClick={() => setSelectedCompanyKey(null)}
              className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SCALPING_TABS.map(tab => {
            const performance = getScalpingPerformance(selectedCompany[tab.key] as ScalpingDto | undefined);
            const tabColorClass = getTabColorClass(performance);

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveScalpingTab(tab.key);
                  setExpandedDayNumber(null);
                }}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition ${tabColorClass} ${
                  activeScalpingTab === tab.key ? "ring-2 ring-amber-300 shadow-[0_0_0_3px_rgba(252,211,77,0.35)]" : ""
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-1 text-emerald-800">Green: Steady Growth</span>
          <span className="rounded-full border border-rose-300 bg-rose-100 px-2 py-1 text-rose-800">Red: Gradual Decline</span>
          <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-amber-900">Yellow: Sideways Movement</span>
          <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-slate-700">Gray: No Clear Data</span>
        </div>

        {!selectedDto && (
          <p className="mt-4 text-sm text-slate-500">No {SCALPING_TABS.find(t => t.key === activeScalpingTab)?.label} scalping data for this company.</p>
        )}

        {selectedDto && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Entry Date</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(selectedDto.entryDate)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Entry Price</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatNumber(selectedDto.entryPrice)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Target</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatNumber(selectedDto.targetPrice)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Stop Loss</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatNumber(selectedDto.stopLossPrice)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Min / Max Swing Profit</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatNumber(selectedDto.minSwingProfits, "%")} / {formatNumber(selectedDto.maxSwingProfits, "%")}</p>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Day-by-day analysis</p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {selectedDays.map((day, index) => {
                  const isRiseDominant = (day.maxRisePercent ?? 0) >= (day.maxFallPercent ?? 0);
                  const isExpanded = expandedDayNumber === day.dayNumber;
                  const dayHitState = getDayHitState(day, selectedDto);
                  const { gapState, gapPercent } = getGapOpeningState(day, index, selectedDays);
                  const dayHitClass = dayHitClassByState[dayHitState];
                  const gapBadgeClass = gapState !== "none" ? gapBadgeClassByState[gapState] : "";
                  const gapLabel = gapState !== "none" ? gapLabelByState[gapState] : "";

                  return (
                    <button
                      key={day.dayNumber}
                      type="button"
                      onClick={() => setExpandedDayNumber(isExpanded ? null : day.dayNumber)}
                      className={`min-w-[150px] shrink-0 rounded-xl border p-3 text-left transition ${
                        isExpanded
                          ? "border-emerald-400 bg-emerald-50 shadow-sm"
                          : `${dayHitClass || "border-slate-200 bg-white"} hover:border-slate-300`
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Day {day.dayNumber}</p>
                      {dayHitState !== "none" && (
                        <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${dayHitState === "target" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                          {dayHitState === "target" ? "Target crossed" : "SL crossed"}
                        </p>
                      )}
                      {gapState !== "none" && (
                        <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${gapBadgeClass}`}>
                          {gapLabel}
                          {` (${formatNumber(Math.abs(gapPercent), "%")})`}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">{formatDate(day.date)}</p>
                      <p className="mt-2 text-sm text-slate-700">
                        {formatNumber(day.openingPrice)} &rarr; {formatNumber(day.closingPrice)}
                      </p>
                      <div className="mt-2 flex gap-2 text-xs">
                        <span className={`rounded px-1.5 py-0.5 font-medium ${isRiseDominant ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                          +{formatNumber(day.maxRisePercent, "%")}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 font-medium ${!isRiseDominant ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-500"}`}>
                          -{formatNumber(Math.abs(day.maxFallPercent ?? 0), "%")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedDays.length === 0 && (
                <p className="text-sm text-slate-500">No daily analysis available.</p>
              )}
            </div>

            {expandedDay && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-emerald-700">
                  Day {expandedDay.dayNumber} &bull; Quarter breakdown
                </p>
                <p className="mb-3 text-xs text-emerald-700/80">
                  Quarter percentages are calculated from each quarter opening price. Day percentages are calculated from the day opening price.
                </p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {(expandedDay.quarters || []).map((quarter, index) => {
                    const isQuarterRiseDominant = (quarter.maxRisePercent ?? 0) >= (quarter.maxFallPercent ?? 0);

                    return (
                      <div
                        key={`${quarter.quarter}-${index}`}
                        className="min-w-[170px] shrink-0 rounded-xl border border-emerald-200 bg-white p-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{quarter.quarter || `Q${index + 1}`}</p>
                        <p className="mt-2 text-sm text-slate-700">
                          {formatNumber(quarter.openingPrice)} &rarr; {formatNumber(quarter.closingPrice)}
                        </p>
                        <div className="mt-2 flex gap-2 text-xs">
                          <span className={`rounded px-1.5 py-0.5 font-medium ${isQuarterRiseDominant ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                            +{formatNumber(quarter.maxRisePercent, "%")}
                          </span>
                          <span className={`rounded px-1.5 py-0.5 font-medium ${!isQuarterRiseDominant ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-500"}`}>
                            -{formatNumber(Math.abs(quarter.maxFallPercent ?? 0), "%")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(expandedDay.quarters || []).length === 0 && (
                  <p className="py-2 text-sm text-slate-500">No quarter data available for this day.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderCompanyRows = () => {
    const rows: any[] = [];
    const rowSize = 5;

    for (let i = 0; i < filteredCompanies.length; i += rowSize) {
      const rowItems = filteredCompanies.slice(i, i + rowSize);

      rows.push(
        <div key={`row-${i}`} className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {rowItems.map(company => {
            const companyKey = getCompanyKey(company);
            const isSelected = companyKey === selectedCompanyKey;

            return (
              <button
                key={companyKey}
                type="button"
                onClick={() => handleSelectCompany(companyKey)}
                className={`rounded-xl border p-3 text-left transition ${
                  isSelected
                    ? "border-emerald-400 bg-emerald-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <p className="truncate text-sm font-medium text-slate-800">{company.companyName || "Unknown"}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {SCALPING_TABS.map(tab => {
                    const performance = getScalpingPerformance(company[tab.key] as ScalpingDto | undefined);
                    return (
                      <span
                        key={tab.key}
                        title={`${tab.label}: ${performanceLabel[performance]}`}
                        className={`inline-flex h-6 w-7 items-center justify-center rounded-md text-[11px] font-semibold ${performanceBadgeClass[performance]}`}
                      >
                        {tab.badge}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      );

      const selectedInRow = rowItems.some(company => getCompanyKey(company) === selectedCompanyKey);
      if (selectedInRow) {
        rows.push(
          <div key={`selected-row-panel-${i}`}>
            {renderSelectedCompanyPanel()}
          </div>
        );
      }
    }

    return rows;
  };

  if (!isHydrated) {
    return null;
  }

  let progressLabel = "Complete";
  if (loadingState.currentAlphabet) {
    progressLabel = `Loading ${loadingState.currentAlphabet}`;
  } else if (isLoading) {
    progressLabel = "Finalizing...";
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:px-10 xl:px-12">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Scalping</h1>
          </div>

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
                    {progressLabel}
                  </div>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {alphabetCells}
              </div>
            </>
          )}

          {showCompleteBanner && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Scalping analysis loading is complete. All alphabets have been processed.
            </div>
          )}

          {loadingState.error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <p className="font-semibold">Loading failed for one or more alphabets.</p>
              <p className="mt-1">{loadingState.error}</p>
            </div>
          )}

          {allCompanies.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Companies loaded</p>
                  <p className="text-lg font-semibold text-slate-900">{allCompanies.length}</p>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search company name..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-64"
                />
              </div>

              <div className="mt-4 space-y-4">
                {renderCompanyRows()}
              </div>

              {filteredCompanies.length === 0 && (
                <p className="mt-3 text-sm text-slate-500">No companies match &quot;{searchTerm}&quot;.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

