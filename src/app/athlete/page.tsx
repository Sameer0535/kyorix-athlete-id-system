import Link from "next/link";
import Image from "next/image";
import { UserPlus, Download, ArrowLeft, ShieldCheck, Award, Clock } from "lucide-react";

export default function AthletePortalHub() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 sm:p-12 max-w-5xl mx-auto flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Main Portal
          </Link>
          <div className="flex items-center gap-2">
            <Image
              src="/images/kyorix-logo.png"
              alt="Kyorix Sports Technology"
              width={240}
              height={70}
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <span className="bg-blue-600 text-white font-extrabold text-xs px-2.5 py-1 rounded tracking-wider uppercase">
            Athlete Hub
          </span>
          <span className="text-blue-700 text-xs font-semibold uppercase tracking-wider">
            Self-Service Portal
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
          Athlete Registration & Credential Portal
        </h1>
        <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
          Welcome to the official Kukkiwon Cup 2026 accreditation system powered by Kyorix Sports Technology. Register your details, select your badge type, track verification status, and retrieve your official credential.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          {/* Card 1: Register */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-blue-500 hover:shadow-xl transition-all shadow-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4">
                <UserPlus className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">1. New Registration</h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Submit your Kukkiwon ID, full name, academy, registered weight class, select from 4 official card roles, and upload your portrait photo.
              </p>
            </div>
            <Link
              href="/athlete/register"
              className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition shadow-md shadow-blue-600/20"
            >
              Start Registration &rarr;
            </Link>
          </div>

          {/* Card 2: Status & Resubmissions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-amber-500 hover:shadow-xl transition-all shadow-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">2. Check Status</h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Check whether your submission is pending, approved, or needs photo/information corrections requested by tournament administrators.
              </p>
            </div>
            <Link
              href="/athlete/status"
              className="w-full text-center bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition shadow-md shadow-amber-600/20"
            >
              Check Status & Resubmit &rarr;
            </Link>
          </div>

          {/* Card 3: Download Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500 hover:shadow-xl transition-all shadow-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4">
                <Download className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">3. Download ID Card</h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Already approved by tournament administrators? Download your official authorized high-resolution ID card matching your chosen badge template.
              </p>
            </div>
            <Link
              href="/athlete/card"
              className="w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition shadow-md shadow-emerald-600/20"
            >
              Download ID Card &rarr;
            </Link>
          </div>
        </div>
      </div>

      <div className="pt-8 mt-12 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Private Biometric Photo Storage Protected</span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Kukkiwon Taekwondo Championship Credentials</span>
        </div>
      </div>
    </div>
  );
}
