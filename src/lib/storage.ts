import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface SaveFileOptions {
  buffer: Buffer;
  originalFilename: string;
  subfolder: "photos" | "cards" | "batches";
  allowedMimeTypes?: string[];
  maxSizeBytes?: number;
}

export interface StorageFileResult {
  storageKey: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  checksumSha256: string;
}

// Ensure base private storage directory exists
const DEFAULT_STORAGE_ROOT = path.resolve(process.cwd(), "storage", "private");

export function getStorageRoot(): string {
  const customRoot = process.env.STORAGE_LOCAL_ROOT;
  const root = customRoot ? path.resolve(process.cwd(), customRoot) : DEFAULT_STORAGE_ROOT;
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  return root;
}

/**
 * Validates magic bytes / signatures for standard allowed image and PDF formats
 */
export function verifyMagicBytes(buffer: Buffer): { valid: boolean; detectedMime?: string } {
  if (buffer.length < 4) return { valid: false };

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: "image/png" };
  }

  // WEBP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { valid: true, detectedMime: "image/webp" };
  }

  // PDF: %PDF-
  if (buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "%PDF") {
    return { valid: true, detectedMime: "application/pdf" };
  }

  // ZIP (for bulk download batches): PK\x03\x04
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return { valid: true, detectedMime: "application/zip" };
  }

  return { valid: false };
}

/**
 * Saves a file securely to the private storage repository
 */
export async function savePrivateFile(options: SaveFileOptions): Promise<StorageFileResult> {
  const { buffer, originalFilename, subfolder, allowedMimeTypes, maxSizeBytes } = options;

  // 1. File size check (configurable per subfolder)
  const defaultMax =
    subfolder === "batches"
      ? 500 * 1024 * 1024 // 500 MB for bulk combined PDFs and ZIP packages
      : subfolder === "cards"
      ? 20 * 1024 * 1024 // 20 MB for individual card PDFs
      : parseInt(process.env.MAX_PHOTO_SIZE_BYTES || "5242880", 10); // 5 MB for photographs

  const maxLimit = maxSizeBytes || defaultMax;
  if (buffer.length > maxLimit) {
    throw new Error(`File size ${buffer.length} bytes exceeds maximum allowed limit of ${maxLimit} bytes for '${subfolder}'.`);
  }

  // 2. Magic byte / MIME validation
  const magicCheck = verifyMagicBytes(buffer);
  if (!magicCheck.valid || !magicCheck.detectedMime) {
    throw new Error("Invalid file content: signature does not match allowed binary format.");
  }

  const mimeType = magicCheck.detectedMime;
  if (allowedMimeTypes && !allowedMimeTypes.includes(mimeType)) {
    throw new Error(`MIME type '${mimeType}' is not in the list of allowed types: ${allowedMimeTypes.join(", ")}`);
  }

  // 3. Compute cryptographic SHA-256 digest
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  // 4. Sanitize and generate unique storage filename
  const ext = path.extname(originalFilename).toLowerCase() || `.${mimeType.split("/")[1]}`;
  const randomToken = crypto.randomBytes(16).toString("hex");
  const secureFilename = `${Date.now()}_${randomToken}${ext}`;

  // 5. Secure target path inside storage root
  const root = getStorageRoot();
  const targetDir = path.join(root, subfolder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const absoluteFilePath = path.join(targetDir, secureFilename);

  // Prevent directory traversal attacks
  if (!absoluteFilePath.startsWith(root)) {
    throw new Error("Security violation: path traversal attempt detected.");
  }

  // Write file
  await fs.promises.writeFile(absoluteFilePath, buffer);

  const storageKey = `${subfolder}/${secureFilename}`;

  return {
    storageKey,
    fileName: path.basename(originalFilename),
    mimeType,
    fileSizeBytes: buffer.length,
    checksumSha256: hash,
  };
}

/**
 * Retrieves a private file buffer by storage key
 */
export async function getPrivateFile(storageKey: string): Promise<{ buffer: Buffer; absolutePath: string }> {
  const root = getStorageRoot();
  const absoluteFilePath = path.resolve(root, storageKey);

  // Security: Prevent directory traversal
  if (!absoluteFilePath.startsWith(root)) {
    throw new Error("Security violation: unauthorized file path requested.");
  }

  if (!fs.existsSync(absoluteFilePath)) {
    throw new Error(`File not found in private storage: ${storageKey}`);
  }

  const buffer = await fs.promises.readFile(absoluteFilePath);
  return { buffer, absolutePath: absoluteFilePath };
}

/**
 * Safely deletes a private file if needed
 */
export async function deletePrivateFile(storageKey: string): Promise<boolean> {
  try {
    const root = getStorageRoot();
    const absoluteFilePath = path.resolve(root, storageKey);
    if (!absoluteFilePath.startsWith(root)) return false;
    if (fs.existsSync(absoluteFilePath)) {
      await fs.promises.unlink(absoluteFilePath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

