import { prisma } from "../prisma.ts";
import { executeBulkExport } from "../export/bulk-exporter.ts";
import { logAuditEvent } from "../security.ts";

export interface EnqueueBatchJobParams {
  batchId: string;
  adminId: string;
  registrationIds: string[];
  filterCriteria?: Record<string, unknown>;
}

/**
 * Enqueue a new bulk ID card generation job in the PostgreSQL-backed queue
 */
export async function enqueueBulkJob(params: EnqueueBatchJobParams) {
  const { batchId, adminId, registrationIds, filterCriteria } = params;

  // 1. Create BackgroundJob record
  const job = await prisma.backgroundJob.create({
    data: {
      jobType: "BULK_CARD_GENERATION",
      status: "QUEUED",
      batchId,
      payload: JSON.stringify({
        batchId,
        adminId,
        registrationIds,
        filterCriteria: filterCriteria || {},
      }),
      totalCount: registrationIds.length,
      processedCount: 0,
      successfulCount: 0,
      failedCount: 0,
      progress: 0,
    },
  });

  // 2. Trigger asynchronous background runner without blocking HTTP response
  setImmediate(() => {
    processJob(job.id).catch((err) => {
      console.error(`[WORKER] Unhandled background job failure: ${job.id}`, err);
    });
  });

  return job;
}

/**
 * Atomically claim the next available queued job.
 * Guaranteed: Only one worker instance can claim a given job due to atomic single-statement update.
 */
export async function claimNextQueuedJob(workerId: string): Promise<string | null> {
  const candidate = await prisma.backgroundJob.findFirst({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!candidate) return null;

  const result = await prisma.backgroundJob.updateMany({
    where: {
      id: candidate.id,
      status: "QUEUED",
    },
    data: {
      status: "PROCESSING",
      lockedBy: workerId,
      lockedAt: new Date(),
      heartbeatAt: new Date(),
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });

  return result.count > 0 ? candidate.id : null;
}

/**
 * Process a background job with atomic locking, progress heartbeats, and error handling
 */
export async function processJob(jobId: string, customWorkerId?: string) {
  const workerId = customWorkerId || `worker-${process.pid}-${Date.now()}`;

  // 1. Acquire atomic single-statement lock on the job.
  // In PostgreSQL, updateMany with status: "QUEUED" guarantees that only ONE worker can transition this row.
  const claimResult = await prisma.backgroundJob.updateMany({
    where: {
      id: jobId,
      status: "QUEUED",
    },
    data: {
      status: "PROCESSING",
      lockedBy: workerId,
      lockedAt: new Date(),
      heartbeatAt: new Date(),
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });

  // If claimResult.count === 0, another concurrent worker already claimed or processed this job
  if (claimResult.count === 0) {
    const existing = await prisma.backgroundJob.findUnique({
      where: { id: jobId },
      select: { status: true, lockedBy: true },
    });
    // If already locked by this exact customWorkerId, continue
    if (existing?.lockedBy !== workerId || existing?.status !== "PROCESSING") {
      return null;
    }
  }

  const job = await prisma.backgroundJob.findUnique({
    where: { id: jobId },
  });

  if (!job) return null;

  const payload = JSON.parse(job.payload);
  const { batchId, registrationIds, adminId } = payload;

  // Update batch status to PROCESSING
  await prisma.cardGenerationBatch.update({
    where: { id: batchId },
    data: { status: "PROCESSING" },
  });

  try {
    // Progress callback for live database updates with intelligent throttling
    let lastProgressUpdateTime = 0;
    const onProgress = async (prog: {
      processedCount: number;
      totalCount: number;
      successfulCount: number;
      failedCount: number;
    }) => {
      const now = Date.now();
      const isFinal = prog.processedCount === prog.totalCount;

      // Throttle DB updates to once every 1200ms unless it is the final progress event
      if (!isFinal && now - lastProgressUpdateTime < 1200) {
        return;
      }
      lastProgressUpdateTime = now;

      const percentage = prog.totalCount > 0 ? Math.round((prog.processedCount / prog.totalCount) * 100) : 0;

      await prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          progress: percentage,
          processedCount: prog.processedCount,
          successfulCount: prog.successfulCount,
          failedCount: prog.failedCount,
          heartbeatAt: new Date(),
        },
      });

      await prisma.cardGenerationBatch.update({
        where: { id: batchId },
        data: {
          successfulCards: prog.successfulCount,
          failedCards: prog.failedCount,
        },
      });
    };

    // Cancellation check
    const checkCancelled = async (): Promise<boolean> => {
      const current = await prisma.backgroundJob.findUnique({
        where: { id: jobId },
        select: { status: true },
      });
      return current?.status === "CANCELLED";
    };

    // Execute bulk generation
    const result = await executeBulkExport(batchId, registrationIds, {
      onProgress,
      checkCancelled,
    });

    const finalStatus =
      result.failed === 0
        ? "COMPLETED"
        : result.successful > 0
        ? "PARTIAL_FAILURE"
        : "FAILED";

    // Update Batch Record
    await prisma.cardGenerationBatch.update({
      where: { id: batchId },
      data: {
        status: finalStatus,
        successfulCards: result.successful,
        failedCards: result.failed,
        pdfFileKey: result.pdfStorageKey,
        pdfFileSizeBytes: result.pdfFileSizeBytes,
        archiveFileKey: result.zipStorageKey,
        zipFileSizeBytes: result.zipFileSizeBytes,
        failedRecords: result.failedRecords.length > 0 ? JSON.stringify(result.failedRecords) : null,
        completedAt: new Date(),
      },
    });

    // Update Job Record
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        progress: 100,
        processedCount: result.total,
        successfulCount: result.successful,
        failedCount: result.failed,
        completedAt: new Date(),
      },
    });

    // Log completion audit event
    await logAuditEvent({
      actorType: "ADMIN",
      actorId: adminId,
      action: "ADMIN_BULK_BATCH_COMPLETED",
      entityType: "CardGenerationBatch",
      entityId: batchId,
      details: {
        batchNumber: result.batchNumber,
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        pdfFileKey: result.pdfStorageKey,
        zipFileKey: result.zipStorageKey,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Job processing failure";

    if (errorMsg === "BATCH_CANCELLED_BY_ADMIN") {
      await prisma.cardGenerationBatch.update({
        where: { id: batchId },
        data: {
          status: "CANCELLED",
          completedAt: new Date(),
          errorSummary: "Operation cancelled by administrator.",
        },
      });

      await prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: "CANCELLED",
          errorMessage: "Operation cancelled by administrator.",
          completedAt: new Date(),
        },
      });

      return;
    }

    // Mark Job as FAILED
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorMessage: errorMsg,
        completedAt: new Date(),
      },
    });

    await prisma.cardGenerationBatch.update({
      where: { id: batchId },
      data: {
        status: "FAILED",
        errorSummary: errorMsg,
        completedAt: new Date(),
      },
    });
  }
}

