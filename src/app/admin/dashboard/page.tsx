import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminNav from "@/components/AdminNav";
import {
  ShieldCheck,
  Users,
  FileCheck,
  CreditCard,
  Layers,
  ArrowRight,
  Clock,
  AlertTriangle,
  Building,
  Scale,
  CheckCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // Query live counts from PostgreSQL
  const [
    athleteCount,
    academyCount,
    registrationCount,
    pendingApprovals,
    approvedCount,
    rejectedCount,
    changesRequestedCount,
    idCardCount,
    weightCategoryCount,
    recentRegistrations,
  ] = await Promise.all([
    prisma.athlete.count(),
    prisma.academy.count(),
    prisma.registration.count(),
    prisma.registration.count({ where: { approvalStatus: "PENDING_REVIEW" } }),
    prisma.registration.count({ where: { approvalStatus: "APPROVED" } }),
    prisma.registration.count({ where: { approvalStatus: "REJECTED" } }),
    prisma.registration.count({ where: { approvalStatus: "CHANGES_REQUESTED" } }),
    prisma.idCardRecord.count(),
    prisma.weightCategory.count(),
    prisma.registration.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        athlete: true,
        academy: true,
        weightCategory: true,
        photograph: true,
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                Phase 2 Verification Console
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-red-500" />
              Athlete Credential Management Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Review athlete registrations, approve biometric photographs, manage academies, and monitor tournament verification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/registrations"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition shadow-lg shadow-red-950/40"
            >
              <FileCheck className="w-4 h-4" />
              Open Verification Queue ({pendingApprovals})
            </Link>
          </div>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/admin/registrations?status=PENDING_REVIEW"
            className="bg-slate-900/90 border border-amber-900/50 hover:border-amber-500/60 rounded-2xl p-5 shadow-lg transition"
          >
            <div className="flex items-center justify-between text-amber-400 mb-2">
              <span className="text-xs font-semibold uppercase">Pending Verification</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-3xl font-extrabold text-amber-300">{pendingApprovals}</div>
            <div className="text-[11px] text-slate-400 mt-1">Awaiting credential review</div>
          </Link>

          <Link
            href="/admin/registrations?status=APPROVED"
            className="bg-slate-900/90 border border-emerald-900/50 hover:border-emerald-500/60 rounded-2xl p-5 shadow-lg transition"
          >
            <div className="flex items-center justify-between text-emerald-400 mb-2">
              <span className="text-xs font-semibold uppercase">Approved Athletes</span>
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-300">{approvedCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Ready for card issuance</div>
          </Link>

          <Link
            href="/admin/registrations?status=CHANGES_REQUESTED"
            className="bg-slate-900/90 border border-orange-900/50 hover:border-orange-500/60 rounded-2xl p-5 shadow-lg transition"
          >
            <div className="flex items-center justify-between text-orange-400 mb-2">
              <span className="text-xs font-semibold uppercase">Changes Needed</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-3xl font-extrabold text-orange-300">{changesRequestedCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Corrections with athlete</div>
          </Link>

          <Link
            href="/admin/registrations"
            className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase">Total Registered</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">{registrationCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Across all academies</div>
          </Link>
        </div>

        {/* Quick Management Tools */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/registrations"
            className="bg-slate-900/60 border border-slate-800 hover:border-red-500/50 p-6 rounded-2xl transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-red-400 transition">
                Registration Verification Queue
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Review athlete photographs, approve credentials, reject invalid entries, or request photo/data corrections.
              </p>
            </div>
            <span className="text-xs font-semibold text-red-400 inline-flex items-center gap-1 mt-4">
              Open Queue &rarr;
            </span>
          </Link>

          <Link
            href="/admin/academies"
            className="bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 p-6 rounded-2xl transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition">
                Academy Management ({academyCount})
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Add and verify martial arts academies, edit dojang details, and associate athletes to prevent duplicate academies.
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-400 inline-flex items-center gap-1 mt-4">
              Manage Academies &rarr;
            </span>
          </Link>

          <Link
            href="/admin/weight-categories"
            className="bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 p-6 rounded-2xl transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition">
                Weight Categories ({weightCategoryCount})
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Configure tournament weight divisions, weight thresholds, and age classes dynamically without code changes.
              </p>
            </div>
            <span className="text-xs font-semibold text-purple-400 inline-flex items-center gap-1 mt-4">
              Configure Classes &rarr;
            </span>
          </Link>
        </div>

        {/* Recent Registrations Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Recent Athlete Submissions
            </h3>
            <Link
              href="/admin/registrations"
              className="text-xs text-slate-400 hover:text-white font-medium inline-flex items-center gap-1"
            >
              <span>View all registrations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                  <th className="py-2.5 px-3">Athlete</th>
                  <th className="py-2.5 px-3">Kukkiwon ID</th>
                  <th className="py-2.5 px-3">Academy</th>
                  <th className="py-2.5 px-3">Weight Class</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No registrations in database yet.
                    </td>
                  </tr>
                ) : (
                  recentRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-3 font-semibold text-white">{reg.athlete.fullName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{reg.athlete.kukkiwonId}</td>
                      <td className="py-2.5 px-3 text-slate-400">{reg.academy.name}</td>
                      <td className="py-2.5 px-3 text-blue-400">{reg.weightCategory.name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          reg.approvalStatus === "APPROVED"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : reg.approvalStatus === "PENDING_REVIEW"
                            ? "bg-amber-950 text-amber-300 border border-amber-800"
                            : reg.approvalStatus === "CHANGES_REQUESTED"
                            ? "bg-orange-950 text-orange-300 border border-orange-800"
                            : "bg-red-950 text-red-400 border border-red-800"
                        }`}>
                          {reg.approvalStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href="/admin/registrations"
                          className="text-xs text-red-400 hover:text-red-300 font-semibold"
                        >
                          Review &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
