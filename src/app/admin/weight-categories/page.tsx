"use client";

import { useState, useEffect, useCallback } from "react";
import AdminNav from "@/components/AdminNav";
import { Scale, Plus, Edit2, CheckCircle, AlertCircle, Filter } from "lucide-react";

interface CategoryItem {
  id: string;
  code: string;
  name: string;
  division: "SENIOR" | "JUNIOR" | "CADET" | "SUB_CADET";
  gender: "MALE" | "FEMALE";
  minWeightKg?: number | null;
  maxWeightKg: number;
  isActive: boolean;
  _count: {
    registrations: number;
  };
}

export default function AdminWeightCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [divisionFilter, setDivisionFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDivision, setFormDivision] = useState<"SENIOR" | "JUNIOR" | "CADET" | "SUB_CADET">("SENIOR");
  const [formGender, setFormGender] = useState<"MALE" | "FEMALE">("MALE");
  const [formMinWeight, setFormMinWeight] = useState("");
  const [formMaxWeight, setFormMaxWeight] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (divisionFilter) params.set("division", divisionFilter);
      if (genderFilter) params.set("gender", genderFilter);

      const res = await fetch(`/api/admin/weight-categories?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to load categories.");

      setCategories(json.data.categories || []);
      setStats(json.data.stats || { total: 0, active: 0, inactive: 0 });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading categories.");
    } finally {
      setLoading(false);
    }
  }, [divisionFilter, genderFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormCode("");
    setFormName("");
    setFormDivision("SENIOR");
    setFormGender("MALE");
    setFormMinWeight("");
    setFormMaxWeight("");
    setFormActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (c: CategoryItem) => {
    setEditingId(c.id);
    setFormCode(c.code);
    setFormName(c.name);
    setFormDivision(c.division);
    setFormGender(c.gender);
    setFormMinWeight(c.minWeightKg ? String(c.minWeightKg) : "");
    setFormMaxWeight(String(c.maxWeightKg));
    setFormActive(c.isActive);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        code: formCode,
        name: formName,
        division: formDivision,
        gender: formGender,
        minWeightKg: formMinWeight ? parseFloat(formMinWeight) : null,
        maxWeightKg: parseFloat(formMaxWeight),
        isActive: formActive,
      };

      const url = editingId ? `/api/admin/weight-categories/${editingId}` : "/api/admin/weight-categories";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Operation failed.");

      setSuccessMsg(editingId ? "Category updated successfully." : "Category created successfully.");
      setModalOpen(false);
      fetchCategories();
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
              <Scale className="w-6 h-6 text-blue-600" />
              Weight Category Configuration
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Configure tournament weight classes, age divisions, and weight limits without modifying application code.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Weight Category
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
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Configured Categories</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Active Categories</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.active}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Disabled / Inactive</div>
            <div className="text-2xl font-extrabold text-slate-500 mt-1">{stats.inactive}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3 items-center shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-blue-600" /> Filter by:
          </div>

          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
          >
            <option value="">All Divisions</option>
            <option value="SENIOR">Senior Division</option>
            <option value="JUNIOR">Junior Division</option>
            <option value="CADET">Cadet Division</option>
            <option value="SUB_CADET">Sub Cadet Division</option>
          </select>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
          >
            <option value="">All Genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>

          {(divisionFilter || genderFilter) && (
            <button
              onClick={() => {
                setDivisionFilter("");
                setGenderFilter("");
              }}
              className="text-xs text-slate-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-slate-100 font-semibold"
            >
              Reset
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Category Name</th>
                <th className="py-3 px-4">Division</th>
                <th className="py-3 px-4">Gender</th>
                <th className="py-3 px-4">Weight Limits</th>
                <th className="py-3 px-4">Athletes</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Loading categories...</td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">No categories found.</td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{c.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700">
                        {c.division}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{c.gender}</td>
                    <td className="py-3 px-4 text-blue-600 font-semibold">
                      {c.maxWeightKg >= 999
                        ? `Over ${c.minWeightKg} kg`
                        : c.minWeightKg
                        ? `${c.minWeightKg} kg – ${c.maxWeightKg} kg`
                        : `Up to ${c.maxWeightKg} kg`}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{c._count.registrations}</td>
                    <td className="py-3 px-4">
                      {c.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 text-[11px] font-semibold bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                        title="Edit Category"
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
                <Scale className="w-4 h-4 text-blue-600" />
                {editingId ? "Edit Weight Category" : "Add Weight Category"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SR_M_U58 or JR_F_U49"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono uppercase focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category Display Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Senior Male Under 58kg (Flyweight)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Division <span className="text-red-500">*</span></label>
                  <select
                    value={formDivision}
                    onChange={(e) => setFormDivision(e.target.value as "SENIOR" | "JUNIOR" | "CADET" | "SUB_CADET")}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                  >
                    <option value="SENIOR">Senior</option>
                    <option value="JUNIOR">Junior</option>
                    <option value="CADET">Cadet</option>
                    <option value="SUB_CADET">Sub Cadet</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gender <span className="text-red-500">*</span></label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as "MALE" | "FEMALE")}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formMinWeight}
                    onChange={(e) => setFormMinWeight(e.target.value)}
                    placeholder="e.g. 54"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Weight (kg) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formMaxWeight}
                    onChange={(e) => setFormMaxWeight(e.target.value)}
                    placeholder="e.g. 58 (999 for Heavy)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="catActive"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="catActive" className="text-slate-700 font-semibold cursor-pointer">
                  Category is active for registrations
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
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
