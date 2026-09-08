"use client";

import * as React from "react";
import toast from 'react-hot-toast';
import CompanySearch from '@/components/CompanySearch';
import { fetchKeyMapping } from '@/utils/apiUtils';

export default function ConfidenceMeterPage() {
  const [data, setData] = React.useState<any[]>([]);
  const [masterIndicators, setMasterIndicators] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const [submitting, setSubmitting] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const successTimer = React.useRef<number | null>(null);
  const [form, setForm] = React.useState({
    indicatorName: "",
    owner: "",
    weightage: "",
  });
  const [showForm, setShowForm] = React.useState(false);
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [indicatorPendingDeletion, setIndicatorPendingDeletion] = React.useState<Record<string, unknown> | null>(null);
  const [masterIndicatorPendingDeletion, setMasterIndicatorPendingDeletion] = React.useState<any | null>(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);
  const [editForm, setEditForm] = React.useState({
    indicatorName: "",
    owner: "",
    isAutomated: false,
    weightage: "",
  });
  const [showCompanyModal, setShowCompanyModal] = React.useState(false);
  const [editingCompany, setEditingCompany] = React.useState<any | null>(null);
  const [companyPendingDeletion, setCompanyPendingDeletion] = React.useState<any | null>(null);
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
  const [indicatorPickerOwner, setIndicatorPickerOwner] = React.useState<string | null>(null);
  const [selectedOwner, setSelectedOwner] = React.useState<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState("");
  const [currentTime, setCurrentTime] = React.useState(() => Date.now());
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [savingChanges, setSavingChanges] = React.useState(false);
  const pendingCompanyUpdates = React.useRef(new Map<string, any>());

  React.useEffect(() => {
    const user = localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser") || "";
    setCurrentUser(user);
    if (user.trim().toLowerCase() !== "abrar") {
      setForm((previous) => ({ ...previous, owner: user }));
    }
  }, []);

  React.useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // fetch master indicators
  const fetchMasterList = React.useCallback(async (signal?: AbortSignal, updateView = true) => {
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
      setMasterIndicators(list);
      if (updateView) setData(list);
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
        else if (indicatorPendingDeletion) setIndicatorPendingDeletion(null);
      }
    }
    if (showForm || showCancelModal || showEditModal || showCompanyModal || indicatorPendingDeletion) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
    return;
  }, [showForm, showCancelModal, showEditModal, showCompanyModal, indicatorPendingDeletion]);

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

  const isDeleted = (value: any) => value === true || String(value).trim().toLowerCase() === "true";

  const getIndicatorName = (indicator: any) => {
    const name = indicator?.indicatorName ?? indicator?.indicator_name;
    return typeof name === "string" && name.trim() ? name : "this indicator";
  };

  const getEntryTimestamp = (value: any): number | null => {
    if (value == null || value === "") return null;

    if (typeof value === "number") {
      const timestamp = value < 1e12 ? value * 1000 : value;
      return Number.isFinite(timestamp) ? timestamp : null;
    }

    if (Array.isArray(value) && value.length >= 3) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = value.map(Number);
      const date = new Date(year, month - 1, day, hour, minute, second);
      return Number.isNaN(date.getTime()) ? null : date.getTime();
    }

    if (typeof value === "object") {
      return getEntryTimestamp(value.$date ?? value.date ?? value.value);
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const numericValue = Number(trimmed);
      if (Number.isFinite(numericValue)) return getEntryTimestamp(numericValue);
      const date = new Date(trimmed);
      return Number.isNaN(date.getTime()) ? null : date.getTime();
    }

    return null;
  };

  const isEntryTimePassed = (company: any) => {
    const entryTimestamp = getEntryTimestamp(company?.entryTime);
    return entryTimestamp !== null && entryTimestamp <= currentTime;
  };

  const ownerIndicatorGroups = React.useMemo(() => {
    const companyIndicators = Array.isArray(selectedCompany?.confidenceIndicatorsList)
      ? selectedCompany.confidenceIndicatorsList
      : [];

    const groups = companyIndicators
      .filter((indicator: any) => !isDeleted(indicator?.deleted))
      .reduce((acc: Record<string, any[]>, indicator: any) => {
        const owner = indicator?.owner || "Unassigned";
        acc[owner] = acc[owner] || [];
        acc[owner].push(indicator);
        return acc;
      }, {} as Record<string, any[]>);

    return {
      Nawaz: groups.Nawaz || [],
      Sadiq: groups.Sadiq || [],
    };
  }, [selectedCompany]);

  const ownerColumns = Object.entries(ownerIndicatorGroups) as Array<[string, any[]]>;
  const cumulativeIndicators = [...ownerIndicatorGroups.Nawaz, ...ownerIndicatorGroups.Sadiq];
  const cumulativeScored = cumulativeIndicators.filter((indicator: any) => Boolean(indicator?.qualifies)).length;
  const cumulativeTotal = cumulativeIndicators.length;
  const cumulativePercentage = cumulativeTotal === 0 ? 0 : Math.round((cumulativeScored / cumulativeTotal) * 100);

  const masterOwnerColumns = (["Nawaz", "Sadiq"] as const).map((owner) => [
    owner,
    masterIndicators.filter((indicator: any) => String(indicator?.owner || "").trim().toLowerCase() === owner.toLowerCase() && !isDeleted(indicator?.deleted)),
  ] as [string, any[]]);
  const visibleMasterOwnerColumns = masterOwnerColumns.filter(([owner]) => !selectedOwner || owner === selectedOwner);

  const availableIndicatorsForOwner = (owner: string) => {
    const existingNames = new Set(
      (selectedCompany?.confidenceIndicatorsList || [])
        .filter((indicator: any) => indicator?.owner === owner && !isDeleted(indicator?.deleted))
        .map((indicator: any) => String(indicator?.indicatorName || indicator?.indicator_name).trim().toLowerCase())
    );

    return masterIndicators.filter((indicator: any) => {
      if (isDeleted(indicator?.deleted)) return false;
      const indicatorOwner = String(indicator?.owner || "").trim().toLowerCase();
      if (indicatorOwner !== owner.trim().toLowerCase()) return false;
      const name = String(indicator?.indicatorName || indicator?.indicator_name || "").trim().toLowerCase();
      return name && !existingNames.has(name);
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canManageOwner(form.owner || "")) {
      setError("You can only add indicators for your own owner column");
      return;
    }
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
        weightage: form.weightage === "" ? undefined : Number(form.weightage),
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
      await fetchMasterList();
      setShowForm(false);
      setForm({ indicatorName: "", owner: "", weightage: "" });
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

  const canEditIndicator = (item: any) => {
    const owner = String(item?.owner || "").trim().toLowerCase();
    const user = currentUser.trim().toLowerCase();
    return user === "abrar" || (Boolean(user) && user === owner);
  };

  const canManageOwner = (owner: string) => {
    const user = currentUser.trim().toLowerCase();
    return user === "abrar" || (Boolean(user) && user === owner.trim().toLowerCase());
  };

  const markUnsaved = () => {
    setHasUnsavedChanges(true);
    setError(null);
    setSuccessMsg(null);
  };

  const companyPayload = (company: any, indicators: any[]) => ({
    id: company?.id ?? company?._id,
    companyName: company?.companyName ?? "",
    entryTime: company?.entryTime,
    entryPrice: Number(company?.entryPrice ?? 0),
    target: Number(company?.target ?? 0),
    stopLoss: Number(company?.stopLoss ?? 0),
    entryTaken: Boolean(company?.entryTaken),
    profitable: Boolean(company?.profitable),
    confidenceIndicatorsList: indicators,
  });

  const queueCompanyUpdate = (company: any, indicators: any[]) => {
    pendingCompanyUpdates.current.set(String(getItemId(company)), companyPayload(company, indicators));
    markUnsaved();
  };

  const openEdit = (item: any) => {
    if (!canEditIndicator(item)) {
      setError("You can only edit indicators in your own owner column");
      return;
    }
    const id = item?.id ?? item?._id ?? item?.key ?? null;
    setEditingItem(item);
    setEditForm({
      indicatorName: item?.indicatorName ?? item?.indicator_name ?? "",
      owner: item?.owner ?? "",
      isAutomated: Boolean(item?.isAutomated ?? item?.automated),
      weightage: String(item?.weightage ?? ""),
    });
    setShowEditModal(true);
  };

  const handleIndicatorUpdate = async (indicator: any) => {
    if (!indicator) return;
    if (isEntryTimePassed(selectedCompany)) {
      setError("This confidence entry is locked because its entry time has passed");
      return;
    }
    if (!canManageOwner(String(indicator?.owner || ""))) {
      setError("You can only delete indicators in your own owner column");
      return;
    }

    if (!indicatorPendingDeletion) {
      setIndicatorPendingDeletion(indicator);
      return;
    }

    setError(null);
    const indicators = Array.isArray(selectedCompany?.confidenceIndicatorsList) ? selectedCompany.confidenceIndicatorsList : [];
    const id = getItemId(indicator);
    const updatedIndicators = indicators.map((currentIndicator: any) => ({
      ...currentIndicator,
      deleted: String(getItemId(currentIndicator)) === String(id) ? true : currentIndicator?.deleted,
    }));
    const updatedCompany = { ...selectedCompany, confidenceIndicatorsList: updatedIndicators };
    setData((items) => items.map((item) => String(getItemId(item)) === String(getItemId(selectedCompany)) ? updatedCompany : item));
    queueCompanyUpdate(updatedCompany, updatedIndicators);
    setIndicatorPendingDeletion(null);
    setSuccessMsg("Indicator marked for deletion");
  };

  const handleAddIndicatorToCompany = async (masterIndicator: any, owner: string) => {
    if (!selectedCompany || !masterIndicator) return;
    if (isEntryTimePassed(selectedCompany)) {
      setError("This confidence entry is locked because its entry time has passed");
      return;
    }
    if (!canManageOwner(owner)) {
      setError("You can only add indicators to your own owner column");
      return;
    }

    setError(null);
    const indicators = Array.isArray(selectedCompany.confidenceIndicatorsList) ? selectedCompany.confidenceIndicatorsList : [];
    const newIndicator = { ...masterIndicator, owner, deleted: false, qualifies: false };
    const updatedIndicators = [...indicators, newIndicator];
    const updatedCompany = { ...selectedCompany, confidenceIndicatorsList: updatedIndicators };
    setData((items) => items.map((item) => String(getItemId(item)) === String(getItemId(selectedCompany)) ? updatedCompany : item));
    queueCompanyUpdate(updatedCompany, updatedIndicators);
    setSuccessMsg("Indicator added locally");
  };

  const handleIndicatorScoreChange = async (indicator: any, field: "qualifies" | "helpedInProfit" | "helpedInLoss", value: boolean) => {
    if (!selectedCompany || !indicator || !canManageOwner(String(indicator?.owner || ""))) return;
    if (isEntryTimePassed(selectedCompany)) {
      setError("This confidence entry is locked because its entry time has passed");
      return;
    }

    let indicatorUpdate: Record<string, boolean> = { [field]: value };
    if (value) {
      switch (field) {
        case "helpedInProfit":
          indicatorUpdate = { helpedInProfit: true, helpedInLoss: false };
          break;
        case "helpedInLoss":
          indicatorUpdate = { helpedInProfit: false, helpedInLoss: true };
          break;
        default:
          break;
      }
    }
    const indicators = Array.isArray(selectedCompany.confidenceIndicatorsList)
      ? selectedCompany.confidenceIndicatorsList
      : [];
    const updatedIndicators = indicators.map((currentIndicator: any) => (
      String(getItemId(currentIndicator)) === String(getItemId(indicator))
        ? { ...currentIndicator, ...indicatorUpdate }
        : currentIndicator
    ));
    const updatedCompany = { ...selectedCompany, confidenceIndicatorsList: updatedIndicators };
    setData((items) => items.map((item) => (
      String(getItemId(item)) === String(getItemId(selectedCompany)) ? updatedCompany : item
    )));
    queueCompanyUpdate(updatedCompany, updatedIndicators);
    setError(null);
    setSuccessMsg("Company changes updated locally");
  };

  const openIndicatorPicker = async (owner: string) => {
    if (isEntryTimePassed(selectedCompany)) {
      setError("This confidence entry is locked because its entry time has passed");
      return;
    }
    setIndicatorPickerOwner(owner);
    if (masterIndicators.length === 0) {
      await fetchMasterList(undefined, false);
    }
  };

  const handleEditSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingItem) return;
    if (isEntryTimePassed(selectedCompany)) {
      setError("This confidence entry is locked because its entry time has passed");
      return;
    }
    if (!canManageOwner(editingItem?.owner || editForm.owner || "")) {
      setError("You can only edit indicators in your own owner column");
      return;
    }
    if (!editForm.indicatorName.trim()) {
      setError("Indicator name is required");
      return;
    }
    setError(null);
    try {
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
      const id = getItemId(editingItem);
      if (!id) throw new Error("Unable to determine item id for update");
      const safeId = encodeURIComponent(String(id));
      const url = base ? `${base}/api/master-indicators/${safeId}` : `/api/master-indicators/${safeId}`;
      const payload = {
        indicatorName: editForm.indicatorName.trim(),
        owner: editForm.owner || undefined,
        isAutomated: editForm.isAutomated,
        weightage: editForm.weightage === "" ? undefined : Number(editForm.weightage),
      };
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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

  const handleMasterIndicatorDelete = async () => {
    if (!masterIndicatorPendingDeletion) return;
    if (!canManageOwner(String(masterIndicatorPendingDeletion?.owner || ""))) {
      setError("You can only delete indicators in your own owner column");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
      const id = getItemId(masterIndicatorPendingDeletion);
      if (!id) throw new Error("Unable to determine item id for deletion");
      const safeId = encodeURIComponent(String(id));
      const url = base ? `${base}/api/master-indicators/${safeId}` : `/api/master-indicators/${safeId}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      await fetchMasterList();
      setMasterIndicatorPendingDeletion(null);
      setSuccessMsg("Indicator deleted successfully");
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges || savingChanges) return;
    setSavingChanges(true);
    setError(null);
    try {
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
      for (const payload of pendingCompanyUpdates.current.values()) {
        const url = base ? `${base}/api/confidence-meter/update` : "/api/confidence-meter/update";
        const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
      }
      pendingCompanyUpdates.current.clear();
      setHasUnsavedChanges(false);
      setSuccessMsg("Changes saved successfully");
      await (viewMode === "master" ? fetchMasterList() : fetchList());
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setSavingChanges(false);
    }
  };

  const openCompanyModal = async () => {
    setEditingCompany(null);
    setShowCompanyModal(true);
    setCompanyForm((f) => ({ ...f, companyName: "", entryTime: new Date().toISOString().slice(0,16), entryPrice: "", target: "", stopLoss: "", entryTaken: false, profitable: false }));
  };

  const toDateTimeInputValue = (value: any) => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
      ? date.toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16);
  };

  const openEditCompanyModal = () => {
    if (!selectedCompany) return;
    if (isEntryTimePassed(selectedCompany)) {
      setError("This confidence entry is locked because its entry time has passed");
      return;
    }
    setEditingCompany(selectedCompany);
    setCompanyForm({
      companyName: selectedCompany.companyName ?? "",
      entryTime: toDateTimeInputValue(selectedCompany.entryTime),
      entryPrice: String(selectedCompany.entryPrice ?? ""),
      target: String(selectedCompany.target ?? ""),
      stopLoss: String(selectedCompany.stopLoss ?? ""),
      entryTaken: Boolean(selectedCompany.entryTaken),
      profitable: Boolean(selectedCompany.profitable),
    });
    setShowCompanyModal(true);
  };

  const handleCompanyDelete = async () => {
    if (!companyPendingDeletion || currentUser.trim().toLowerCase() !== "abrar") return;

    setSubmitting(true);
    setError(null);
    try {
      const id = getItemId(companyPendingDeletion);
      if (!id) throw new Error("Unable to determine company entry id for deletion");
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
      const url = base ? `${base}/api/confidence-meter/delete` : "/api/confidence-meter/delete";
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok && res.status !== 204) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      setCompanyPendingDeletion(null);
      setSelectedCompanyId(null);
      await fetchList();
      setSuccessMsg("Confidence entry deleted successfully");
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
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
      if (editingCompany) {
        const indicators = Array.isArray(editingCompany.confidenceIndicatorsList) ? editingCompany.confidenceIndicatorsList : [];
        const updatedCompany = { ...editingCompany, ...payload, confidenceIndicatorsList: indicators };
        setData((items) => items.map((item) => String(getItemId(item)) === String(getItemId(editingCompany)) ? updatedCompany : item));
        queueCompanyUpdate(updatedCompany, indicators);
        setEditingCompany(null);
        setShowCompanyModal(false);
        setSuccessMsg("Confidence entry updated locally. Save changes to persist it.");
        return;
      }
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_8%_0%,rgba(186,230,253,0.7),transparent_30%),radial-gradient(circle_at_94%_12%,rgba(224,242,254,0.9),transparent_28%),linear-gradient(135deg,#f8fcff_0%,#eef7fb_48%,#f8fafc_100%)] p-4 text-slate-900 sm:p-6">
      <header className="mx-auto mb-6 flex max-w-[1600px] flex-col gap-5 rounded-[26px] border border-white/80 bg-white/75 p-5 shadow-[0_18px_60px_rgba(14,116,144,0.12)] backdrop-blur-xl sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-600 p-3 shadow-lg shadow-cyan-200/70 ring-4 ring-white">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v9l4 2" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="8" stroke="#a78bfa" strokeWidth="1.2" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Confidence Meter</h1>
            <p className="mt-1 text-sm text-slate-600">Track indicators and master entries</p>
          </div>
        </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
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
                className="rounded-xl border border-slate-200/90 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700"
              >
                {showForm ? 'Close' : 'Add Indicator'}
              </button>
            </div>
            <div>
              <button
                onClick={() => openCompanyModal()}
                className="rounded-xl border border-slate-200/90 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700"
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
              className="rounded-xl border border-cyan-200 bg-cyan-50/80 px-4 py-2 text-sm font-bold text-cyan-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-100"
            >
              {viewMode === "confidence" ? "Show Master Indicators" : "Show Confidence Entries"}
            </button>
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wide text-amber-700">UNSAVED CHANGES</span>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={savingChanges}
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-700 disabled:opacity-60"
                >
                  {savingChanges ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
      </header>

      {successMsg && (
        <div className="mx-auto mb-4 w-full max-w-[1600px] min-w-0 overflow-hidden break-words rounded-lg bg-emerald-100 px-4 py-2 text-slate-900 shadow-sm">
          {successMsg}
        </div>
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
                  disabled={currentUser.trim().toLowerCase() !== "abrar"}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  {currentUser.trim().toLowerCase() === "abrar" ? <option value="">-- Select Owner --</option> : null}
                  <option value="Sadiq">Sadiq</option>
                  <option value="Nawaz">Nawaz</option>
                </select>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Weightage"
                  value={form.weightage}
                  onChange={(e) => handleChange("weightage", e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white placeholder-slate-400"
                />
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
                  setForm({ indicatorName: "", owner: "", weightage: "" });
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
      {companyPendingDeletion && currentUser.trim().toLowerCase() === "abrar" && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-company-entry-title"
          onClick={() => setCompanyPendingDeletion(null)}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-company-entry-title" className="text-lg font-bold text-slate-900">Delete confidence entry?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Delete &quot;{companyPendingDeletion.companyName || "this company"}&quot; permanently?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setCompanyPendingDeletion(null)} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="button" disabled={submitting} onClick={handleCompanyDelete} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                {submitting ? "Deleting..." : "Delete"}
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
            <h3 className="text-lg font-semibold">{editingCompany ? "Edit Confidence Meter Entry" : "Add Confidence Meter Entry"}</h3>
            <form onSubmit={handleAddCompanySubmit} className="mt-4">
              <div className="grid grid-cols-1 gap-3">
                {editingCompany ? (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Company Name</label>
                    <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                      {companyForm.companyName}
                    </div>
                  </div>
                ) : (
                  <CompanySearch
                    keyMapping={keyMapping}
                    label="Company Name"
                    placeholder="Search company name..."
                    onSelect={(companyName) => setCompanyForm((s) => ({ ...s, companyName }))}
                    className=""
                  />
                )}
                <input type="datetime-local" value={companyForm.entryTime} onChange={(e) => setCompanyForm((s) => ({ ...s, entryTime: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200 bg-white" />
                <input type="number" step="any" placeholder="Entry Price" value={companyForm.entryPrice} onChange={(e) => setCompanyForm((s) => ({ ...s, entryPrice: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200 bg-white" />
                <input type="number" step="any" placeholder="Target" value={companyForm.target} onChange={(e) => setCompanyForm((s) => ({ ...s, target: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200 bg-white" />
                <input type="number" step="any" placeholder="Stop Loss" value={companyForm.stopLoss} onChange={(e) => setCompanyForm((s) => ({ ...s, stopLoss: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200 bg-white" />
                <label className="flex items-center gap-2"><input type="checkbox" checked={companyForm.entryTaken} onChange={(e) => setCompanyForm((s) => ({ ...s, entryTaken: e.target.checked }))} /> Entry Taken</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={companyForm.profitable} onChange={(e) => setCompanyForm((s) => ({ ...s, profitable: e.target.checked }))} /> Is Profitable</label>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCompanyModal(false)} className="px-4 py-2 rounded-md bg-white border">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white">{editingCompany ? "Update Entry" : "Add Entry"}</button>
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
                  disabled={currentUser.trim().toLowerCase() !== "abrar"}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="">-- Select Owner --</option>
                  <option value="Sadiq">Sadiq</option>
                  <option value="Nawaz">Nawaz</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={editForm.isAutomated} onChange={(e) => handleEditChange("isAutomated", e.target.checked)} />
                  Automated indicator
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["weightage", "Weightage"],
                  ].map(([field, label]) => (
                    <label key={field} className="text-sm text-slate-600">
                      {label}
                      <input type="number" step="any" value={editForm[field as keyof typeof editForm] as string} onChange={(e) => handleEditChange(field, e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setShowEditModal(false)} type="button" className="px-4 py-2 rounded-md bg-white border">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {indicatorPickerOwner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setIndicatorPickerOwner(null)}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/80 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Indicator</h3>
                <p className="mt-1 text-sm text-slate-500">{indicatorPickerOwner}</p>
              </div>
              <button type="button" onClick={() => setIndicatorPickerOwner(null)} className="text-2xl leading-none text-slate-400 hover:text-slate-700" aria-label="Close">&times;</button>
            </div>
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {availableIndicatorsForOwner(indicatorPickerOwner).length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No indicators available.</div>
              ) : availableIndicatorsForOwner(indicatorPickerOwner).map((indicator: any, index: number) => (
                <button
                  key={String(getItemId(indicator) ?? `${indicator.indicatorName}-${index}`)}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleAddIndicatorToCompany(indicator, indicatorPickerOwner)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 disabled:opacity-50"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="truncate">{indicator.indicatorName || indicator.indicator_name}</span>
                    <span className="shrink-0 text-xs font-medium text-slate-500">Weightage: {indicator.weightage ?? 0}</span>
                  </span>
                  <span className="ml-3 shrink-0 text-cyan-600">+</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {indicatorPendingDeletion && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-indicator-title"
          onClick={() => setIndicatorPendingDeletion(null)}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/80 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-indicator-title" className="text-lg font-bold text-slate-900">Delete indicator?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Delete "{getIndicatorName(indicatorPendingDeletion)}" from this company?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIndicatorPendingDeletion(null)}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleIndicatorUpdate(indicatorPendingDeletion)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {submitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {masterIndicatorPendingDeletion && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-master-indicator-title" onClick={() => setMasterIndicatorPendingDeletion(null)}>
          <div className="w-full max-w-md rounded-2xl border border-white/80 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-master-indicator-title" className="text-lg font-bold text-slate-900">Delete master indicator?</h3>
            <p className="mt-2 text-sm text-slate-600">Delete &quot;{getIndicatorName(masterIndicatorPendingDeletion)}&quot; permanently?</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setMasterIndicatorPendingDeletion(null)} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
              <button type="button" disabled={submitting} onClick={handleMasterIndicatorDelete} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{submitting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 lg:grid-cols-3">
        {viewMode === "master" ? (
          <section className="lg:col-span-3 space-y-4 flex flex-col min-h-screen">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-cyan-100 bg-white/95 p-3 shadow-sm backdrop-blur">
              <span className="mr-2 text-sm font-bold uppercase tracking-[0.12em] text-cyan-800">Indicator owner</span>
              {(["Nawaz", "Sadiq"] as const).map((owner) => (
                <button
                  key={owner}
                  type="button"
                  onClick={() => setSelectedOwner((current) => current === owner ? null : owner)}
                  aria-pressed={selectedOwner === owner}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${selectedOwner === owner ? "bg-cyan-700 text-white" : "bg-cyan-50 text-cyan-800 hover:bg-cyan-100"}`}
                >
                  {owner}
                </button>
              ))}
              {selectedOwner && (
                <button type="button" onClick={() => setSelectedOwner(null)} className="px-2 py-1.5 text-sm text-slate-500 hover:text-slate-800">
                  All
                </button>
              )}
            </div>
            <div className={`grid items-start gap-4 ${visibleMasterOwnerColumns.length === 2 ? "md:grid-cols-2" : "grid-cols-1"}`}>
              {!loading && !error && data.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-full p-6 mx-6 rounded-xl border border-slate-100 bg-white text-center shadow-sm">
                    <div className="text-2xl font-semibold text-slate-800">No items found.</div>
                    <div className="text-sm text-slate-600 mt-2">Add new indicators to populate this view.</div>
                  </div>
                </div>
              ) : (
                visibleMasterOwnerColumns.map(([owner, indicators]) => (
                  <div key={owner} className="space-y-4">
                    <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-cyan-800">{owner}</div>
                    {indicators.map((item: any, index: number) => {
                  const isIndicator = !!(item?.indicatorName || item?.indicator_name);
                  const name = item.indicatorName ?? item.indicator_name ?? item.name ?? item.companyName ?? "";
                  const itemKey = String(item?.id ?? item?._id ?? item?.key ?? `${name}-${owner}-${index}`);

                  if (isIndicator && isDeleted(item?.deleted)) return null;

                  if (isIndicator) {
                    return (
                      <div key={itemKey} className="rounded-2xl border border-white/90 bg-white/80 p-5 shadow-[0_12px_35px_rgba(15,118,110,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(14,116,144,0.14)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-bold">{name}</div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                              <span>Automated: {Boolean(item?.isAutomated ?? item?.automated) ? "Yes" : "No"}</span>
                              <span>Weightage: {item?.weightage ?? "-"}</span>
                              <span>Helped in profit: {item?.helpedInProfit ?? "-"}</span>
                              <span>Helped in loss: {item?.helpedInLoss ?? "-"}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {viewMode === "master" && canManageOwner(owner) && (
                              <>
                                <button onClick={() => openEdit(item)} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100">
                                  Edit
                                </button>
                                <button onClick={() => setMasterIndicatorPendingDeletion(item)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={itemKey} className="rounded-2xl border border-white/90 bg-white/80 p-5 shadow-[0_12px_35px_rgba(15,118,110,0.08)] backdrop-blur transition hover:shadow-[0_18px_45px_rgba(14,116,144,0.14)]">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-2xl font-bold text-slate-900">{item.companyName || name || "Unknown Company"}</div>
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Confidence Entry</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${Boolean(item?.entryTaken) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                            {Boolean(item?.entryTaken) ? "Entry Taken" : "Not Taken"}
                          </span>
                          {Boolean(item?.entryTaken) && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${Boolean(item?.profitable) ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                              {Boolean(item?.profitable) ? "Profitable" : "Not Profitable"}
                            </span>
                          )}
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
                    })}
                  </div>
                ))
              )}
            </div>
          </section>
        ) : (
          <section className="lg:col-span-3">
            <div className="grid h-[calc(100vh-220px)] min-h-[600px] grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="overflow-hidden rounded-2xl border border-white/90 bg-white/75 shadow-[0_16px_45px_rgba(14,116,144,0.1)] backdrop-blur-xl">
                <div className="border-b border-cyan-100 bg-cyan-50/70 px-4 py-4">
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
                              {entryTaken && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${profitable ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                                  {profitable ? "Profit" : "Loss"}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>

              <div className="overflow-hidden rounded-2xl border border-white/90 bg-white/80 shadow-[0_16px_45px_rgba(14,116,144,0.1)] backdrop-blur-xl">
                {!selectedCompany ? (
                  <div className="flex h-full items-center justify-center p-10 text-slate-500">Select a company to view details.</div>
                ) : (
                  <div className="flex h-full flex-col">
                    <div className="border-b border-cyan-100 bg-cyan-50/60 p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-3xl font-bold text-slate-900">{selectedCompany.companyName}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">Confidence Entry</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${Boolean(selectedCompany.entryTaken) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                            {Boolean(selectedCompany.entryTaken) ? "Entry Taken" : "Not Taken"}
                          </span>
                          {Boolean(selectedCompany.entryTaken) && (
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${Boolean(selectedCompany.profitable) ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                              {Boolean(selectedCompany.profitable) ? "Profitable" : "Not Profitable"}
                            </span>
                          )}
                          <button type="button" onClick={openEditCompanyModal} disabled={isEntryTimePassed(selectedCompany)} className="rounded-lg border border-cyan-200 bg-white px-3 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50">
                            Edit Entry
                          </button>
                          {currentUser.trim().toLowerCase() === "abrar" && (
                            <button type="button" onClick={() => setCompanyPendingDeletion(selectedCompany)} className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
                              Delete Entry
                            </button>
                          )}
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

                    <div className="min-h-0 flex-1 overflow-y-auto p-5">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Confidence Indicators</div>
                      <div className="mb-5 rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                          <span className="font-semibold text-slate-700">Combined Nawaz + Sadiq</span>
                          <span className="shrink-0 font-bold text-slate-700">{cumulativeScored} of {cumulativeTotal} ({cumulativePercentage}%)</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${cumulativePercentage > 75 ? "bg-emerald-500" : cumulativePercentage > 50 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${cumulativePercentage}%` }}
                          />
                        </div>
                      </div>

                      {ownerColumns.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                          No confidence indicators added for this company.
                        </div>
                      ) : (
                        <div className="grid min-h-0 w-full grid-cols-1 gap-5 md:grid-cols-2">
                          {ownerColumns.filter(([owner]) => !selectedOwner || owner === selectedOwner).map(([owner, indicators]) => (
                            <div key={owner} className="flex min-h-0 flex-col rounded-2xl border border-cyan-100 bg-slate-50/70 shadow-sm">
                              <div className="sticky top-[-1.25rem] z-20 flex items-center justify-between border-b border-cyan-100 bg-white px-4 py-3 shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOwner((current) => current === owner ? null : owner)}
                                  className="text-sm font-bold text-cyan-800 hover:text-cyan-600"
                                  aria-pressed={selectedOwner === owner}
                                >
                                  {owner || "Unassigned"}
                                </button>
                                <div className="flex min-w-0 flex-1 items-center gap-2 pl-3">
                                  {(() => {
                                    const scored = indicators.filter((indicator: any) => Boolean(indicator?.qualifies)).length;
                                    const percentage = indicators.length === 0 ? 0 : Math.round((scored / indicators.length) * 100);
                                    let scoreColor = "bg-red-500";
                                    if (percentage > 75) scoreColor = "bg-emerald-500";
                                    else if (percentage > 50) scoreColor = "bg-amber-500";
                                    return (
                                      <div className="flex min-w-0 flex-1 items-center gap-2" title={`${scored} of ${indicators.length} indicators scored`}>
                                        <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200">
                                          <div className={`h-full rounded-full transition-all duration-300 ${scoreColor}`} style={{ width: `${percentage}%` }} />
                                        </div>
                                        <span className="w-10 shrink-0 text-right text-xs font-bold text-slate-700">{percentage}%</span>
                                      </div>
                                    );
                                  })()}
                                  {(owner === "Nawaz" || owner === "Sadiq") && canManageOwner(owner) ? (
                                    <button
                                      type="button"
                                      aria-label={`Add indicator for ${owner}`}
                                      title={`Add indicator for ${owner}`}
                                      onClick={() => openIndicatorPicker(owner)}
                                      disabled={isEntryTimePassed(selectedCompany)}
                                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-lg font-semibold leading-none text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      +
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                              <div className="space-y-3 p-3">
                                {indicators.map((indicator: any, idx: number) => {
                                  const isAutomated = indicator?.isAutomated ?? indicator?.automated ?? false;
                                  const qualifies = Boolean(indicator?.qualifies);
                                  const helpedInProfit = Boolean(indicator?.helpedInProfit);
                                  const helpedInLoss = Boolean(indicator?.helpedInLoss);

                                  const toggleTrack = (active: boolean, onChange?: () => void) => (
                                    <button
                                      type="button"
                                      onClick={onChange}
                                      disabled={!onChange || submitting || isEntryTimePassed(selectedCompany)}
                                      className={`relative h-7 w-14 shrink-0 rounded-full border border-white/70 p-0.5 shadow-inner transition-colors ${active ? "bg-emerald-500 shadow-emerald-200" : "bg-rose-400 shadow-rose-200"}`}
                                      aria-label={active ? "Enabled" : "Disabled"}
                                    >
                                      <span
                                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-[0_2px_5px_rgba(15,23,42,0.25)] transition-[left] duration-200 ${active ? "left-8" : "left-1"}`}
                                      />
                                    </button>
                                  );

                                  return (
                                    <div key={`${owner}-${indicator.id ?? idx}`} className="rounded-xl border border-slate-100 bg-white/90 p-4 shadow-sm transition hover:border-cyan-200 hover:shadow-md">
                                      <div className="flex min-h-8 items-center justify-between gap-3">
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
                                            disabled={submitting || !canManageOwner(owner) || isEntryTimePassed(selectedCompany)}
                                            className="flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V4h6v3m-8 0 1 12h8l1-12" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>

                                      <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3">
                                        <div className="flex min-h-7 items-center justify-between gap-2">
                                          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">Qualifies</span>
                                          {toggleTrack(qualifies, () => handleIndicatorScoreChange(indicator, "qualifies", !qualifies))}
                                        </div>
                                        <div className="flex min-h-7 items-center justify-between gap-2">
                                          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">Helped in Profit Booking</span>
                                          {toggleTrack(helpedInProfit, () => handleIndicatorScoreChange(indicator, "helpedInProfit", !helpedInProfit))}
                                        </div>
                                        <div className="flex min-h-7 items-center justify-between gap-2">
                                          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">Helped in Loss Identification</span>
                                          {toggleTrack(helpedInLoss, () => handleIndicatorScoreChange(indicator, "helpedInLoss", !helpedInLoss))}
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
