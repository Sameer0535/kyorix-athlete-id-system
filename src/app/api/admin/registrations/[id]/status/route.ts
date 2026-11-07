import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest, logAuditEvent } from "@/lib/security";
import { apiSuccess, apiError } from "@/lib/api-response";
import { generateIndividualCardPdf, AthleteCardData } from "@/lib/pdf-generator";
import { savePrivateFile } from "@/lib/storage";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdminRequest(req, "registrations:review");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const { id: registrationId } = await params;
    const body = await req.json();
    const { action, reason, notes } = body;

    if (!["APPROVE", "REJECT", "REQUEST_CHANGES"].includes(action)) {
      return apiError(
        "Invalid action. Supported actions: 'APPROVE', 'REJECT', 'REQUEST_CHANGES'.",
        "INVALID_ACTION",
        400
      );
    }

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        athlete: true,
        academy: true,
        weightCategory: true,
        photograph: true,
        idCard: true,
      },
    });

    if (!registration) {
      return apiError("Registration not found.", "NOT_FOUND", 404);
    }

    const previousStatus = registration.approvalStatus;

    if (action === "APPROVE") {
      // Approve registration and ensure ID Card record exists and is generated
      const cardCount = await prisma.idCardRecord.count();
      const cardNumber = registration.idCard?.cardNumber || `KYX-ID-${new Date().getFullYear()}-${String(cardCount + 1).padStart(5, "0")}`;

      let storageKey: string | null = null;
      let pdfBase64: string | null = null;
      let fileSizeBytes = 0;
      let checksumSha256 = "";

      try {
        const cardData: AthleteCardData = {
          cardNumber,
          registrationNumber: registration.registrationNumber,
          kukkiwonId: registration.athlete.kukkiwonId,
          fullName: registration.athlete.fullName,
          gender: registration.athlete.gender,
          danOrPoom: registration.athlete.danOrPoom,
          academyName: registration.academy.name,
          academyCity: registration.academy.city,
          weightCategoryName: registration.weightCategory.name,
          division: registration.weightCategory.division,
          countryCode: registration.countryCode || registration.athlete.countryCode || "IND",
          countryName: registration.countryName || registration.athlete.countryName || "India",
          photoStorageKey: registration.photograph.storageKey,
          photoMimeType: registration.photograph.mimeType,
          photoBase64: registration.photograph.photoBase64,
          cardRole: registration.cardRole || "PARTICIPANT",
          notes: notes || registration.notes,
          issueDate: new Date(),
        };

        const { buffer: pdfBuffer } = await generateIndividualCardPdf(cardData);
        pdfBase64 = pdfBuffer.toString("base64");
        fileSizeBytes = pdfBuffer.length;
        checksumSha256 = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

        try {
          const saveRes = await savePrivateFile({
            buffer: pdfBuffer,
            originalFilename: `${cardNumber}.pdf`,
            subfolder: "cards",
            allowedMimeTypes: ["application/pdf"],
          });
          storageKey = saveRes.storageKey;
        } catch {
          storageKey = `cards/${cardNumber}.pdf`;
        }
      } catch (genErr) {
        console.error("Card generation error during approval:", genErr);
      }

      const updated = await prisma.$transaction(async (tx) => {
        const reg = await tx.registration.update({
          where: { id: registrationId },
          data: {
            approvalStatus: "APPROVED",
            approvedByAdminId: auth.session!.adminId,
            approvalDate: new Date(),
            rejectionReason: null,
            notes: notes || null,
          },
        });

        // Ensure ID card record is instantiated
        let card = await tx.idCardRecord.findUnique({
          where: { registrationId: registration.id },
        });

        if (card) {
          card = await tx.idCardRecord.update({
            where: { id: card.id },
            data: {
              status: "GENERATED",
              generatedFileKey: storageKey || card.generatedFileKey,
              generatedFileSizeBytes: fileSizeBytes || card.generatedFileSizeBytes,
              checksumSha256: checksumSha256 || card.checksumSha256,
              pdfBase64: pdfBase64 || card.pdfBase64,
              generatedAt: new Date(),
              generatedByAdminId: auth.session!.adminId,
            },
          });
        } else {
          card = await tx.idCardRecord.create({
            data: {
              cardNumber,
              registrationId: registration.id,
              athleteId: registration.athleteId,
              status: "GENERATED",
              generatedFileKey: storageKey,
              generatedFileSizeBytes: fileSizeBytes || null,
              checksumSha256: checksumSha256 || null,
              pdfBase64,
              generatedAt: new Date(),
              generatedByAdminId: auth.session!.adminId,
            },
          });
        }

        return { reg, card };
      });

      // Audit log
      await logAuditEvent({
        actorType: "ADMIN",
        actorId: auth.session.adminId,
        adminUserId: auth.session.adminId,
        registrationId: registration.id,
        action: "REGISTRATION_APPROVED",
        entityType: "Registration",
        entityId: registration.id,
        details: {
          previousStatus,
          newStatus: "APPROVED",
          athleteKukkiwonId: registration.athlete.kukkiwonId,
          athleteName: registration.athlete.fullName,
          cardNumber: updated.card.cardNumber,
        },
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
        userAgent: req.headers.get("user-agent") || undefined,
      });

      return apiSuccess({
        registration: updated.reg,
        idCard: updated.card,
        message: `Registration for ${registration.athlete.fullName} (${registration.athlete.kukkiwonId}) successfully approved.`,
      });
    }

    if (action === "REJECT") {
      if (!reason || !reason.trim()) {
        return apiError("A rejection reason is required.", "MISSING_REJECTION_REASON", 400);
      }

      const updated = await prisma.registration.update({
        where: { id: registrationId },
        data: {
          approvalStatus: "REJECTED",
          approvedByAdminId: auth.session.adminId,
          rejectionReason: reason.trim(),
          notes: notes || null,
        },
      });

      // Audit log
      await logAuditEvent({
        actorType: "ADMIN",
        actorId: auth.session.adminId,
        adminUserId: auth.session.adminId,
        registrationId: registration.id,
        action: "REGISTRATION_REJECTED",
        entityType: "Registration",
        entityId: registration.id,
        details: {
          previousStatus,
          newStatus: "REJECTED",
          athleteKukkiwonId: registration.athlete.kukkiwonId,
          athleteName: registration.athlete.fullName,
          reason: reason.trim(),
        },
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
        userAgent: req.headers.get("user-agent") || undefined,
      });

      return apiSuccess({
        registration: updated,
        message: `Registration for ${registration.athlete.fullName} has been rejected.`,
      });
    }

    if (action === "REQUEST_CHANGES") {
      if (!notes || !notes.trim()) {
        return apiError("An explanation of requested corrections is required.", "MISSING_EXPLANATION", 400);
      }

      const updated = await prisma.registration.update({
        where: { id: registrationId },
        data: {
          approvalStatus: "CHANGES_REQUESTED",
          approvedByAdminId: auth.session.adminId,
          notes: notes.trim(),
        },
      });

      // Audit log
      await logAuditEvent({
        actorType: "ADMIN",
        actorId: auth.session.adminId,
        adminUserId: auth.session.adminId,
        registrationId: registration.id,
        action: "REGISTRATION_CHANGES_REQUESTED",
        entityType: "Registration",
        entityId: registration.id,
        details: {
          previousStatus,
          newStatus: "CHANGES_REQUESTED",
          athleteKukkiwonId: registration.athlete.kukkiwonId,
          athleteName: registration.athlete.fullName,
          requestedChanges: notes.trim(),
        },
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
        userAgent: req.headers.get("user-agent") || undefined,
      });

      return apiSuccess({
        registration: updated,
        message: `Corrections requested for ${registration.athlete.fullName}. Athlete can now resubmit.`,
      });
    }

    return apiError("Unsupported action.", "BAD_REQUEST", 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating status";
    return apiError(message, "STATUS_UPDATE_ERROR", 500);
  }
}

