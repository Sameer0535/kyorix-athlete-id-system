"use client";

import { useState, useEffect, useMemo } from "react";
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
  BadgeCheck,
  Trophy,
  Users,
  Phone,
  Mail,
  Briefcase,
  Layers,
  Activity,
  Zap,
  Shield,
  CreditCard,
  Swords,
} from "lucide-react";
import PhotoCropper from "@/components/PhotoCropper";
import { WT_COUNTRIES, getCountryByCode } from "@/lib/countries";

interface WeightCategory {
  id: string;
  code: string;
  name: string;
  division: string;
  gender: string;
}

export type DisciplineKey = "KYORUGI" | "POOMSAE" | "SPEED_KICKING" | "E_BREAKING" | "VIRTUAL_TKD";

interface DisciplineOption {
  key: DisciplineKey;
  title: string;
  subtitle: string;
}

const COMPETITION_DISCIPLINES: DisciplineOption[] = [
  { key: "KYORUGI", title: "KYORUGI", subtitle: "Sparring" },
  { key: "POOMSAE", title: "POOMSAE", subtitle: "Official Forms" },
  { key: "SPEED_KICKING", title: "SPEED KICKING", subtitle: "Individual & Team" },
  { key: "E_BREAKING", title: "E-BREAKING", subtitle: "Electronic Impact" },
  { key: "VIRTUAL_TKD", title: "VIRTUAL TKD", subtitle: "VR Motion" },
];

const RANK_OPTIONS = [
  // Black Belt / Poom (Regular Championship)
  { value: "1st Dan / Poom (Black Belt)", label: "1st Dan / Poom (Black Belt)", isRegular: true },
  { value: "2nd Dan / Poom", label: "2nd Dan / Poom", isRegular: true },
  { value: "3rd Dan / Poom", label: "3rd Dan / Poom", isRegular: true },
  { value: "4th Dan / Poom", label: "4th Dan / Poom", isRegular: true },
  { value: "5th Dan", label: "5th Dan", isRegular: true },
  { value: "6th Dan", label: "6th Dan", isRegular: true },
  { value: "7th Dan & Above", label: "7th Dan & Above", isRegular: true },
  // Color Belts (Freshers Championship)
  { value: "10th Kup (White Belt)", label: "10th Kup (White Belt)", isRegular: false },
  { value: "9th Kup (Yellow Stripe)", label: "9th Kup (Yellow Stripe)", isRegular: false },
  { value: "8th Kup (Yellow Belt)", label: "8th Kup (Yellow Belt)", isRegular: false },
  { value: "7th Kup (Green Stripe)", label: "7th Kup (Green Stripe)", isRegular: false },
  { value: "6th Kup (Green Belt)", label: "6th Kup (Green Belt)", isRegular: false },
  { value: "5th Kup (Blue Stripe)", label: "5th Kup (Blue Stripe)", isRegular: false },
  { value: "4th Kup (Blue Belt)", label: "4th Kup (Blue Belt)", isRegular: false },
  { value: "3rd Kup (Red Stripe)", label: "3rd Kup (Red Stripe)", isRegular: false },
  { value: "2nd Kup (Red Belt)", label: "2nd Kup (Red Belt)", isRegular: false },
  { value: "1st Kup (Black Stripe)", label: "1st Kup (Black Stripe)", isRegular: false },
];

const VT_COMPETITION_TYPES = [
  {
    id: "IND_FR" as const,
    title: "Male/Female – Individual Freshers",
    subtitle: "Color Belts (Freshers Tier)",
    codePrefix: "VT-IND-FR",
  },
  {
    id: "IND_REG" as const,
    title: "Male/Female – Individual Regular",
    subtitle: "Black Belt / Poom (Regular Tier)",
    codePrefix: "VT-IND-REG",
  },
  {
    id: "MIX_FR" as const,
    title: "Male/Female – Mix Gender Individual Freshers",
    subtitle: "Color Belts (Freshers Tier)",
    codePrefix: "VT-MIX-FR",
  },
  {
    id: "MIX_REG" as const,
    title: "Male/Female – Mix Gender Individual Regular",
    subtitle: "Black Belt / Poom (Regular Tier)",
    codePrefix: "VT-MIX-REG",
  },
];

const VT_AGE_DIVISIONS = [
  { id: "CHILD" as const, label: "CHILDREN", ageRange: "Under 12 Yrs / Ages 5–11" },
  { id: "SUBJUN" as const, label: "SUB JUNIOR", ageRange: "Ages 10–11 / Under 12" },
  { id: "CADET" as const, label: "CADET", ageRange: "Ages 12–14" },
  { id: "JUNIOR" as const, label: "JUNIOR", ageRange: "Ages 15–17" },
  { id: "SENIOR" as const, label: "SENIOR", ageRange: "Ages 17+" },
];

type CardRoleType = "PARTICIPANT" | "REFEREE" | "COACH" | "STAFF";

