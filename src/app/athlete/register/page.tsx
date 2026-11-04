"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Award,
  User,
  ShieldCheck,
  Building,
  Scale,
  ArrowRight,
  Eye,
  Check,
} from "lucide-react";
import PhotoCropper from "@/components/PhotoCropper";

interface Academy {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface WeightCategory {
  id: string;
  code: string;
  name: string;
  division: string;
  gender: string;
}

export default function AthleteRegisterPage() {
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Form Fields
  const [kukkiwonId, setKukkiwonId] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [danOrPoom, setDanOrPoom] = useState("1st Dan");
  const [academyId, setAcademyId] = useState("");
  const [weightCategoryId, setWeightCategoryId] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Real-time Kukkiwon ID check
  const [checkingKukkiwon, setCheckingKukkiwon] = useState(false);
  const [kukkiwonStatus, setKukkiwonStatus] = useState<{
    checked: boolean;
    available?: boolean;
    message?: string;
  }>({ checked: false });

  // Multi-step State: 1 = Form, 2 = Confirmation Screen, 3 = Success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    registrationNumber: string;
    kukkiwonId: string;
    fullName: string;
    academyName: string;
    weightCategoryName: string;
    athleteAccessToken: string;
  } | null>(null);

  // Load academies and weight categories
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch("/api/meta/options");
        const data = await res.json();
        if (data.success) {
          const acads = data.data.academies || [];
          const wcs = data.data.weightCategories || [];
          setAcademies(acads);
          setWeightCategories(wcs);

          if (acads.length > 0) setAcademyId(acads[0].id);
          const defaultWc = wcs.find((w: WeightCategory) => w.gender === "MALE");
          if (defaultWc) setWeightCategoryId(defaultWc.id);
        }
      } catch {
        setError("Could not load registration options from server.");
      } finally {
        setLoadingOptions(false);
      }
    }
    loadOptions();
  }, []);

  // Update weight category when gender changes
  useEffect(() => {
    const validCategory = weightCategories.find((w) => w.gender === gender);
    if (validCategory) {
      setWeightCategoryId(validCategory.id);
    }
  }, [gender, weightCategories]);

  // Real-time Kukkiwon check
  useEffect(() => {
    const trimmed = kukkiwonId.trim().toUpperCase();
    if (trimmed.length < 5) {
      setKukkiwonStatus({ checked: false });
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingKukkiwon(true);
      try {
        const res = await fetch(`/api/athletes/check-kukkiwon?kukkiwonId=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data.success) {
          setKukkiwonStatus({
            checked: true,
            available: data.data.isAvailable,
            message: data.data.message,
          });
        }
      } catch {
        // ignore network error
      } finally {
        setCheckingKukkiwon(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [kukkiwonId]);

  const handlePhotoCropped = (file: File, previewUrl: string) => {
    setPhotoFile(file);
    setPhotoPreview(previewUrl);
    setError(null);
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedKuk = kukkiwonId.trim().toUpperCase();
    if (!trimmedKuk) {
      setError("Kukkiwon ID is required.");
      return;
    }

    if (!fullName.trim()) {
      setError("Athlete full name is required.");
      return;
    }

    if (!academyId) {
      setError("Please select an academy.");
      return;
    }

    if (!weightCategoryId) {
      setError("Please select a registered weight category.");
      return;
    }

    if (!photoFile) {
      setError("Athlete photograph is required. Please upload and position your photo.");
      return;
    }

    if (kukkiwonStatus.checked && !kukkiwonStatus.available) {
      setError(`Kukkiwon ID '${trimmedKuk}' is already registered. Duplicates are strictly prevented.`);
      return;
    }

    // Move to step 2: Confirmation
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFinalSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      if (!photoFile) {
        throw new Error("Photograph is missing. Please return and upload your photograph.");
      }

      const formData = new FormData();
      formData.append("kukkiwonId", kukkiwonId.trim().toUpperCase());
      formData.append("fullName", fullName.trim());
      formData.append("gender", gender);
      formData.append("danOrPoom", danOrPoom);
      formData.append("academyId", academyId);
      formData.append("weightCategoryId", weightCategoryId);
      if (contactPhone) formData.append("contactPhone", contactPhone.trim());
      if (contactEmail) formData.append("contactEmail", contactEmail.trim());
      formData.append("photo", photoFile);

      const res = await fetch("/api/registrations", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to submit registration.");
      }

      setSuccessResult(data.data);
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration submission failed.";
      setError(msg);
      setCurrentStep(1); // Return to form if error
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAcademy = academies.find((a) => a.id === academyId);
  const selectedWeightCategory = weightCategories.find((w) => w.id === weightCategoryId);

  // STEP 3: SUCCESS SCREEN
  if (currentStep === 3 && successResult) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-12 max-w-2xl mx-auto flex flex-col justify-center">
        <div className="bg-slate-900 border border-emerald-800/80 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              Submission Verified
            </span>
            <h1 className="text-2xl font-bold text-white mt-1">Official Registration Submitted!</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Your athlete record and biometric photograph have been safely received and queued for administrative review.
            </p>
          </div>

          {/* Reference Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-left text-xs space-y-3">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">Registration Reference</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{successResult.registrationNumber}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">Kukkiwon ID</span>
              <span className="font-mono font-bold text-white">{successResult.kukkiwonId}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">Athlete Full Name</span>
              <span className="font-semibold text-white">{successResult.fullName}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">Academy</span>
              <span className="text-white">{successResult.academyName}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">Registered Weight Class</span>
              <span className="text-blue-400 font-semibold">{successResult.weightCategoryName}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-400 font-medium">Current Status</span>
              <span className="inline-flex items-center gap-1.5 bg-amber-950/70 border border-amber-800/80 px-2.5 py-0.5 rounded-full text-amber-300 font-semibold text-[11px]">
                PENDING_REVIEW
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href={`/athlete/status?query=${encodeURIComponent(successResult.kukkiwonId)}`}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl text-xs transition shadow-lg shadow-blue-950/40"
            >
              Track Registration Status &rarr;
            </Link>
            <Link
              href="/"
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-4 rounded-xl text-xs transition border border-slate-700"
            >
              Return to Portal Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: CONFIRMATION SCREEN
  if (currentStep === 2) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-12 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Edit Details
        </button>

        <div className="flex items-center gap-3 mb-2">
          <span className="bg-amber-600 text-white font-extrabold text-xs px-2.5 py-1 rounded tracking-wider uppercase">
            Step 2 of 2
          </span>
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Review & Final Confirmation
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Confirm Athlete Registration
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 mb-8">
          Please verify all details carefully before submitting. Information is synchronized directly to the centralized tournament database.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-950/60 border border-red-800 rounded-xl flex items-start gap-3 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          {/* Athlete Profile Summary with Cropped Photo */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-800">
            <div className="w-32 h-40 rounded-xl overflow-hidden border-2 border-blue-500/60 shadow-lg shrink-0 bg-slate-950">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Athlete Portrait" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">No Photo</div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                Official Credential Preview
              </span>
              <h2 className="text-2xl font-bold text-white">{fullName}</h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="font-mono text-xs bg-slate-950 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-md">
                  KUKKIWON: {kukkiwonId.toUpperCase()}
                </span>
                <span className="text-xs bg-slate-950 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-md">
                  {danOrPoom}
                </span>
                <span className="text-xs bg-slate-950 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-md">
                  {gender}
                </span>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Affiliated Academy</span>
              <span className="font-semibold text-white">
                {selectedAcademy?.name} ({selectedAcademy?.city}, {selectedAcademy?.state})
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Registered Weight Category</span>
              <span className="font-semibold text-blue-400">{selectedWeightCategory?.name}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Competition Division</span>
              <span className="font-semibold text-slate-200">{selectedWeightCategory?.division}</span>
            </div>

            {contactPhone && (
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Contact Phone</span>
                <span className="text-slate-300">{contactPhone}</span>
              </div>
            )}

            {contactEmail && (
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Contact Email</span>
                <span className="text-slate-300">{contactEmail}</span>
              </div>
            )}
          </div>

          <div className="p-4 bg-blue-950/30 border border-blue-900/50 rounded-xl text-xs text-blue-300 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
            <span>
              By confirming submission, you certify that the Kukkiwon certificate and photo represent the official athlete credentials. Photo is stored in private, access-controlled storage.
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setCurrentStep(1)}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-4 rounded-xl text-xs transition border border-slate-700"
            >
              &larr; Make Changes
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinalSubmit}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl text-xs transition shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {submitting ? "Submitting Registration..." : "Confirm & Submit Registration"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 1: FORM INPUT
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
          Athlete Enrollment
        </span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
        Official Athlete Registration Form
      </h1>
      <p className="text-xs sm:text-sm text-slate-400 mt-1 mb-8">
        Submit official Kukkiwon credentials and portrait photograph. All submissions are verified by credential officers before ID card generation.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-950/60 border border-red-800 rounded-xl flex items-start gap-3 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {loadingOptions ? (
        <div className="text-center py-16 text-sm text-slate-400">Loading system academies and weight categories...</div>
      ) : (
        <form onSubmit={handleProceedToReview} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-8 shadow-xl">
          {/* Section 1: Core Athlete Identification */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Award className="w-4 h-4 text-blue-400" />
              1. Core Identification (Kukkiwon Headquarters)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kukkiwon ID <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={kukkiwonId}
                    onChange={(e) => setKukkiwonId(e.target.value.toUpperCase())}
                    placeholder="e.g. 05123456 or KUK-987654"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 uppercase"
                  />
                  {checkingKukkiwon && (
                    <span className="absolute right-3 top-3 text-[11px] text-slate-400 animate-pulse">
                      Checking...
                    </span>
                  )}
                </div>

                {kukkiwonStatus.checked && (
                  <div className={`mt-1.5 text-[11px] font-medium flex items-center gap-1.5 ${
                    kukkiwonStatus.available ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {kukkiwonStatus.available ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{kukkiwonStatus.message}</span>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  Must be unique across all tournaments. Duplicate Kukkiwon IDs are strictly rejected.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Athlete Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Official name on certificate"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Gender <span className="text-red-400">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE")}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Dan / Poom Rank
                </label>
                <select
                  value={danOrPoom}
                  onChange={(e) => setDanOrPoom(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="1st Dan">1st Dan (Black Belt)</option>
                  <option value="2nd Dan">2nd Dan (Black Belt)</option>
                  <option value="3rd Dan">3rd Dan (Black Belt)</option>
                  <option value="4th Dan">4th Dan (Black Belt)</option>
                  <option value="1st Poom">1st Poom (Junior Black Belt)</option>
                  <option value="2nd Poom">2nd Poom (Junior Black Belt)</option>
                  <option value="3rd Poom">3rd Poom (Junior Black Belt)</option>
                  <option value="1st Geup">1st Geup (Red-Black)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Affiliation & Weight Category */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Building className="w-4 h-4 text-blue-400" />
              2. Academy Affiliation & Registered Weight Category
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Academy Name <span className="text-red-400">*</span>
                </label>
                <select
                  value={academyId}
                  onChange={(e) => setAcademyId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {academies.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.city}, {a.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Registered Weight Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={weightCategoryId}
                  onChange={(e) => setWeightCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {weightCategories
                    .filter((wc) => wc.gender === gender)
                    .map((wc) => (
                      <option key={wc.id} value={wc.id}>
                        [{wc.division}] {wc.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Contact Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Contact Email (Optional)
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="athlete@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Biometric Photograph with Crop Tool */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              3. Athlete Photograph (Cropping & Positioning)
            </h2>

            <PhotoCropper
              onPhotoCropped={handlePhotoCropped}
              currentPreview={photoPreview}
            />
          </div>

          {/* Proceed Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl text-sm transition shadow-lg shadow-blue-950/40 flex items-center justify-center gap-2"
          >
            <span>Proceed to Confirmation Screen</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}
