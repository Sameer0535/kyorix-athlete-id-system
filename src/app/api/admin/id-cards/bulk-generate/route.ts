import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest, logAuditEvent } from "@/lib/security";
import { savePrivateFile } from "@/lib/storage";
import { generateBulkCardsPdf, generateIndividualCardPdf, AthleteCardData } from "@/lib/pdf-generator";
import { apiSuccess, apiError } from "@/lib/api-response";
import { AgeDivision, Gender } from "@prisma/client";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const auth = await authenticateAdminRequest(req, "cards:bulk_generate");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const body = await req.json();
    const { registrationIds, academyId, weightCategoryId, division, gender, selectAll } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      approvalStatus: "APPROVED",
    };

    if (Array.isArray(registrationIds) && registrationIds.length > 0 && !selectAll) {
      where.id = { in: registrationIds };
    } else {
      if (academyId) where.academyId = academyId;
      if (weightCategoryId) where.weightCategoryId = weightCategoryId;
      if (division && Object.values(AgeDivision).includes(division as AgeDivision)) {
        where.weightCategory = { ...where.weightCategory, division: division as AgeDivision };
      }
      if (gender && Object.values(Gender).includes(gender as Gender)) {
        where.athlete = { ...where.athlete, gender: gender as Gender };
      }
    }

    const registrations = await prisma.registration.findMany({
      where,
      include: {
        athlete: true,
        academy: true,
        weightCategory: true,
        photograph: true,
        idCard: true,
      },
      orderBy: [{ academy: { name: "asc" } }, { athlete: { fullName: "asc" } }],
    });

    if (registrations.length === 0) {
      return apiError("No approved registrations found matching the specified criteria.", "NO_RECORDS", 404);
    }

    // Create CardGenerationBatch record
    const batchCount = await prisma.cardGenerationBatch.count();
    const batchNumber = `BATCH-${new Date().getFullYear()}-${String(batchCount + 1).padStart(4, "0")}`;

    const batch = await prisma.cardGenerationBatch.create({
      data: {
        batchNumber,
        initiatedByAdminId: auth.session.adminId,
        status: "PROCESSING",
        totalCards: registrations.length,
      },
    });

    // Prepare card payloads
    const cardsData: AthleteCardData[] = [];
    const regToCardMap = new Map<string, string>();

    let currentCardIndex = await prisma.idCardRecord.count();

    for (const reg of registrations) {
      let cardNumber = reg.idCard?.cardNumber;
      if (!cardNumber) {
        currentCardIndex += 1;
        cardNumber = `KYX-ID-${new Date().getFullYear()}-${String(currentCardIndex).padStart(5, "0")}`;
      }
      regToCardMap.set(reg.id, cardNumber);

      cardsData.push({
        cardNumber,
        registrationNumber: reg.registrationNumber,
        kukkiwonId: reg.athlete.kukkiwonId,
        fullName: reg.athlete.fullName,
        gender: reg.athlete.gender,
        danOrPoom: reg.athlete.danOrPoom,
        academyName: reg.academy.name,
        academyCity: reg.academy.city,
        weightCategoryName: reg.weightCategory.name,
        division: reg.weightCategory.division,
        photoStorageKey: reg.photograph.storageKey,
        photoMimeType: reg.photograph.mimeType,
        issueDate: new Date(),
      });
    }

    // Render multi-page unified PDF
    const { buffer: multiPageBuffer, pageCount, errors } = await generateBulkCardsPdf(cardsData);

    // Save multi-page PDF to private storage
    const storageResult = await savePrivateFile({
      buffer: multiPageBuffer,
      originalFilename: `${batchNumber}_all_cards.pdf`,
      subfolder: "batches",
      allowedMimeTypes: ["application/pdf"],
    });

    // Also render and update individual card records in PostgreSQL
    let successfulCount = 0;
    for (const reg of registrations) {
      const cardNumber = regToCardMap.get(reg.id)!;
      try {
        const cardData = cardsData.find((c) => c.cardNumber === cardNumber)!;
        const { buffer: singleBuffer } = await generateIndividualCardPdf(cardData);
        const singleStorageResult = await savePrivateFile({
          buffer: singleBuffer,
          originalFilename: `${cardNumber}.pdf`,
          subfolder: "cards",
          allowedMimeTypes: ["application/pdf"],
        });

        const card = await prisma.idCardRecord.upsert({
          where: { registrationId: reg.id },
          create: {
            cardNumber,
            registrationId: reg.id,
            athleteId: reg.athleteId,
            status: "GENERATED",
            generatedFileKey: singleStorageResult.storageKey,
            generatedFileSizeBytes: singleStorageResult.fileSizeBytes,
            checksumSha256: singleStorageResult.checksumSha256,
            generatedAt: new Date(),
            generatedByAdminId: auth.session.adminId,
            batchId: batch.id,
            cardTemplateVersion: "v1.0",
          },
          update: {
            cardNumber,
            status: "GENERATED",
            generatedFileKey: singleStorageResult.storageKey,
            generatedFileSizeBytes: singleStorageResult.fileSizeBytes,
            checksumSha256: singleStorageResult.checksumSha256,
            generatedAt: new Date(),
            generatedByAdminId: auth.session.adminId,
            batchId: batch.id,
          },
        });

        await prisma.generationHistory.create({
          data: {
            idCardRecordId: card.id,
            batchId: batch.id,
            triggerType: "ADMIN_BULK",
            triggeredByAdminId: auth.session.adminId,
            success: true,
            fileSizeBytes: singleStorageResult.fileSizeBytes,
          },
        });

        successfulCount += 1;
      } catch (singleErr) {
        console.error(`[ERROR] Failed to render individual card for ${cardNumber}:`, singleErr);
      }
    }

    const failedCount = registrations.length - successfulCount;
    const finalBatchStatus = failedCount === 0 ? "COMPLETED" : successfulCount > 0 ? "PARTIAL_FAILURE" : "FAILED";

    // Update batch record
    const updatedBatch = await prisma.cardGenerationBatch.update({
      where: { id: batch.id },
      data: {
        status: finalBatchStatus,
        successfulCards: successfulCount,
        failedCards: failedCount,
        archiveFileKey: storageResult.storageKey,
        completedAt: new Date(),
        errorSummary: errors.length > 0 ? JSON.stringify(errors) : null,
      },
    });

    const totalDurationMs = Date.now() - startTime;

    // Record audit event
    await logAuditEvent({
      actorType: "ADMIN",
      actorId: auth.session.adminId,
      adminUserId: auth.session.adminId,
      action: "BULK_CARDS_GENERATED",
      entityType: "CardGenerationBatch",
      entityId: batch.id,
      details: {
        batchNumber: batch.batchNumber,
        totalRequested: registrations.length,
        successfulCards: successfulCount,
        failedCards: failedCount,
        durationMs: totalDurationMs,
        storageKey: storageResult.storageKey,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return apiSuccess({
      batch: updatedBatch,
      totalCards: registrations.length,
      successfulCards: successfulCount,
      failedCards: failedCount,
      pageCount,
      durationMs: totalDurationMs,
      downloadUrl: `/api/admin/id-cards/bulk-download?batchId=${batch.id}`,
      message: `Successfully processed batch ${batchNumber}: ${successfulCount} ID cards generated (${pageCount} pages).`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error during bulk card generation";
    return apiError(message, "BULK_GENERATION_ERROR", 500);
  }
}