const TEMPLATE_OPTIONS: {
  role: CardRoleType;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Trophy;
  color: string;
  badgeBg: string;
  iconBg: string;
}[] = [
  {
    role: "PARTICIPANT",
    title: "Participant",
    subtitle: "Championship Athlete",
    description: "Official competitor badge for tournament athletes",
    icon: Trophy,
    color: "border-blue-600 bg-blue-50/70",
    badgeBg: "bg-blue-600 text-white",
    iconBg: "bg-blue-100 text-blue-700",
  },
  {
    role: "REFEREE",
    title: "Referee",
    subtitle: "Ring Judge / Official",
    description: "Accreditation pass for ring referees and mat judges",
    icon: Scale,
    color: "border-cyan-600 bg-cyan-50/70",
    badgeBg: "bg-cyan-600 text-white",
    iconBg: "bg-cyan-100 text-cyan-700",
  },
  {
    role: "COACH",
    title: "Coach",
    subtitle: "Team Coach / Master",
    description: "Official corner pass for registered team masters",
    icon: Award,
    color: "border-red-600 bg-red-50/70",
    badgeBg: "bg-red-600 text-white",
    iconBg: "bg-red-100 text-red-700",
  },
  {
    role: "STAFF",
    title: "Staff",
    subtitle: "Organising Committee",
    description: "Access pass for operational personnel and coordinators",
    icon: Users,
    color: "border-amber-600 bg-amber-50/70",
    badgeBg: "bg-amber-600 text-white",
    iconBg: "bg-amber-100 text-amber-700",
  },
];

