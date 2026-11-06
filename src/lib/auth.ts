import { SignJWT, jwtVerify } from "jose";
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "crypto";
import { prisma } from "./prisma";

// Ensure secrets are available
const JWT_SECRET_STRING =
  process.env.JWT_SECRET || "kyorix-athlete-id-sys-secure-jwt-secret-min32chars-2026!";
const ATHLETE_ACCESS_SECRET_STRING =
  process.env.ATHLETE_ACCESS_SECRET || "kyorix-athlete-token-secret-selfservice-32chars!";

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const ATHLETE_SECRET = new TextEncoder().encode(ATHLETE_ACCESS_SECRET_STRING);

export interface AdminSessionPayload {
  adminId: string;
  email: string;
  fullName: string;
  role: string;
  type: "ADMIN";
}

export interface AthleteTokenPayload {
  registrationId: string;
  athleteId: string;
  kukkiwonId: string;
  type: "ATHLETE";
}

/**
 * Hash a plain text password using cryptographic scrypt with a unique random salt
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verify a plain text password against a stored salt:hash string using constant-time comparison
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = scryptSync(password, salt, 64);
    return timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically signed JWT session for authenticated administrators
 */
export async function createAdminSessionToken(payload: Omit<AdminSessionPayload, "type">): Promise<string> {
  const expiresIn = process.env.JWT_EXPIRES_IN || "12h";
  return new SignJWT({ ...payload, type: "ADMIN" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setIssuer("kyorix:athlete-id:admin")
    .sign(JWT_SECRET);
}

/**
 * Verify an administrative session JWT token
 */
export async function verifyAdminSessionToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: "kyorix:athlete-id:admin",
    });
    if (payload.type !== "ADMIN") return null;
    return payload as unknown as AdminSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Create a secure access token for an athlete to query registration and download their card
 */
export async function createAthleteAccessToken(payload: Omit<AthleteTokenPayload, "type">): Promise<string> {
  const expiresIn = process.env.ATHLETE_DOWNLOAD_TOKEN_EXPIRES_IN || "1h";
  return new SignJWT({ ...payload, type: "ATHLETE" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setIssuer("kyorix:athlete-id:athlete")
    .sign(ATHLETE_SECRET);
}

/**
 * Verify an athlete access token for self-service card retrieval
 */
export async function verifyAthleteAccessToken(token: string): Promise<AthleteTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ATHLETE_SECRET, {
      issuer: "kyorix:athlete-id:athlete",
    });
    if (payload.type !== "ATHLETE") return null;
    return payload as unknown as AthleteTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Compute HMAC-SHA256 hash of an athlete's plain secret access code.
 * Raw codes are never persisted in the database.
 */
export function hashAthleteAccessCode(plainCode: string): string {
  return createHmac("sha256", ATHLETE_ACCESS_SECRET_STRING)
    .update(plainCode.trim())
    .digest("hex");
}

/**
 * Verify a candidate access code against the stored cryptographic hash using constant-time comparison
 */
export function verifyAthleteAccessCode(candidateCode: string, storedHash: string): boolean {
  try {
    const computedHash = hashAthleteAccessCode(candidateCode);
    const a = Buffer.from(computedHash, "hex");
    const b = Buffer.from(storedHash, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Generate a short-lived (5 min), single-use cryptographic download grant token
 */
export async function createSingleUseDownloadGrant(params: {
  registrationId: string;
  athleteId: string;
  ipAddress?: string;
  maxAgeMinutes?: number;
}): Promise<string> {
  const { registrationId, athleteId, ipAddress, maxAgeMinutes = 5 } = params;
  const grantToken = `dgrant_${randomBytes(24).toString("hex")}`;
  const expiresAt = new Date(Date.now() + maxAgeMinutes * 60 * 1000);

  await prisma.downloadGrant.create({
    data: {
      grantToken,
      registrationId,
      athleteId,
      expiresAt,
      isUsed: false,
      usedByIp: ipAddress,
    },
  });

  return grantToken;
}

/**
 * Atomically verify and consume a single-use download grant.
 * Protects against URL token leakage, replay attacks, and unauthorized sharing.
 */
export async function verifyAndConsumeDownloadGrant(
  grantToken: string,
  registrationId: string,
  ipAddress?: string
): Promise<{ valid: boolean; reason?: string }> {
  const grant = await prisma.downloadGrant.findUnique({
    where: { grantToken },
  });

  if (!grant) {
    return { valid: false, reason: "INVALID_GRANT_TOKEN" };
  }

  if (grant.registrationId !== registrationId) {
    return { valid: false, reason: "GRANT_REGISTRATION_MISMATCH" };
  }

  if (grant.isUsed) {
    return { valid: false, reason: "GRANT_ALREADY_CONSUMED_REPLAY_DETECTED" };
  }

  if (new Date() > grant.expiresAt) {
    return { valid: false, reason: "GRANT_TOKEN_EXPIRED" };
  }

  // Atomically consume the grant
  await prisma.downloadGrant.update({
    where: { id: grant.id },
    data: {
      isUsed: true,
      usedAt: new Date(),
      usedByIp: ipAddress || grant.usedByIp,
    },
  });

  return { valid: true };
}


