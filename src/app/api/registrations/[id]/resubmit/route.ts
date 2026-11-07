import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/security";
import { savePrivateFile } from "@/lib/storage";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: registrationId } = await params;
    const formData = await req.formData();

    const athleteAccessToken = formData.get("athleteAccessToken") as string;
    if (!athleteAccessToken) {
      return apiError("Athlete access token is required for resubmission.", "UNAUTHORIZED", 401);
    }

    // Find registration and verify token
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        athlete: true,
        photograph: true,
      },
    });

    if (!registration) {
      return apiError("Registration not found.", "NOT_FOUND", 404);
    }

    if (registration.athleteAccessToken !== athleteAccessToken) {
      return apiError("Invalid athlete access token.", "FORBIDDEN", 403);
    }

    if (registration.approvalStatus !== "CHANGES_REQUESTED") {
      return apiError(
        `Cannot resubmit: current status is '${registration.approvalStatus}'. Only records with 'CHANGES_REQUESTED' can be corrected by the athlete.`,
        "INVALID_STATE",
        400
      );
    }

    // Optional fields to update
    const fullName = formData.get("fullName") as string | null;
    const danOrPoom = formData.get("danOrPoom") as string | null;
    const weightCategoryId = formData.get("weightCategoryId") as string | null;
    const photoFile = formData.get("photo") as File | null;

    let newPhotographId = registration.photographId;

    if (photoFile && photoFile.size > 0) {
      const photoBuffer = Buffer.from(await photoFile.arrayBuffer());
      const storageResult = await savePrivateFile({
        buffer: photoBuffer,
        originalFilename: photoFile.name,
        subfolder: "photos",
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });

      // Mark old photo as not current
      await prisma.athletePhotograph.update({
        where: { id: registration.photographId },
        data: { isCurrent: false },
      });

      // Create new photograph record
      const newPhoto = await prisma.athletePhotograph.create({
        data: {
          athleteId: registration.athleteId,
          storageProvider: "LOCAL_PRIVATE",
          storageKey: storageResult.storageKey,
          fileName: storageResult.fileName,
          mimeType: storageResult.mimeType,
          fileSizeBytes: storageResult.fileSizeBytes,
          checksumSha256: storageResult.checksumSha256,
          photoBase64: photoBuffer.toString("base64"),
          isCurrent: true,
        },
      });

      newPhotographId = newPhoto.id;
    }

    // Update athlete details if provided
    if (fullName || danOrPoom) {
      await prisma.athlete.update({
        where: { id: registration.athleteId },
        data: {
          ...(fullName ? { fullName: fullName.trim() } : {}),
          ...(danOrPoom ? { danOrPoom } : {}),
        },
      });
    }

    // Update registration back to PENDING_REVIEW
    const updated = await prisma.registration.update({
      where: { id: registration.id },
      data: {
        photographId: newPhotographId,
        ...(weightCategoryId ? { weightCategoryId } : {}),
        approvalStatus: "PENDING_REVIEW",
        notes: null, // Clear correction notes once resubmitted
      },
    });

    // Audit log
    await logAuditEvent({
      actorType: "ATHLETE_PORTAL",
      actorId: registration.athleteId,
      registrationId: registration.id,
      action: "REGISTRATION_CORRECTIONS_RESUBMITTED",
      entityType: "Registration",
      entityId: registration.id,
      details: {
        registrationNumber: registration.registrationNumber,
        photoReplaced: !!photoFile && photoFile.size > 0,
        updatedFullName: fullName || undefined,
        updatedWeightCategory: weightCategoryId || undefined,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return apiSuccess({
      registrationId: updated.id,
      registrationNumber: updated.registrationNumber,
      approvalStatus: updated.approvalStatus,
      message: "Corrections submitted successfully. Your registration has returned to the administrative review queue.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to resubmit corrections";
    return apiError(message, "RESUBMIT_FAILED", 500);
  }
}

