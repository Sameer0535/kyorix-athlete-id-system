import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest, logAuditEvent } from "@/lib/security";
import { getPrivateFile } from "@/lib/storage";
import { apiError } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdminRequest(req, "cards:download");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const { id } = await context.params;

    const batch = await prisma.cardGenerationBatch.findUnique({
      where: { id },
    });

    if (!batch) {
      return apiError("Batch record not found.", "NOT_FOUND", 404);
    }

    if (!batch.archiveFileKey) {
      return apiError(
        "ZIP archive is not available for this batch. It may still be processing or failed.",
        "FILE_NOT_READY",
        400
      );
    }

    const file = await getPrivateFile(batch.archiveFileKey);

    await logAuditEvent({
      actorType: "ADMIN",
      actorId: auth.session.adminId,
      action: "ADMIN_BATCH_ZIP_DOWNLOADED",
      entityType: "CardGenerationBatch",
      entityId: batch.id,
      details: {
        batchNumber: batch.batchNumber,
        fileSizeBytes: file.buffer.length,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return new NextResponse(file.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${batch.batchNumber}-archive.zip"`,
        "Content-Length": file.buffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Download failed";
    return apiError(message, "DOWNLOAD_ERROR", 500);
  }
}

