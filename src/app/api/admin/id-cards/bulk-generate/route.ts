import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest, logAuditEvent } from "@/lib/security";
import { enqueueBulkJob } from "@/lib/queue/worker";
import { apiSuccess, apiError } from "@/lib/api-response";
import { AgeDivision, Gender } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(req, "cards:bulk_generate");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const body = await req.json().catch(() => ({}));
    const { registrationIds, academyId, weightCategoryId, division, gender, selectAll } = body;

    // Build filter criteria
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
      select: { id: true },
      orderBy: [{ createdAt: "asc" }],
    });

    if (registrations.length === 0) {
      return apiError("No approved registrations found matching the specified criteria.", "NO_RECORDS", 404);
    }

    const regIds = registrations.map((r) => r.id);

    // Create CardGenerationBatch record
    const batchCount = await prisma.cardGenerationBatch.count();
    const batchNumber = `BATCH-${new Date().getFullYear()}-${String(batchCount + 1).padStart(4, "0")}`;

    const batch = await prisma.cardGenerationBatch.create({
      data: {
        batchNumber,
        initiatedByAdminId: auth.session.adminId,
        status: "QUEUED",
        totalCards: regIds.length,
        filterCriteria: JSON.stringify({
          academyId,
          weightCategoryId,
          division,
          gender,
          count: regIds.length,
        }),
      },
    });

    // Enqueue background processing job
    const job = await enqueueBulkJob({
      batchId: batch.id,
      adminId: auth.session.adminId,
      registrationIds: regIds,
      filterCriteria: { academyId, weightCategoryId, division, gender },
    });

    // Log initiation audit event
    await logAuditEvent({
      actorType: "ADMIN",
      actorId: auth.session.adminId,
      action: "ADMIN_BULK_BATCH_QUEUED",
      entityType: "CardGenerationBatch",
      entityId: batch.id,
      details: {
        batchNumber,
        totalSelected: regIds.length,
        jobId: job.id,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return apiSuccess(
      {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        jobId: job.id,
        status: "QUEUED",
        totalCards: batch.totalCards,
        message: `Bulk generation job enqueued for ${regIds.length} athletes. Processing asynchronously in the background.`,
      },
      202
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to initiate bulk card generation";
    return apiError(message, "BULK_GENERATION_ERROR", 500);
  }
}
