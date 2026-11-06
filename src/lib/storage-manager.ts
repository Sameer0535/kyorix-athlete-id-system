import fs from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "./prisma.ts";

const PRIVATE_STORAGE_DIR =
  process.env.STORAGE_LOCAL_ROOT || path.resolve(process.cwd(), "storage", "private");
const TMP_STORAGE_DIR = path.resolve(process.cwd(), "storage", "tmp");

export interface StorageIntegrityReport {
  checkedRecords: number;
  validFiles: number;
  missingFiles: number;
  corruptFiles: number;
  missingFileKeys: string[];
  corruptFileKeys: string[];
}

export interface CleanupReport {
  tempFilesRemoved: number;
  tempBytesFreed: number;
  prunedBatches: number;
  prunedBytesFreed: number;
}

/**
 * Validate that a storage key does not escape the private storage root
 */
export function validateStorageKey(key: string): { valid: boolean; absolutePath: string } {
  const normalizedKey = key.replace(/^[/\\]+/, "");
  const absolutePath = path.resolve(PRIVATE_STORAGE_DIR, normalizedKey);

  if (!absolutePath.startsWith(PRIVATE_STORAGE_DIR)) {
    return { valid: false, absolutePath: "" };
  }

  return { valid: true, absolutePath };
}

/**
 * Compute SHA-256 hash of a file on disk
 */
export function computeFileChecksum(filePath: string): string {
  if (!fs.existsSync(filePath)) return "";
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Verify integrity of private storage against database SHA-256 checksums
 */
export async function verifyStorageIntegrity(): Promise<StorageIntegrityReport> {
  const records = await prisma.idCardRecord.findMany({
    where: { status: "GENERATED", generatedFileKey: { not: null } },
    select: { id: true, generatedFileKey: true, checksumSha256: true },
  });

  const report: StorageIntegrityReport = {
    checkedRecords: records.length,
    validFiles: 0,
    missingFiles: 0,
    corruptFiles: 0,
    missingFileKeys: [],
    corruptFileKeys: [],
  };

  for (const rec of records) {
    if (!rec.generatedFileKey) continue;
    const { valid, absolutePath } = validateStorageKey(rec.generatedFileKey);

    if (!valid || !fs.existsSync(absolutePath)) {
      report.missingFiles++;
      report.missingFileKeys.push(rec.generatedFileKey);
      continue;
    }

    if (rec.checksumSha256) {
      const currentHash = computeFileChecksum(absolutePath);
      if (currentHash !== rec.checksumSha256) {
        report.corruptFiles++;
        report.corruptFileKeys.push(rec.generatedFileKey);
        continue;
      }
    }

    report.validFiles++;
  }

  return report;
}

/**
 * Clean up temporary files older than a specified duration (default: 24 hours)
 */
export function cleanupTempFiles(maxAgeHours = 24): { filesRemoved: number; bytesFreed: number } {
  let filesRemoved = 0;
  let bytesFreed = 0;

  if (!fs.existsSync(TMP_STORAGE_DIR)) return { filesRemoved: 0, bytesFreed: 0 };

  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

  const entries = fs.readdirSync(TMP_STORAGE_DIR);
  for (const entry of entries) {
    const fullPath = path.join(TMP_STORAGE_DIR, entry);
    try {
      const stat = fs.statSync(fullPath);
      if (now - stat.mtimeMs > maxAgeMs) {
        bytesFreed += stat.size;
        fs.unlinkSync(fullPath);
        filesRemoved++;
      }
    } catch {
      // Ignore transient file lock errors
    }
  }

  return { filesRemoved, bytesFreed };
}

/**
 * Clean up partial artifacts from failed or cancelled batches
 */
export async function cleanupFailedBatchFiles(batchId: string): Promise<number> {
  let filesDeleted = 0;
  const batch = await prisma.cardGenerationBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) return 0;

  const keysToDelete = [batch.pdfFileKey, batch.archiveFileKey].filter(Boolean) as string[];

  for (const key of keysToDelete) {
    const { valid, absolutePath } = validateStorageKey(key);
    if (valid && fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
        filesDeleted++;
      } catch {
        // Ignore
      }
    }
  }

  return filesDeleted;
}

/**
 * Prune batch archives older than retention days (default: 30 days)
 */
export async function pruneOldBatches(retentionDays = 30): Promise<{ prunedCount: number; bytesFreed: number }> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const oldBatches = await prisma.cardGenerationBatch.findMany({
    where: {
      completedAt: { lt: cutoff },
      OR: [{ pdfFileKey: { not: null } }, { archiveFileKey: { not: null } }],
    },
  });

  let prunedCount = 0;
  let bytesFreed = 0;

  for (const b of oldBatches) {
    for (const key of [b.pdfFileKey, b.archiveFileKey]) {
      if (!key) continue;
      const { valid, absolutePath } = validateStorageKey(key);
      if (valid && fs.existsSync(absolutePath)) {
        try {
          const stat = fs.statSync(absolutePath);
          bytesFreed += stat.size;
          fs.unlinkSync(absolutePath);
        } catch {
          // Ignore
        }
      }
    }

    await prisma.cardGenerationBatch.update({
      where: { id: b.id },
      data: {
        pdfFileKey: null,
        archiveFileKey: null,
      },
    });

    prunedCount++;
  }

  return { prunedCount, bytesFreed };
}

