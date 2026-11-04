"use client";

import { useState, useEffect, useCallback } from "react";
import AdminNav from "@/components/AdminNav";
import {
  Users,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Check,
  Edit2,
  Camera,
  Eye,
  X,
  Building,
  Scale,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import PhotoCropper from "@/components/PhotoCropper";

interface RegistrationItem {
  id: string;
  registrationNumber: string;
  approvalStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  approvalDate?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  athlete: {
    id: string;
    kukkiwonId: string;
    fullName: string;
    gender: string;
    danOrPoom?: string;
    contactPhone?: string;
    contactEmail?: string;
  };
  academy: {
    id: string;
    code: string;
    name: string;
    city: string;
    state: string;
  };
  weightCategory: {
    id: string;
    code: string;
    name: string;
    division: string;
    gender: string;
  };
  photograph: {
    id: string;
    storageKey: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
  };
  idCard?: {
    id: string;
    cardNumber: string;
    status: string;
  } | null;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  changesRequested: number;
}

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0, changesRequested: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [academyFilter, setAcademyFilter] = useState("");
  const [weightFilter, setWeightFilter] = useState("");

  // Options for filtering
  const [academies, setAcademies] = useState<{ id: string; name: string }[]>([]);
  const [weightCategories, setWeightCategories] = useState<{ id: string; name: string }[]>([]);

  // Modals State
  const [viewItem, setViewItem] = useState<RegistrationItem | null>(null);
  const [photoModalItem, setPhotoModalItem] = useState<RegistrationItem | null>(null);
  const [rejectModalItem, setRejectModalItem] = useState<RegistrationItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [changesModalItem, setChangesModalItem] = useState<RegistrationItem | null>(null);
  const [changesNotes, setChangesNotes] = useState("");

  // Edit Modal State
  const [editModalItem, setEditModalItem] = useState<RegistrationItem | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editDanOrPoom, setEditDanOrPoom] = useState("");
  const [editAcademyId, setEditAcademyId] = useState("");
  const [editWeightCategoryId, setEditWeightCategoryId] = useState("");

  // Replace Photo Modal State
  const [replacePhotoItem, setReplacePhotoItem] = useState<RegistrationItem | null>(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replacementPreview, setReplacementPreview] = useState<string | null>(null);

  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Load filter options
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

  // Fetch registrations
  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (academyFilter) params.set("academyId", academyFilter);
      if (weightFilter) params.set("weightCategoryId", weightFilter);

      const res = await fetch(`/api/admin/registrations?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load registrations.");
      }

      setRegistrations(json.data.registrations || []);
      setStats(json.data.stats || { total: 0, pending: 0, approved: 0, rejected: 0, changesRequested: 0 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading registrations.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, academyFilter, weightFilter]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Actions
  const handleApprove = async (reg: RegistrationItem) => {
    if (!confirm(`Are you sure you want to approve registration for ${reg.athlete.fullName} (${reg.athlete.kukkiwonId})?`)) {
      return;
    }

    setActionInProgress(true);
    try {
      const res = await fetch(`/api/admin/registrations/${reg.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Approval failed.");

      setActionSuccessMsg(`Approved ${reg.athlete.fullName} successfully.`);
      fetchRegistrations();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalItem || !rejectReason.trim()) return;

    setActionInProgress(true);
    try {
      const res = await fetch(`/api/admin/registrations/${rejectModalItem.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", reason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Rejection failed.");

      setActionSuccessMsg(`Registration rejected.`);
      setRejectModalItem(null);
      setRejectReason("");
      fetchRegistrations();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Rejection failed.");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleChangesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changesModalItem || !changesNotes.trim()) return;

    setActionInProgress(true);
    try {
      const res = await fetch(`/api/admin/registrations/${changesModalItem.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REQUEST_CHANGES", notes: changesNotes.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Request failed.");

      setActionSuccessMsg(`Correction instructions sent to athlete.`);
      setChangesModalItem(null);
      setChangesNotes("");
      fetchRegistrations();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleEditOpen = (reg: RegistrationItem) => {
    setEditModalItem(reg);
    setEditFullName(reg.athlete.fullName);
    setEditDanOrPoom(reg.athlete.danOrPoom || "1st Dan");
    setEditAcademyId(reg.academy.id);
    setEditWeightCategoryId(reg.weightCategory.id);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalItem) return;

    setActionInProgress(true);
    try {
      const res = await fetch(`/api/admin/registrations/${editModalItem.id}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editFullName.trim(),
          danOrPoom: editDanOrPoom,
          academyId: editAcademyId,
          weightCategoryId: editWeightCategoryId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Edit failed.");

      setActionSuccessMsg(`Athlete information updated.`);
      setEditModalItem(null);
      fetchRegistrations();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Edit failed.");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReplacePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacePhotoItem || !replacementFile) return;

    setActionInProgress(true);
    try {
      const formData = new FormData();
      formData.append("photo", replacementFile);

      const res = await fetch(`/api/admin/registrations/${replacePhotoItem.id}/replace-photo`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Photo replacement failed.");

      setActionSuccessMsg(`Athlete photograph replaced.`);
      setReplacePhotoItem(null);
      setReplacementFile(null);
      setReplacementPreview(null);
      fetchRegistrations();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Photo replacement failed.");
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-red-500" />
              Registration Verification & Approvals
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Verify biometric athlete photographs, validate Kukkiwon credentials, and manage ID card issuance.
            </p>
          </div>

          <button
            onClick={() => fetchRegistrations()}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Queue
          </button>
        </div>

        {actionSuccessMsg && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-300">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              {actionSuccessMsg}
            </span>
            <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Dashboard Statistics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`p-4 rounded-xl border text-left transition ${
              statusFilter === "ALL"
                ? "bg-slate-900 border-red-500/50 shadow-lg"
                : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Total Registrations</div>
            <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
          </button>

          <button
            onClick={() => setStatusFilter("PENDING_REVIEW")}
            className={`p-4 rounded-xl border text-left transition ${
              statusFilter === "PENDING_REVIEW"
                ? "bg-amber-950/30 border-amber-500 shadow-lg"
                : "bg-slate-900/60 border-slate-800 hover:border-amber-900/60"
            }`}
          >
            <div className="text-[11px] font-semibold text-amber-400 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3" /> Pending Review
            </div>
            <div className="text-2xl font-bold text-amber-300 mt-1">{stats.pending}</div>
          </button>

          <button
            onClick={() => setStatusFilter("APPROVED")}
            className={`p-4 rounded-xl border text-left transition ${
              statusFilter === "APPROVED"
                ? "bg-emerald-950/30 border-emerald-500 shadow-lg"
                : "bg-slate-900/60 border-slate-800 hover:border-emerald-900/60"
            }`}
          >
            <div className="text-[11px] font-semibold text-emerald-400 uppercase flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Approved
            </div>
            <div className="text-2xl font-bold text-emerald-300 mt-1">{stats.approved}</div>
          </button>

          <button
            onClick={() => setStatusFilter("CHANGES_REQUESTED")}
            className={`p-4 rounded-xl border text-left transition ${
              statusFilter === "CHANGES_REQUESTED"
                ? "bg-orange-950/30 border-orange-500 shadow-lg"
                : "bg-slate-900/60 border-slate-800 hover:border-orange-900/60"
            }`}
          >
            <div className="text-[11px] font-semibold text-orange-400 uppercase flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Changes Needed
            </div>
            <div className="text-2xl font-bold text-orange-300 mt-1">{stats.changesRequested}</div>
          </button>

          <button
            onClick={() => setStatusFilter("REJECTED")}
            className={`p-4 rounded-xl border text-left transition ${
              statusFilter === "REJECTED"
                ? "bg-red-950/30 border-red-500 shadow-lg"
                : "bg-slate-900/60 border-slate-800 hover:border-red-900/60"
            }`}
          >
            <div className="text-[11px] font-semibold text-red-400 uppercase flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Rejected
            </div>
            <div className="text-2xl font-bold text-red-300 mt-1">{stats.rejected}</div>
          </button>
        </div>

        {/* Search & Filters Row */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Kukkiwon ID, athlete name, or registration ref..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={academyFilter}
              onChange={(e) => setAcademyFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            >
              <option value="">All Academies</option>
              {academies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <select
              value={weightFilter}
              onChange={(e) => setWeightFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            >
              <option value="">All Weight Categories</option>
              {weightCategories.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
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
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Registrations Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Photo</th>
                  <th className="py-3.5 px-4">Kukkiwon ID</th>
                  <th className="py-3.5 px-4">Athlete Full Name</th>
                  <th className="py-3.5 px-4">Academy Affiliation</th>
                  <th className="py-3.5 px-4">Weight Category</th>
                  <th className="py-3.5 px-4">Submission Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading verification queue...
                    </td>
                  </tr>
                ) : registrations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No registrations found matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  registrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-800/30 transition">
                      {/* Photo Thumbnail */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setPhotoModalItem(reg)}
                          className="w-10 h-12 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 hover:border-red-500 transition relative group block shrink-0"
                          title="Click to view full-size photo"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/storage/${reg.photograph.storageKey}`}
                            alt={reg.athlete.fullName}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </div>
                        </button>
                      </td>

                      {/* Kukkiwon ID */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-white text-[12px] bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                          {reg.athlete.kukkiwonId}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{reg.registrationNumber}</div>
                      </td>

                      {/* Name & Dan */}
                      <td className="py-3 px-4 font-medium text-white">
                        <div>{reg.athlete.fullName}</div>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {reg.athlete.danOrPoom || "Registered"} &bull; {reg.athlete.gender}
                        </span>
                      </td>

                      {/* Academy */}
                      <td className="py-3 px-4 text-slate-300">
                        <div className="font-semibold text-white">{reg.academy.name}</div>
                        <div className="text-[11px] text-slate-400">{reg.academy.city}, {reg.academy.state}</div>
                      </td>

                      {/* Weight Category */}
                      <td className="py-3 px-4">
                        <span className="text-blue-400 font-semibold">{reg.weightCategory.name}</span>
                        <div className="text-[11px] text-slate-400">Division: {reg.weightCategory.division}</div>
                      </td>

                      {/* Submission Date */}
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(reg.createdAt).toLocaleDateString()}
                        <div className="text-[10px] text-slate-500">
                          {new Date(reg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        {reg.approvalStatus === "APPROVED" && (
                          <span className="inline-flex items-center gap-1 bg-emerald-950/70 border border-emerald-800 text-emerald-400 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                            <CheckCircle className="w-3 h-3" /> APPROVED
                          </span>
                        )}
                        {reg.approvalStatus === "PENDING_REVIEW" && (
                          <span className="inline-flex items-center gap-1 bg-amber-950/70 border border-amber-800 text-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                            <Clock className="w-3 h-3" /> PENDING
                          </span>
                        )}
                        {reg.approvalStatus === "CHANGES_REQUESTED" && (
                          <span className="inline-flex items-center gap-1 bg-orange-950/70 border border-orange-800 text-orange-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                            <AlertTriangle className="w-3 h-3" /> CHANGES
                          </span>
                        )}
                        {reg.approvalStatus === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 bg-red-950/70 border border-red-800 text-red-400 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                            <XCircle className="w-3 h-3" /> REJECTED
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => setViewItem(reg)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                            title="View Full Athlete Record"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {reg.approvalStatus !== "APPROVED" && (
                            <button
                              onClick={() => handleApprove(reg)}
                              disabled={actionInProgress}
                              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/50 rounded-lg transition"
                              title="Approve Registration"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}

                          {reg.approvalStatus === "PENDING_REVIEW" && (
                            <>
                              <button
                                onClick={() => setChangesModalItem(reg)}
                                disabled={actionInProgress}
                                className="p-1.5 text-orange-400 hover:text-orange-300 hover:bg-orange-950/50 rounded-lg transition"
                                title="Request Corrections"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setRejectModalItem(reg)}
                                disabled={actionInProgress}
                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded-lg transition"
                                title="Reject Application"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleEditOpen(reg)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                            title="Edit Athlete Info"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setReplacePhotoItem(reg);
                              setReplacementPreview(null);
                              setReplacementFile(null);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                            title="Replace Athlete Photograph"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* FULL-SIZE PHOTO MODAL */}
      {photoModalItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">{photoModalItem.athlete.fullName}</h3>
                <span className="text-[11px] font-mono text-slate-400">Kukkiwon: {photoModalItem.athlete.kukkiwonId}</span>
              </div>
              <button onClick={() => setPhotoModalItem(null)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <div className="w-full h-80 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/storage/${photoModalItem.photograph.storageKey}`}
                alt={photoModalItem.athlete.fullName}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-2">
              <span>File: {photoModalItem.photograph.fileName}</span>
              <span>{(photoModalItem.photograph.fileSizeBytes / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE INFORMATION MODAL */}
      {viewItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider">
                  Registration Dossier
                </span>
                <h3 className="text-xl font-bold text-white">{viewItem.athlete.fullName}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{viewItem.registrationNumber}</p>
              </div>
              <button onClick={() => setViewItem(null)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 items-center pb-4 border-b border-slate-800">
              <div className="w-28 h-36 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/storage/${viewItem.photograph.storageKey}`}
                  alt={viewItem.athlete.fullName}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 flex-1">
                <div className="text-sm font-bold text-white">{viewItem.athlete.fullName}</div>
                <div>Kukkiwon ID: <span className="font-mono font-bold text-white">{viewItem.athlete.kukkiwonId}</span></div>
                <div>Rank: <span className="text-slate-200">{viewItem.athlete.danOrPoom || "Registered"}</span></div>
                <div>Gender: <span className="text-slate-200">{viewItem.athlete.gender}</span></div>
                <div>Academy: <span className="text-white font-medium">{viewItem.academy.name} ({viewItem.academy.city})</span></div>
                <div>Weight Category: <span className="text-blue-400 font-semibold">{viewItem.weightCategory.name}</span></div>
              </div>
            </div>

            {viewItem.rejectionReason && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300">
                <span className="font-bold block">Rejection Reason:</span>
                &ldquo;{viewItem.rejectionReason}&rdquo;
              </div>
            )}

            {viewItem.notes && (
              <div className="p-3 bg-orange-950/40 border border-orange-800/60 rounded-xl text-xs text-orange-300">
                <span className="font-bold block">Correction Instructions / Notes:</span>
                &ldquo;{viewItem.notes}&rdquo;
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                Reject Registration
              </h3>
              <button onClick={() => setRejectModalItem(null)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Please enter an official reason for rejecting the registration of{" "}
              <span className="font-semibold text-white">{rejectModalItem.athlete.fullName}</span> (
              {rejectModalItem.athlete.kukkiwonId}). This reason will be recorded in the audit log and shown to the athlete.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Kukkiwon ID verification failed with HQ registry, or invalid photo background..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST CORRECTIONS MODAL */}
      {changesModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                Request Athlete Corrections
              </h3>
              <button onClick={() => setChangesModalItem(null)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Instruct <span className="font-semibold text-white">{changesModalItem.athlete.fullName}</span> on the changes required before approval. The athlete will be able to resubmit their application with the corrected information or photo.
            </p>

            <form onSubmit={handleChangesSubmit} className="space-y-4">
              <textarea
                required
                rows={3}
                value={changesNotes}
                onChange={(e) => setChangesNotes(e.target.value)}
                placeholder="e.g. Please upload a clear photo with white background and forward-facing alignment..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChangesModalItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold"
                >
                  Send Correction Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ATHLETE INFO MODAL */}
      {editModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                Edit Athlete Record
              </h3>
              <button onClick={() => setEditModalItem(null)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Kukkiwon ID (Immutable)</label>
                <input
                  type="text"
                  disabled
                  value={editModalItem.athlete.kukkiwonId}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Athlete Full Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Dan / Poom Rank</label>
                <select
                  value={editDanOrPoom}
                  onChange={(e) => setEditDanOrPoom(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                >
                  <option value="1st Dan">1st Dan</option>
                  <option value="2nd Dan">2nd Dan</option>
                  <option value="3rd Dan">3rd Dan</option>
                  <option value="4th Dan">4th Dan</option>
                  <option value="1st Poom">1st Poom</option>
                  <option value="2nd Poom">2nd Poom</option>
                  <option value="3rd Poom">3rd Poom</option>
                  <option value="1st Geup">1st Geup</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Affiliated Academy</label>
                <select
                  value={editAcademyId}
                  onChange={(e) => setEditAcademyId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                >
                  {academies.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Registered Weight Category</label>
                <select
                  value={editWeightCategoryId}
                  onChange={(e) => setEditWeightCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                >
                  {weightCategories.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
                >
                  Save Corrections
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPLACE PHOTO MODAL */}
      {replacePhotoItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-red-500" />
                Replace Athlete Photograph
              </h3>
              <button onClick={() => setReplacePhotoItem(null)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Replacing photo for <span className="font-semibold text-white">{replacePhotoItem.athlete.fullName}</span> (
              {replacePhotoItem.athlete.kukkiwonId}). The existing photo will be safely marked non-current in private storage.
            </p>

            <form onSubmit={handleReplacePhotoSubmit} className="space-y-4">
              <PhotoCropper
                onPhotoCropped={(file, preview) => {
                  setReplacementFile(file);
                  setReplacementPreview(preview);
                }}
                currentPreview={replacementPreview}
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplacePhotoItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress || !replacementFile}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold"
                >
                  Upload & Replace Photo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

