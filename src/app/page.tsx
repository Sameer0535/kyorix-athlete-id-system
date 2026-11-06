import Link from "next/link";
import Image from "next/image";
import { UserCheck, CreditCard, Award, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

export default function HomePage() {
  const templates = [
    {
      role: "PARTICIPANT",
      title: "Championship Participant",
      color: "from-blue-600 to-indigo-800",
      border: "border-blue-200",
      badgeBg: "bg-blue-50 text-blue-700",
      description: "Official accreditation badge for athletes competing in Open International Kukkiwon Cup 2026.",
      previewImg: "/templates/template-participant.jpg",
    },
    {
      role: "REFEREE",
      title: "Official Referee / Judge",
      color: "from-cyan-500 to-blue-700",
      border: "border-cyan-200",
      badgeBg: "bg-cyan-50 text-cyan-700",
      description: "Accreditation badge for certified international and national referees and ring officials.",
      previewImg: "/templates/template-referee.jpg",
    },
    {
      role: "COACH",
      title: "Team Coach / Master",
      color: "from-red-600 to-slate-900",
      border: "border-red-200",
      badgeBg: "bg-red-50 text-red-700",
      description: "Official team coach pass granting floor and corner access for recognized academy masters.",
      previewImg: "/templates/template-coach.jpg",
    },
    {
      role: "STAFF",
      title: "Organising Staff",
      color: "from-blue-700 to-amber-600",
      border: "border-amber-200",
      badgeBg: "bg-amber-50 text-amber-800",
      description: "Accreditation pass for operational personnel, medical crew, and committee coordinators.",
      previewImg: "/templates/template-staff.jpg",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between">
      {/* Top Header */}
      <header className="w-full border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/kyorix-logo.png"
              alt="Kyorix Sport Technology"
              width={160}
              height={50}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>

          <nav className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/athlete/status"
              className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 transition px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Check Status
            </Link>
            <Link
              href="/athlete/card"
              className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 transition px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Download Card
            </Link>
            <Link
              href="/athlete/register"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-xs transition shadow-blue-500/20"
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-4">
            <Award className="w-3.5 h-3.5 text-blue-600" />
            Open International Kukkiwon Cup 2026
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight">
            Official Championship <span className="text-blue-600">ID Card Accreditation</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Register your Kukkiwon credentials, select your official championship role, and download your accredited ID card. Powered by Kyorix Sports Technology.
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
            <h3 className="font-bold text-slate-900 text-lg mb-2">Verified Kukkiwon Identity</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Automatic validation prevents duplicate Kukkiwon numbers and verifies academy affiliations across all 16 Olympic weight divisions.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-400 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">4 Official Roles & Templates</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Choose your accreditation badge: Participant, Referee, Coach, or Staff. Every badge is generated with print-ready high fidelity.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-400 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">Instant Self-Service Access</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Approved participants can access their status anytime using their secure access code and download high-resolution PDF credentials.
            </p>
          </div>
        </div>

        {/* The 4 Official Templates Showcase */}
        <section className="mb-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Official Templates</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-1">
              Selectable Accreditation Badges
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Select one of the 4 official templates during registration. Your ID card will be rendered directly onto your selected championship badge.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {templates.map((tmpl) => (
              <div
                key={tmpl.role}
                className={`bg-white rounded-2xl border ${tmpl.border} shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group`}
              >
                <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden border-b border-slate-100">
                  <Image
                    src={tmpl.previewImg}
                    alt={tmpl.title}
                    fill
                    className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                  <div className="absolute top-3 left-3">
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-wider uppercase ${tmpl.badgeBg} shadow-xs`}>
                      {tmpl.role}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base mb-1.5">{tmpl.title}</h3>
                    <p className="text-slate-600 text-xs leading-relaxed mb-4">{tmpl.description}</p>
                  </div>

                  <Link
                    href={`/athlete/register?role=${tmpl.role}`}
                    className="w-full text-center py-2 px-3 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-blue-50 text-blue-700 border border-blue-200 transition flex items-center justify-center gap-1.5"
                  >
                    Select {tmpl.role}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

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
                  Enter your Kukkiwon ID, full name, academy, registered weight category, and upload a clear portrait photo.
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
          </div>
        </div>
      </footer>
    </div>
  );
}
