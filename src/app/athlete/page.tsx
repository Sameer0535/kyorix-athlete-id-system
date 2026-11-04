import Link from "next/link";
import { UserPlus, Download, ArrowLeft, ShieldCheck, Award, Clock } from "lucide-react";

export default function AthletePortalHub() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-12 max-w-5xl mx-auto flex flex-col justify-between">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-8 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Main Portal
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span className="bg-blue-600 text-white font-extrabold text-xs px-2.5 py-1 rounded tracking-wider uppercase">
            Portal 2
          </span>
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Athlete Self-Service
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          Athlete Registration & Credential Portal
        </h1>
        <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
          Welcome to the Kyorix Athlete Portal. Register with your Kukkiwon ID, upload and position your photograph, monitor approval status in real-time, and retrieve your official approved credential.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          {/* Card 1: Register */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-blue-500/50 transition shadow-lg">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                <UserPlus className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">1. New Registration</h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Submit your Kukkiwon ID, full name, academy, registered weight class, and portrait photo with interactive crop & position.
              </p>
            </div>
            <Link
              href="/athlete/register"
              className="w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition shadow-md shadow-blue-950/40"
            >
              Start Registration &rarr;
            </Link>
          </div>

          {/* Card 2: Status & Resubmissions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-orange-500/50 transition shadow-lg">
            <div>
              <div className="w-12 h-12 rounded-xl bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">2. Check Status</h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Check whether your submission is pending, approved, or needs photo/information corrections requested by administrators.
              </p>
            </div>
            <Link
              href="/athlete/status"
              className="w-full text-center bg-orange-600 hover:bg-orange-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition shadow-md shadow-orange-950/40"
            >
              Check Status & Resubmit &rarr;
            </Link>
          </div>

          {/* Card 3: Download Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/50 transition shadow-lg">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <Download className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">3. Download ID Card</h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Already approved by tournament administrators? Download your official authorized physical or digital Athlete ID card.
              </p>
            </div>
            <Link
              href="/athlete/card"
              className="w-full text-center bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition shadow-md shadow-emerald-950/40"
            >
              Download ID Card &rarr;
            </Link>
          </div>
        </div>
      </div>

      <div className="pt-8 mt-12 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Private Biometric Photo Storage Protected</span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-slate-400" />
          <span>Kukkiwon Taekwondo Credentials</span>
        </div>
      </div>
    </div>
  );
}
