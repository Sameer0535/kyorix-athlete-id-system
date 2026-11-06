"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AdminNav from "@/components/AdminNav";
import {
  CreditCard,
  Download,
  Eye,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  Layers,
  AlertCircle,
  Check,
  FileText,
  Printer,
  Archive,
  Ban,
  RotateCcw,
  Activity,
} from "lucide-react";

interface CardRegistrationItem {
  id: string;
  registrationNumber: string;
  approvalStatus: string;
  cardRole?: string;
  createdAt: string;
  athlete: {
    id: string;
    kukkiwonId: string;
    fullName: string;
    gender: string;
    danOrPoom?: string;
  };
  academy: {
    id: string;
    name: string;
    city: string;
  };
  weightCategory: {
    id: string;
    name: string;
    division: string;
  };
  photograph: {
    storageKey: string;
    fileName: string;
  };
  idCard?: {
    id: string;
    cardNumber: string;
    status: string;
    generatedFileKey?: string | null;
    generatedAt?: string | null;
    downloadCountAthlete: number;
    downloadCountAdmin: number;
  } | null;
}

interface Stats {
  totalApproved: number;
  cardsGenerated: number;
  pendingGeneration: number;
  failedGenerations: number;
}

interface BatchItem {
  id: string;
  batchNumber: string;
  status: string;
  totalCards: number;
  successfulCards: number;
  failedCards: number;
  hasPdf: boolean;
  hasZip: boolean;
  pdfFileSize?: number | null;
  zipFileSize?: number | null;
  startedAt: string;
  completedAt?: string | null;
  initiatedBy: string;
  jobProgress: number;
  jobStatus: string;
}

interface FailedRecord {
  registrationId: string;
  athleteId: string;
  athleteName: string;
  kukkiwonId: string;
  reason: string;
  failedAt: string;
}