/**
 * Cancel an active or queued batch generation job safely
 */
export async function cancelBatchJob(batchId: string, adminId: string) {
  const batch = await prisma.cardGenerationBatch.findUnique({
    where: { id: batchId },
    include: { job: true },
  });

  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  if (batch.status === "COMPLETED" || batch.status === "CANCELLED") {
    throw new Error(`Cannot cancel batch in status: ${batch.status}`);
  }

  // Update batch and job to CANCELLED
  await prisma.cardGenerationBatch.update({
    where: { id: batchId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      completedAt: new Date(),
    },
  });

  if (batch.job) {
    await prisma.backgroundJob.update({
      where: { id: batch.job.id },
      data: {
        status: "CANCELLED",
        errorMessage: "Cancelled by administrator request.",
        completedAt: new Date(),
      },
    });
  }

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: adminId,
    action: "ADMIN_BULK_BATCH_CANCELLED",
    entityType: "CardGenerationBatch",
    entityId: batchId,
    details: { batchNumber: batch.batchNumber },
  });
}

/**
 * Retry failed records from a previous batch
 */
export async function retryFailedBatchRecords(batchId: string, adminId: string) {
  const batch = await prisma.cardGenerationBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  if (!batch.failedRecords) {
    throw new Error("No failed records recorded for this batch to retry.");
  }

  const failedItems: Array<{ registrationId: string }> = JSON.parse(batch.failedRecords);
  const registrationIds = failedItems.map((f) => f.registrationId);

  if (registrationIds.length === 0) {
    throw new Error("Failed record list is empty.");
  }

  // Generate new retry batch
  const batchCount = await prisma.cardGenerationBatch.count();
  const retryBatchNumber = `${batch.batchNumber}-RETRY-${String(batchCount + 1).padStart(3, "0")}`;

  const retryBatch = await prisma.cardGenerationBatch.create({
    data: {
      batchNumber: retryBatchNumber,
      initiatedByAdminId: adminId,
      totalCards: registrationIds.length,
      status: "QUEUED",
      filterCriteria: JSON.stringify({ retryOf: batch.batchNumber }),
    },
  });

  // Enqueue job for the retry batch
  const job = await enqueueBulkJob({
    batchId: retryBatch.id,
    adminId,
    registrationIds,
    filterCriteria: { retryOf: batch.batchNumber },
  });

  return { retryBatch, job };
}

/**
 * Recover orphaned/stale jobs (e.g. after server restart or ungraceful shutdown)
 */
export async function recoverStaleJobs(staleThresholdMinutes = 10) {
  const cutoff = new Date(Date.now() - staleThresholdMinutes * 60 * 1000);

  const staleJobs = await prisma.backgroundJob.findMany({
    where: {
      status: "PROCESSING",
      heartbeatAt: { lt: cutoff },
    },
  });

  for (const job of staleJobs) {
    console.warn(`[RECOVERY] Recovering stale job ${job.id} (last heartbeat: ${job.heartbeatAt})`);

    if (job.attempts >= job.maxAttempts) {
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage: "Job abandoned due to worker timeout and exceeded maximum retry attempts.",
          completedAt: new Date(),
        },
      });
      if (job.batchId) {
        await prisma.cardGenerationBatch.update({
          where: { id: job.batchId },
          data: {
            status: "FAILED",
            errorSummary: "Job timed out and worker died.",
            completedAt: new Date(),
          },
        });
      }
    } else {
      // Reset back to QUEUED for another worker
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: "QUEUED",
          lockedBy: null,
          lockedAt: null,
        },
      });
    }
  }

  return staleJobs.length;
}

