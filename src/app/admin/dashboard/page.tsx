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
      take: 6,
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Administration Console
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-blue-600" />
              Athlete Credential Management Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Review athlete registrations, verify biometric photographs, approve ID card badges, and configure championship categories.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/registrations"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition shadow-md shadow-blue-600/20"
            >
              <FileCheck className="w-4 h-4" />
              Verification Queue ({pendingApprovals})
            </Link>
            <Link
              href="/admin/id-cards"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 transition"
            >
              <CreditCard className="w-4 h-4 text-blue-600" />
              ID Card Engine
            </Link>
          </div>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/admin/registrations?status=PENDING_REVIEW"
            className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between text-amber-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Pending Review</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{pendingApprovals}</div>
            <div className="text-[11px] text-slate-500 mt-1">Awaiting credential review</div>
          </Link>

          <Link
            href="/admin/registrations?status=APPROVED"
            className="bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Approved Athletes</span>
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{approvedCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Ready for card issuance</div>
          </Link>

          <Link
            href="/admin/registrations?status=CHANGES_REQUESTED"
            className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between text-blue-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Changes Needed</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{changesRequestedCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Corrections with athlete</div>
          </Link>

          <Link
            href="/admin/registrations"
            className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Submissions</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{registrationCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Across all academies</div>
          </Link>
        </div>

        {/* Quick Management Tools */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/registrations"
            className="bg-white border border-slate-200 hover:border-blue-500 p-6 rounded-2xl transition shadow-sm hover:shadow-md flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                Registration Verification Queue
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Review athlete photographs, approve credentials, reject invalid entries, or request photo/data corrections.
              </p>
            </div>
            <span className="text-xs font-bold text-blue-600 inline-flex items-center gap-1 mt-4">
              Open Queue &rarr;
            </span>
          </Link>

          <Link
            href="/admin/academies"
            className="bg-white border border-slate-200 hover:border-blue-500 p-6 rounded-2xl transition shadow-sm hover:shadow-md flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-4">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                Academy Management ({academyCount})
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Add and verify martial arts academies, edit dojang details, and associate athletes to prevent duplicate academies.
              </p>
            </div>
            <span className="text-xs font-bold text-blue-600 inline-flex items-center gap-1 mt-4">
              Manage Academies &rarr;
            </span>
          </Link>

          <Link
            href="/admin/weight-categories"
            className="bg-white border border-slate-200 hover:border-blue-500 p-6 rounded-2xl transition shadow-sm hover:shadow-md flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-4">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                Weight Categories ({weightCategoryCount})
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Configure tournament weight divisions, weight thresholds, and age classes dynamically without code changes.
              </p>
            </div>
            <span className="text-xs font-bold text-blue-600 inline-flex items-center gap-1 mt-4">
              Configure Classes &rarr;
            </span>
          </Link>
        </div>

        {/* Recent Registrations Table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Recent Athlete Submissions
            </h3>
            <Link
              href="/admin/registrations"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
            >
              <span>View all registrations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase bg-slate-50">
                  <th className="py-2.5 px-3 font-bold">Athlete</th>
                  <th className="py-2.5 px-3 font-bold">Kukkiwon ID</th>
                  <th className="py-2.5 px-3 font-bold">Academy</th>
                  <th className="py-2.5 px-3 font-bold">Role / Weight</th>
                  <th className="py-2.5 px-3 font-bold">Status</th>
                  <th className="py-2.5 px-3 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No registrations in database yet.
                    </td>
                  </tr>
                ) : (
                  recentRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-bold text-slate-900">{reg.athlete.fullName}</td>
                      <td className="py-3 px-3 font-mono text-slate-700 font-semibold">{reg.athlete.kukkiwonId}</td>
                      <td className="py-3 px-3 text-slate-600">{reg.academy.name}</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-blue-700">{reg.cardRole || "PARTICIPANT"}</span>
                        <span className="text-[11px] text-slate-500 block">{reg.weightCategory.name}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          reg.approvalStatus === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : reg.approvalStatus === "PENDING_REVIEW"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : reg.approvalStatus === "CHANGES_REQUESTED"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {reg.approvalStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href="/admin/registrations"
                          className="text-xs text-blue-600 hover:text-blue-800 font-bold"
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
