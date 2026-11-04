import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest, logAuditEvent } from "@/lib/security";
import { savePrivateFile } from "@/lib/storage";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdminRequest(req, "registrations:replace_photo");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const { id: registrationId } = await params;
    const formData = await req.formData();
    const photoFile = formData.get("photo") as File | null;

    if (!photoFile || photoFile.size === 0) {
      return apiError("A replacement photograph file is required.", "MISSING_PHOTO", 400);
    }

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

    // Save replacement photo securely to private storage
    const photoBuffer = Buffer.from(await photoFile.arrayBuffer());
    const storageResult = await savePrivateFile({
      buffer: photoBuffer,
      originalFilename: photoFile.name,
      subfolder: "photos",
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });

    // Mark previous photo as non-current and create new photo record atomically
    const newPhoto = await prisma.$transaction(async (tx) => {
      await tx.athletePhotograph.update({
        where: { id: registration.photographId },
        data: { isCurrent: false },
      });

      const photo = await tx.athletePhotograph.create({
        data: {
          athleteId: registration.athleteId,
          storageProvider: "LOCAL_PRIVATE",
          storageKey: storageResult.storageKey,
          fileName: storageResult.fileName,
          mimeType: storageResult.mimeType,
          fileSizeBytes: storageResult.fileSizeBytes,
          checksumSha256: storageResult.checksumSha256,
          isCurrent: true,
        },
      });

      await tx.registration.update({
        where: { id: registrationId },
        data: { photographId: photo.id },
      });

      return photo;
    });

    // Record audit log
    await logAuditEvent({
      actorType: "ADMIN",
      actorId: auth.session.adminId,
      adminUserId: auth.session.adminId,
      registrationId: registration.id,
      action: "ADMIN_REPLACED_ATHLETE_PHOTO",
      entityType: "AthletePhotograph",
      entityId: newPhoto.id,
      details: {
        athleteKukkiwonId: registration.athlete.kukkiwonId,
        athleteName: registration.athlete.fullName,
        oldStorageKey: registration.photograph.storageKey,
        newStorageKey: newPhoto.storageKey,
        newChecksum: newPhoto.checksumSha256,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return apiSuccess({
      photograph: newPhoto,
      message: `Athlete photograph for ${registration.athlete.fullName} successfully replaced.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error replacing photograph";
    return apiError(message, "PHOTO_REPLACEMENT_ERROR", 500);
  }
}

