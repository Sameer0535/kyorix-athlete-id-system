import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { prisma } from "../prisma.ts";
import { savePrivateFile, getPrivateFile } from "../storage.ts";
import { drawAthleteCard, type AthleteCardData, CARD_WIDTH_PT, CARD_HEIGHT_PT } from "../pdf-generator.ts";

export interface BatchProgressCallback {
  (progress: {
    processedCount: number;
    totalCount: number;
    successfulCount: number;
    failedCount: number;
    currentAthleteName?: string;
  }): Promise<void>;
}

export interface FailedRecordDetail {
  registrationId: string;
  athleteId: string;
  athleteName: string;
  kukkiwonId: string;
  reason: string;
  failedAt: string;
}

export interface BulkExportResult {
  batchId: string;
  batchNumber: string;
  total: number;
  successful: number;
  failed: number;
  pdfStorageKey?: string;
  pdfFileSizeBytes?: number;
  zipStorageKey?: string;
  zipFileSizeBytes?: number;
  failedRecords: FailedRecordDetail[];
}

/**
 * Executes high-volume bulk ID card generation:
 * 1. Generates individual CR80 PDF for every selected athlete.
 * 2. Compiles a single combined multi-page CR80 PDF (1 card per page).
 * 3. Packages all individual PDFs into a structured ZIP archive (categorized by Academy).
 * 4. Persists records to PostgreSQL and private storage.
 */
