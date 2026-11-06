"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Download,
  AlertCircle,
  RefreshCw,
  Award,
  ShieldCheck,
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
  cardRole?: string;
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
      <form onSubmit={handleSearchSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Enter Kukkiwon ID or Registration Number
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. 05123456 or REG-2026-0001"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 uppercase"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-7 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20"
          >
            <Search className="w-4 h-4" />
            {loading ? "Checking..." : "Verify Status"}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {resubmitSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-xs font-medium">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>{resubmitSuccess}</span>
        </div>
      )}

      {notFound && (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <XCircle className="w-6 h-6 text-slate-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">No Matching Record Found</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            We could not find a registration matching <span className="font-mono font-bold text-slate-900">{searchQuery}</span>. Please verify your reference number or register as a new participant.
          </p>
          <Link
            href="/athlete/register"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition shadow-sm"
          >
            Go to Registration &rarr;
          </Link>
        </div>
      )}

      {data && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Header with status badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Ref: {data.registrationNumber}
                </span>
                {data.cardRole && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {data.cardRole} BADGE
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-slate-950 mt-1">{data.athlete.fullName}</h2>
              <div className="text-xs text-slate-600 mt-1">
                Kukkiwon ID: <span className="font-mono font-bold text-slate-900">{data.athlete.kukkiwonId}</span> &bull; {data.athlete.danOrPoom || "Registered"}
              </div>
            </div>

            <div>
              {data.approvalStatus === "APPROVED" && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full text-emerald-800 text-xs font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> APPROVED
                </span>
              )}
              {data.approvalStatus === "PENDING_REVIEW" && (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full text-amber-800 text-xs font-bold">
                  <Clock className="w-4 h-4 text-amber-600" /> PENDING_REVIEW
                </span>
              )}
              {data.approvalStatus === "CHANGES_REQUESTED" && (
                <span className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3.5 py-1.5 rounded-full text-orange-800 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-orange-600" /> CHANGES_REQUESTED
                </span>
              )}
              {data.approvalStatus === "REJECTED" && (
                <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 px-3.5 py-1.5 rounded-full text-red-800 text-xs font-bold">
                  <XCircle className="w-4 h-4 text-red-600" /> REJECTED
                </span>
              )}
            </div>
          </div>

          {/* Details Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">
                Championship Affiliation
              </span>
              <div>
                <span className="text-slate-500 block text-[11px]">Academy</span>
                <span className="text-slate-900 font-semibold">{data.academy.name}</span>
                <span className="text-slate-500 block text-[11px]">{data.academy.city}, {data.academy.state}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Weight Division</span>
                <span className="text-blue-700 font-semibold">{data.weightCategory.name}</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">
                Verification Details
              </span>
              <div>
                <span className="text-slate-500 block text-[11px]">Submission Date</span>
                <span className="text-slate-800">{new Date(data.submittedAt).toLocaleDateString()}</span>
              </div>
              {data.approvalDate && (
                <div>
                  <span className="text-slate-500 block text-[11px]">Approval Date</span>
                  <span className="text-emerald-700 font-semibold">{new Date(data.approvalDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Specific Status Callouts */}
          {data.approvalStatus === "CHANGES_REQUESTED" && (
            <div className="p-5 bg-orange-50 border border-orange-200 rounded-2xl space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-orange-900">Action Required: Corrections Requested</h3>
                  <p className="text-xs text-orange-800 mt-1 leading-relaxed">
                    <span className="font-semibold">Administrator Note:</span> &ldquo;{data.correctionsRequested}&rdquo;
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowResubmitModal(true)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Submit Requested Corrections Now
              </button>
            </div>
          )}

          {data.approvalStatus === "REJECTED" && (
            <div className="p-5 bg-red-50 border border-red-200 rounded-2xl text-xs space-y-2">
              <div className="font-bold text-red-900 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Application Rejected by Credential Officer
              </div>
              <p className="text-red-800">
                <span className="font-semibold">Reason:</span> &ldquo;{data.rejectionReason}&rdquo;
              </p>
            </div>
          )}

          {data.approvalStatus === "PENDING_REVIEW" && (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Under Administrative Review
              </div>
              <p className="text-amber-800 leading-relaxed">
                Your photograph and Kukkiwon credentials are being verified by credential officers. You will be able to download your official accreditation card as soon as your application is approved.
              </p>
            </div>
          )}

          {data.approvalStatus === "APPROVED" && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
              <div className="font-bold text-emerald-900 flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Credential Approved & Ready for Download
              </div>
              <p className="text-xs text-emerald-800">
                Your athlete registration has been verified and authorized by Kyorix Sports Technology.
              </p>
              <Link
                href={`/athlete/card?kukkiwonId=${encodeURIComponent(data.athlete.kukkiwonId)}`}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download Official ID Card &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Resubmission Modal */}
      {showResubmitModal && data && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Resubmit Corrections</h3>
                <p className="text-xs text-slate-500">Reference: {data.registrationNumber}</p>
              </div>
              <button
                onClick={() => setShowResubmitModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900">
              <span className="font-semibold block mb-0.5">Administrator Instructions:</span>
              &ldquo;{data.correctionsRequested}&rdquo;
            </div>

            <form onSubmit={handleResubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Athlete Full Name
                </label>
                <input
                  type="text"
                  value={resubmitName}
                  onChange={(e) => setResubmitName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Update Photograph (Optional / If requested)
                </label>
                <PhotoCropper
                  onCropComplete={(file: File, preview: string) => {
                    setResubmitPhoto(file);
                    setResubmitPhotoPreview(preview);
                  }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowResubmitModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm"
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
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4 sm:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/images/kyorix-logo.png"
              alt="Kyorix Sport Technology"
              width={240}
              height={70}
              className="h-12 sm:h-14 w-auto object-contain"
              priority
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
        </header>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
            <Award className="w-3.5 h-3.5 text-blue-600" />
            Registration Tracking
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
            Check Accreditation Status
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Track real-time administrative review status, address corrections, or download your verified card.
          </p>
        </div>

        <Suspense fallback={<div className="text-center py-12 text-slate-500 text-sm">Loading status...</div>}>
          <StatusContent />
        </Suspense>
      </div>
    </div>
  );
}
