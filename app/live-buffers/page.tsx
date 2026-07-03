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

export default function LiveBuffersPage() {
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

  const completedCount = loadingState.completedAlphabets.length;
  const progressPercent = Math.round((completedCount / ALPHABET_ORDER.length) * 100);

  const fetchLiveBuffersForAlphabet = async (alphabet: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const endpoint = `${baseUrl}/api/prediction/get-live-prediction-data/${alphabet}`;

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
          const result = await fetchLiveBuffersForAlphabet(alphabet);
          const count = Array.isArray(result) ? result.length : 0;
          totalCount += count;
          completedAlphabets.push(alphabet);
          statusByAlphabet[alphabet] = "completed";

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

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto w-full max-w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:px-10 xl:px-12">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Live Buffers</h1>
            <p className="mt-2 text-sm text-slate-600">
              Automatically loading live buffers for all alphabets. This page tracks which alphabets have been processed.
            </p>
          </div>

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

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Loaded companies</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{loadingState.loadedCompanies}</p>
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