const ROLE_BADGES: Record<string, string> = {
  PARTICIPANT: "bg-blue-50 text-blue-700 border-blue-200",
  REFEREE: "bg-sky-50 text-sky-700 border-sky-200",
  COACH: "bg-red-50 text-red-700 border-red-200",
  STAFF: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function AdminIdCardsPage() {
  const [activeTab, setActiveTab] = useState<"athletes" | "batches">("athletes");
  const [items, setItems] = useState<CardRegistrationItem[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalApproved: 0,
    cardsGenerated: 0,
    pendingGeneration: 0,
    failedGenerations: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [academyFilter, setAcademyFilter] = useState("");
  const [weightFilter, setWeightFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selection for bulk generation
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Filter options
  const [academies, setAcademies] = useState<{ id: string; name: string }[]>([]);
  const [weightCategories, setWeightCategories] = useState<{ id: string; name: string }[]>([]);

  // Preview Modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  // Inspect Failed Records Modal
  const [inspectBatchId, setInspectBatchId] = useState<string | null>(null);
  const [inspectBatchNumber, setInspectBatchNumber] = useState<string>("");
  const [failedRecordsList, setFailedRecordsList] = useState<FailedRecord[]>([]);
  const [loadingFailedRecords, setLoadingFailedRecords] = useState(false);

  // Polling for active background jobs
  const [activeBatchJob, setActiveBatchJob] = useState<{
    id: string;
    batchNumber: string;
    progress: number;
    status: string;
    total: number;
  } | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (academyFilter) params.set("academyId", academyFilter);
      if (weightFilter) params.set("weightCategoryId", weightFilter);
      if (statusFilter !== "ALL") params.set("cardStatus", statusFilter);

      const [cardsRes, batchesRes] = await Promise.all([
        fetch(`/api/admin/id-cards?${params.toString()}`),
        fetch("/api/admin/id-cards/batches"),
      ]);

      const cardsJson = await cardsRes.json();
      const batchesJson = await batchesRes.json();

      if (cardsJson.success) {
        setItems(cardsJson.data.registrations || []);
        setStats(cardsJson.data.stats || {
          totalApproved: 0,
          cardsGenerated: 0,
          pendingGeneration: 0,
          failedGenerations: 0,
        });
        setAcademies(cardsJson.data.academies || []);
        setWeightCategories(cardsJson.data.weightCategories || []);
      }

      if (batchesJson.success) {
        setBatches(batchesJson.data.batches || []);
        const active = (batchesJson.data.batches || []).find(
          (b: BatchItem) => b.status === "PROCESSING" || b.status === "QUEUED"
        );
        if (active) {
          setActiveBatchJob({
            id: active.id,
            batchNumber: active.batchNumber,
            progress: active.jobProgress,
            status: active.status,
            total: active.totalCards,
          });
        } else {
          setActiveBatchJob(null);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching card records.");
    } finally {
      setLoading(false);
    }
  }, [search, academyFilter, weightFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling effect
  useEffect(() => {
    if (activeBatchJob) {
      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/admin/id-cards/batches/${activeBatchJob.id}`);
          const json = await res.json();
          if (res.ok && json.success) {
            const b = json.data.batch;
            setActiveBatchJob({
              id: b.id,
              batchNumber: b.batchNumber,
              progress: b.jobProgress,
              status: b.status,
              total: b.totalCards,
            });
            if (b.status === "COMPLETED" || b.status === "FAILED" || b.status === "PARTIAL_FAILURE") {
              fetchData();
            }
          }
        } catch {
          // ignore
        }
      }, 2500);
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [activeBatchJob, fetchData]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i.id));
    }
  };

  const handleGenerateSingle = async (item: CardRegistrationItem) => {
    setActionInProgress(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/id-cards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: item.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Generation failed.");

      setSuccessMsg(`ID Card ${json.data.cardNumber} generated for ${item.athlete.fullName}.`);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ID Card generation failed.");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleBulkGenerate = async () => {
    const idsToGenerate = selectedIds.length > 0 ? selectedIds : items.map((i) => i.id);
    if (idsToGenerate.length === 0) {
      alert("No approved athletes available for bulk generation.");
      return;
    }

    if (!confirm(`Queue background bulk generation for ${idsToGenerate.length} athlete(s)? Both Combined PDF and ZIP Archive will be prepared.`)) {
      return;
    }

    setActionInProgress(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/id-cards/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationIds: idsToGenerate,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Bulk generation initiation failed.");

      setSuccessMsg(json.data.message || "Bulk generation background job queued successfully.");
      setSelectedIds([]);
      setActiveTab("batches");
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bulk generation failed.");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCancelBatch = async (batchId: string) => {
    if (!confirm("Are you sure you want to cancel this bulk card generation batch?")) return;
    try {
      const res = await fetch(`/api/admin/id-cards/batches/${batchId}/cancel`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to cancel batch.");
      setSuccessMsg("Batch generation cancelled.");
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Cancellation failed.");
    }
  };

  const handleInspectFailed = async (batch: BatchItem) => {
    setInspectBatchId(batch.id);
    setInspectBatchNumber(batch.batchNumber);
    setLoadingFailedRecords(true);
    try {
      const res = await fetch(`/api/admin/id-cards/batches/${batch.id}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setFailedRecordsList(json.data.batch.failedRecords || []);
      }
    } catch {
      setFailedRecordsList([]);
    } finally {
      setLoadingFailedRecords(false);
    }
  };

  const handleRetryFailed = async (batchId: string) => {
    if (!confirm("Queue a retry batch for all failed athlete records?")) return;
    try {
      const res = await fetch(`/api/admin/id-cards/batches/${batchId}/retry`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Retry failed.");
      setSuccessMsg(json.data.message || "Retry batch queued.");
      setInspectBatchId(null);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Retry initiation failed.");
    }
  };

  const handleOpenPreview = (item: CardRegistrationItem) => {
    setPreviewTitle(`${item.athlete.fullName} (${item.athlete.kukkiwonId})`);
    setPreviewUrl(`/api/admin/id-cards/preview?registrationId=${item.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Accreditation Engine
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-blue-600" />
              Athlete ID Card Generation & Bulk Production
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Produce official championship credentials in 4 role formats (Participant, Referee, Coach, Staff) with dual export (Combined PDF & ZIP).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleBulkGenerate}
              disabled={actionInProgress || items.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-bold text-white transition shadow-md shadow-blue-600/20"
            >
              <Printer className="w-4 h-4" />
              {selectedIds.length > 0
                ? `Bulk Queue (${selectedIds.length}) Cards`
                : `Bulk Queue All Filtered (${items.length})`}
            </button>
          </div>
        </div>

        {/* Live Active Batch Banner */}
        {activeBatchJob && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-blue-600 shrink-0 animate-spin" />
              <div>
                <div className="text-xs font-bold text-blue-800">
                  Background Batch Processing: {activeBatchJob.batchNumber}
                </div>
                <div className="text-[11px] text-slate-600">
                  Status: <strong>{activeBatchJob.status}</strong> &bull; Total: {activeBatchJob.total} cards
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-64">
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(activeBatchJob.progress, 5)}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-blue-700 shrink-0">
                {activeBatchJob.progress}%
              </span>
            </div>
          </div>
        )}

        {/* Notices */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-700 hover:text-slate-900 text-xs">&times;</button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-slate-900 text-xs">&times;</button>
          </div>
        )}

        {/* Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1 font-semibold">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Total Approved
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.totalApproved}</div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1 font-semibold">
              <Printer className="w-3.5 h-3.5 text-blue-600" /> Cards Generated
            </div>
            <div className="text-2xl font-extrabold text-blue-600">{stats.cardsGenerated}</div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1 font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Generation
            </div>
            <div className="text-2xl font-extrabold text-amber-600">{stats.pendingGeneration}</div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1 font-semibold">
              <Archive className="w-3.5 h-3.5 text-purple-600" /> Batch Archives
            </div>
            <div className="text-2xl font-extrabold text-purple-600">{batches.length}</div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab("athletes")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "athletes"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Approved Athletes & Direct Cards ({items.length})
          </button>
          <button
            onClick={() => setActiveTab("batches")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "batches"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            Bulk Processing & Batch Monitor ({batches.length})
          </button>
        </div>

        {/* TAB 1: Athletes List */}
        {activeTab === "athletes" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search Kukkiwon ID or Athlete Name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <select
                  value={academyFilter}
                  onChange={(e) => setAcademyFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                >
                  <option value="">All Academies</option>
                  {academies.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>

                <select
                  value={weightFilter}
                  onChange={(e) => setWeightFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                >
                  <option value="">All Weight Categories</option>
                  {weightCategories.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                >
                  <option value="ALL">All Card Statuses</option>
                  <option value="GENERATED">Generated Only</option>
                  <option value="PENDING_GENERATION">Pending Generation</option>
                </select>
              </div>

              <button
                onClick={fetchData}
                disabled={loading}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
                Refresh
              </button>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={items.length > 0 && selectedIds.length === items.length}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="p-3">Athlete</th>
                      <th className="p-3">Kukkiwon ID</th>
                      <th className="p-3">Role / Template</th>
                      <th className="p-3">Academy</th>
                      <th className="p-3">Weight Category</th>
                      <th className="p-3">Card Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          Loading approved athletes...
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          No approved athletes found matching filters.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const isSelected = selectedIds.includes(item.id);
                        const isGenerated = item.idCard?.status === "GENERATED";
                        const roleKey = (item.cardRole || "PARTICIPANT").toUpperCase();
                        const badgeClass = ROLE_BADGES[roleKey] || ROLE_BADGES.PARTICIPANT;

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50/80 transition ${
                              isSelected ? "bg-blue-50/60" : ""
                            }`}
                          >
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(item.id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="p-3 font-bold text-slate-900">
                              <div>{item.athlete.fullName}</div>
                              <div className="text-[10px] text-slate-500 font-normal">
                                {item.athlete.danOrPoom || "Registered Competitor"} &bull; {item.registrationNumber}
                              </div>
                            </td>
                            <td className="p-3 font-mono text-blue-600 font-bold">
                              {item.athlete.kukkiwonId}
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${badgeClass}`}>
                                {roleKey}
                              </span>
                            </td>
                            <td className="p-3 text-slate-700">
                              <div className="font-semibold text-slate-900">{item.academy.name}</div>
                              <div className="text-[10px] text-slate-500">{item.academy.city}</div>
                            </td>
                            <td className="p-3 text-slate-700">
                              <div className="font-semibold text-slate-900">{item.weightCategory.name}</div>
                              <div className="text-[10px] text-slate-500 uppercase">{item.weightCategory.division}</div>
                            </td>
                            <td className="p-3">
                              {isGenerated ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  {item.idCard?.cardNumber}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => handleGenerateSingle(item)}
                                disabled={actionInProgress}
                                title={isGenerated ? "Regenerate Card" : "Generate Card"}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition text-xs font-semibold inline-flex items-center gap-1 border border-slate-200"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                                {isGenerated ? "Regen" : "Generate"}
                              </button>

                              <button
                                onClick={() => handleOpenPreview(item)}
                                title="Preview Official Card"
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition text-xs font-semibold inline-flex items-center gap-1 border border-slate-200"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                Preview
                              </button>

                              <a
                                href={`/api/admin/id-cards/download?registrationId=${item.id}`}
                                download
                                title="Download PDF"
                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition text-xs font-semibold inline-flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5 text-blue-600" />
                                PDF
                              </a>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Bulk Batches & Background Monitor */}
        {activeTab === "batches" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Background Bulk Processing Batches
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every batch compiles both an all-in-one multi-page PDF and a structured ZIP archive.
                </p>
              </div>

              <button
                onClick={fetchData}
                disabled={loading}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Batch Number</th>
                      <th className="p-3">Initiated By</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Progress</th>
                      <th className="p-3">Athletes</th>
                      <th className="p-3">Success / Fail</th>
                      <th className="p-3">Started</th>
                      <th className="p-3 text-right">Downloads & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batches.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          No bulk generation batches recorded yet.
                        </td>
                      </tr>
                    ) : (
                      batches.map((b) => {
                        const isProcessing = b.status === "PROCESSING" || b.status === "QUEUED";

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3 font-mono font-bold text-slate-900">
                              {b.batchNumber}
                            </td>
                            <td className="p-3 text-slate-700">{b.initiatedBy}</td>
                            <td className="p-3">
                              {b.status === "COMPLETED" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Completed
                                </span>
                              )}
                              {b.status === "PROCESSING" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                                  Processing
                                </span>
                              )}
                              {b.status === "QUEUED" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Queued
                                </span>
                              )}
                              {b.status === "PARTIAL_FAILURE" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                  Partial
                                </span>
                              )}
                              {b.status === "FAILED" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                  Failed
                                </span>
                              )}
                              {b.status === "CANCELLED" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  Cancelled
                                </span>
                              )}
                            </td>
                            <td className="p-3 w-32">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      b.status === "COMPLETED"
                                        ? "bg-emerald-500"
                                        : b.status === "FAILED"
                                        ? "bg-red-500"
                                        : "bg-blue-600"
                                    }`}
                                    style={{ width: `${Math.max(b.jobProgress, 5)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {b.jobProgress}%
                                </span>
                              </div>
                            </td>
                            <td className="p-3 font-semibold text-slate-800">{b.totalCards}</td>
                            <td className="p-3">
                              <span className="text-emerald-600 font-bold">{b.successfulCards}</span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className={b.failedCards > 0 ? "text-red-600 font-bold" : "text-slate-400"}>
                                {b.failedCards}
                              </span>
                            </td>
                            <td className="p-3 text-[11px] text-slate-500">
                              {new Date(b.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                              {b.hasPdf && (
                                <a
                                  href={`/api/admin/id-cards/batches/${b.id}/download-pdf`}
                                  download
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold transition border border-slate-200"
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                                  Combined PDF
                                </a>
                              )}

                              {b.hasZip && (
                                <a
                                  href={`/api/admin/id-cards/batches/${b.id}/download-zip`}
                                  download
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-semibold transition border border-purple-200"
                                >
                                  <Archive className="w-3.5 h-3.5 text-purple-600" />
                                  ZIP Archive
                                </a>
                              )}

                              {b.failedCards > 0 && (
                                <button
                                  onClick={() => handleInspectFailed(b)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold transition border border-red-200"
                                >
                                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                                  Failed ({b.failedCards})
                                </button>
                              )}

                              {isProcessing && (
                                <button
                                  onClick={() => handleCancelBatch(b.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 text-[11px] font-semibold transition border border-slate-200"
                                >
                                  <Ban className="w-3.5 h-3.5 text-red-600" />
                                  Cancel
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Failed Records Modal */}
        {inspectBatchId && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Failed Athlete Records &mdash; {inspectBatchNumber}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Inspect failure causes and re-queue card generation.
                  </p>
                </div>
                <button
                  onClick={() => setInspectBatchId(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              {loadingFailedRecords ? (
                <div className="py-8 text-center text-slate-500 text-xs">Loading failure logs...</div>
              ) : failedRecordsList.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">No failure details found.</div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {failedRecordsList.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-red-200 text-xs flex items-start justify-between gap-4"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{rec.athleteName}</div>
                        <div className="text-[11px] text-blue-600 font-mono">
                          Kukkiwon ID: {rec.kukkiwonId}
                        </div>
                        <div className="text-[11px] text-red-700 mt-1">
                          Reason: {rec.reason}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 shrink-0">
                        {new Date(rec.failedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  onClick={() => setInspectBatchId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Close
                </button>

                <button
                  onClick={() => handleRetryFailed(inspectBatchId)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry All Failed Records
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inline PDF Preview Modal */}
        {previewUrl && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-4 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-blue-600" />
                  Print Preview &bull; {previewTitle}
                </div>
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="text-slate-400 hover:text-slate-600 text-base font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="w-full h-80 rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
                <iframe src={previewUrl} title="Card Preview" className="w-full h-full border-0" />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
