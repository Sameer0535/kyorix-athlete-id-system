import Link from "next/link";
import { ShieldCheck, UserCheck, CreditCard, Award, Database, FileCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-6 sm:p-12 max-w-6xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-red-600 text-white font-extrabold text-sm px-2.5 py-1 rounded tracking-wider uppercase">
              Kyorix
            </span>
            <span className="text-slate-400 text-sm font-semibold tracking-wide uppercase">
              Sports Technology
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mt-2 text-white tracking-tight">
            Athlete ID Card Generation System
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-1">
            Enterprise credential management platform with unified dual portals and centralized PostgreSQL store.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/80 px-3.5 py-1.5 rounded-full text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Phase 1 Foundation Live
        </div>
      </header>

      {/* Portal Selection Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
        {/* Portal 1: Admin Portal */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 flex flex-col justify-between hover:border-red-600/60 transition-all duration-200 shadow-xl shadow-black/40">
          <div>
            <div className="w-12 h-12 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
              Portal 1
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Admin Portal
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Administrative portal for verifying athlete registrations, reviewing biometric photographs, approving applications, and generating official ID cards individually or in bulk.
            </p>

            <ul className="space-y-2.5 text-xs text-slate-300 mb-8 border-t border-slate-800/80 pt-4">
              <li className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-red-400" />
                <span>Registration review & approval workflow</span>
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-red-400" />
                <span>Individual and bulk card rendering & download</span>
              </li>
              <li className="flex items-center gap-2">
                <Database className="w-4 h-4 text-red-400" />
                <span>Strict Kukkiwon ID duplicate prevention</span>
              </li>
            </ul>
          </div>

          <Link
            href="/admin/login"
            className="w-full text-center bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-6 rounded-xl transition duration-150 shadow-lg shadow-red-950/50"
          >
            Access Admin Portal &rarr;
          </Link>
        </div>

        {/* Portal 2: Athlete Registration Website */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 flex flex-col justify-between hover:border-blue-600/60 transition-all duration-200 shadow-xl shadow-black/40">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
              Portal 2
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Athlete Registration Website
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Public athlete-facing portal to register with Kukkiwon ID, upload official athlete photograph, select academy and weight category, track approval status, and download approved ID cards.
            </p>

            <ul className="space-y-2.5 text-xs text-slate-300 mb-8 border-t border-slate-800/80 pt-4">
              <li className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-400" />
                <span>Kukkiwon ID & weight division enrollment</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Private photo storage (Zero public exposure)</span>
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span>Post-approval athlete self-service download</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/athlete/register"
              className="text-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl transition duration-150 shadow-lg shadow-blue-950/50 text-sm"
            >
              Register Athlete
            </Link>
            <Link
              href="/athlete/card"
              className="text-center bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl transition duration-150 border border-slate-700 text-sm"
            >
              Download ID Card
            </Link>
          </div>
        </div>
      </section>

      {/* Core Architectural Guarantees */}
      <footer className="pt-8 border-t border-slate-800/80 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          &copy; {new Date().getFullYear()} Kyorix Sports Technology. All rights reserved.
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Centralized PostgreSQL DB</span>
          <span>&bull;</span>
          <span>Isolated Architecture</span>
          <span>&bull;</span>
          <span>No QR Codes Required</span>
        </div>
      </footer>
    </main>
  );
}

