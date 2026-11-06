"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Check,
  Copy,
  BadgeCheck,
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

type CardRoleType = "PARTICIPANT" | "REFEREE" | "COACH" | "STAFF";

const TEMPLATE_OPTIONS: {
  role: CardRoleType;
  title: string;
  subtitle: string;
  color: string;
  badgeBg: string;
  previewImg: string;
}[] = [
  {
    role: "PARTICIPANT",
    title: "Participant",
    subtitle: "Championship Athlete",
    color: "border-blue-600 bg-blue-50/50",
    badgeBg: "bg-blue-600 text-white",
    previewImg: "/templates/template-participant.jpg",
  },
  {
    role: "REFEREE",
    title: "Referee",
    subtitle: "Ring Judge / Official",
    color: "border-cyan-600 bg-cyan-50/50",
    badgeBg: "bg-cyan-600 text-white",
    previewImg: "/templates/template-referee.jpg",
  },
  {
    role: "COACH",
    title: "Coach",
    subtitle: "Team Coach / Master",
    color: "border-red-600 bg-red-50/50",
    badgeBg: "bg-red-600 text-white",
    previewImg: "/templates/template-coach.jpg",
  },
  {
    role: "STAFF",
    title: "Staff",
    subtitle: "Organising Committee",
    color: "border-indigo-600 bg-indigo-50/50",
    badgeBg: "bg-indigo-600 text-white",
    previewImg: "/templates/template-staff.jpg",
  },
];

