import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest } from "@/lib/security";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdminRequest(req, "cards:view");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const { id } = await context.params;

    const batch = await prisma.cardGenerationBatch.findUnique({
      where: { id },
      include: {
        initiatedByAdmin: {
          select: { fullName: true, email: true },
        },
        job: true,
      },
    });

    if (!batch) {
      return apiError("Batch record not found.", "NOT_FOUND", 404);
    }

    let parsedFailedRecords = [];
    if (batch.failedRecords) {
      try {
        parsedFailedRecords = JSON.parse(batch.failedRecords);
      } catch {
        parsedFailedRecords = [];
      }
    }

    return apiSuccess({
      batch: {
        id: batch.id,
        batchNumber: batch.batchNumber,
        status: batch.status,
        totalCards: batch.totalCards,
        successfulCards: batch.successfulCards,
        failedCards: batch.failedCards,
        hasPdf: !!batch.pdfFileKey,
        hasZip: !!batch.archiveFileKey,
        pdfFileSize: batch.pdfFileSizeBytes,
        zipFileSize: batch.zipFileSizeBytes,
        startedAt: batch.startedAt,
        completedAt: batch.completedAt,
        errorSummary: batch.errorSummary,
        initiatedBy: batch.initiatedByAdmin.fullName,
        failedRecords: parsedFailedRecords,
        job: batch.job
          ? {
              id: batch.job.id,
              status: batch.job.status,
              progress: batch.job.progress,
              processedCount: batch.job.processedCount,
              errorMessage: batch.job.errorMessage,
              heartbeatAt: batch.job.heartbeatAt,
            }
          : null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve batch details";
    return apiError(message, "BATCH_DETAIL_ERROR", 500);
  }
}

