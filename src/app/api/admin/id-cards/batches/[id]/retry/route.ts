import { NextRequest } from "next/server";
import { authenticateAdminRequest } from "@/lib/security";
import { retryFailedBatchRecords } from "@/lib/queue/worker";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdminRequest(req, "cards:bulk_generate");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const { id } = await context.params;

    const result = await retryFailedBatchRecords(id, auth.session.adminId);

    return apiSuccess({
      retried: true,
      retryBatchId: result.retryBatch.id,
      retryBatchNumber: result.retryBatch.batchNumber,
      jobId: result.job.id,
      message: `Enqueued retry batch ${result.retryBatch.batchNumber} for ${result.retryBatch.totalCards} failed records.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retry batch";
    return apiError(message, "BATCH_RETRY_ERROR", 400);
  }
}

