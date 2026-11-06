import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest } from "@/lib/security";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(req, "cards:view");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20"), 1), 100);

    const batches = await prisma.cardGenerationBatch.findMany({
      take: limit,
      orderBy: { startedAt: "desc" },
      include: {
        initiatedByAdmin: {
          select: { fullName: true, email: true },
        },
        job: {
          select: {
            id: true,
            status: true,
            progress: true,
            processedCount: true,
            errorMessage: true,
            heartbeatAt: true,
          },
        },
      },
    });

    return apiSuccess({
      batches: batches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        status: b.status,
        totalCards: b.totalCards,
        successfulCards: b.successfulCards,
        failedCards: b.failedCards,
        hasPdf: !!b.pdfFileKey,
        hasZip: !!b.archiveFileKey,
        pdfFileSize: b.pdfFileSizeBytes,
        zipFileSize: b.zipFileSizeBytes,
        startedAt: b.startedAt,
        completedAt: b.completedAt,
        initiatedBy: b.initiatedByAdmin.fullName,
        jobProgress: b.job?.progress ?? (b.status === "COMPLETED" ? 100 : 0),
        jobStatus: b.job?.status ?? b.status,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load generation batches";
    return apiError(message, "BATCH_LIST_ERROR", 500);
  }
}

