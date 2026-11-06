import { NextRequest } from "next/server";
import { authenticateAdminRequest, logAuditEvent } from "@/lib/security";
import { verifyStorageIntegrity, cleanupTempFiles, pruneOldBatches } from "@/lib/storage-manager";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(req, "system:manage");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const report = await verifyStorageIntegrity();

    return apiSuccess({ integrity: report });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Integrity audit failed";
    return apiError(message, "STORAGE_AUDIT_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(req, "system:manage");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const body = await req.json().catch(() => ({}));
    const retentionDays = parseInt(body.retentionDays || "30");

    const tempResult = cleanupTempFiles(24);
    const pruneResult = await pruneOldBatches(retentionDays);

    await logAuditEvent({
      actorType: "ADMIN",
      actorId: auth.session.adminId,
      action: "ADMIN_STORAGE_CLEANUP_EXECUTED",
      entityType: "Storage",
      details: {
        tempFilesRemoved: tempResult.filesRemoved,
        tempBytesFreed: tempResult.bytesFreed,
        prunedBatches: pruneResult.prunedCount,
        prunedBytesFreed: pruneResult.bytesFreed,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return apiSuccess({
      cleanup: {
        tempFilesRemoved: tempResult.filesRemoved,
        tempBytesFreed: tempResult.bytesFreed,
        prunedBatches: pruneResult.prunedCount,
        prunedBytesFreed: pruneResult.bytesFreed,
        message: "Storage cleanup and integrity maintenance completed successfully.",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Storage cleanup failed";
    return apiError(message, "STORAGE_CLEANUP_ERROR", 500);
  }
}

