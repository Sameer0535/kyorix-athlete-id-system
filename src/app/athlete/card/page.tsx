"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  ShieldCheck,
} from "lucide-react";

interface AthleteLookupResult {
  found: boolean;
  kukkiwonId?: string;
  message?: string;
  athlete?: {
    id: string;
    kukkiwonId: string;
    fullName: string;
    gender: string;
    danOrPoom?: string;
    cardRole?: string;
    academyName: string;
    academyCity: string;
    registrationStatus: string;
    weightCategory: string;
    idCard?: {
      id: string;
      cardNumber: string;
      status: string;
      generatedAt?: string;
    } | null;
    canDownloadCard: boolean;
  };
}

const TEMPLATE_INFO: Record<string, { label: string; image: string; tagClass: string }> = {
  PARTICIPANT: {
    label: "PARTICIPANT",
    image: "/templates/template-participant.jpg",
    tagClass: "bg-blue-100 text-blue-800 border-blue-200",
  },
  REFEREE: {
    label: "REFEREE",
    image: "/templates/template-referee.jpg",
    tagClass: "bg-sky-100 text-sky-800 border-sky-200",
  },
  COACH: {
    label: "COACH",
    image: "/templates/template-coach.jpg",
    tagClass: "bg-red-100 text-red-800 border-red-200",
  },
  STAFF: {
    label: "STAFF",
    image: "/templates/template-staff.jpg",
    tagClass: "bg-amber-100 text-amber-800 border-amber-200",
  },
};

function CardDownloadContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("kukkiwonId") || searchParams.get("id") || "";
  const initialToken = searchParams.get("token") || "";

  const [kukkiwonId, setKukkiwonId] = useState(initialId);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<AthleteLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Lookup athlete and display ID card directly without access code
  const handleVerifyAndSearch = async (targetId: string) => {
    const trimmedId = targetId.trim().toUpperCase();

    if (!trimmedId) {
      setError("Please enter your Kukkiwon ID or Registration Number.");
      return;
    }

    setError(null);
    setResult(null);
    setSearching(true);
    setShowPdfPreview(false);

    try {
      const res = await fetch(`/api/athletes/lookup?kukkiwonId=${encodeURIComponent(trimmedId)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to search for athlete.");
      }

      setResult(data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error querying athlete database.";
      setError(msg);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      handleVerifyAndSearch(initialId);
    }
  }, [initialId]);

  const handleDownload = () => {
    if (!result?.athlete?.kukkiwonId) return;
    window.location.href = `/api/id-cards/download?kukkiwonId=${encodeURIComponent(result.athlete.kukkiwonId)}`;
  };

  const activeRole = result?.athlete?.cardRole?.toUpperCase() || "PARTICIPANT";
  const templateConfig = TEMPLATE_INFO[activeRole] || TEMPLATE_INFO.PARTICIPANT;

  return (
    <div className="space-y-6">
      {/* Search Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleVerifyAndSearch(kukkiwonId);
        }}
        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4"
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Kukkiwon ID / Registration Number
          </label>
          <div className="relative">
            <input
              type="text"
              value={kukkiwonId}
              onChange={(e) => setKukkiwonId(e.target.value)}
              placeholder="e.g. KKWID-261103-0731-2765 or REG-2026-0001"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition uppercase font-semibold"
              disabled={searching}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={searching || !kukkiwonId.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50"
        >
          {searching ? (
            <span>Locating Credentials...</span>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              Retrieve Official ID Card
            </>
          )}
        </button>
      </form>

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Credential Notice</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Lookup Result Card */}
      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          {!result.found ? (
            <div className="text-center py-8 space-y-3">
              <XCircle className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Athlete Record Not Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {result.message || "Please check your Kukkiwon ID or submit a new registration."}
              </p>
              <Link
                href="/athlete/register"
                className="inline-block mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition"
              >
                Go to Registration Form &rarr;
              </Link>
            </div>
          ) : result.athlete && (
            <div className="space-y-6">
              {/* Header Profile */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-extrabold text-slate-900">{result.athlete.fullName}</h2>
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${templateConfig.tagClass}`}>
                      {templateConfig.label} CARD
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span>Kukkiwon ID: <strong className="text-blue-600 font-mono">{result.athlete.kukkiwonId}</strong></span>
                    <span>&bull;</span>
                    <span>Rank: <strong className="text-slate-700">{result.athlete.danOrPoom || "Registered Competitor"}</strong></span>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  {result.athlete.registrationStatus === "APPROVED" && (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Registration Approved
                    </span>
                  )}
                  {result.athlete.registrationStatus === "PENDING_REVIEW" && (
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Admin Review
                    </span>
                  )}
                  {result.athlete.registrationStatus === "CHANGES_REQUESTED" && (
                    <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-300 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-full">
                      <AlertCircle className="w-3.5 h-3.5 text-blue-600" /> Corrections Requested
                    </span>
                  )}
                  {result.athlete.registrationStatus === "REJECTED" && (
                    <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-300 text-red-800 text-xs font-bold px-3 py-1.5 rounded-full">
                      <XCircle className="w-3.5 h-3.5 text-red-600" /> Registration Rejected
                    </span>
                  )}
                </div>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[11px]">Affiliated Academy</span>
                  <span className="font-semibold text-slate-800">{result.athlete.academyName}</span>
                  <span className="text-slate-400 block text-[11px]">{result.athlete.academyCity}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Weight Category</span>
                  <span className="font-semibold text-blue-600">{result.athlete.weightCategory}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Card Template</span>
                  <span className="font-semibold text-slate-800">{templateConfig.label}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Official Card Number</span>
                  <span className="font-mono text-slate-800 font-bold">
                    {result.athlete.idCard?.cardNumber || "Ready Upon Generation"}
                  </span>
                </div>
              </div>

              {/* Action Area for Approved Card */}
              {result.athlete.registrationStatus === "APPROVED" ? (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleDownload}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
                    >
                      <Download className="w-4 h-4" />
                      Download Official {templateConfig.label} ID Card (PDF)
                    </button>
                    <button
                      onClick={() => setShowPdfPreview(!showPdfPreview)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-5 rounded-xl text-sm transition flex items-center justify-center gap-2 border border-slate-200"
                    >
                      <Eye className="w-4 h-4" />
                      {showPdfPreview ? "Hide Preview" : "Print Preview"}
                    </button>
                  </div>

                  {showPdfPreview && (
                    <div className="mt-4 border-2 border-slate-200 rounded-2xl overflow-hidden bg-slate-100 p-2 shadow-inner">
                      <div className="flex items-center justify-between pb-2 px-2 text-xs text-slate-500 font-semibold border-b border-slate-200 mb-2">
                        <span>High-Resolution Document Preview</span>
                        <span className="text-blue-600">85.6mm &times; 54mm Print Output</span>
                      </div>
                      <iframe
                        src={`/api/id-cards/download?kukkiwonId=${encodeURIComponent(result.athlete.kukkiwonId)}&preview=true`}
                        className="w-full h-96 rounded-xl border border-slate-300 bg-white"
                        title="ID Card Document Preview"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
                  <div className="font-bold text-amber-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    ID Card Will Be Available Upon Approval
                  </div>
                  <p className="text-slate-600">
                    Your registration has been submitted and is currently being verified by tournament administrators. Once approved, your printable ID card will be immediately ready for download here.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AthleteCardDownloadPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 sm:p-12 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/athlete"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Athlete Hub
        </Link>
        <Image
          src="/images/kyorix-logo.png"
          alt="Kyorix Sports Technology"
          width={240}
          height={70}
          className="h-12 sm:h-14 w-auto object-contain"
        />
      </div>

      <div className="flex items-center gap-3 mb-2">
        <span className="bg-blue-600 text-white font-extrabold text-xs px-2.5 py-1 rounded tracking-wider uppercase">
          ID Card Download
        </span>
        <span className="text-blue-700 text-xs font-semibold uppercase tracking-wider">
          Official Accreditation
        </span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
        Official Athlete ID Card Download
      </h1>
      <p className="text-xs sm:text-sm text-slate-600 mt-1 mb-8">
        Enter your Kukkiwon ID or registration number to preview and download your official championship credential.
      </p>

      <Suspense fallback={<div className="text-center py-12 text-slate-400 text-sm">Loading credential engine...</div>}>
        <CardDownloadContent />
      </Suspense>
    </div>
  );
}
