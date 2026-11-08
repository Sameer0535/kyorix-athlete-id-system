"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import {
  Users,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  Check,
  Edit2,
  Camera,
  Eye,
  X,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import PhotoCropper from "@/components/PhotoCropper";

interface RegistrationItem {
  id: string;
  registrationNumber: string;
  approvalStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  cardRole?: string;
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

const ROLE_BADGES: Record<string, string> = {
  PARTICIPANT: "bg-blue-50 text-blue-700 border-blue-200",
  REFEREE: "bg-sky-50 text-sky-700 border-sky-200",
  COACH: "bg-red-50 text-red-700 border-red-200",
  STAFF: "bg-amber-50 text-amber-700 border-amber-200",
};

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
      setStats(
        json.data.stats || {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          changesRequested: 0,
        }
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching registrations.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, academyFilter, weightFilter]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleApprove = async (item: RegistrationItem) => {
    if (!confirm(`Are you sure you want to APPROVE ${item.athlete.fullName} (${item.athlete.kukkiwonId})?`)) return;

    setActionInProgress(true);
    try {
      const res = await fetch(`/api/admin/registrations/${item.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Approval failed.");

      setActionSuccessMsg(`Athlete ${item.athlete.fullName} approved.`);
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
        body: JSON.stringify({ action: "REJECT", reason: rejectReason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Rejection failed.");

      setActionSuccessMsg(`Athlete ${rejectModalItem.athlete.fullName} rejected.`);
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
        body: JSON.stringify({ action: "REQUEST_CHANGES", notes: changesNotes }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Request changes failed.");

      setActionSuccessMsg(`Correction request sent to ${changesModalItem.athlete.fullName}.`);
      setChangesModalItem(null);
      setChangesNotes("");
      fetchRegistrations();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Request changes failed.");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleEditOpen = (item: RegistrationItem) => {
    setEditModalItem(item);
    setEditFullName(item.athlete.fullName);
    setEditDanOrPoom(item.athlete.danOrPoom || "1st Dan");
    setEditAcademyId(item.academy.id);
    setEditWeightCategoryId(item.weightCategory.id);
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
          fullName: editFullName,
          danOrPoom: editDanOrPoom,
          academyId: editAcademyId,
          weightCategoryId: editWeightCategoryId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Edit failed.");

      setActionSuccessMsg(`Athlete ${editFullName} updated.`);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Registration Verification & Approvals
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Verify biometric athlete photographs, validate athlete credentials, and manage ID card issuance.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/athlete/register?from=admin"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm shadow-blue-500/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add New Player</span>
            </Link>

            <button
              onClick={() => fetchRegistrations()}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-300 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
              Refresh Queue
            </button>
          </div>
        </div>

        {actionSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              {actionSuccessMsg}
            </span>
            <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-slate-900">
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
                ? "bg-white border-blue-500 shadow-md ring-1 ring-blue-500"
                : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
            }`}
          >
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Submissions</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
          </button>

          <button
            onClick={() => setStatusFilter("PENDING_REVIEW")}
            className={`p-4 rounded-xl border text-left transition ${
              statusFilter === "PENDING_REVIEW"
                ? "bg-amber-50/50 border-amber-500 shadow-md ring-1 ring-amber-500"
                : "bg-white border-slate-200 hover:border-amber-300 shadow-sm"
            }`}
          >
            <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" /> Pending Review
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.pending}</div>
          </button>

          <button
            onClick={() => setStatusFilter("APPROVED")}
            className={`p-4 rounded-xl border text-left transition ${
              statusFilter === "APPROVED"
                ? "bg-emerald-50/50 border-emerald-500 shadow-md ring-1 ring-emerald-500"
                : "bg-white border-slate-200 hover:border-emerald-300 shadow-sm"
            }`}
          >
            <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Approved
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.approved}</div>
          </button>