export default function AthleteRegisterPage() {
  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Template / Role Selection
  const [cardRole, setCardRole] = useState<CardRoleType>("PARTICIPANT");

  // Common Fields
  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("IND");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Participant Specific Fields
  const [kukkiwonId, setKukkiwonId] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [academyName, setAcademyName] = useState("");
  const [selectedDisciplines, setSelectedDisciplines] = useState<DisciplineKey[]>(["KYORUGI"]);
  const [rankGrade, setRankGrade] = useState("1st Dan / Poom (Black Belt)");

  // Discipline-specific selections
  const [kyorugiTier, setKyorugiTier] = useState<"REGULAR" | "FRESHERS">("REGULAR");
  const [poomsaeTier, setPoomsaeTier] = useState<"REGULAR" | "FRESHERS">("REGULAR");
  const [vtType, setVtType] = useState<"IND_REG" | "IND_FR" | "MIX_REG" | "MIX_FR">("IND_REG");
  const [vtDivision, setVtDivision] = useState<"CHILD" | "SUBJUN" | "CADET" | "JUNIOR" | "SENIOR">("SENIOR");
  const [kyorugiDivision, setKyorugiDivision] = useState("SENIOR");
  const [kyorugiWeightId, setKyorugiWeightId] = useState("");
  const [poomsaeType, setPoomsaeType] = useState<"INDIVIDUAL" | "MIX_PAIR" | "TRIO_TEAM">("INDIVIDUAL");
  const [poomsaeCategoryId, setPoomsaeCategoryId] = useState("");
  const [speedKickDivision, setSpeedKickDivision] = useState("SENIOR");
  const [breakingDivision, setBreakingDivision] = useState("SENIOR");

  const [weightCategoryId, setWeightCategoryId] = useState("");
  const [secondaryEvent, setSecondaryEvent] = useState("");

  // Referee Specific Fields
  const [officiatingRole, setOfficiatingRole] = useState("Ring Judge / Referee");
  const [refereeKukkiwonDan, setRefereeKukkiwonDan] = useState("");
  const [officiatingUnit, setOfficiatingUnit] = useState("");

  // Coach Specific Fields
  const [accreditedRole, setAccreditedRole] = useState("Corner Coach");
  const [coachKukkiwonDan, setCoachKukkiwonDan] = useState("");
  const [coachAcademyName, setCoachAcademyName] = useState("");

  // Staff Specific Fields
  const [committeeDesignation, setCommitteeDesignation] = useState("Organising Committee");
  const [hostUnit, setHostUnit] = useState("Kukkiwon India North Branch");
  const [staffId, setStaffId] = useState("");

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
    countryCode?: string;
    countryName?: string;
    cardRole?: string;
    notes?: string;
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

  // Load weight categories with instant sessionStorage cache
  useEffect(() => {
    async function loadOptions() {
      try {
        if (typeof window !== "undefined") {
          const cached = sessionStorage.getItem("kyorix_weight_categories");
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setWeightCategories(parsed);
                setLoadingOptions(false);
              }
            } catch {
              // ignore
            }
          }
        }

        const res = await fetch("/api/meta/options");
        const data = await res.json();
        if (data.success) {
          const wcs = data.data.weightCategories || [];
          setWeightCategories(wcs);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("kyorix_weight_categories", JSON.stringify(wcs));
          }
        }
      } catch {
        setError("Could not load registration options from server.");
      } finally {
        setLoadingOptions(false);
      }
    }
    loadOptions();
  }, []);

  const isRegularRank = useMemo(() => {
    const found = RANK_OPTIONS.find((r) => r.value === rankGrade);
    return found ? found.isRegular : true;
  }, [rankGrade]);

  const toggleDiscipline = (key: DisciplineKey) => {
    setSelectedDisciplines((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // keep at least one discipline
        return prev.filter((k) => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  // Sync tiers with selected rank
  useEffect(() => {
    const tier = isRegularRank ? "REGULAR" : "FRESHERS";
    setKyorugiTier(tier);
    setPoomsaeTier(tier);
    if (!isRegularRank) {
      if (vtType === "IND_REG") setVtType("IND_FR");
      if (vtType === "MIX_REG") setVtType("MIX_FR");
    } else {
      if (vtType === "IND_FR") setVtType("IND_REG");
      if (vtType === "MIX_FR") setVtType("MIX_REG");
    }
  }, [isRegularRank]);

  // Auto-correct division/type when tier switches
  useEffect(() => {
    if (kyorugiTier === "REGULAR" && kyorugiDivision === "CHILDREN") {
      setKyorugiDivision("SUB_JUNIOR");
    }
  }, [kyorugiTier, kyorugiDivision]);

  useEffect(() => {
    if (poomsaeTier === "FRESHERS" && poomsaeType === "TRIO_TEAM") {
      setPoomsaeType("INDIVIDUAL");
    }
  }, [poomsaeTier, poomsaeType]);

  // Filtered Kyorugi Categories for Participant
  const filteredKyorugiCategories = useMemo(() => {
    return weightCategories.filter((wc) => {
      if (wc.gender !== gender) return false;
      const isTierMatch = kyorugiTier === "REGULAR"
        ? wc.code.startsWith("KY_REG_") && !wc.code.includes("TEAM")
        : wc.code.startsWith("KY_FR_");
      if (!isTierMatch) return false;

      if (kyorugiDivision === "CHILDREN") return wc.code.includes("_CH_") || wc.division === "SUB_CADET";
      if (kyorugiDivision === "SUB_JUNIOR") return wc.code.includes("_SUBJR_") || wc.division === "SUB_CADET";
      if (kyorugiDivision === "CADET") return wc.division === "CADET";
      if (kyorugiDivision === "JUNIOR") return wc.division === "JUNIOR";
      if (kyorugiDivision === "SENIOR") return wc.division === "SENIOR";

      return true;
    });
  }, [weightCategories, gender, kyorugiTier, kyorugiDivision]);

  useEffect(() => {
    if (filteredKyorugiCategories.length > 0) {
      const exists = filteredKyorugiCategories.some((w) => w.id === kyorugiWeightId);
      if (!exists) {
        setKyorugiWeightId(filteredKyorugiCategories[0].id);
      }
    }
  }, [filteredKyorugiCategories, kyorugiWeightId]);

  // Filtered Poomsae Categories
  const filteredPoomsaeCategories = useMemo(() => {
    return weightCategories.filter((wc) => {
      if (poomsaeType === "INDIVIDUAL") {
        if (wc.gender !== gender) return false;
        return poomsaeTier === "REGULAR"
          ? wc.code.startsWith("POOM_REG_IND_")
          : wc.code.startsWith("POOM_FR_IND_");
      }
      if (poomsaeType === "MIX_PAIR") {
        return poomsaeTier === "REGULAR"
          ? wc.code.startsWith("POOM_REG_PAIR_")
          : wc.code.startsWith("POOM_FR_PAIR_");
      }
      if (poomsaeType === "TRIO_TEAM") {
        return wc.code.includes("TEAM") && wc.code.includes("POOM");
      }
      return wc.code.startsWith("POOM_");
    });
  }, [weightCategories, gender, poomsaeTier, poomsaeType]);

  useEffect(() => {
    if (filteredPoomsaeCategories.length > 0) {
      const exists = filteredPoomsaeCategories.some((w) => w.id === poomsaeCategoryId);
      if (!exists) {
        setPoomsaeCategoryId(filteredPoomsaeCategories[0].id);
      }
    }
  }, [filteredPoomsaeCategories, poomsaeCategoryId]);

  // Dynamic active categories list across all selected disciplines
  const activeCategories = useMemo(() => {
    const list: { discipline: string; name: string; id: string }[] = [];

    // 1. Kyorugi
    if (selectedDisciplines.includes("KYORUGI")) {
      const cat = weightCategories.find((w) => w.id === kyorugiWeightId) || filteredKyorugiCategories[0];
      if (cat) {
        list.push({
          discipline: "Kyorugi (Sparring)",
          name: cat.name,
          id: cat.id,
        });
      }
    }

    // 2. Virtual Taekwondo
    if (selectedDisciplines.includes("VIRTUAL_TKD")) {
      const typeObj = VT_COMPETITION_TYPES.find((t) => t.id === vtType) || VT_COMPETITION_TYPES[0];
      const cat =
        weightCategories.find((w) => w.code.startsWith(typeObj.codePrefix) && w.code.endsWith(vtDivision)) ||
        weightCategories.find((w) => w.code.startsWith(typeObj.codePrefix)) ||
        weightCategories.find((w) => w.code.startsWith("VT-"));
      if (cat) {
        list.push({
          discipline: "Virtual Taekwondo",
          name: cat.name,
          id: cat.id,
        });
      }
    }

    // 3. Poomsae
    if (selectedDisciplines.includes("POOMSAE")) {
      const cat = weightCategories.find((w) => w.id === poomsaeCategoryId) || filteredPoomsaeCategories[0];
      if (cat) {
        list.push({
          discipline: "Recognised Poomsae",
          name: cat.name,
          id: cat.id,
        });
      }
    }

    // 4. Speed Kicking
    if (selectedDisciplines.includes("SPEED_KICKING")) {
      const cat =
        weightCategories.find(
          (w) =>
            w.code.startsWith("SPEED_KICK_") &&
            (w.division === speedKickDivision || w.name.includes(speedKickDivision))
        ) || weightCategories.find((w) => w.code.startsWith("SPEED_KICK_"));
      if (cat) {
        list.push({
          discipline: "Speed Kicking",
          name: cat.name,
          id: cat.id,
        });
      }
    }

    // 5. Electronic Breaking (Kyukpa)
    if (selectedDisciplines.includes("E_BREAKING")) {
      const cat =
        weightCategories.find(
          (w) =>
            w.code.startsWith("KYUKPA_") &&
            (w.division === breakingDivision || w.name.includes(breakingDivision))
        ) || weightCategories.find((w) => w.code.startsWith("KYUKPA_"));
      if (cat) {
        list.push({
          discipline: "Electronic Breaking (Kyukpa)",
          name: cat.name,
          id: cat.id,
        });
      }
    }

    return list;
  }, [
    selectedDisciplines,
    kyorugiWeightId,
    filteredKyorugiCategories,
    vtType,
    vtDivision,
    weightCategories,
    poomsaeCategoryId,
    filteredPoomsaeCategories,
    speedKickDivision,
    breakingDivision,
  ]);

  const primaryCategoryId = activeCategories[0]?.id || (weightCategories[0]?.id ?? "");

  const compiledNotes = useMemo(() => {
    const additional = activeCategories.slice(1).map((c) => c.name);
    if (secondaryEvent.trim()) {
      additional.push(secondaryEvent.trim());
    }
    return additional.join(" • ");
  }, [activeCategories, secondaryEvent]);

  // Real-time Kukkiwon check for participant
  useEffect(() => {
    const trimmed = (cardRole === "PARTICIPANT" ? kukkiwonId : cardRole === "COACH" ? coachKukkiwonDan : refereeKukkiwonDan).trim().toUpperCase();
    if (trimmed.length < 4) {
      setKukkiwonStatus({ checked: false });
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingKukkiwon(true);
      try {
        const res = await fetch(`/api/athletes/check-kukkiwon?kukkiwonId=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data.success) {
          const isAvail = Boolean(data.data.available ?? data.data.isAvailable);
          setKukkiwonStatus({
            checked: true,
            available: isAvail,
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
  }, [kukkiwonId, coachKukkiwonDan, refereeKukkiwonDan, cardRole]);

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Full legal name is required.");
      return;
    }

    if (cardRole === "PARTICIPANT") {
      if (!kukkiwonId.trim()) {
        setError("Kukkiwon ID is required.");
        return;
      }
      if (kukkiwonStatus.checked && kukkiwonStatus.available === false) {
        setError("This Kukkiwon ID is already registered in the system.");
        return;
      }
      if (!academyName.trim()) {
        setError("Please enter your martial arts academy or club name.");
        return;
      }
      if (selectedDisciplines.length === 0) {
        setError("Please select at least 1 competition discipline.");
        return;
      }
      if (!primaryCategoryId) {
        setError("Please configure your competition category.");
        return;
      }
    } else if (cardRole === "REFEREE") {
      if (!refereeKukkiwonDan.trim()) {
        setError("Kukkiwon Dan ID is required for referee accreditation.");
        return;
      }
      if (!officiatingUnit.trim()) {
        setError("Officiating State Association / Unit is required.");
        return;
      }
    } else if (cardRole === "COACH") {
      if (!coachKukkiwonDan.trim()) {
        setError("Kukkiwon Dan ID is required for coach accreditation.");
        return;
      }
      if (!coachAcademyName.trim()) {
        setError("Official Academy / Dojang Name is required.");
        return;
      }
    } else if (cardRole === "STAFF") {
      if (!hostUnit.trim()) {
        setError("Host Unit / Organisation is required.");
        return;
      }
    }

    if (!photoFile) {
      setError("Please upload and crop your portrait photograph.");
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
      formData.append("cardRole", cardRole);
      formData.append("fullName", fullName.trim().toUpperCase());
      formData.append("countryCode", countryCode);
      formData.append("countryName", getCountryByCode(countryCode).name);
      formData.append("photo", photoFile);

      if (cardRole === "PARTICIPANT") {
        formData.append("kukkiwonId", kukkiwonId.trim().toUpperCase());
        formData.append("gender", gender);
        formData.append("academyName", academyName.trim().toUpperCase());
        formData.append("weightCategoryId", primaryCategoryId);
        formData.append("danOrPoom", rankGrade);
        if (compiledNotes.trim()) {
          formData.append("notes", compiledNotes.trim());
        }
      } else if (cardRole === "REFEREE") {
        formData.append("kukkiwonId", refereeKukkiwonDan.trim().toUpperCase());
        formData.append("kukkiwonDanId", refereeKukkiwonDan.trim().toUpperCase());
        formData.append("academyName", officiatingUnit.trim().toUpperCase());
        formData.append("officiatingRole", officiatingRole);
        formData.append("notes", officiatingRole);
        if (contactPhone) formData.append("contactPhone", contactPhone.trim());
        if (contactEmail) formData.append("contactEmail", contactEmail.trim());
      } else if (cardRole === "COACH") {
        formData.append("kukkiwonId", coachKukkiwonDan.trim().toUpperCase());
        formData.append("kukkiwonDanId", coachKukkiwonDan.trim().toUpperCase());
        formData.append("academyName", coachAcademyName.trim().toUpperCase());
        formData.append("accreditedRole", accreditedRole);
        formData.append("notes", accreditedRole);
        if (contactPhone) formData.append("contactPhone", contactPhone.trim());
        if (contactEmail) formData.append("contactEmail", contactEmail.trim());
      } else if (cardRole === "STAFF") {
        const staffIdentifier = staffId.trim() || `STAFF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        formData.append("kukkiwonId", staffIdentifier.toUpperCase());
        formData.append("academyName", hostUnit.trim().toUpperCase());
        formData.append("designation", committeeDesignation);
        formData.append("notes", committeeDesignation);
        if (contactPhone) formData.append("contactPhone", contactPhone.trim());
        if (contactEmail) formData.append("contactEmail", contactEmail.trim());
      }

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

  const selectedWeightCategory = weightCategories.find((w) => w.id === weightCategoryId);
  const currentTemplate = TEMPLATE_OPTIONS.find((t) => t.role === cardRole);

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

          {/* Reference Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs space-y-3">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Registration Number</span>
              <span className="font-mono font-bold text-blue-600 text-sm">{successResult.registrationNumber}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Accreditation Role</span>
              <span className="font-bold text-slate-900 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md">
                {cardRole}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Full Name</span>
              <span className="font-semibold text-slate-900">{successResult.fullName}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Country (WT)</span>
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <span>{getCountryByCode(countryCode).flagEmoji}</span>
                <span>{getCountryByCode(countryCode).name} ({countryCode})</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">
                {cardRole === "COACH" ? "Dojang / Academy" : cardRole === "REFEREE" ? "Officiating Unit" : cardRole === "STAFF" ? "Host Unit" : "Martial Arts Academy"}
              </span>
              <span className="text-slate-800 font-semibold">{successResult.academyName}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">
                {cardRole === "COACH" ? "Accredited Role" : cardRole === "REFEREE" ? "Officiating Role" : cardRole === "STAFF" ? "Designation" : "Tournament Category"}
              </span>
              <span className="text-blue-700 font-semibold">
                {cardRole === "COACH"
                  ? accreditedRole
                  : cardRole === "REFEREE"
                  ? officiatingRole
                  : cardRole === "STAFF"
                  ? committeeDesignation
                  : successResult.weightCategoryName}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-500 font-medium">Approval Status</span>
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
          {/* Profile Summary with Cropped Photo and Badge Selection */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-200">
            <div className="w-32 h-40 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-md shrink-0 bg-slate-100">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Portrait" className="w-full h-full object-cover" />
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

              <h2 className="text-2xl font-bold text-slate-950 pt-1">{fullName.toUpperCase()}</h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="text-xs bg-slate-100 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1">
                  <span>{getCountryByCode(countryCode).flagEmoji}</span>
                  <span>{countryCode}</span>
                </span>
                {cardRole === "PARTICIPANT" && (
                  <>
                    <span className="font-mono text-xs bg-slate-100 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-md">
                      KUKKIWON ID: {kukkiwonId.toUpperCase()}
                    </span>
                    <span className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md">
                      {gender}
                    </span>
                  </>
                )}
                {cardRole === "REFEREE" && refereeKukkiwonDan && (
                  <span className="font-mono text-xs bg-slate-100 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-md">
                    DAN ID: {refereeKukkiwonDan.toUpperCase()}
                  </span>
                )}
                {cardRole === "COACH" && coachKukkiwonDan && (
                  <span className="font-mono text-xs bg-slate-100 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-md">
                    DAN ID: {coachKukkiwonDan.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Selected Badge Template</span>
              <span className="font-bold text-blue-700">{cardRole} Official Pass</span>
            </div>

            {cardRole === "PARTICIPANT" && (
              <>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Kukkiwon ID</span>
                  <span className="font-mono font-bold text-slate-900">{kukkiwonId.toUpperCase()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Competitor Rank</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{rankGrade}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      isRegularRank
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {isRegularRank ? "REGULAR" : "FRESHERS"}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Affiliated Academy / Club</span>
                  <span className="font-semibold text-slate-900 uppercase">{academyName}</span>
                </div>
                <div className="py-2 border-b border-slate-200 space-y-1.5">
                  <div className="text-slate-500 font-medium">
                    <span>Registered Events ({activeCategories.length})</span>
                  </div>
                  {activeCategories.map((cat, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-2.5">
                      <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider block">
                        {cat.discipline}
                      </span>
                      <span className="font-bold text-slate-900">{cat.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {cardRole === "REFEREE" && (
              <>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Officiating Role / Title</span>
                  <span className="font-bold text-cyan-800">{officiatingRole}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Kukkiwon Dan ID</span>
                  <span className="font-mono font-bold text-slate-900">{refereeKukkiwonDan.toUpperCase()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Officiating Unit / State Association</span>
                  <span className="font-semibold text-slate-900 uppercase">{officiatingUnit}</span>
                </div>
              </>
            )}

            {cardRole === "COACH" && (
              <>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Accredited Role</span>
                  <span className="font-bold text-red-800">{accreditedRole}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Kukkiwon Dan ID</span>
                  <span className="font-mono font-bold text-slate-900">{coachKukkiwonDan.toUpperCase()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Academy / Dojang Name</span>
                  <span className="font-semibold text-slate-900 uppercase">{coachAcademyName}</span>
                </div>
                {contactPhone && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Contact Mobile</span>
                    <span className="font-semibold text-slate-900">{contactPhone}</span>
                  </div>
                )}
              </>
            )}

            {cardRole === "STAFF" && (
              <>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Committee Designation</span>
                  <span className="font-bold text-amber-800">{committeeDesignation}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Host Unit</span>
                  <span className="font-semibold text-slate-900 uppercase">{hostUnit}</span>
                </div>
                {contactPhone && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Contact Mobile</span>
                    <span className="font-semibold text-slate-900">{contactPhone}</span>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between py-1">
              <span className="text-slate-500">Representing Country</span>
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <span>{getCountryByCode(countryCode).flagEmoji}</span>
                <span>{getCountryByCode(countryCode).name} ({countryCode})</span>
              </span>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
            <span>
              By submitting, you certify that the accreditation details and photo represent official championship credentials.
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
              {submitting ? "Submitting Registration..." : "Confirm & Submit Credentials"}
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
            Open International Championship 2026
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
            Accreditation & ID Card Registration
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Select your accreditation role category and enter your verified details to generate your championship pass.
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
            {/* Role Category Selection: 4 Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-blue-600" />
                  1. Select Accreditation Role <span className="text-red-500">*</span>
                </h2>
                <span className="text-xs text-blue-600 font-semibold">4 Official Categories</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {TEMPLATE_OPTIONS.map((tmpl) => {
                  const isSelected = cardRole === tmpl.role;
                  const IconComp = tmpl.icon;
                  return (
                    <button
                      type="button"
                      key={tmpl.role}
                      onClick={() => setCardRole(tmpl.role)}
                      className={`relative flex flex-col justify-between text-left rounded-2xl border-2 transition-all p-4 ${
                        isSelected
                          ? `${tmpl.color} shadow-sm ring-2 ring-blue-500/20`
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3 w-full">
                        <div className={`w-10 h-10 rounded-xl ${tmpl.iconBg} flex items-center justify-center shrink-0`}>
                          <IconComp className="w-5 h-5" />
                        </div>
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                        )}
                      </div>

                      <div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${tmpl.badgeBg}`}>
                          {tmpl.role}
                        </span>
                        <div className="font-bold text-slate-900 text-sm mt-2 leading-snug">{tmpl.title}</div>
                        <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">{tmpl.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Identification & Credentials (Dynamic based on selected Role) */}
            {cardRole === "PARTICIPANT" && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                  <User className="w-4 h-4 text-blue-600" />
                  2. Competitor Identification
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
                        placeholder="e.g. KKWID-261103-0731-2765 or 05123456"
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
                      Nationality / Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {WT_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flagEmoji} {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Legal Name (As on Certificate) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. YIGDEEP SINGH RISHI"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 uppercase"
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
            )}

            {cardRole === "REFEREE" && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Scale className="w-4 h-4 text-cyan-600" />
                  2. Ring Official & Referee Credentials
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. MANOJ SHARMA"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nationality / Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    >
                      {WT_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flagEmoji} {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Officiating Role / Title <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={officiatingRole}
                      onChange={(e) => setOfficiatingRole(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    >
                      <option value="Ring Judge / Referee">Ring Judge / Referee</option>
                      <option value="International Referee (IR)">International Referee (IR)</option>
                      <option value="National Referee (NR)">National Referee (NR)</option>
                      <option value="Chief Ring Referee">Chief Ring Referee</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Kukkiwon Dan ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={refereeKukkiwonDan}
                      onChange={(e) => setRefereeKukkiwonDan(e.target.value.toUpperCase())}
                      placeholder="e.g. KKWID-261012-0842-1923 or 4TH DAN"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Officiating Unit / State Association <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={officiatingUnit}
                    onChange={(e) => setOfficiatingUnit(e.target.value)}
                    placeholder="e.g. Delhi Taekwondo Association or Referee Committee"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 uppercase"
                  />
                </div>
              </div>
            )}

            {cardRole === "COACH" && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Award className="w-4 h-4 text-red-600" />
                  2. Team Coach / Master Credentials
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Legal Coach Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. DIVYESH SINGH or ABHISHEK KUMAR"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nationality / Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    >
                      {WT_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flagEmoji} {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Academy / Dojang Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={coachAcademyName}
                      onChange={(e) => setCoachAcademyName(e.target.value)}
                      placeholder="e.g. TRUEKICK TAEKWONDO ACADEMY"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Accredited Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={accreditedRole}
                      onChange={(e) => setAccreditedRole(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="Corner Coach">Corner Coach</option>
                      <option value="Head Coach / Delegation Leader">Head Coach / Delegation Leader</option>
                      <option value="Team Master">Team Master</option>
                      <option value="Assistant Coach">Assistant Coach</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Kukkiwon Dan ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={coachKukkiwonDan}
                      onChange={(e) => setCoachKukkiwonDan(e.target.value.toUpperCase())}
                      placeholder="e.g. KKWID-261103-1110-3733"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="coach@academy.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {cardRole === "STAFF" && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  2. Organising Committee & Staff Credentials
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Operational Staff Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. RAJESH VERMA"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nationality / Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    >
                      {WT_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flagEmoji} {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Committee Designation <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={committeeDesignation}
                      onChange={(e) => setCommitteeDesignation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    >
                      <option value="Organising Committee">Organising Committee</option>
                      <option value="Tournament Director">Tournament Director</option>
                      <option value="Medical Staff">Medical Staff</option>
                      <option value="Technical Operations / IT">Technical Operations / IT</option>
                      <option value="Security & Arena Logistics">Security & Arena Logistics</option>
                      <option value="Awards & Protocol">Awards & Protocol</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Host Unit / Organisation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={hostUnit}
                      onChange={(e) => setHostUnit(e.target.value)}
                      placeholder="e.g. Kukkiwon India North Branch or Kyorix Sports"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Contact Phone (For Arena Coordination)
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Staff ID / Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={staffId}
                      onChange={(e) => setStaffId(e.target.value)}
                      placeholder="e.g. STAFF-OC-01"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 uppercase"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section 3: Tournament Categories & Affiliation (Participant Only) */}
            {cardRole === "PARTICIPANT" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-600" />
                    3. Academy & Competition Disciplines <span className="text-red-500">*</span>
                  </h2>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Martial Arts Academy / Club Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={academyName}
                    onChange={(e) => setAcademyName(e.target.value)}
                    placeholder="e.g. DTTA or TRUEKICK TAEKWONDO ACADEMY"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 uppercase"
                  />
                </div>

                {/* 1. SELECT COMPETITION DISCIPLINES (Multi-select) */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-blue-600" />
                        SELECT COMPETITION DISCIPLINES <span className="text-red-500">*</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Select 1 or multiple events at once (Sparring, Forms, Speed Kicking, E-Breaking, Virtual TKD).
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                        {selectedDisciplines.length} {selectedDisciplines.length === 1 ? "EVENT" : "EVENTS"} SELECTED
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {COMPETITION_DISCIPLINES.map((d) => {
                      const isSelected = selectedDisciplines.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => toggleDiscipline(d.key)}
                          className={`rounded-2xl p-3.5 text-left transition relative flex flex-col justify-between min-h-[96px] border ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 w-full">
                            <span className={`text-xs font-bold uppercase tracking-tight ${isSelected ? "text-blue-900" : "text-slate-900"}`}>
                              {d.title}
                            </span>
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected ? "bg-blue-600 text-white" : "border border-slate-300 bg-white"
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </div>
                          <div className="pt-3">
                            <span className={`text-[11px] ${isSelected ? "text-blue-700 font-semibold" : "text-slate-500 font-medium"}`}>
                              {d.subtitle}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. COMPETITOR BELT / RANK GRADE */}
                <div className="space-y-2 bg-slate-50/50 border border-slate-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-blue-600" />
                      COMPETITOR BELT / RANK GRADE <span className="text-red-500">*</span>
                    </label>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                      isRegularRank
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {isRegularRank ? "BLACK BELT / POOM (REGULAR)" : "COLOR BELT (FRESHERS)"}
                    </span>
                  </div>

                  <select
                    value={rankGrade}
                    onChange={(e) => setRankGrade(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <optgroup label="Black Belt / Poom (Regular Championship)">
                      {RANK_OPTIONS.filter((r) => r.isRegular).map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Color Belts (Freshers Championship)">
                      {RANK_OPTIONS.filter((r) => !r.isRegular).map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  <p className="text-[11px] text-slate-500">
                    Select your official Kukkiwon Dan/Poom rank or Color Belt grade. Black Belts / Poom must hold an authentic Kukkiwon Dan or Poom certificate.
                  </p>
                </div>

                {/* 3. DEDICATED EVENT DETAILS CARDS */}

                {/* A. VIRTUAL TAEKWONDO EVENT DETAILS */}
                {selectedDisciplines.includes("VIRTUAL_TKD") && (
                  <div className="bg-white border-2 border-blue-500/40 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Award className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                        VIRTUAL TAEKWONDO EVENT DETAILS
                      </h4>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        VIRTUAL TAEKWONDO COMPETITION TYPE <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {VT_COMPETITION_TYPES.map((t) => {
                          const isSelected = vtType === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setVtType(t.id)}
                              className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                                isSelected
                                  ? "border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <div>
                                <div className={`text-xs font-bold ${isSelected ? "text-blue-900" : "text-slate-900"}`}>
                                  {t.title}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {t.subtitle}
                                </div>
                              </div>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                isSelected ? "bg-blue-600 text-white" : "border border-slate-300 bg-white"
                              }`}>
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        AGE DIVISION <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {VT_AGE_DIVISIONS.map((d) => {
                          const isSelected = vtDivision === d.id;
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setVtDivision(d.id)}
                              className={`p-3 rounded-xl border text-center transition ${
                                isSelected
                                  ? "border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-600"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <div className={`text-xs font-bold uppercase ${isSelected ? "text-blue-900" : "text-slate-800"}`}>
                                {d.label}
                              </div>
                              <div className={`text-[10px] mt-0.5 ${isSelected ? "text-blue-700 font-medium" : "text-slate-500"}`}>
                                {d.ageRange}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* B. KYORUGI (SPARRING) EVENT DETAILS */}
                {selectedDisciplines.includes("KYORUGI") && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Swords className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                          KYORUGI (SPARRING) EVENT DETAILS
                        </h4>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                        kyorugiTier === "REGULAR"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {kyorugiTier} DIVISION
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Competition Tier <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setKyorugiTier("REGULAR")}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                            kyorugiTier === "REGULAR"
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          Regular (Black Belt / Poom)
                        </button>
                        <button
                          type="button"
                          onClick={() => setKyorugiTier("FRESHERS")}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                            kyorugiTier === "FRESHERS"
                              ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          Freshers (Color Belts)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase">
                          Age Division <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={kyorugiDivision}
                          onChange={(e) => setKyorugiDivision(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          {kyorugiTier === "FRESHERS" && (
                            <option value="CHILDREN">Children (Ages 5–11 / Born 2014+)</option>
                          )}
                          <option value="SUB_JUNIOR">Sub-Junior (Ages 10–11 / Born 2013–2014)</option>
                          <option value="CADET">Cadet (Ages 12–14 / Born 2010–2012)</option>
                          <option value="JUNIOR">Junior (Ages 15–17 / Born 2007–2009)</option>
                          <option value="SENIOR">Senior (17+ Years / Born 2007 & Before)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase">
                          Weight Category ({gender}) <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={kyorugiWeightId}
                          onChange={(e) => setKyorugiWeightId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          {filteredKyorugiCategories.map((wc) => (
                            <option key={wc.id} value={wc.id}>
                              {wc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* C. RECOGNISED POOMSAE EVENT DETAILS */}
                {selectedDisciplines.includes("POOMSAE") && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                          RECOGNISED POOMSAE EVENT DETAILS
                        </h4>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                        poomsaeTier === "REGULAR"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {poomsaeTier} DIVISION
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Competition Tier <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPoomsaeTier("REGULAR")}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                            poomsaeTier === "REGULAR"
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          Regular (Black Belt / Poom)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPoomsaeTier("FRESHERS")}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                            poomsaeTier === "FRESHERS"
                              ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          Freshers (Color Belts)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase">
                          Poomsae Division / Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={poomsaeType}
                          onChange={(e) => setPoomsaeType(e.target.value as "INDIVIDUAL" | "MIX_PAIR" | "TRIO_TEAM")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="INDIVIDUAL">Individual Recognized Poomsae</option>
                          <option value="MIX_PAIR">Mixed Pair Recognized Poomsae</option>
                          {poomsaeTier === "REGULAR" && (
                            <option value="TRIO_TEAM">Trio Team Recognized Poomsae</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={poomsaeCategoryId}
                          onChange={(e) => setPoomsaeCategoryId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          {filteredPoomsaeCategories.map((wc) => (
                            <option key={wc.id} value={wc.id}>
                              {wc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* D. SPEED KICKING EVENT DETAILS */}
                {selectedDisciplines.includes("SPEED_KICKING") && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                        SPEED KICKING EVENT DETAILS
                      </h4>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase">
                        Age Division (Electronic Impact Counter) <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={speedKickDivision}
                        onChange={(e) => setSpeedKickDivision(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="SUB_CADET">Sub-Junior (Ages 10–11)</option>
                        <option value="CADET">Cadet (Ages 12–14)</option>
                        <option value="JUNIOR">Junior (Ages 15–17)</option>
                        <option value="SENIOR">Senior (17+ Years)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* E. ELECTRONIC BREAKING (KYUKPA) EVENT DETAILS */}
                {selectedDisciplines.includes("E_BREAKING") && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                        ELECTRONIC BREAKING (KYUKPA) EVENT DETAILS
                      </h4>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase">
                        Age Division (Board Breaking Assessment) <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={breakingDivision}
                        onChange={(e) => setBreakingDivision(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="SUB_CADET">Sub-Junior (Ages 10–11)</option>
                        <option value="CADET">Cadet (Ages 12–14)</option>
                        <option value="JUNIOR">Junior (Ages 15–17)</option>
                        <option value="SENIOR">Senior (17+ Years)</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Optional Additional Presentation Notes
                  </label>
                  <input
                    type="text"
                    value={secondaryEvent}
                    onChange={(e) => setSecondaryEvent(e.target.value)}
                    placeholder="e.g. Additional arena or team presentation notes"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Your selected disciplines ({activeCategories.map((c) => c.discipline).join(", ")}) will automatically be combined and printed on line 4 of your official championship ID card.
                  </span>
                </div>
              </div>
            )}

            {/* Section 4: Portrait Photograph Upload */}
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
