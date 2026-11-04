"use client";

import { useState, useEffect, useCallback } from "react";
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
  startedAt: string;
  completedAt?: string | null;
  initiatedByAdmin: {
    fullName: string;
  };
}

export default function AdminIdCardsPage() {
  const [items, setItems] = useState<CardRegistrationItem[]>([]);
  const [stats, setStats] = useState<Stats>({ totalApproved: 0, cardsGenerated: 0, pendingGeneration: 0, failedGenerations: 0 });
  const [recentBatches, setRecentBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [academyFilter, setAcademyFilter] = useState("");
  const [weightFilter, setWeightFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | GENERATED | PENDING_GENERATION

  // Options
  const [academies, setAcademies] = useState<{ id: string; name: string }[]>([]);
  const [weightCategories, setWeightCategories] = useState<{ id: string; name: string }[]>([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Preview Modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (academyFilter) params.set("academyId", academyFilter);
      if (weightFilter) params.set("weightCategoryId", weightFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/id-cards?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to load ID cards data.");

      setItems(json.data.registrations || []);
      setStats(json.data.stats || { totalApproved: 0, cardsGenerated: 0, pendingGeneration: 0, failedGenerations: 0 });
      setRecentBatches(json.data.recentBatches || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading card management data.");
    } finally {
      setLoading(false);
    }
  }, [search, academyFilter, weightFilter, statusFilter]);

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

  // Bulk Generate
  const handleBulkGenerate = async () => {
    const idsToGenerate = selectedIds.length > 0 ? selectedIds : items.map((i) => i.id);
    if (idsToGenerate.length === 0) {
      alert("No approved athletes available for bulk card generation.");
      return;
    }

    if (!confirm(`Generate official print-ready ID cards for ${idsToGenerate.length} athlete(s)?`)) {
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
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Bulk generation failed.");

      setSuccessMsg(json.data.message);
      setSelectedIds([]);
      fetchData();

      // Offer direct multi-page PDF download
      if (json.data.downloadUrl) {
        window.open(json.data.downloadUrl, "_blank");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bulk generation failed.");
    } finally {
      setActionInProgress(false);
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
              <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                Phase 3 Credential Production
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-red-500" />
              Athlete ID Card Generation & Print Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Produce international-standard 85.6mm × 54mm landscape CR80 Taekwondo credentials with high-resolution photo embedding.
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
                ? `Bulk Generate (${selectedIds.length}) Cards`
                : `Generate All Filtered (${items.length}) Cards`}
            </button>

            {recentBatches.length > 0 && (
              <a
                href={`/api/admin/id-cards/bulk-download?batchId=${recentBatches[0].id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition"
                title={`Download latest batch (${recentBatches[0].batchNumber}) multi-page PDF`}
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Latest Batch PDF
              </a>
            )}
          </div>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-300">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              {successMsg}
            </span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Dashboard Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Total Approved Athletes</div>
            <div className="text-2xl font-bold text-white mt-1">{stats.totalApproved}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-[11px] font-semibold text-emerald-400 uppercase">ID Cards Generated</div>
            <div className="text-2xl font-bold text-emerald-300 mt-1">{stats.cardsGenerated}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-[11px] font-semibold text-amber-400 uppercase">Pending Card Generation</div>
            <div className="text-2xl font-bold text-amber-300 mt-1">{stats.pendingGeneration}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-[11px] font-semibold text-blue-400 uppercase">Multi-Page Batches</div>
            <div className="text-2xl font-bold text-blue-300 mt-1">{recentBatches.length}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Kukkiwon ID, athlete name, card number..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            >
              <option value="ALL">All Card Statuses</option>
              <option value="GENERATED">Generated Cards Only</option>
              <option value="PENDING_GENERATION">Pending Generation</option>
            </select>

            <select
              value={academyFilter}
              onChange={(e) => setAcademyFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            >
              <option value="">All Academies</option>
              {academies.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            <select
              value={weightFilter}
              onChange={(e) => setWeightFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            >
              <option value="">All Weight Categories</option>
              {weightCategories.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            {(search || statusFilter !== "ALL" || academyFilter || weightFilter) && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setAcademyFilter("");
                  setWeightFilter("");
                }}
                className="text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Approved Athletes & ID Cards Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={items.length > 0 && selectedIds.length === items.length}
                onChange={handleSelectAll}
                className="rounded border-slate-800 text-red-600 bg-slate-950 w-4 h-4 cursor-pointer"
              />
              <span className="font-semibold text-slate-300">
                {selectedIds.length > 0 ? `${selectedIds.length} athletes selected` : "Select All for Bulk Operations"}
              </span>
            </div>

            <span className="text-[11px]">CR80 Landscape (85.6mm × 54mm)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 w-10">Select</th>
                  <th className="py-3.5 px-4">Photo</th>
                  <th className="py-3.5 px-4">Card Number / Ref</th>
                  <th className="py-3.5 px-4">Kukkiwon ID</th>
                  <th className="py-3.5 px-4">Athlete Full Name</th>
                  <th className="py-3.5 px-4">Academy & Class</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Downloads</th>
                  <th className="py-3.5 px-4 text-right">Card Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">Loading athlete credentials...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No approved athlete records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isGenerated = item.idCard?.status === "GENERATED" && !!item.idCard?.generatedFileKey;
                    const isSelected = selectedIds.includes(item.id);

                    return (
                      <tr key={item.id} className={`hover:bg-slate-800/30 transition ${isSelected ? "bg-red-950/20" : ""}`}>
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="rounded border-slate-800 text-red-600 bg-slate-950 w-4 h-4 cursor-pointer"
                          />
                        </td>

                        {/* Photo */}
                        <td className="py-3 px-4">
                          <div className="w-9 h-12 rounded border border-slate-700 bg-slate-950 overflow-hidden shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/api/storage/${item.photograph.storageKey}`}
                              alt={item.athlete.fullName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </td>

                        {/* Card Number / Ref */}
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-white text-[12px] block">
                            {item.idCard?.cardNumber || "Pending Issue"}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">{item.registrationNumber}</span>
                        </td>

                        {/* Kukkiwon ID */}
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-amber-300 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[11px]">
                            {item.athlete.kukkiwonId}
                          </span>
                        </td>

                        {/* Full Name & Dan */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-sm">{item.athlete.fullName}</div>
                          <span className="text-[11px] text-slate-400">{item.athlete.danOrPoom || "Registered"} &bull; {item.athlete.gender}</span>
                        </td>

                        {/* Academy & Weight Category */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">{item.academy.name}</div>
                          <div className="text-[11px] text-cyan-400 font-medium">{item.weightCategory.name}</div>
                        </td>

                        {/* Card Status */}
                        <td className="py-3 px-4">
                          {isGenerated ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-semibold bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" /> Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-300 text-[11px] font-semibold bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </td>

                        {/* Downloads */}
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          <div>Athlete: <span className="font-semibold text-white">{item.idCard?.downloadCountAthlete || 0}</span></div>
                          <div>Admin: <span className="font-semibold text-white">{item.idCard?.downloadCountAdmin || 0}</span></div>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* Preview Button */}
                            <button
                              onClick={() => handleOpenPreview(item)}
                              className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition"
                              title="Preview Official ID Card"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Generate / Regenerate Button */}
                            <button
                              onClick={() => handleGenerateSingle(item)}
                              disabled={actionInProgress}
                              className={`p-1.5 rounded-lg transition ${
                                isGenerated
                                  ? "text-slate-400 hover:text-white hover:bg-slate-800"
                                  : "text-amber-400 hover:text-amber-300 hover:bg-amber-950/50"
                              }`}
                              title={isGenerated ? "Regenerate Card PDF" : "Generate Card PDF"}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>

                            {/* Download Button */}
                            {isGenerated && (
                              <a
                                href={`/api/admin/id-cards/download?registrationId=${item.id}`}
                                className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/50 rounded-lg transition"
                                title="Download Print-Ready Card PDF"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Multi-Page Batches History */}
        {recentBatches.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Recent Bulk Print Batches
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recentBatches.map((b) => (
                <div key={b.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-white text-sm">{b.batchNumber}</span>
                    <span className="bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {b.status}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    Total Cards: <span className="font-semibold text-white">{b.successfulCards} / {b.totalCards}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Initiated: {new Date(b.startedAt).toLocaleString()} by {b.initiatedByAdmin.fullName}
                  </div>
                  <a
                    href={`/api/admin/id-cards/bulk-download?batchId=${b.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 pt-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Multi-Page PDF
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* IN-BROWSER HIGH-RES CARD PREVIEW MODAL */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl flex flex-col h-[85vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  Print Preview (CR80 Landscape 85.6mm × 54mm)
                </span>
                <h3 className="text-base font-bold text-white">{previewTitle}</h3>
              </div>
              <button onClick={() => setPreviewUrl(null)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <div className="flex-1 w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative">
              <iframe
                src={previewUrl}
                title="ID Card Preview"
                className="w-full h-full border-0"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <p className="text-[11px] text-slate-400">
                Vector PDF rendered with embedded fonts and high-resolution photo. Standard Taekwondo championship template.
              </p>
              <button
                onClick={() => setPreviewUrl(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

