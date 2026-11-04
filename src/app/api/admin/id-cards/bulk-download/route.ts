import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest, logAuditEvent } from "@/lib/security";
import { getPrivateFile } from "@/lib/storage";
import { apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(req, "cards:download");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get("batchId");

    if (!batchId) {
      return apiError("Batch ID is required.", "MISSING_ID", 400);
    }

    const batch = await prisma.cardGenerationBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch || !batch.archiveFileKey) {
      return apiError("Batch multi-page PDF not found or not yet processed.", "BATCH_NOT_FOUND", 404);
    }

    const { buffer } = await getPrivateFile(batch.archiveFileKey);

    // Audit log
    await logAuditEvent({
      actorType: "ADMIN",
      actorId: auth.session.adminId,
      adminUserId: auth.session.adminId,
      action: "BULK_BATCH_DOWNLOADED",
      entityType: "CardGenerationBatch",
      entityId: batch.id,
      details: {
        batchNumber: batch.batchNumber,
        totalCards: batch.successfulCards,
        fileSizeBytes: buffer.length,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${batch.batchNumber}_cards_print.pdf"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error downloading bulk batch";
    return apiError(message, "BATCH_DOWNLOAD_ERROR", 500);
  }
}

