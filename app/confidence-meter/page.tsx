"use client";

import * as React from "react";
import toast from 'react-hot-toast';
import CompanySearch from '@/components/CompanySearch';
import { fetchKeyMapping } from '@/utils/apiUtils';

export default function ConfidenceMeterPage() {
  const [data, setData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const [submitting, setSubmitting] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const successTimer = React.useRef<number | null>(null);
  const [form, setForm] = React.useState({
    indicatorName: "",
    owner: "",
  });
  const [showForm, setShowForm] = React.useState(false);
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);
  const [editForm, setEditForm] = React.useState({ indicatorName: "", owner: "" });
  const [showCompanyModal, setShowCompanyModal] = React.useState(false);
  const [keyMapping, setKeyMapping] = React.useState<Record<string, string>>({});
  const [companyForm, setCompanyForm] = React.useState({
    companyName: "",
    entryTime: new Date().toISOString().slice(0,16),
    entryPrice: "",
    target: "",
    stopLoss: "",
    entryTaken: false,
    profitable: false,
  });
  const [viewMode, setViewMode] = React.useState<"confidence" | "master">("confidence");

  // fetch master indicators
  const fetchMasterList = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
      const url = base ? `${base}/api/master-indicators` : `/api/master-indicators`;
      const res = await fetch(url, { signal });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const list = Array.isArray(json?.masterIndicatorsList) ? json.masterIndicatorsList : [];
      setData(list);
    } catch (err: any) {
      if (signal?.aborted) return;
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (k: string, v: any) => setForm((s) => ({ ...s, [k]: v }));
  const handleEditChange = (k: string, v: any) => setEditForm((s) => ({ ...s, [k]: v }));

  // fetch list helper so we can reuse it after create
  const fetchList = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
      const url = base ? `${base}/api/confidence-meter/fetch-all` : `/api/confidence-meter/fetch-all`;
      const res = await fetch(url, { signal });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const list = Array.isArray(json?.confidenceMeterList) ? json.confidenceMeterList : [];
      setData(list);
    } catch (err: any) {
      if (signal?.aborted) return;
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    fetchList(controller.signal);
    return () => controller.abort();
  }, [fetchList]);

  React.useEffect(() => {
    let active = true;
    fetchKeyMapping()
      .then((mapping) => {
        if (active) setKeyMapping(mapping);
      })
      .catch(() => {
        if (active) setKeyMapping({});
      });

    return () => {
      active = false;
    };
  }, []);

  // Close modals on Escape key
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showCancelModal) setShowCancelModal(false);
        else if (showEditModal) setShowEditModal(false);
        else if (showCompanyModal) setShowCompanyModal(false);
        else if (showForm) setShowForm(false);
      }
    }
    if (showForm || showCancelModal || showEditModal || showCompanyModal) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
    return;
  }, [showForm, showCancelModal, showEditModal, showCompanyModal]);

  const formatConfidenceDate = (value: any) => {
    if (Array.isArray(value) && value.length >= 5) {
      const [year, month, day, hour, minute] = value;
      const date = new Date(year, month - 1, day, hour ?? 0, minute ?? 0);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }

    if (typeof value === "string" && value.trim()) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return value;
    }

    return "-";
  };

  const formatAmount = (value: any) => {
    if (typeof value === "number") {
      return new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }).format(value);
    }
    return value ?? "-";
  };

  const getItemId = (item: any) => {
    if (!item) return null;
    if (typeof item === "string") return item;
    if (item.id) {
      if (typeof item.id === "string") return item.id;
      if (item.id?._id) return item.id._id;
      if (item.id?.$oid) return item.id.$oid;
      if (typeof item.id?.toString === "function") return item.id.toString();
    }
    if (item._id) {
      if (typeof item._id === "string") return item._id;
      if (item._id?.$oid) return item._id.$oid;
      if (typeof item._id?.toString === "function") return item._id.toString();
    }
    if (item.key) return item.key;
    if (typeof item.toString === "function") return item.toString();
    return null;
  };

  const confidenceEntries = React.useMemo(
    () => data.filter((item: any) => !(item?.indicatorName || item?.indicator_name)),
    [data]
  );

  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (viewMode !== "confidence" || confidenceEntries.length === 0) return;

    const currentExists = confidenceEntries.some((item: any) => {
      const current = getItemId(item);
      return current && selectedCompanyId && String(current) === String(selectedCompanyId);
    });

    if (!currentExists) {
      const first = confidenceEntries[0];
      setSelectedCompanyId(String(getItemId(first) ?? `${first?.companyName ?? "company"}-${Date.now()}`));
    }
  }, [confidenceEntries, selectedCompanyId, viewMode]);

  const selectedCompany = React.useMemo(() => {
    if (!selectedCompanyId) return null;
    return confidenceEntries.find((item: any) => String(getItemId(item)) === String(selectedCompanyId)) ?? null;
  }, [selectedCompanyId, confidenceEntries]);

  const ownerIndicatorGroups = React.useMemo(() => {
    if (!selectedCompany?.confidenceIndicatorsList) return {} as Record<string, any[]>;

    return selectedCompany.confidenceIndicatorsList
      .filter((indicator: any) => indicator?.deleted !== true)
      .reduce((acc: Record<string, any[]>, indicator: any) => {
      const owner = indicator?.owner || "Unassigned";
      acc[owner] = acc[owner] || [];
      acc[owner].push(indicator);
      return acc;
      }, {} as Record<string, any[]>);
  }, [selectedCompany]);

  const ownerColumns = Object.entries(ownerIndicatorGroups) as Array<[string, any[]]>;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.indicatorName.trim()) {
      setError("Indicator name is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
      const url = base ? `${base}/api/master-indicators` : `/api/master-indicators`;
      const payload: any = {
        indicatorName: form.indicatorName,
        owner: form.owner || undefined,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 409) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.statusText || "Indicator name already exists");
      }
      if (![200, 201].includes(res.status)) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      // success — refresh list and reset form
      await fetchList();
      setShowForm(false);
      setForm({ indicatorName: "", owner: "" });
      setError(null);
      setSuccessMsg("Indicator added successfully");
      if (successTimer.current) window.clearTimeout(successTimer.current);
      successTimer.current = window.setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const getRemainingEdits = (item: any) => {
    const raw = item?.remainingEdits ?? item?.remaining_edits ?? 0;
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  };

  const canEditIndicator = (item: any) => {
    return getRemainingEdits(item) > 0;
  };

  const openEdit = (item: any) => {
    if (!canEditIndicator(item)) return;
    const id = item?.id ?? item?._id ?? item?.key ?? null;
    setEditingItem(item);
    setEditForm({ indicatorName: item?.indicatorName ?? item?.indicator_name ?? "", owner: item?.owner ?? "" });
    setShowEditModal(true);
  };

  const handleIndicatorUpdate = async (indicator: any) => {
    if (!indicator) return;

    const name = indicator?.indicatorName ?? indicator?.indicator_name ?? "this indicator";
    const confirmed = window.confirm(`Delete "${name}"?`);
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);

    try {
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
      const id = getItemId(indicator);
      if (!id) throw new Error("Unable to determine item id for delete");
      const url = base ? `${base}/api/confidence-meter/update` : `/api/confidence-meter/update`;
      const indicators = Array.isArray(selectedCompany?.confidenceIndicatorsList)
        ? selectedCompany.confidenceIndicatorsList
        : [];
      const payload = {
        id: selectedCompany?.id ?? selectedCompany?._id,
        companyName: selectedCompany?.companyName ?? "",
        entryTime: selectedCompany?.entryTime,
        entryPrice: Number(selectedCompany?.entryPrice ?? 0),
        target: Number(selectedCompany?.target ?? 0),
        stopLoss: Number(selectedCompany?.stopLoss ?? 0),
        entryTaken: Boolean(selectedCompany?.entryTaken),
        profitable: Boolean(selectedCompany?.profitable),
        confidenceIndicatorsList: indicators.map((currentIndicator: any) => ({
          ...currentIndicator,
          deleted: String(getItemId(currentIndicator)) === String(id),
        })),
      };

      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (![200, 201].includes(res.status)) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      await fetchList();
      setSuccessMsg("Indicator deleted successfully");
      if (successTimer.current) window.clearTimeout(successTimer.current);
      successTimer.current = window.setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingItem) return;
    if (!editForm.indicatorName.trim()) {
      setError("Indicator name is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
      const id = getItemId(editingItem);
      if (!id) throw new Error("Unable to determine item id for update");
      const safeId = encodeURIComponent(String(id));
      const url = base ? `${base}/api/master-indicators/${safeId}` : `/api/master-indicators/${safeId}`;
      const payload: any = { indicatorName: editForm.indicatorName, owner: editForm.owner || undefined };
      const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.status === 409) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.statusText || "indicatorName already exists");
      }
      if (![200, 201].includes(res.status)) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      await fetchMasterList();
      setShowEditModal(false);
      setEditingItem(null);
      setSuccessMsg("Indicator updated successfully");
      if (successTimer.current) window.clearTimeout(successTimer.current);
      successTimer.current = window.setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openCompanyModal = async () => {
    setShowCompanyModal(true);
    setCompanyForm((f) => ({ ...f, companyName: "", entryTime: new Date().toISOString().slice(0,16), entryPrice: "", target: "", stopLoss: "", entryTaken: false, profitable: false }));
  };

  // Removed KeyMapping search logic — server endpoint /add-new will handle additions

  const handleAddCompanySubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const trimmedCompanyName = companyForm.companyName.trim();
    const payload = {
      companyName: trimmedCompanyName,
      entryTime: companyForm.entryTime || new Date().toISOString().slice(0, 16),
      entryPrice: Number.parseFloat(String(companyForm.entryPrice) || "0"),
      target: Number.parseFloat(String(companyForm.target) || "0"),
      stopLoss: Number.parseFloat(String(companyForm.stopLoss) || "0"),
      entryTaken: Boolean(companyForm.entryTaken),
      profitable: Boolean(companyForm.profitable),
    };

    if (!payload.companyName) {
      toast.error('Company name is required');
      return;
    }

    try {
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
      const url = base ? `${base}/api/confidence-meter/add-new` : '/api/confidence-meter/add-new';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.statusText || j?.message || 'Failed to add confidence meter entry');
      }

      toast.success('Confidence meter entry added');
      setCompanyForm((s) => ({
        ...s,
        companyName: '',
        entryTime: new Date().toISOString().slice(0, 16),
        entryPrice: '',
        target: '',
        stopLoss: '',
        entryTaken: false,
        profitable: false,
      }));
      setShowCompanyModal(false);
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-white to-slate-50 text-slate-900">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-white ring-1 ring-slate-200 shadow-sm">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v9l4 2" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="8" stroke="#a78bfa" strokeWidth="1.2" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Confidence Meter</h1>
            <p className="text-sm text-slate-600">Track indicators and master entries — clean, lightweight UI.</p>
          </div>
        </div>
          <div className="flex items-center gap-3">
            <div>
              <button
                onClick={() => {
                  setShowForm((s) => !s);
                  setSuccessMsg(null);
                  if (successTimer.current) {
                    window.clearTimeout(successTimer.current);
                    successTimer.current = null;
                  }
                }}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm"
              >
                {showForm ? 'Close' : 'Add Indicator'}
              </button>
            </div>
            <div>
              <button
                onClick={() => openCompanyModal()}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm"
              >
                Add Company
              </button>
            </div>
            <button
              onClick={() => {
                const newMode = viewMode === "confidence" ? "master" : "confidence";
                setViewMode(newMode);
                setSuccessMsg(null);
                if (successTimer.current) {
                  window.clearTimeout(successTimer.current);
                  successTimer.current = null;
                }
                const c = new AbortController();
                if (newMode === "master") fetchMasterList(c.signal);
                else fetchList(c.signal);
              }}
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm"
            >
              {viewMode === "confidence" ? "Show Master Indicators" : "Show Confidence Entries"}
            </button>
          </div>
      </header>

      {successMsg && (
        <div className="mb-4 px-4 py-2 bg-emerald-100 text-slate-900 rounded-lg shadow-sm">{successMsg}</div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
          onClick={() => setShowForm(false)}
        >
          <div className="w-full max-w-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  placeholder="Indicator Name"
                  value={form.indicatorName}
                  onChange={(e) => handleChange("indicatorName", e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white placeholder-slate-400"
                  required
                />
                <select
                  value={form.owner}
                  onChange={(e) => handleChange("owner", e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="">-- Select Owner --</option>
                  <option value="Sadik">Sadik</option>
                  <option value="Nawaz">Nawaz</option>
                </select>
              </div>
              <div className="mt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60"
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 rounded-md bg-white border border-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCancelModal(false)}
        >
          <div className="w-full max-w-md bg-white rounded-xl p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Discard changes?</h3>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to cancel? Unsaved changes will be lost.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-md bg-white border border-slate-200"
              >
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setForm({ indicatorName: "", owner: "" });
                  setShowCancelModal(false);
                }}
                className="px-4 py-2 rounded-md bg-red-600 text-white"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
      {showCompanyModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCompanyModal(false)}
        >
          <div className="w-full max-w-lg bg-white rounded-xl p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Add Confidence Meter Entry</h3>
            <form onSubmit={handleAddCompanySubmit} className="mt-4">
              <div className="grid grid-cols-1 gap-3">
                <CompanySearch
                  keyMapping={keyMapping}
                  label="Company Name"
                  placeholder="Search company name..."
                  onSelect={(companyName) => setCompanyForm((s) => ({ ...s, companyName }))}
                  className=""
                />
                <input type="datetime-local" value={companyForm.entryTime} onChange={(e) => setCompanyForm((s) => ({ ...s, entryTime: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200 bg-white" />
                <input type="number" step="any" placeholder="Entry Price" value={companyForm.entryPrice} onChange={(e) => setCompanyForm((s) => ({ ...s, entryPrice: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200 bg-white" />
                <input type="number" step="any" placeholder="Target" value={companyForm.target} onChange={(e) => setCompanyForm((s) => ({ ...s, target: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200 bg-white" />
                <input type="number" step="any" placeholder="Stop Loss" value={companyForm.stopLoss} onChange={(e) => setCompanyForm((s) => ({ ...s, stopLoss: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200 bg-white" />
                <label className="flex items-center gap-2"><input type="checkbox" checked={companyForm.entryTaken} onChange={(e) => setCompanyForm((s) => ({ ...s, entryTaken: e.target.checked }))} /> Entry Taken</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={companyForm.profitable} onChange={(e) => setCompanyForm((s) => ({ ...s, profitable: e.target.checked }))} /> Is Profitable</label>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCompanyModal(false)} className="px-4 py-2 rounded-md bg-white border">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white">Add Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowEditModal(false)}
        >
          <div className="w-full max-w-md bg-white rounded-xl p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Edit Indicator</h3>
            <form onSubmit={handleEditSubmit} className="mt-3">
              <div className="grid grid-cols-1 gap-3">
                <input
                  placeholder="Indicator Name"
                  value={editForm.indicatorName}
                  onChange={(e) => handleEditChange("indicatorName", e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white placeholder-slate-400"
                  required
                />
                <select
                  value={editForm.owner}
                  onChange={(e) => handleEditChange("owner", e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="">-- Select Owner --</option>
                  <option value="Sadik">Sadik</option>
                  <option value="Nawaz">Nawaz</option>
                </select>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setShowEditModal(false)} type="button" className="px-4 py-2 rounded-md bg-white border">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {viewMode === "master" ? (
          <section className="lg:col-span-3 space-y-4 flex flex-col min-h-screen">
            <div className="grid gap-4">
              {!loading && !error && data.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-full p-6 mx-6 rounded-xl border border-slate-100 bg-white text-center shadow-sm">
                    <div className="text-2xl font-semibold text-slate-800">No items found.</div>
                    <div className="text-sm text-slate-600 mt-2">Add new indicators to populate this view.</div>
                  </div>
                </div>
              ) : (
                data.map((item: any, index: number) => {
                  const isIndicator = !!(item?.indicatorName || item?.indicator_name);
                  const name = item.indicatorName ?? item.indicator_name ?? item.name ?? item.companyName ?? "";
                  const owner = item.owner ?? "";
                  const itemKey = String(item?.id ?? item?._id ?? item?.key ?? `${name}-${owner}-${index}`);

                  if (isIndicator) {
                    return (
                      <div key={itemKey} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-bold">{name}</div>
                            <div className="text-sm text-slate-600">Owner: {owner || "-"}</div>
                            <div className="text-xs text-slate-500">Remaining Edits: {getRemainingEdits(item)}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-xs text-slate-500">Indicator</div>
                            {viewMode === "master" && (
                              <button
                                onClick={() => openEdit(item)}
                                disabled={!canEditIndicator(item)}
                                className={`px-3 py-1 rounded-md border text-sm ${canEditIndicator(item) ? "bg-white border-slate-200" : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"}`}
                              >
                                {canEditIndicator(item) ? "Edit" : "Locked"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={itemKey} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-2xl font-bold text-slate-900">{item.companyName || name || "Unknown Company"}</div>
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Confidence Entry</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${Boolean(item?.entryTaken) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                            {Boolean(item?.entryTaken) ? "Entry Taken" : "Not Taken"}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${Boolean(item?.profitable) ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                            {Boolean(item?.profitable) ? "Profitable" : "Not Profitable"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Entry Time</div>
                          <div className="mt-1 font-medium text-slate-800">{formatConfidenceDate(item.entryTime)}</div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Entry Price</div>
                          <div className="mt-1 font-medium text-slate-800">₹ {formatAmount(item.entryPrice)}</div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Target</div>
                          <div className="mt-1 font-medium text-slate-800">₹ {formatAmount(item.target)}</div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Stop Loss</div>
                          <div className="mt-1 font-medium text-slate-800">₹ {formatAmount(item.stopLoss)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        ) : (
          <section className="lg:col-span-3">
            <div className="grid h-[calc(100vh-220px)] min-h-[600px] grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Companies</div>
                  <div className="mt-1 text-sm text-slate-600">{confidenceEntries.length} entries</div>
                </div>

                <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                  {confidenceEntries.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">No confidence entries yet.</div>
                  ) : (
                    confidenceEntries.map((item: any) => {
                      const itemId = String(getItemId(item) ?? `${item.companyName ?? "company"}-${Math.random()}`);
                      const selected = itemId === String(selectedCompanyId ?? "");
                      const entryTaken = Boolean(item?.entryTaken);
                      const profitable = Boolean(item?.profitable);

                      return (
                        <button
                          key={itemId}
                          type="button"
                          onClick={() => setSelectedCompanyId(itemId)}
                          className={`w-full border-b border-slate-200 px-4 py-3 text-left transition ${selected ? "bg-slate-100" : "bg-white hover:bg-slate-50"}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-800">{item.companyName || "Unknown Company"}</div>
                              <div className="mt-1 text-[11px] text-slate-500">{formatConfidenceDate(item.entryTime)}</div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${entryTaken ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                                {entryTaken ? "Taken" : "Open"}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${profitable ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                                {profitable ? "Profit" : "Loss"}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {!selectedCompany ? (
                  <div className="flex h-full items-center justify-center p-10 text-slate-500">Select a company to view details.</div>
                ) : (
                  <div className="flex h-full flex-col">
                    <div className="border-b border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-3xl font-bold text-slate-900">{selectedCompany.companyName}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">Confidence Entry</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${Boolean(selectedCompany.entryTaken) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                            {Boolean(selectedCompany.entryTaken) ? "Entry Taken" : "Not Taken"}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${Boolean(selectedCompany.profitable) ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                            {Boolean(selectedCompany.profitable) ? "Profitable" : "Not Profitable"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Entry Time</div>
                          <div className="mt-1 font-medium text-slate-800">{formatConfidenceDate(selectedCompany.entryTime)}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Entry Price</div>
                          <div className="mt-1 font-medium text-slate-800">₹ {formatAmount(selectedCompany.entryPrice)}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Target</div>
                          <div className="mt-1 font-medium text-slate-800">₹ {formatAmount(selectedCompany.target)}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Stop Loss</div>
                          <div className="mt-1 font-medium text-slate-800">₹ {formatAmount(selectedCompany.stopLoss)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Confidence Indicators</div>

                      {ownerColumns.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                          No confidence indicators added for this company.
                        </div>
                      ) : (
                        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                          {ownerColumns.map(([owner, indicators]) => (
                            <div key={owner} className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                              <div className="border-b border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                                {owner || "Unassigned"}
                              </div>
                              <div className="space-y-3 p-3">
                                {indicators.map((indicator: any, idx: number) => {
                                  const isAutomated = indicator?.isAutomated ?? indicator?.automated ?? false;
                                  const qualifies = Boolean(indicator?.qualifies);
                                  const usedForEntry = Boolean(indicator?.usedForEntry);
                                  const helpedInProfit = Boolean(indicator?.helpedInProfit);
                                  const helpedInLoss = Boolean(indicator?.helpedInLoss);

                                  const toggleTrack = (active: boolean) => (
                                    <div
                                      className={`relative h-6 w-12 rounded-full transition-all ${active ? "bg-emerald-500" : "bg-red-500"}`}
                                      aria-label={active ? "Enabled" : "Disabled"}
                                    >
                                      <span
                                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${active ? "left-7" : "left-1"}`}
                                      />
                                    </div>
                                  );

                                  return (
                                    <div key={`${owner}-${indicator.id ?? idx}`} className="rounded-xl border border-slate-200 bg-white p-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                          <div className="text-sm font-semibold text-slate-800 truncate">{indicator.indicatorName || `Indicator ${idx + 1}`}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`inline-flex h-6 min-w-[52px] items-center justify-center rounded-full px-2 text-[10px] font-bold text-white ${isAutomated ? "bg-violet-500" : "bg-slate-500"}`}
                                            title={isAutomated ? "Automated" : "Manual"}
                                          >
                                            {isAutomated ? "Code" : "Manual"}
                                          </span>
                                          <button
                                            type="button"
                                            aria-label={`Delete ${indicator.indicatorName || 'indicator'}`}
                                            title="Delete indicator"
                                            onClick={() => handleIndicatorUpdate(indicator)}
                                            disabled={submitting}
                                            className="flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V4h6v3m-8 0 1 12h8l1-12" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>

                                      <div className="mt-3 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Qualifies</span>
                                          {toggleTrack(qualifies)}
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Used For Entry</span>
                                          {toggleTrack(usedForEntry)}
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Helped in Profit Booking</span>
                                          {toggleTrack(helpedInProfit)}
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Helped in Loss Identification</span>
                                          {toggleTrack(helpedInLoss)}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
