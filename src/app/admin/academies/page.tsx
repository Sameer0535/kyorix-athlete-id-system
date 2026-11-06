"use client";

import { useState, useEffect, useCallback } from "react";
import AdminNav from "@/components/AdminNav";
import { Building, Plus, Search, Edit2, CheckCircle, Users, AlertCircle } from "lucide-react";

interface AcademyItem {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  contactPerson?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  isVerified: boolean;
  createdAt: string;
  _count: {
    athletes: number;
    registrations: number;
  };
}

export default function AdminAcademiesPage() {
  const [academies, setAcademies] = useState<AcademyItem[]>([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, unverified: 0, totalAthletes: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");
  const [formPerson, setFormPerson] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formVerified, setFormVerified] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAcademies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/academies?search=${encodeURIComponent(search.trim())}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to load academies.");

      setAcademies(json.data.academies || []);
      setStats(json.data.stats || { total: 0, verified: 0, unverified: 0, totalAthletes: 0 });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading academies.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchAcademies();
  }, [fetchAcademies]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormCode("");
    setFormName("");
    setFormCity("");
    setFormState("");
    setFormPerson("");
    setFormPhone("");
    setFormEmail("");
    setFormVerified(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (a: AcademyItem) => {
    setEditingId(a.id);
    setFormCode(a.code);
    setFormName(a.name);
    setFormCity(a.city);
    setFormState(a.state);
    setFormPerson(a.contactPerson || "");
    setFormPhone(a.contactPhone || "");
    setFormEmail(a.contactEmail || "");
    setFormVerified(a.isVerified);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formName,
        code: formCode || undefined,
        city: formCity,
        state: formState,
        contactPerson: formPerson || undefined,
        contactPhone: formPhone || undefined,
        contactEmail: formEmail || undefined,
        isVerified: formVerified,
      };

      const url = editingId ? `/api/admin/academies/${editingId}` : "/api/admin/academies";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Operation failed.");

      setSuccessMsg(editingId ? "Academy updated successfully." : "Academy created successfully.");
      setModalOpen(false);
      fetchAcademies();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-6 h-6 text-blue-600" />
              Martial Arts Academy Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage affiliated Taekwondo academies, dojang credentials, and athlete representations.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Academy
          </button>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              {successMsg}
            </span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-slate-900">✕</button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Academies</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Verified Dojangs</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.verified}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Unverified</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.unverified}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Affiliated Athletes</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalAthletes}</div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-3 shadow-sm">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by academy name, city, state, or code..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Academy Name</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Athletes</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading academies...</td>
                </tr>
              ) : academies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">No academies found.</td>
                </tr>
              ) : (
                academies.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{a.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{a.name}</td>
                    <td className="py-3 px-4 text-slate-700">{a.city}, {a.state}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{a.contactPerson || "—"}</div>
                      <div className="text-[10px] text-slate-400">{a.contactPhone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                        <Users className="w-3 h-3 text-blue-600" /> {a._count.athletes}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {a.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-600 text-[11px] font-semibold bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(a)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                        title="Edit Academy"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                {editingId ? "Edit Academy" : "Add New Academy"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Academy Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Lotus Taekwondo Academy"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="New Delhi"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    placeholder="Delhi"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Academy Code (Auto-generated if empty)</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="e.g. KYX-DEL-001"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono uppercase focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Master / Contact Person</label>
                <input
                  type="text"
                  value={formPerson}
                  onChange={(e) => setFormPerson(e.target.value)}
                  placeholder="Master Rajesh Sharma"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 9811002233"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="contact@academy.org"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="acadVerified"
                  checked={formVerified}
                  onChange={(e) => setFormVerified(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="acadVerified" className="text-slate-700 font-semibold cursor-pointer">
                  Mark as officially verified dojang
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Academy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
