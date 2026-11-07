import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateKukkiwonId, logAuditEvent } from "@/lib/security";
import { savePrivateFile } from "@/lib/storage";
import { apiSuccess, apiError } from "@/lib/api-response";
import { hashAthleteAccessCode } from "@/lib/auth";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const kukkiwonIdRaw = (formData.get("kukkiwonId") as string) || (formData.get("athleteId") as string);
    const fullName = formData.get("fullName") as string;
    const gender = (formData.get("gender") as string) || "MALE";
    const academyIdRaw = formData.get("academyId") as string | null;
    const academyNameRaw = formData.get("academyName") as string | null;
    const weightCategoryId = formData.get("weightCategoryId") as string;
    const danOrPoom = (formData.get("danOrPoom") as string) || null;
    const contactPhone = (formData.get("contactPhone") as string) || null;
    const contactEmail = (formData.get("contactEmail") as string) || null;
    const photoFile = formData.get("photo") as File | null;
    const cardRoleRaw = ((formData.get("cardRole") as string) || "PARTICIPANT").toUpperCase();
    const cardRole = ["PARTICIPANT", "REFEREE", "COACH", "STAFF"].includes(cardRoleRaw)
      ? cardRoleRaw
      : "PARTICIPANT";

    // 1. Validation
    const trimmedAcademy = academyNameRaw?.trim() || "";
    if (!kukkiwonIdRaw || !fullName || (!academyIdRaw && !trimmedAcademy) || !weightCategoryId) {
      return apiError(
        "Kukkiwon ID, full name, academy name, and weight category are required fields.",
        "VALIDATION_ERROR",
        400
      );
    }

    if (!photoFile || photoFile.size === 0) {
      return apiError("An athlete photograph is required.", "MISSING_PHOTO", 400);
    }

    const kukkiwonValidation = validateKukkiwonId(kukkiwonIdRaw);
    if (!kukkiwonValidation.valid || !kukkiwonValidation.normalized) {
      return apiError(
        kukkiwonValidation.error || "Invalid Kukkiwon ID.",
        "INVALID_KUKKIWON_ID",
        400
      );
    }
    const kukkiwonId = kukkiwonValidation.normalized;

    // 2. Check for duplicate Kukkiwon ID
    const existingAthlete = await prisma.athlete.findUnique({
      where: { kukkiwonId },
    });

    if (existingAthlete) {
      return apiError(
        `An athlete with Kukkiwon ID '${kukkiwonId}' is already registered in the system. Duplicate Kukkiwon IDs are strictly prohibited.`,
        "DUPLICATE_KUKKIWON_ID",
        409,
        { existingAthleteId: existingAthlete.id }
      );
    }

    // 3. Resolve Academy and Weight Category
    let academy = null;
    if (academyIdRaw) {
      academy = await prisma.academy.findUnique({ where: { id: academyIdRaw } });
    }
    if (!academy && trimmedAcademy) {
      academy = await prisma.academy.findFirst({
        where: { name: { equals: trimmedAcademy, mode: "insensitive" } },
      });
      if (!academy) {
        const acadCount = await prisma.academy.count();
        const code = `ACAD-${String(acadCount + 1).padStart(4, "0")}-${randomBytes(2).toString("hex").toUpperCase()}`;
        academy = await prisma.academy.create({
          data: {
            code,
            name: trimmedAcademy.toUpperCase(),
            city: "Affiliated",
            state: "India",
          },
        });
      }
    }

    if (!academy) {
      return apiError("Academy name could not be resolved.", "ACADEMY_NOT_FOUND", 404);
    }

    const weightCategory = await prisma.weightCategory.findUnique({
      where: { id: weightCategoryId },
    });

    if (!academy) {
      return apiError("Selected academy not found.", "ACADEMY_NOT_FOUND", 404);
    }
    if (!weightCategory) {
      return apiError("Selected weight category not found.", "WEIGHT_CATEGORY_NOT_FOUND", 404);
    }

    // 4. Save Photo securely to private storage
    const photoBuffer = Buffer.from(await photoFile.arrayBuffer());
    const storageResult = await savePrivateFile({
      buffer: photoBuffer,
      originalFilename: photoFile.name,
      subfolder: "photos",
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });

    // 5. Database Transaction to insert Athlete, Photo, and Registration atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create Athlete
      const athlete = await tx.athlete.create({
        data: {
          kukkiwonId,
          fullName: fullName.trim(),
          gender: gender === "FEMALE" ? "FEMALE" : "MALE",
          danOrPoom,
          contactPhone,
          contactEmail,
          academyId: academy.id,
        },
      });

      // Create Photograph record
      const photograph = await tx.athletePhotograph.create({
        data: {
          athleteId: athlete.id,
          storageProvider: "LOCAL_PRIVATE",
          storageKey: storageResult.storageKey,
          fileName: storageResult.fileName,
          mimeType: storageResult.mimeType,
          fileSizeBytes: storageResult.fileSizeBytes,
          checksumSha256: storageResult.checksumSha256,
          isCurrent: true,
        },
      });

      // Generate registration number (REG-YYYY-XXXX)
      const regCount = await tx.registration.count();
      const registrationNumber = `REG-${new Date().getFullYear()}-${String(regCount + 1).padStart(4, "0")}`;
      const athleteAccessToken = randomBytes(24).toString("hex");
      const athleteAccessTokenHash = hashAthleteAccessCode(athleteAccessToken);

      // Create Registration with hashed access token
      const registration = await tx.registration.create({
        data: {
          registrationNumber,
          athleteId: athlete.id,
          academyId: academy.id,
          photographId: photograph.id,
          weightCategoryId: weightCategory.id,
          approvalStatus: "PENDING_REVIEW",
          athleteAccessTokenHash,
          cardRole,
        },
      });

      return { athlete, photograph, registration, athleteAccessToken };
    });

    // 6. Log audit event
    await logAuditEvent({
      actorType: "ATHLETE_PORTAL",
      actorId: result.athlete.id,
      registrationId: result.registration.id,
      action: "REGISTRATION_SUBMITTED",
      entityType: "Registration",
      entityId: result.registration.id,
      details: {
        kukkiwonId: result.athlete.kukkiwonId,
        academy: academy.name,
        weightCategory: weightCategory.name,
        photoKey: result.photograph.storageKey,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return apiSuccess(
      {
        registrationNumber: result.registration.registrationNumber,
        athleteId: result.athlete.id,
        kukkiwonId: result.athlete.kukkiwonId,
        fullName: result.athlete.fullName,
        academyName: academy.name,
        weightCategoryName: weightCategory.name,
        approvalStatus: result.registration.approvalStatus,
        athleteAccessToken: result.athleteAccessToken,
        cardRole: result.registration.cardRole,
        message: "Registration submitted successfully. Awaiting administrative review.",
      },
      201
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration submission failed";
    return apiError(message, "SUBMISSION_FAILED", 500);
  }
}

