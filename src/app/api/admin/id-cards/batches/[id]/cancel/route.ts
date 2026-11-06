import { NextRequest } from "next/server";
import { authenticateAdminRequest } from "@/lib/security";
import { cancelBatchJob } from "@/lib/queue/worker";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdminRequest(req, "cards:bulk_generate");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const { id } = await context.params;

    await cancelBatchJob(id, auth.session.adminId);

    return apiSuccess({
      cancelled: true,
      message: "Batch generation job has been cancelled safely.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to cancel batch";
    return apiError(message, "BATCH_CANCEL_ERROR", 400);
  }
}

