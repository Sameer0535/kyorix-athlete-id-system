"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Upload,
  Download,
  AlertCircle,
  Award,
  RefreshCw,
} from "lucide-react";
import PhotoCropper from "@/components/PhotoCropper";

interface RegistrationStatusData {
  id: string;
  registrationNumber: string;
  approvalStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  approvalDate?: string;
  rejectionReason?: string;
  correctionsRequested?: string;
  submittedAt: string;
  athlete: {
    id: string;
    kukkiwonId: string;
    fullName: string;
    gender: string;
    danOrPoom?: string;
  };
  academy: {
    name: string;
    city: string;
    state: string;
  };
  weightCategory: {
    name: string;
    division: string;
  };
  photograph: {
    streamUrl: string;
  };
  idCard?: {
    cardNumber: string;
    status: string;
    generatedAt?: string;
  } | null;
  athleteAccessToken: string;
}

function StatusContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("query") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RegistrationStatusData | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Resubmission State for CHANGES_REQUESTED
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitName, setResubmitName] = useState("");
  const [resubmitPhoto, setResubmitPhoto] = useState<File | null>(null);
  const [resubmitPhotoPreview, setResubmitPhotoPreview] = useState<string | null>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitSuccess, setResubmitSuccess] = useState<string | null>(null);

  const fetchStatus = async (queryStr: string) => {
    if (!queryStr.trim()) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    setData(null);

    try {
      const res = await fetch(`/api/athletes/status?query=${encodeURIComponent(queryStr.trim())}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to query registration status.");
      }

      if (!json.data.found) {
        setNotFound(true);
      } else {
        setData(json.data.registration);
        setResubmitName(json.data.registration.athlete.fullName);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error retrieving status.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      fetchStatus(initialQuery);
    }
  }, [initialQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStatus(searchQuery);
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    setResubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("athleteAccessToken", data.athleteAccessToken);
      if (resubmitName.trim()) formData.append("fullName", resubmitName.trim());
      if (resubmitPhoto) formData.append("photo", resubmitPhoto);

      const res = await fetch(`/api/registrations/${data.id}/resubmit`, {
        method: "POST",
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error?.message || "Failed to resubmit corrections.");
      }

      setResubmitSuccess("Corrections submitted successfully! Status updated to PENDING_REVIEW.");
      setShowResubmitModal(false);
      // Refresh status
      await fetchStatus(data.registrationNumber);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resubmit corrections.";
      setError(msg);
    } finally {
      setResubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input Box */}
      <form onSubmit={handleSearchSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <label className="block text-xs font-semibold text-slate-300 mb-2">
          Kukkiwon ID or Registration Number
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. 05123456 or REG-2026-0001"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 uppercase"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-950/40"
          >
            <Search className="w-4 h-4" />
            {loading ? "Checking..." : "Verify Status"}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl flex items-start gap-3 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {resubmitSuccess && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-start gap-3 text-emerald-300 text-xs">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          <span>{resubmitSuccess}</span>
        </div>
      )}

      {notFound && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">No Matching Record Found</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            We could not find an athlete registration matching <span className="font-mono text-slate-200">{searchQuery}</span>. Please verify your reference or register as a new athlete.
          </p>
          <Link
            href="/athlete/register"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-5 rounded-xl text-xs transition"
          >
            Go to Registration &rarr;
          </Link>
        </div>
      )}

      {data && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          {/* Header with status badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Registration Ref: {data.registrationNumber}
              </span>
              <h2 className="text-2xl font-bold text-white mt-0.5">{data.athlete.fullName}</h2>
              <div className="text-xs text-slate-400 mt-1">
                Kukkiwon ID: <span className="font-mono font-semibold text-slate-200">{data.athlete.kukkiwonId}</span> &bull; {data.athlete.danOrPoom || "Registered"}
              </div>
            </div>

            <div>
              {data.approvalStatus === "APPROVED" && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-800 px-3.5 py-1.5 rounded-full text-emerald-400 text-xs font-bold">
                  <CheckCircle className="w-4 h-4" /> APPROVED
                </span>
              )}
              {data.approvalStatus === "PENDING_REVIEW" && (
                <span className="inline-flex items-center gap-1.5 bg-amber-950/80 border border-amber-800 px-3.5 py-1.5 rounded-full text-amber-300 text-xs font-bold">
                  <Clock className="w-4 h-4" /> PENDING_REVIEW
                </span>
              )}
              {data.approvalStatus === "CHANGES_REQUESTED" && (
                <span className="inline-flex items-center gap-1.5 bg-orange-950/80 border border-orange-800 px-3.5 py-1.5 rounded-full text-orange-300 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4" /> CHANGES_REQUESTED
                </span>
              )}
              {data.approvalStatus === "REJECTED" && (
                <span className="inline-flex items-center gap-1.5 bg-red-950/80 border border-red-800 px-3.5 py-1.5 rounded-full text-red-400 text-xs font-bold">
                  <XCircle className="w-4 h-4" /> REJECTED
                </span>
              )}
            </div>
          </div>

          {/* Details Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">
                Tournament Affiliation
              </span>
              <div>
                <span className="text-slate-400 block text-[11px]">Academy</span>
                <span className="text-white font-semibold">{data.academy.name}</span>
                <span className="text-slate-400 block text-[11px]">{data.academy.city}, {data.academy.state}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Weight Division</span>
                <span className="text-blue-400 font-semibold">{data.weightCategory.name}</span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">
                Verification Details
              </span>
              <div>
                <span className="text-slate-400 block text-[11px]">Submission Date</span>
                <span className="text-slate-200">{new Date(data.submittedAt).toLocaleDateString()}</span>
              </div>
              {data.approvalDate && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Approval Date</span>
                  <span className="text-emerald-400 font-semibold">{new Date(data.approvalDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Specific Status Callouts */}
          {data.approvalStatus === "CHANGES_REQUESTED" && (
            <div className="p-5 bg-orange-950/40 border border-orange-800/80 rounded-xl space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-orange-300">Action Required: Corrections Requested</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    <span className="font-semibold text-white">Administrator Note:</span> &ldquo;{data.correctionsRequested}&rdquo;
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowResubmitModal(true)}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition shadow-lg shadow-orange-950/50 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Submit Requested Corrections Now
              </button>
            </div>
          )}

          {data.approvalStatus === "REJECTED" && (
            <div className="p-5 bg-red-950/40 border border-red-800/80 rounded-xl text-xs space-y-2">
              <div className="font-bold text-red-300 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                Application Rejected by Credential Officer
              </div>
              <p className="text-slate-300">
                <span className="font-semibold text-white">Reason:</span> &ldquo;{data.rejectionReason}&rdquo;
              </p>
            </div>
          )}

          {data.approvalStatus === "PENDING_REVIEW" && (
            <div className="p-5 bg-amber-950/30 border border-amber-900/60 rounded-xl text-xs text-amber-200/90 space-y-1">
              <div className="font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Under Administrative Review
              </div>
              <p className="text-slate-400">
                Your photograph and Kukkiwon credentials are being verified by credential officers. You will be able to download your official Athlete ID card as soon as your application is approved.
              </p>
            </div>
          )}

          {data.approvalStatus === "APPROVED" && (
            <div className="p-5 bg-emerald-950/40 border border-emerald-800/80 rounded-xl space-y-3">
              <div className="font-bold text-emerald-300 flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Credential Approved & Ready for Download
              </div>
              <p className="text-xs text-slate-300">
                Your athlete registration has been verified and authorized by Kyorix Sports Technology.
              </p>
              <Link
                href={`/athlete/card?kukkiwonId=${encodeURIComponent(data.athlete.kukkiwonId)}`}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-5 rounded-xl text-xs transition shadow-lg shadow-emerald-950/40"
              >
                <Download className="w-4 h-4" />
                Download Official Athlete ID Card &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Resubmission Modal */}
      {showResubmitModal && data && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Resubmit Corrections</h3>
                <p className="text-xs text-slate-400">Reference: {data.registrationNumber}</p>
              </div>
              <button
                onClick={() => setShowResubmitModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-orange-950/50 border border-orange-800/60 rounded-xl text-xs text-orange-300">
              <span className="font-semibold block mb-0.5">Administrator Instructions:</span>
              &ldquo;{data.correctionsRequested}&rdquo;
            </div>

            <form onSubmit={handleResubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Athlete Full Name
                </label>
                <input
                  type="text"
                  value={resubmitName}
                  onChange={(e) => setResubmitName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Update Athlete Photograph (Optional / If requested)
                </label>
                <PhotoCropper
                  onPhotoCropped={(file, preview) => {
                    setResubmitPhoto(file);
                    setResubmitPhotoPreview(preview);
                  }}
                  currentPreview={resubmitPhotoPreview}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResubmitModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resubmitting}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-orange-950/40"
                >
                  {resubmitting ? "Submitting..." : "Submit Corrections"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AthleteStatusPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-12 max-w-3xl mx-auto">
      <Link
        href="/athlete"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Athlete Hub
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <span className="bg-blue-600 text-white font-extrabold text-xs px-2.5 py-1 rounded tracking-wider uppercase">
          Portal 2
        </span>
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
          Status & Credential Tracking
        </span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
        Athlete Registration Status
      </h1>
      <p className="text-xs sm:text-sm text-slate-400 mt-1 mb-8">
        Check real-time administrative review status, address correction requests, or download your official approved ID card.
      </p>

      <Suspense fallback={<div className="text-center py-12 text-slate-400 text-sm">Loading status...</div>}>
        <StatusContent />
      </Suspense>
    </div>
  );
}

