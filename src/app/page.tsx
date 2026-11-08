import Link from "next/link";
import Image from "next/image";
import { UserCheck, CreditCard, Award, ShieldCheck, ArrowRight, Lock } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between">
      {/* Top Header */}
      <header className="w-full border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/kyorix-logo.png"
              alt="Kyorix Sport Technology"
              width={260}
              height={75}
              className="h-14 sm:h-16 w-auto object-contain"
              priority
            />
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/athlete/status"
              className="hidden sm:inline-block text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 transition px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Check Status
            </Link>
            <Link
              href="/athlete/card"
              className="hidden sm:inline-block text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 transition px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Download Card
            </Link>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition px-3.5 py-2 rounded-xl"
            >
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Admin Portal</span>
            </Link>
            <Link
              href="/athlete/register"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2.5 rounded-xl shadow-xs transition shadow-blue-500/20"
            >
              Register Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-16 w-full">
        <div className="text-center max-w-3xl mx-auto mb-14">
          {/* Big Company Logo In Hero */}
          <div className="flex justify-center mb-6">
            <Image
              src="/images/kyorix-logo.png"
              alt="Kyorix Sport Technology"
              width={380}
              height={110}
              className="h-20 sm:h-24 w-auto object-contain drop-shadow-xs"
              priority
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-4">
            <Award className="w-3.5 h-3.5 text-blue-600" />
            Open International Championship 2026
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight">
            Official Championship <span className="text-blue-600">ID Card Accreditation</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Register your athlete credentials, select your official championship role, and download your accredited ID card. Powered by Kyorix Sports Technology.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/athlete/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl shadow-md shadow-blue-600/20 transition-all text-base"
            >
              <UserCheck className="w-5 h-5" />
              New Registration
            </Link>
            <Link
              href="/athlete/card"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-bold py-3.5 px-8 rounded-xl border border-slate-300 shadow-xs transition text-base"
            >
              <CreditCard className="w-5 h-5 text-blue-600" />
              Download Your ID Card
            </Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-400 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">Verified Athlete Identity</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Automatic validation prevents duplicate athlete identification numbers and verifies academy affiliations across all 16 Olympic weight divisions.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-400 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">4 Official Roles</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Accreditation categories tailored for Participants, Referees, Coaches, and Organising Staff with print-ready high fidelity.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-400 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">Instant Self-Service Access</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Approved participants can check their status anytime and download their high-resolution official ID card.
            </p>
          </div>
        </div>

        {/* Steps to Receive Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 sm:p-10 mb-10">
          <div className="max-w-2xl mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Simple Process</span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">How to Get Your Accreditation Card</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                1
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Fill Registration Details</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Enter your Athlete ID, full name, academy, registered weight category, and upload a clear portrait photo.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                2
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Choose Card Template</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Pick your role among Participant, Referee, Coach, or Staff. Your selection is securely saved.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                3
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Download Your Card</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Upon verification by the organising committee, download your official print-ready accreditation PDF.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Clean White & Blue Footer */}
      <footer className="border-t border-slate-100 bg-white py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <Image
              src="/images/kyorix-logo.png"
              alt="Kyorix Logo"
              width={110}
              height={32}
              className="h-7 w-auto object-contain opacity-90"
            />
            <span>&copy; {new Date().getFullYear()} Kyorix Sports Technology. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/athlete/register" className="hover:text-blue-600 transition">
              Registration
            </Link>
            <Link href="/athlete/status" className="hover:text-blue-600 transition">
              Status Check
            </Link>
            <Link href="/athlete/card" className="hover:text-blue-600 transition">
              Download Card
            </Link>
            <Link href="/admin/login" className="hover:text-blue-600 transition font-semibold text-slate-700 flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-500" />
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
