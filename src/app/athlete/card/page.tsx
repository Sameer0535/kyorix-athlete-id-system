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
  const initialId = searchParams.get("kukkiwonId") || "";

  const [kukkiwonId, setKukkiwonId] = useState(initialId);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<AthleteLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const handleSearch = async (targetId: string) => {
    const trimmed = targetId.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter your Kukkiwon ID.");
      return;
    }

    setError(null);
    setResult(null);
    setSearching(true);
    setShowPdfPreview(false);

    try {
      const res = await fetch(`/api/athletes/lookup?kukkiwonId=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to search for athlete.");
      }

      setResult(data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error querying Kukkiwon database.";
      setError(msg);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      handleSearch(initialId);
    }
  }, [initialId]);

  const handleDownload = () => {
    if (!result?.athlete?.kukkiwonId) return;
    window.open(`/api/id-cards/download?kukkiwonId=${encodeURIComponent(result.athlete.kukkiwonId)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Search Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(kukkiwonId);
        }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl"
      >
        <label className="block text-xs font-semibold text-slate-300 mb-2">
          Enter Your Kukkiwon ID
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={kukkiwonId}
            onChange={(e) => setKukkiwonId(e.target.value.toUpperCase())}
            placeholder="e.g. 05123456 or KUK-987654"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 uppercase"
          />
          <button
            type="submit"
            disabled={searching}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
          >
            <Search className="w-4 h-4" />
            {searching ? "Verifying..." : "Find My Credential"}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl flex items-start gap-3 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Results View */}
      {result && (
        <div>
          {!result.found ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">No Athlete Record Found</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No athlete is registered under Kukkiwon ID <span className="font-mono text-slate-200">{result.kukkiwonId}</span>. If you haven&apos;t registered yet, submit your enrollment below.
              </p>
              <Link
                href="/athlete/register"
                className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-5 rounded-xl text-xs transition"
              >
                Register as an Athlete &rarr;
              </Link>
            </div>
          ) : result.athlete && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
              {/* Header Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Official Athlete Dossier
                  </span>
                  <h2 className="text-2xl font-bold text-white mt-0.5">
                    {result.athlete.fullName}
                  </h2>
                </div>

                <div>
                  {result.athlete.registrationStatus === "APPROVED" ? (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-800 px-3.5 py-1.5 rounded-full text-emerald-400 text-xs font-bold">
                      <CheckCircle className="w-3.5 h-3.5" /> ID Card Available
                    </span>
                  ) : result.athlete.registrationStatus === "REJECTED" ? (
                    <span className="inline-flex items-center gap-1.5 bg-red-950/80 border border-red-800 px-3.5 py-1.5 rounded-full text-red-400 text-xs font-bold">
                      <XCircle className="w-3.5 h-3.5" /> Application Rejected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-amber-950/80 border border-amber-800 px-3.5 py-1.5 rounded-full text-amber-300 text-xs font-bold">
                      <Clock className="w-3.5 h-3.5" /> Pending Admin Review
                    </span>
                  )}
                </div>
              </div>

              {/* Verified Details Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-slate-400 font-semibold mb-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Verified Championship Credentials</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Kukkiwon ID</span>
                    <span className="font-mono font-bold text-white text-sm">{result.athlete.kukkiwonId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Belt Rank</span>
                    <span className="font-semibold text-slate-200">{result.athlete.danOrPoom || "Registered"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Academy Affiliation</span>
                    <span className="font-semibold text-white">{result.athlete.academyName}</span>
                    <span className="text-slate-400 block text-[11px]">{result.athlete.academyCity}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Registered Weight Category</span>
                    <span className="font-semibold text-cyan-400">{result.athlete.weightCategory}</span>
                  </div>
                </div>
              </div>

              {/* Action Area for Approved Card */}
              {result.athlete.registrationStatus === "APPROVED" ? (
                <div className="space-y-4 pt-2">
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
                          src={`/api/id-cards/download?kukkiwonId=${encodeURIComponent(result.athlete.kukkiwonId)}&preview=true`}
                          title="Card Preview"
                          className="w-full h-full border-0"
                        />
                      </div>
                    </div>
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
        Enter your Kukkiwon ID to retrieve and download your official 85.6mm × 54mm print-ready championship accreditation credential.
      </p>

      <Suspense fallback={<div className="text-center py-12 text-slate-400 text-sm">Loading credential engine...</div>}>
        <CardDownloadContent />
      </Suspense>
    </div>
  );
}
