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
  Building,
  Scale,
  AlertCircle,
  Check,
  FileText,
  Printer,
  Archive,
  Ban,
  RotateCcw,
  Activity,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface CardRegistrationItem {
  id: string;
  registrationNumber: string;
  approvalStatus: string;
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

export default function AdminIdCardsPage() {
  const [activeTab, setActiveTab] = useState<"athletes" | "batches">("athletes");

  const [items, setItems] = useState<CardRegistrationItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalApproved: 0,
    cardsGenerated: 0,
    pendingGeneration: 0,
    failedGenerations: 0,
  });
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [academyFilter, setAcademyFilter] = useState("");
  const [weightFilter, setWeightFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Options
  const [academies, setAcademies] = useState<{ id: string; name: string }[]>([]);
  const [weightCategories, setWeightCategories] = useState<{ id: string; name: string }[]>([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Preview Modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  // Failed Records Inspection Modal
  const [inspectBatchId, setInspectBatchId] = useState<string | null>(null);
  const [inspectBatchNumber, setInspectBatchNumber] = useState<string>("");
  const [failedRecordsList, setFailedRecordsList] = useState<FailedRecord[]>([]);
  const [loadingFailedRecords, setLoadingFailedRecords] = useState(false);

  // Live active batch progress
  const [activeBatchJob, setActiveBatchJob] = useState<{
    batchId: string;
    batchNumber: string;
    progress: number;
    total: number;
    status: string;
  } | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (academyFilter) params.set("academyId", academyFilter);
      if (weightFilter) params.set("weightCategoryId", weightFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const [cardsRes, batchesRes] = await Promise.all([
        fetch(`/api/admin/id-cards?${params.toString()}`),
        fetch("/api/admin/id-cards/batches?limit=25"),
      ]);

      const cardsJson = await cardsRes.json();
      const batchesJson = await batchesRes.json();

      if (cardsJson.success) {
        setItems(cardsJson.data.registrations || []);
        setStats(
          cardsJson.data.stats || {
            totalApproved: 0,
            cardsGenerated: 0,
            pendingGeneration: 0,
            failedGenerations: 0,
          }
        );
      }

      if (batchesJson.success) {
        setBatches(batchesJson.data.batches || []);

        // Detect any actively running batch
        const running = batchesJson.data.batches.find(
          (b: BatchItem) => b.status === "PROCESSING" || b.status === "QUEUED"
        );
        if (running) {
          setActiveBatchJob({
            batchId: running.id,
            batchNumber: running.batchNumber,
            progress: running.jobProgress,
            total: running.totalCards,
            status: running.status,
          });
        } else {
          setActiveBatchJob(null);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading card management data.");
    } finally {
      setLoading(false);
    }
  }, [search, academyFilter, weightFilter, statusFilter]);

  // Periodic polling when batch is active
  useEffect(() => {
    if (activeBatchJob) {
      pollingRef.current = setTimeout(() => {
        fetchData();
      }, 3000);
    }
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [activeBatchJob, fetchData]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch("/api/meta/options");
        const json = await res.json();
        if (json.success) {
          setAcademies(json.data.academies || []);
          setWeightCategories(json.data.weightCategories || []);
        }
      } catch {
        // ignore
      }
    }
    loadOptions();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Checkbox handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(items.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Individual Generate
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

      setSuccessMsg(json.data.message || `Card generated for ${item.athlete.fullName}.`);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate card.");
    } finally {
      setActionInProgress(false);
    }
  };

  // Bulk Generate (Asynchronous Background Job)
  const handleBulkGenerate = async () => {
    const idsToGenerate = selectedIds.length > 0 ? selectedIds : items.map((i) => i.id);
    if (idsToGenerate.length === 0) {
      alert("No approved athletes available for bulk card generation.");
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

  // Cancel Batch Job
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

  // Inspect Failed Records
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

  // Retry Failed Records
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                Phase 4 Enterprise Batch Production
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-red-500" />
              Athlete ID Card Generation & Batch Processing
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Produce standard 85.6mm × 54mm landscape CR80 credentials with dual export (Combined PDF & ZIP Archive).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleBulkGenerate}
              disabled={actionInProgress || items.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-xs font-semibold text-white transition shadow-lg shadow-red-950/40"
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
          <div className="bg-cyan-950/60 border border-cyan-500/50 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-cyan-300">
                  Background Batch Processing: {activeBatchJob.batchNumber}
                </div>
                <div className="text-[11px] text-slate-300">
                  Status: <strong>{activeBatchJob.status}</strong> &bull; Total: {activeBatchJob.total} cards
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-64">
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-cyan-500/30">
                <div
                  className="bg-cyan-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(activeBatchJob.progress, 5)}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400 shrink-0">
                {activeBatchJob.progress}%
              </span>
            </div>
          </div>
        )}

        {/* Notices */}
        {error && (
          <div className="p-4 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-slate-400 hover:text-white text-xs">&times;</button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-xl text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-white text-xs">&times;</button>
          </div>
        )}

        {/* Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Total Approved
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalApproved}</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Printer className="w-3.5 h-3.5 text-cyan-400" /> Cards Generated
            </div>
            <div className="text-2xl font-bold text-cyan-400">{stats.cardsGenerated}</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Pending Generation
            </div>
            <div className="text-2xl font-bold text-amber-400">{stats.pendingGeneration}</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Archive className="w-3.5 h-3.5 text-purple-400" /> Batch Archives
            </div>
            <div className="text-2xl font-bold text-purple-400">{batches.length}</div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab("athletes")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "athletes"
                ? "border-red-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Approved Athletes & Direct Cards ({items.length})
          </button>
          <button
            onClick={() => setActiveTab("batches")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "batches"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search Kukkiwon ID or Athlete Name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <select
                  value={academyFilter}
                  onChange={(e) => setAcademyFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="">All Academies</option>
                  {academies.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>

                <select
                  value={weightFilter}
                  onChange={(e) => setWeightFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="">All Weight Categories</option>
                  {weightCategories.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="ALL">All Card Statuses</option>
                  <option value="GENERATED">Generated Only</option>
                  <option value="PENDING_GENERATION">Pending Generation</option>
                </select>
              </div>

              <button
                onClick={fetchData}
                disabled={loading}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={items.length > 0 && selectedIds.length === items.length}
                          className="rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0"
                        />
                      </th>
                      <th className="p-3">Athlete</th>
                      <th className="p-3">Kukkiwon ID</th>
                      <th className="p-3">Academy</th>
                      <th className="p-3">Weight Category</th>
                      <th className="p-3">Card Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          Loading approved athletes...
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No approved athletes found matching filters.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const isSelected = selectedIds.includes(item.id);
                        const isGenerated = item.idCard?.status === "GENERATED";

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-800/40 transition ${
                              isSelected ? "bg-red-950/20" : ""
                            }`}
                          >
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(item.id)}
                                className="rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0"
                              />
                            </td>
                            <td className="p-3 font-semibold text-white">
                              <div>{item.athlete.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {item.athlete.danOrPoom || "Registered Athlete"} &bull; {item.registrationNumber}
                              </div>
                            </td>
                            <td className="p-3 font-mono text-cyan-400 font-bold">
                              {item.athlete.kukkiwonId}
                            </td>
                            <td className="p-3 text-slate-300">
                              <div>{item.academy.name}</div>
                              <div className="text-[10px] text-slate-500">{item.academy.city}</div>
                            </td>
                            <td className="p-3 text-slate-300">
                              <div>{item.weightCategory.name}</div>
                              <div className="text-[10px] text-slate-500 uppercase">{item.weightCategory.division}</div>
                            </td>
                            <td className="p-3">
                              {isGenerated ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                                  {item.idCard?.cardNumber}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => handleGenerateSingle(item)}
                                disabled={actionInProgress}
                                title={isGenerated ? "Regenerate Card" : "Generate Card"}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-semibold inline-flex items-center gap-1"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                                {isGenerated ? "Regen" : "Generate"}
                              </button>

                              <button
                                onClick={() => handleOpenPreview(item)}
                                title="Preview CR80 Card"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-semibold inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-300" />
                                Preview
                              </button>

                              <a
                                href={`/api/admin/id-cards/download?registrationId=${item.id}`}
                                download
                                title="Download PDF"
                                className="p-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 transition text-xs font-semibold inline-flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5 text-emerald-400" />
                                Download
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Background Bulk Processing Batches
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every batch compiles both an all-in-one multi-page PDF and a structured ZIP archive.
                </p>
              </div>

              <button
                onClick={fetchData}
                disabled={loading}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
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
                  <tbody className="divide-y divide-slate-800">
                    {batches.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          No bulk generation batches recorded yet.
                        </td>
                      </tr>
                    ) : (
                      batches.map((b) => {
                        const isProcessing = b.status === "PROCESSING" || b.status === "QUEUED";

                        return (
                          <tr key={b.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3 font-mono font-bold text-white">
                              {b.batchNumber}
                            </td>
                            <td className="p-3 text-slate-300">{b.initiatedBy}</td>
                            <td className="p-3">
                              {b.status === "COMPLETED" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  Completed
                                </span>
                              )}
                              {b.status === "PROCESSING" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse">
                                  Processing
                                </span>
                              )}
                              {b.status === "QUEUED" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                  Queued
                                </span>
                              )}
                              {b.status === "PARTIAL_FAILURE" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-950 text-orange-300 border border-orange-800">
                                  Partial
                                </span>
                              )}
                              {b.status === "FAILED" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-800">
                                  Failed
                                </span>
                              )}
                              {b.status === "CANCELLED" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                                  Cancelled
                                </span>
                              )}
                            </td>
                            <td className="p-3 w-32">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      b.status === "COMPLETED"
                                        ? "bg-emerald-500"
                                        : b.status === "FAILED"
                                        ? "bg-red-500"
                                        : "bg-cyan-500"
                                    }`}
                                    style={{ width: `${Math.max(b.jobProgress, 5)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {b.jobProgress}%
                                </span>
                              </div>
                            </td>
                            <td className="p-3 font-semibold text-slate-200">{b.totalCards}</td>
                            <td className="p-3">
                              <span className="text-emerald-400 font-bold">{b.successfulCards}</span>
                              <span className="text-slate-500 mx-1">/</span>
                              <span className={b.failedCards > 0 ? "text-red-400 font-bold" : "text-slate-500"}>
                                {b.failedCards}
                              </span>
                            </td>
                            <td className="p-3 text-[11px] text-slate-400">
                              {new Date(b.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                              {b.hasPdf && (
                                <a
                                  href={`/api/admin/id-cards/batches/${b.id}/download-pdf`}
                                  download
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition"
                                >
                                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                                  Combined PDF
                                </a>
                              )}

                              {b.hasZip && (
                                <a
                                  href={`/api/admin/id-cards/batches/${b.id}/download-zip`}
                                  download
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-950/60 hover:bg-purple-900 text-purple-200 text-[11px] font-semibold transition border border-purple-800/60"
                                >
                                  <Archive className="w-3.5 h-3.5 text-purple-400" />
                                  ZIP Archive
                                </a>
                              )}

                              {b.failedCards > 0 && (
                                <button
                                  onClick={() => handleInspectFailed(b)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-950/60 hover:bg-red-900 text-red-200 text-[11px] font-semibold transition border border-red-800/60"
                                >
                                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                  Failed ({b.failedCards})
                                </button>
                              )}

                              {isProcessing && (
                                <button
                                  onClick={() => handleCancelBatch(b.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300 text-[11px] font-semibold transition"
                                >
                                  <Ban className="w-3.5 h-3.5 text-red-400" />
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
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    Failed Athlete Records &mdash; {inspectBatchNumber}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Inspect failure causes and re-queue card generation.
                  </p>
                </div>
                <button
                  onClick={() => setInspectBatchId(null)}
                  className="text-slate-400 hover:text-white text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              {loadingFailedRecords ? (
                <div className="py-8 text-center text-slate-400 text-xs">Loading failure logs...</div>
              ) : failedRecordsList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No failure details found.</div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {failedRecordsList.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950 rounded-xl border border-red-900/40 text-xs flex items-start justify-between gap-4"
                    >
                      <div>
                        <div className="font-bold text-white">{rec.athleteName}</div>
                        <div className="text-[11px] text-cyan-400 font-mono">
                          Kukkiwon ID: {rec.kukkiwonId}
                        </div>
                        <div className="text-[11px] text-red-300 mt-1">
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

              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <button
                  onClick={() => setInspectBatchId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Close
                </button>

                <button
                  onClick={() => handleRetryFailed(inspectBatchId)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-950/40"
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
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-4 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-cyan-400" />
                  Print Preview &bull; {previewTitle}
                </div>
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="text-slate-400 hover:text-white text-base font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="w-full h-80 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                <iframe src={previewUrl} title="Card Preview" className="w-full h-full border-0" />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
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
