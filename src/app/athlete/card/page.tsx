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
  Printer,
  ShieldCheck,
  KeyRound,
  Lock,
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
  const [accessToken, setAccessToken] = useState(initialToken);
  const [downloadToken, setDownloadToken] = useState(initialToken);
  const [isTokenVerified, setIsTokenVerified] = useState(false);

  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<AthleteLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Authenticate and verify download credentials
  const handleVerifyAndSearch = async (targetId: string, secretToken?: string) => {
    const trimmedId = targetId.trim().toUpperCase();
    const tokenToUse = (secretToken || accessToken).trim();

    if (!trimmedId) {
      setError("Please enter your Kukkiwon ID or Registration Number.");
      return;
    }

    setError(null);
    setResult(null);
    setSearching(true);
    setShowPdfPreview(false);

    try {
      // If access token is provided, verify directly with verify-access endpoint
      if (tokenToUse) {
        const verifyRes = await fetch("/api/athletes/verify-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: trimmedId, accessToken: tokenToUse }),
        });
        const verifyData = await verifyRes.json();

        if (verifyRes.ok && verifyData.success) {
          setDownloadToken(verifyData.data.downloadToken);
          setIsTokenVerified(true);
          const reg = verifyData.data.registration;
          setResult({
            found: true,
            kukkiwonId: reg.athlete.kukkiwonId,
            athlete: {
              id: reg.athlete.id,
              kukkiwonId: reg.athlete.kukkiwonId,
              fullName: reg.athlete.fullName,
              gender: reg.athlete.gender,
              danOrPoom: reg.athlete.danOrPoom,
              cardRole: reg.cardRole || "PARTICIPANT",
              academyName: reg.academy.name,
              academyCity: reg.academy.city,
              registrationStatus: reg.approvalStatus,
              weightCategory: reg.weightCategory.name,
              idCard: reg.idCard,
              canDownloadCard: reg.approvalStatus === "APPROVED",
            },
          });
          return;
        } else {
          throw new Error(verifyData.error?.message || "Invalid Access Token for this athlete.");
        }
      }

      // If no token provided yet, perform read-only lookup
      const res = await fetch(`/api/athletes/lookup?kukkiwonId=${encodeURIComponent(trimmedId)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to search for athlete.");
      }

      setResult(data.data);
      setIsTokenVerified(false);
      setDownloadToken("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error querying athlete database.";
      setError(msg);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      handleVerifyAndSearch(initialId, initialToken);
    }
  }, [initialId, initialToken]);

  const handleDownload = async () => {
    if (!result?.athlete?.kukkiwonId) return;
    if (!downloadToken && !accessToken) {
      setError("Verified Access Token is required to download this official credential.");
      return;
    }
    try {
      const res = await fetch("/api/athletes/verify-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: result.athlete.kukkiwonId, accessToken }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data.singleUseGrantToken) {
        window.open(
          `/api/id-cards/download?kukkiwonId=${encodeURIComponent(result.athlete.kukkiwonId)}&grant=${encodeURIComponent(json.data.singleUseGrantToken)}`,
          "_blank"
        );
      } else {
        window.open(
          `/api/id-cards/download?kukkiwonId=${encodeURIComponent(result.athlete.kukkiwonId)}&token=${encodeURIComponent(downloadToken)}`,
          "_blank"
        );
      }
    } catch {
      window.open(
        `/api/id-cards/download?kukkiwonId=${encodeURIComponent(result.athlete.kukkiwonId)}&token=${encodeURIComponent(downloadToken)}`,
        "_blank"
      );
    }
  };

  const activeRole = result?.athlete?.cardRole?.toUpperCase() || "PARTICIPANT";
  const templateConfig = TEMPLATE_INFO[activeRole] || TEMPLATE_INFO.PARTICIPANT;

  return (
    <div className="space-y-6">
      {/* Search & Verification Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleVerifyAndSearch(kukkiwonId, accessToken);
        }}
        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Kukkiwon ID / Reg Number
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

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Registration Access Code</span>
              <span className="text-[11px] font-normal text-blue-600 lowercase">from submission</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Paste Access Code from registration"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition font-mono text-xs"
                disabled={searching}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={searching || !kukkiwonId.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50"
        >
          {searching ? (
            <span>Verifying Credentials...</span>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              Verify & Retrieve Official ID Card
            </>
          )}
        </button>
      </form>

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Credential Verification Notice</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Lookup & Verification Result Card */}
      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          {!result.found ? (
            <div className="text-center py-8 space-y-3">
              <XCircle className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Athlete Record Not Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {result.message || "Please check your Athlete ID or submit a new registration."}
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
                    {isTokenVerified ? (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Token Verified
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Token Required
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span>Athlete ID: <strong className="text-blue-600 font-mono">{result.athlete.kukkiwonId}</strong></span>
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
                    {result.athlete.idCard?.cardNumber || "Pending Admin Generation"}
                  </span>
                </div>
              </div>

              {/* Action Area for Approved Card */}
              {result.athlete.registrationStatus === "APPROVED" ? (
                <div className="space-y-4 pt-2">
                  {!isTokenVerified ? (
                    <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-xs space-y-3">
                      <div className="flex items-center gap-2 text-blue-800 font-bold">
                        <KeyRound className="w-4 h-4 text-blue-600" />
                        Unlock ID Card Download & Print Preview
                      </div>
                      <p className="text-slate-600">
                        To protect athlete personal information, please enter your secret Registration Access Code in the form above to verify ownership and download your official credential.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                          placeholder="Paste Registration Access Code"
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                        />
                        <button
                          type="button"
                          onClick={() => handleVerifyAndSearch(kukkiwonId, accessToken)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition"
                        >
                          Verify Code
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
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
                          className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 px-5 rounded-xl text-sm transition border border-slate-200"
                        >
                          <Eye className="w-4 h-4" />
                          {showPdfPreview ? "Hide Preview" : "View Card Preview"}
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500 text-center">
                        Official {templateConfig.label} Template &bull; High-resolution vector output &bull; Zero QR codes or barcodes
                      </p>

                      {/* Embedded Card Preview Frame */}
                      {showPdfPreview && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-blue-200 space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-blue-700 flex items-center gap-1.5">
                              <Printer className="w-3.5 h-3.5" /> High-Resolution Badge Preview
                            </span>
                            <span className="text-slate-500 text-[11px] font-semibold">{templateConfig.label} Format</span>
                          </div>
                          <div className="w-full h-96 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-inner">
                            <iframe
                              src={`/api/id-cards/download?kukkiwonId=${encodeURIComponent(result.athlete.kukkiwonId)}&token=${encodeURIComponent(downloadToken)}&preview=true`}
                              title="Card Preview"
                              className="w-full h-full border-0"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    ID Card In Processing
                  </div>
                  <p className="text-slate-600">
                    Your registration has been submitted and is currently being verified by system administrators. Once approved, your printable ID card will be immediately ready for download here.
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
        Authenticate using your Athlete ID and registration Access Code to preview and download your official championship credential generated in your selected template format.
      </p>

      <Suspense fallback={<div className="text-center py-12 text-slate-400 text-sm">Loading credential engine...</div>}>
        <CardDownloadContent />
      </Suspense>
    </div>
  );
}