          <button
            onClick={() => setStatusFilter("CHANGES_REQUESTED")}
            className={`p-4 rounded-xl border text-left transition ${
              statusFilter === "CHANGES_REQUESTED"
                ? "bg-blue-50/50 border-blue-500 shadow-md ring-1 ring-blue-500"
                : "bg-white border-slate-200 hover:border-blue-300 shadow-sm"
            }`}
          >
            <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Changes Needed
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.changesRequested}</div>
          </button>

          <button
            onClick={() => setStatusFilter("REJECTED")}
            className={`p-4 rounded-xl border text-left transition ${
              statusFilter === "REJECTED"
                ? "bg-red-50/50 border-red-500 shadow-md ring-1 ring-red-500"
                : "bg-white border-slate-200 hover:border-red-300 shadow-sm"
            }`}
          >
            <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Rejected
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.rejected}</div>
          </button>
        </div>

        {/* Search & Filters Row */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-3 shadow-sm">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Kukkiwon ID, athlete name, or registration number..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={academyFilter}
              onChange={(e) => setAcademyFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
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
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
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
                className="text-xs text-slate-600 hover:text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition font-semibold"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Registrations Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Photo</th>
                  <th className="py-3 px-4">Kukkiwon ID</th>
                  <th className="py-3 px-4">Athlete Full Name</th>
                  <th className="py-3 px-4">Card Role</th>
                  <th className="py-3 px-4">Academy Affiliation</th>
                  <th className="py-3 px-4">Weight Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
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
                  registrations.map((reg) => {
                    const roleKey = (reg.cardRole || "PARTICIPANT").toUpperCase();
                    const badgeClass = ROLE_BADGES[roleKey] || ROLE_BADGES.PARTICIPANT;

                    return (
                      <tr key={reg.id} className="hover:bg-slate-50/80 transition">
                        {/* Photo Thumbnail */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => setPhotoModalItem(reg)}
                            className="w-10 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:border-blue-500 transition relative group block shrink-0 shadow-sm"
                            title="Click to view full-size photo"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/api/storage/${reg.photograph.storageKey}`}
                              alt={reg.athlete.fullName}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-blue-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </button>
                        </td>

                        {/* Kukkiwon ID */}
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900 text-[12px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                            {reg.athlete.kukkiwonId}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{reg.registrationNumber}</div>
                        </td>

                        {/* Name & Dan */}
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div>{reg.athlete.fullName}</div>
                          <span className="text-[11px] text-slate-500 font-normal">
                            {reg.athlete.danOrPoom || "Registered"} &bull; {reg.athlete.gender}
                          </span>
                        </td>

                        {/* Role Badge */}
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${badgeClass}`}>
                            {roleKey}
                          </span>
                        </td>

                        {/* Academy */}
                        <td className="py-3 px-4 text-slate-700">
                          <div className="font-semibold text-slate-900">{reg.academy.name}</div>
                          <div className="text-[11px] text-slate-500">{reg.academy.city}, {reg.academy.state}</div>
                        </td>

                        {/* Weight Category */}
                        <td className="py-3 px-4">
                          <span className="text-blue-600 font-semibold">{reg.weightCategory.name}</span>
                          <div className="text-[11px] text-slate-500">Div: {reg.weightCategory.division}</div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4">
                          {reg.approvalStatus === "APPROVED" && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              <CheckCircle className="w-3 h-3" /> APPROVED
                            </span>
                          )}
                          {reg.approvalStatus === "PENDING_REVIEW" && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              <Clock className="w-3 h-3" /> PENDING
                            </span>
                          )}
                          {reg.approvalStatus === "CHANGES_REQUESTED" && (
                            <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3" /> CHANGES
                            </span>
                          )}
                          {reg.approvalStatus === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              <XCircle className="w-3 h-3" /> REJECTED
                            </span>
                          )}
                        </td>

                        {/* Action buttons */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => setViewItem(reg)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                              title="View Full Athlete Record"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {reg.approvalStatus !== "APPROVED" && (
                              <button
                                onClick={() => handleApprove(reg)}
                                disabled={actionInProgress}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
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
                                  className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                  title="Request Corrections"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => setRejectModalItem(reg)}
                                  disabled={actionInProgress}
                                  className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                  title="Reject Application"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => handleEditOpen(reg)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
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
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                              title="Replace Athlete Photograph"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
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
      </main>

      {/* FULL-SIZE PHOTO MODAL */}
      {photoModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{photoModalItem.athlete.fullName}</h3>
                <span className="text-[11px] font-mono text-slate-500">Kukkiwon ID: {photoModalItem.athlete.kukkiwonId}</span>
              </div>
              <button onClick={() => setPhotoModalItem(null)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <div className="w-full h-80 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/storage/${photoModalItem.photograph.storageKey}`}
                alt={photoModalItem.athlete.fullName}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2">
              <span>File: {photoModalItem.photograph.fileName}</span>
              <span>{(photoModalItem.photograph.fileSizeBytes / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE INFORMATION MODAL */}
      {viewItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  Registration Dossier
                </span>
                <h3 className="text-xl font-bold text-slate-900">{viewItem.athlete.fullName}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{viewItem.registrationNumber}</p>
              </div>
              <button onClick={() => setViewItem(null)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 items-center pb-4 border-b border-slate-100">
              <div className="w-28 h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/storage/${viewItem.photograph.storageKey}`}
                  alt={viewItem.athlete.fullName}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1.5 text-xs text-slate-700 flex-1">
                <div className="text-sm font-bold text-slate-900">{viewItem.athlete.fullName}</div>
                <div>Kukkiwon ID: <span className="font-mono font-bold text-blue-600">{viewItem.athlete.kukkiwonId}</span></div>
                <div>Card Role: <span className="font-bold text-slate-800">{viewItem.cardRole || "PARTICIPANT"}</span></div>
                <div>Rank: <span className="text-slate-700">{viewItem.athlete.danOrPoom || "Registered"}</span></div>
                <div>Gender: <span className="text-slate-700">{viewItem.athlete.gender}</span></div>
                <div>Academy: <span className="text-slate-900 font-medium">{viewItem.academy.name} ({viewItem.academy.city})</span></div>
                <div>Weight Category: <span className="text-blue-600 font-semibold">{viewItem.weightCategory.name}</span></div>
              </div>
            </div>

            {viewItem.rejectionReason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                <span className="font-bold block">Rejection Reason:</span>
                &ldquo;{viewItem.rejectionReason}&rdquo;
              </div>
            )}

            {viewItem.notes && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                <span className="font-bold block">Correction Instructions / Notes:</span>
                &ldquo;{viewItem.notes}&rdquo;
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Reject Registration
              </h3>
              <button onClick={() => setRejectModalItem(null)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Please enter an official reason for rejecting the registration of{" "}
              <span className="font-semibold text-slate-900">{rejectModalItem.athlete.fullName}</span> (
              {rejectModalItem.athlete.kukkiwonId}).
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Athlete credential verification failed with registry, or invalid photo background..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Request Athlete Corrections
              </h3>
              <button onClick={() => setChangesModalItem(null)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Instruct <span className="font-semibold text-slate-900">{changesModalItem.athlete.fullName}</span> on the changes required before approval.
            </p>

            <form onSubmit={handleChangesSubmit} className="space-y-4">
              <textarea
                required
                rows={3}
                value={changesNotes}
                onChange={(e) => setChangesNotes(e.target.value)}
                placeholder="e.g. Please upload a clear photo with white background and forward-facing alignment..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChangesModalItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                Edit Athlete Record
              </h3>
              <button onClick={() => setEditModalItem(null)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kukkiwon ID (Immutable)</label>
                <input
                  type="text"
                  disabled
                  value={editModalItem.athlete.kukkiwonId}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Athlete Full Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dan / Poom Rank</label>
                <select
                  value={editDanOrPoom}
                  onChange={(e) => setEditDanOrPoom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
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
                <label className="block font-semibold text-slate-700 mb-1">Affiliated Academy</label>
                <select
                  value={editAcademyId}
                  onChange={(e) => setEditAcademyId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                >
                  {academies.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Registered Weight Category</label>
                <select
                  value={editWeightCategoryId}
                  onChange={(e) => setEditWeightCategoryId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-600" />
                Replace Athlete Photograph
              </h3>
              <button onClick={() => setReplacePhotoItem(null)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Replacing photo for <span className="font-semibold text-slate-900">{replacePhotoItem.athlete.fullName}</span> (
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress || !replacementFile}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm"
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
