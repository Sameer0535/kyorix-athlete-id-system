import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest, logAuditEvent } from "@/lib/security";
import { savePrivateFile } from "@/lib/storage";
import { generateIndividualCardPdf, AthleteCardData } from "@/lib/pdf-generator";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const auth = await authenticateAdminRequest(req, "cards:generate");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const body = await req.json();
    const { registrationId } = body;

    if (!registrationId) {
      return apiError("Registration ID is required.", "MISSING_ID", 400);
    }

    // 1. Fetch registration and verify approved status
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
      return apiError("Registration record not found.", "NOT_FOUND", 404);
    }

    if (registration.approvalStatus !== "APPROVED") {
      return apiError(
        `Cannot generate ID card: registration status is '${registration.approvalStatus}'. Only 'APPROVED' registrations can have ID cards generated.`,
        "REGISTRATION_NOT_APPROVED",
        400
      );
    }

    // 2. Determine / create Card Number
    let cardNumber = registration.idCard?.cardNumber;
    if (!cardNumber) {
      const cardCount = await prisma.idCardRecord.count();
      cardNumber = `KYX-ID-${new Date().getFullYear()}-${String(cardCount + 1).padStart(5, "0")}`;
    }

    // 3. Build card payload
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
      issueDate: new Date(),
    };

    // 4. Render PDF
    const { buffer: pdfBuffer, pageCount } = await generateIndividualCardPdf(cardData);
    const renderTimeMs = Date.now() - startTime;

    // 5. Save generated PDF to private storage
    const storageResult = await savePrivateFile({
      buffer: pdfBuffer,
      originalFilename: `${cardNumber}.pdf`,
      subfolder: "cards",
      allowedMimeTypes: ["application/pdf"],
    });

    // 6. Update or insert IdCardRecord and GenerationHistory in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let card = await tx.idCardRecord.findUnique({
        where: { registrationId: registration.id },
      });

      if (card) {
        card = await tx.idCardRecord.update({
          where: { id: card.id },
          data: {
            cardNumber,
            status: "GENERATED",
            generatedFileKey: storageResult.storageKey,
            generatedFileSizeBytes: storageResult.fileSizeBytes,
            checksumSha256: storageResult.checksumSha256,
            pdfBase64: pdfBuffer.toString("base64"),
            generatedAt: new Date(),
            generatedByAdminId: auth.session!.adminId,
            cardTemplateVersion: "v1.0",
          },
        });
      } else {
        card = await tx.idCardRecord.create({
          data: {
            cardNumber,
            registrationId: registration.id,
            athleteId: registration.athleteId,
            status: "GENERATED",
            generatedFileKey: storageResult.storageKey,
            generatedFileSizeBytes: storageResult.fileSizeBytes,
            checksumSha256: storageResult.checksumSha256,
            pdfBase64: pdfBuffer.toString("base64"),
            generatedAt: new Date(),
            generatedByAdminId: auth.session!.adminId,
            cardTemplateVersion: "v1.0",
          },
        });
      }

      // Record generation history
      await tx.generationHistory.create({
        data: {
          idCardRecordId: card.id,
          triggerType: "ADMIN_INDIVIDUAL",
          triggeredByAdminId: auth.session!.adminId,
          success: true,
          renderTimeMs,
          fileSizeBytes: storageResult.fileSizeBytes,
        },
      });

      return card;
    });

    // 7. Audit Log
    await logAuditEvent({
      actorType: "ADMIN",
      actorId: auth.session.adminId,
      adminUserId: auth.session.adminId,
      registrationId: registration.id,
      action: "ID_CARD_GENERATED_INDIVIDUAL",
      entityType: "IdCardRecord",
      entityId: result.id,
      details: {
        cardNumber: result.cardNumber,
        athleteKukkiwonId: registration.athlete.kukkiwonId,
        athleteName: registration.athlete.fullName,
        renderTimeMs,
        storageKey: storageResult.storageKey,
        checksum: storageResult.checksumSha256,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return apiSuccess({
      idCard: result,
      renderTimeMs,
      message: `ID Card ${result.cardNumber} generated successfully for ${registration.athlete.fullName}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error generating ID card";
    return apiError(message, "GENERATION_ERROR", 500);
  }
}