export async function executeBulkExport(
  batchId: string,
  registrationIds: string[],
  options: {
    onProgress?: BatchProgressCallback;
    checkCancelled?: () => Promise<boolean>;
  } = {}
): Promise<BulkExportResult> {
  const batch = await prisma.cardGenerationBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    throw new Error(`Batch record not found: ${batchId}`);
  }

  // Fetch approved registrations
  const registrations = await prisma.registration.findMany({
    where: {
      id: { in: registrationIds },
      approvalStatus: "APPROVED",
    },
    include: {
      athlete: {
        include: { academy: true },
      },
      weightCategory: true,
      photograph: true,
      idCard: true,
    },
  });

  const total = registrations.length;
  let successful = 0;
  let failed = 0;
  const failedRecords: FailedRecordDetail[] = [];

  // Initialize combined multi-page PDF document
  const combinedPdfDoc = await PDFDocument.create();

  // Initialize ZIP container
  const zip = new JSZip();
  const usedZipFileNames = new Set<string>();

  // Process registrations sequentially or in micro-batches
  for (let i = 0; i < registrations.length; i++) {
    // Check if job was cancelled
    if (options.checkCancelled) {
      const isCancelled = await options.checkCancelled();
      if (isCancelled) {
        throw new Error("BATCH_CANCELLED_BY_ADMIN");
      }
    }

    const reg = registrations[i];
    const athlete = reg.athlete;
    const academy = athlete.academy;
    const category = reg.weightCategory;
    const photo = reg.photograph;

    try {
      // Determine Card Number
      let cardNumber = reg.idCard?.cardNumber;
      if (!cardNumber) {
        const cardCount = await prisma.idCardRecord.count();
        cardNumber = `KYX-ID-${new Date().getFullYear()}-${String(cardCount + 1).padStart(5, "0")}`;
      }

      const cardData: AthleteCardData = {
        cardNumber,
        registrationNumber: reg.registrationNumber,
        kukkiwonId: athlete.kukkiwonId,
        fullName: athlete.fullName,
        gender: athlete.gender,
        danOrPoom: athlete.danOrPoom,
        academyName: academy.name,
        academyCity: academy.city,
        weightCategoryName: category.name,
        division: category.division,
        photoStorageKey: photo.storageKey,
        photoMimeType: photo.mimeType,
        issueDate: new Date(),
      };

      // 1. Render single card in memory
      const singleCardDoc = await PDFDocument.create();
      const singlePage = singleCardDoc.addPage([CARD_WIDTH_PT, CARD_HEIGHT_PT]);
      await drawAthleteCard(singleCardDoc, singlePage, cardData);
      const singlePdfBytes = await singleCardDoc.save();
      const singlePdfBuffer = Buffer.from(singlePdfBytes);

      // 2. Persist individual card PDF to private storage
      const storageResult = await savePrivateFile({
        buffer: singlePdfBuffer,
        originalFilename: `${cardNumber}.pdf`,
        subfolder: "cards",
        allowedMimeTypes: ["application/pdf"],
      });

      // 3. Upsert IdCardRecord in PostgreSQL
      await prisma.idCardRecord.upsert({
        where: { registrationId: reg.id },
        create: {
          cardNumber,
          registrationId: reg.id,
          athleteId: athlete.id,
          batchId: batch.id,
          status: "GENERATED",
          generatedFileKey: storageResult.storageKey,
          generatedFileSizeBytes: storageResult.fileSizeBytes,
          checksumSha256: storageResult.checksumSha256,
          generatedAt: new Date(),
          cardTemplateVersion: "v1.0",
        },
        update: {
          cardNumber,
          batchId: batch.id,
          status: "GENERATED",
          generatedFileKey: storageResult.storageKey,
          generatedFileSizeBytes: storageResult.fileSizeBytes,
          checksumSha256: storageResult.checksumSha256,
          generatedAt: new Date(),
        },
      });

      // 4. Add page to combined multi-page document
      const combinedPage = combinedPdfDoc.addPage([CARD_WIDTH_PT, CARD_HEIGHT_PT]);
      await drawAthleteCard(combinedPdfDoc, combinedPage, cardData);

      // 5. Add individual PDF to ZIP archive (organized by sanitized academy name)
      const sanitizedAcademy = (academy.name || "General")
        .replace(/[/\\?%*:|"<>]/g, "_")
        .trim();
      let zipFileName = `${sanitizedAcademy}/KYX-ID-${athlete.kukkiwonId}.pdf`;
      let counter = 1;
      while (usedZipFileNames.has(zipFileName)) {
        zipFileName = `${sanitizedAcademy}/KYX-ID-${athlete.kukkiwonId}_${counter}.pdf`;
        counter++;
      }
      usedZipFileNames.add(zipFileName);
      zip.file(zipFileName, singlePdfBuffer);

      successful++;
    } catch (err: unknown) {
      failed++;
      const reason = err instanceof Error ? err.message : "Unknown generation error";
      failedRecords.push({
        registrationId: reg.id,
        athleteId: athlete.id,
        athleteName: athlete.fullName,
        kukkiwonId: athlete.kukkiwonId,
        reason,
        failedAt: new Date().toISOString(),
      });
    }

    // Report progress to callback
    if (options.onProgress) {
      await options.onProgress({
        processedCount: i + 1,
        totalCount: total,
        successfulCount: successful,
        failedCount: failed,
        currentAthleteName: athlete.fullName,
      });
    }
  }

  let pdfStorageKey: string | undefined = undefined;
  let pdfFileSizeBytes: number | undefined = undefined;
  let zipStorageKey: string | undefined = undefined;
  let zipFileSizeBytes: number | undefined = undefined;

  // Finalize combined PDF if at least 1 card succeeded
  if (successful > 0) {
    const combinedBytes = await combinedPdfDoc.save();
    const combinedBuffer = Buffer.from(combinedBytes);
    const combinedSave = await savePrivateFile({
      buffer: combinedBuffer,
      originalFilename: `${batch.batchNumber}-combined.pdf`,
      subfolder: "batches",
      allowedMimeTypes: ["application/pdf"],
    });
    pdfStorageKey = combinedSave.storageKey;
    pdfFileSizeBytes = combinedSave.fileSizeBytes;

    // Finalize ZIP archive
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    const zipSave = await savePrivateFile({
      buffer: zipBuffer,
      originalFilename: `${batch.batchNumber}-archive.zip`,
      subfolder: "batches",
      allowedMimeTypes: ["application/zip", "application/x-zip-compressed"],
    });
    zipStorageKey = zipSave.storageKey;
    zipFileSizeBytes = zipSave.fileSizeBytes;
  }

  return {
    batchId,
    batchNumber: batch.batchNumber,
    total,
    successful,
    failed,
    pdfStorageKey,
    pdfFileSizeBytes,
    zipStorageKey,
    zipFileSizeBytes,
    failedRecords,
  };
}