export default function AthleteRegisterPage() {
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Template / Role Selection
  const [cardRole, setCardRole] = useState<CardRoleType>("PARTICIPANT");

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
  const [copiedCode, setCopiedCode] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    registrationNumber: string;
    kukkiwonId: string;
    fullName: string;
    academyName: string;
    weightCategoryName: string;
    athleteAccessToken?: string;
    cardRole?: string;
  } | null>(null);

  // Read role from URL query param if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlRole = params.get("role")?.toUpperCase();
      if (urlRole && ["PARTICIPANT", "REFEREE", "COACH", "STAFF"].includes(urlRole)) {
        setCardRole(urlRole as CardRoleType);
      }
    }
  }, []);

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
            available: data.data.available,
            message: data.data.message,
          });
        }
      } catch {
        // Soft fail
      } finally {
        setCheckingKukkiwon(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [kukkiwonId]);

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!kukkiwonId.trim()) {
      setError("Kukkiwon ID is required.");
      return;
    }
    if (kukkiwonStatus.checked && !kukkiwonStatus.available) {
      setError("This Kukkiwon ID is already registered in the system.");
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
      setError("Please upload and crop your athlete photograph.");
      return;
    }

    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFinalSubmit = async () => {
    if (!photoFile) return;
    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("kukkiwonId", kukkiwonId.trim().toUpperCase());
      formData.append("fullName", fullName.trim());
      formData.append("gender", gender);
      formData.append("danOrPoom", danOrPoom);
      formData.append("academyId", academyId);
      formData.append("weightCategoryId", weightCategoryId);
      formData.append("cardRole", cardRole);
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
      setCurrentStep(1);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAcademy = academies.find((a) => a.id === academyId);
  const selectedWeightCategory = weightCategories.find((w) => w.id === weightCategoryId);
  const currentTemplate = TEMPLATE_OPTIONS.find((t) => t.role === cardRole);

  const copyAccessCode = () => {
    if (successResult?.athleteAccessToken) {
      navigator.clipboard.writeText(successResult.athleteAccessToken);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  // STEP 3: SUCCESS SCREEN
  if (currentStep === 3 && successResult) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-6 sm:p-12 max-w-2xl mx-auto flex flex-col justify-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-lg space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Registration Successful
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-3">
              Credentials Submitted!
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Your registration has been recorded and is queued for verification by the organising committee.
            </p>
          </div>

          {/* Secure Access Token Card */}
          {successResult.athleteAccessToken && (
            <div className="bg-blue-50/70 border-2 border-blue-200 rounded-2xl p-5 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Your Self-Service Access Code
                </span>
                <span className="text-[11px] font-semibold text-blue-600">Save This Code</span>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                You will need this access code along with your Kukkiwon ID to check approval status and download your official ID card.
              </p>
              <div className="flex items-center justify-between bg-white border border-blue-200 rounded-xl px-3.5 py-2.5 mt-2">
                <span className="font-mono font-extrabold text-slate-900 text-sm tracking-wider select-all">
                  {successResult.athleteAccessToken}
                </span>
                <button
                  type="button"
                  onClick={copyAccessCode}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg transition"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Reference Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs space-y-3">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Registration Number</span>
              <span className="font-mono font-bold text-blue-600 text-sm">{successResult.registrationNumber}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Selected Template Badge</span>
              <span className="font-bold text-slate-900 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md">
                {cardRole}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Kukkiwon ID</span>
              <span className="font-mono font-bold text-slate-900">{successResult.kukkiwonId}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Athlete Name</span>
              <span className="font-semibold text-slate-900">{successResult.fullName}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Academy</span>
              <span className="text-slate-800">{successResult.academyName}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Category</span>
              <span className="text-blue-700 font-semibold">{successResult.weightCategoryName}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-500 font-medium">Status</span>
              <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-amber-800 font-semibold text-[11px]">
                PENDING_REVIEW
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href={`/athlete/status?query=${encodeURIComponent(successResult.kukkiwonId)}`}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl text-xs transition shadow-md shadow-blue-500/20"
            >
              Track Registration Status &rarr;
            </Link>
            <Link
              href="/"
              className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl text-xs transition border border-slate-300"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: CONFIRMATION SCREEN
  if (currentStep === 2) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-6 sm:p-12 max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 mb-6 transition font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Edit Details
        </button>

        <div className="flex items-center gap-3 mb-2">
          <span className="bg-blue-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-md tracking-wider uppercase">
            Step 2 of 2
          </span>
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
            Review & Final Confirmation
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950">
          Confirm Your Registration
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 mb-8">
          Please verify your details and selected ID card template before final submission.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Athlete Profile Summary with Cropped Photo and Badge Selection */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-200">
            <div className="w-32 h-40 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-md shrink-0 bg-slate-100">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Athlete Portrait" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No Photo</div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                Selected Template Badge
              </span>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className={`text-xs font-extrabold px-3 py-1 rounded-md uppercase ${currentTemplate?.badgeBg} shadow-xs`}>
                  {cardRole} BADGE
                </span>
                <span className="text-xs text-slate-500">• {currentTemplate?.subtitle}</span>
              </div>

              <h2 className="text-2xl font-bold text-slate-950 pt-1">{fullName}</h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="font-mono text-xs bg-slate-100 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-md">
                  KUKKIWON: {kukkiwonId.toUpperCase()}
                </span>
                <span className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md">
                  {danOrPoom}
                </span>
                <span className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md">
                  {gender}
                </span>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Selected Badge Template</span>
              <span className="font-bold text-blue-700">{cardRole} Badge Template</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Affiliated Academy</span>
              <span className="font-semibold text-slate-900">
                {selectedAcademy?.name} ({selectedAcademy?.city}, {selectedAcademy?.state})
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Registered Weight Category</span>
              <span className="font-semibold text-blue-700">{selectedWeightCategory?.name}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Competition Division</span>
              <span className="font-semibold text-slate-800">{selectedWeightCategory?.division}</span>
            </div>

            {contactPhone && (
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Contact Phone</span>
                <span className="text-slate-800">{contactPhone}</span>
              </div>
            )}

            {contactEmail && (
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Contact Email</span>
                <span className="text-slate-800">{contactEmail}</span>
              </div>
            )}
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
            <span>
              By submitting, you certify that the Kukkiwon certificate and photo represent the official participant credentials.
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setCurrentStep(1)}
              className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl text-xs transition border border-slate-300"
            >
              &larr; Make Changes
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinalSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl text-xs transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
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
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4 sm:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/images/kyorix-logo.png"
              alt="Kyorix Sport Technology"
              width={140}
              height={45}
              className="h-8 w-auto object-contain"
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
            Open International Kukkiwon Cup 2026
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
            Accreditation & ID Card Registration
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Select your accreditation badge template and enter your verified details to generate your championship pass.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {loadingOptions ? (
          <div className="text-center py-16 text-sm text-slate-500 bg-white rounded-3xl border border-slate-200">
            Loading championship options...
          </div>
        ) : (
          <form onSubmit={handleProceedToReview} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 space-y-8 shadow-sm">
            {/* Template Selection: 4 Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-blue-600" />
                  1. Choose ID Card Badge Template <span className="text-red-500">*</span>
                </h2>
                <span className="text-xs text-blue-600 font-semibold">4 Official Options</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TEMPLATE_OPTIONS.map((tmpl) => {
                  const isSelected = cardRole === tmpl.role;
                  return (
                    <button
                      type="button"
                      key={tmpl.role}
                      onClick={() => setCardRole(tmpl.role)}
                      className={`relative flex flex-col justify-between text-left rounded-2xl border-2 transition-all p-2.5 overflow-hidden ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/60 shadow-sm ring-2 ring-blue-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {/* Badge Preview Image */}
                      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-slate-100 mb-2 border border-slate-200/80">
                        <Image
                          src={tmpl.previewImg}
                          alt={tmpl.title}
                          fill
                          className="object-cover object-top"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${tmpl.badgeBg}`}>
                          {tmpl.role}
                        </span>
                        <div className="font-bold text-slate-900 text-xs mt-1 leading-snug">{tmpl.title}</div>
                        <div className="text-[10px] text-slate-500 truncate">{tmpl.subtitle}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Core Athlete Identification */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                <Award className="w-4 h-4 text-blue-600" />
                2. Kukkiwon Certificate Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Kukkiwon ID <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={kukkiwonId}
                      onChange={(e) => setKukkiwonId(e.target.value.toUpperCase())}
                      placeholder="e.g. 05123456 or KUK-987654"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 uppercase"
                    />
                    {checkingKukkiwon && (
                      <span className="absolute right-3 top-3 text-[11px] text-slate-500 animate-pulse">
                        Checking...
                      </span>
                    )}
                  </div>

                  {kukkiwonStatus.checked && (
                    <div className={`mt-1.5 text-[11px] font-medium flex items-center gap-1.5 ${
                      kukkiwonStatus.available ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {kukkiwonStatus.available ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{kukkiwonStatus.message}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Dan / Poom Rank <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={danOrPoom}
                    onChange={(e) => setDanOrPoom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="1st Dan">1st Dan (Black Belt)</option>
                    <option value="2nd Dan">2nd Dan</option>
                    <option value="3rd Dan">3rd Dan</option>
                    <option value="4th Dan">4th Dan (Master)</option>
                    <option value="5th Dan">5th Dan</option>
                    <option value="1st Poom">1st Poom (Junior)</option>
                    <option value="2nd Poom">2nd Poom (Junior)</option>
                    <option value="3rd Poom">3rd Poom (Junior)</option>
                    <option value="1st Geup">1st Geup (Color Belt)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name (As on Kukkiwon Certificate) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kang Hyun-Woo or John Doe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender("MALE")}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                        gender === "MALE"
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender("FEMALE")}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                        gender === "FEMALE"
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Academy & Category Affiliation */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                <Building className="w-4 h-4 text-blue-600" />
                3. Affiliation & Division
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Martial Arts Academy / Club <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={academyId}
                    onChange={(e) => setAcademyId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {academies.map((acad) => (
                      <option key={acad.id} value={acad.id}>
                        {acad.name} ({acad.city}, {acad.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Weight Category ({gender}) <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={weightCategoryId}
                    onChange={(e) => setWeightCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {weightCategories
                      .filter((w) => w.gender === gender)
                      .map((wc) => (
                        <option key={wc.id} value={wc.id}>
                          {wc.name} ({wc.division})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Contact Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Contact Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="athlete@domain.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Biometric Photograph Upload */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                <User className="w-4 h-4 text-blue-600" />
                4. Official Portrait Photograph <span className="text-red-500">*</span>
              </h2>

              <p className="text-xs text-slate-600">
                Upload a clear frontal portrait photo. Crop and position your face inside the official accreditation frame. JPEG, PNG, and WebP formats supported (Max 5 MB).
              </p>

              <PhotoCropper
                onCropComplete={(file: File, previewUrl: string) => {
                  setPhotoFile(file);
                  setPhotoPreview(previewUrl);
                }}
              />
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                You will review your details on the next screen before submission.
              </span>
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl shadow-md shadow-blue-500/20 transition-all text-sm"
              >
                Proceed to Confirmation
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
