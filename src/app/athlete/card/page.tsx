"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Award,
  Eye,
  FileText,
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
          // Token verification failed
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
      // Request a short-lived single-use grant token to prevent URL token leakage and replay attacks
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

  return (
    <div className="space-y-6">
      {/* Search & Verification Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleVerifyAndSearch(kukkiwonId, accessToken);
        }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Kukkiwon ID / Reg Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={kukkiwonId}
                onChange={(e) => setKukkiwonId(e.target.value)}
                placeholder="e.g. 05872134 or REG-2026-0001"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition uppercase"
                disabled={searching}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Registration Access Code</span>
              <span className="text-[11px] font-normal text-cyan-400 lowercase">from submission</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Paste Access Token from registration"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition font-mono text-xs"
                disabled={searching}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={searching || !kukkiwonId.trim()}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 disabled:opacity-50"
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
        <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-xl text-xs sm:text-sm text-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Credential Verification Notice</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Lookup & Verification Result Card */}
      {result && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {!result.found ? (
            <div className="text-center py-8 space-y-3">
              <XCircle className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">Athlete Record Not Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {result.message || "Please check your Kukkiwon ID or submit a new registration."}
              </p>
              <Link
                href="/athlete/register"
                className="inline-block mt-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold px-4 py-2 rounded-xl text-xs transition"
              >
                Go to Registration Form &rarr;
              </Link>
            </div>
          ) : result.athlete && (
            <div className="space-y-6">
              {/* Header Profile */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-white">{result.athlete.fullName}</h2>
                    {isTokenVerified ? (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Token Verified
                      </span>
                    ) : (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Token Required
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                    <span>Kukkiwon ID: <strong className="text-cyan-400">{result.athlete.kukkiwonId}</strong></span>
                    <span>&bull;</span>
                    <span>Rank: <strong className="text-slate-300">{result.athlete.danOrPoom || "Registered Athlete"}</strong></span>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  {result.athlete.registrationStatus === "APPROVED" && (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Registration Approved
                    </span>
                  )}
                  {result.athlete.registrationStatus === "PENDING_REVIEW" && (
                    <span className="inline-flex items-center gap-1.5 bg-amber-950/80 border border-amber-700 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> Pending Admin Review
                    </span>
                  )}
                  {result.athlete.registrationStatus === "CHANGES_REQUESTED" && (
                    <span className="inline-flex items-center gap-1.5 bg-blue-950/80 border border-blue-700 text-blue-300 text-xs font-bold px-3 py-1.5 rounded-full">
                      <AlertCircle className="w-3.5 h-3.5 text-blue-400" /> Corrections Requested
                    </span>
                  )}
                  {result.athlete.registrationStatus === "REJECTED" && (
                    <span className="inline-flex items-center gap-1.5 bg-red-950/80 border border-red-700 text-red-300 text-xs font-bold px-3 py-1.5 rounded-full">
                      <XCircle className="w-3.5 h-3.5 text-red-400" /> Registration Rejected
                    </span>
                  )}
                </div>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block text-[11px]">Affiliated Academy</span>
                  <span className="font-semibold text-white">{result.athlete.academyName}</span>
                  <span className="text-slate-400 block text-[11px]">{result.athlete.academyCity}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Registered Weight Category</span>
                  <span className="font-semibold text-cyan-400">{result.athlete.weightCategory}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Official Card Number</span>
                  <span className="font-mono text-slate-300">
                    {result.athlete.idCard?.cardNumber || "Pending Generation"}
                  </span>
                </div>
              </div>

              {/* Action Area for Approved Card */}
              {result.athlete.registrationStatus === "APPROVED" ? (
                <div className="space-y-4 pt-2">
                  {!isTokenVerified ? (
                    <div className="p-4 bg-slate-950 border border-cyan-500/40 rounded-xl text-xs space-y-3">
                      <div className="flex items-center gap-2 text-cyan-300 font-bold">
                        <KeyRound className="w-4 h-4 text-cyan-400" />
                        Unlock ID Card Download & Print Preview
                      </div>
                      <p className="text-slate-400">
                        To protect athlete personal information, please enter your secret Registration Access Token in the form above to verify ownership and download your official credential.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                          placeholder="Paste Registration Access Token"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleVerifyAndSearch(kukkiwonId, accessToken)}
                          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition"
                        >
                          Verify Token
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={handleDownload}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-6 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
                        >
                          <Download className="w-4 h-4" />
                          Download Official ID Card (Print-Ready PDF)
                        </button>

                        <button
                          onClick={() => setShowPdfPreview(!showPdfPreview)}
                          className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-5 rounded-xl text-sm transition border border-slate-700"
                        >
                          <Eye className="w-4 h-4" />
                          {showPdfPreview ? "Hide Card Preview" : "View High-Res Card Preview"}
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-400 text-center">
                        Standard CR80 Landscape Format (85.6mm × 54mm) &bull; No QR code or barcode required &bull; Print-ready vector output
                      </p>

                      {/* Embedded PDF Card Preview Frame */}
                      {showPdfPreview && (
                        <div className="mt-4 p-4 bg-slate-950 rounded-2xl border border-cyan-500/40 space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                              <Printer className="w-3.5 h-3.5" /> High-Resolution Print Preview
                            </span>
                            <span className="text-slate-500 text-[11px]">Standard CR80 (85.6mm × 54mm)</span>
                          </div>
                          <div className="w-full h-72 rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
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
                <div className="p-4 bg-amber-950/40 border border-amber-900/60 rounded-xl text-xs text-amber-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    ID Card Not Yet Available
                  </div>
                  <p className="text-slate-400">
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-12 max-w-3xl mx-auto">
      <Link
        href="/athlete"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Athlete Hub
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <span className="bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-1 rounded tracking-wider uppercase">
          Portal 2
        </span>
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
          Credential Retrieval
        </span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
        Official Athlete ID Card Download
      </h1>
      <p className="text-xs sm:text-sm text-slate-400 mt-1 mb-8">
        Authenticate using your Kukkiwon ID and registration Access Code to securely preview and download your official 85.6mm × 54mm print-ready credential.
      </p>

      <Suspense fallback={<div className="text-center py-12 text-slate-400 text-sm">Loading credential engine...</div>}>
        <CardDownloadContent />
      </Suspense>
    </div>
  );
}
