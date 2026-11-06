import type { NextRequest } from "next/server";
import { prisma } from "./prisma.ts";
import { ActorType, AdminRole } from "@prisma/client";
import { verifyAdminSessionToken, type AdminSessionPayload } from "./auth.ts";
import { apiError } from "./api-response.ts";

/**
 * Standard Kukkiwon ID verification
 * Kukkiwon IDs are alphanumeric certificates issued by Kukkiwon World Taekwondo Headquarters.
 * Usually 6 to 12 alphanumeric characters (e.g. "05123456", "KUK-987654", "05872134")
 */
export function validateKukkiwonId(id: string): { valid: boolean; normalized?: string; error?: string } {
  if (!id || typeof id !== "string") {
    return { valid: false, error: "Kukkiwon ID is required." };
  }

  const trimmed = id.trim().toUpperCase();
  if (trimmed.length < 5 || trimmed.length > 20) {
    return { valid: false, error: "Kukkiwon ID must be between 5 and 20 characters." };
  }

  // Allow alphanumeric characters and standard hyphen/underscore
  const regex = /^[A-Z0-9\-_]+$/;
  if (!regex.test(trimmed)) {
    return { valid: false, error: "Kukkiwon ID may only contain uppercase letters, numbers, and hyphens." };
  }

  return { valid: true, normalized: trimmed };
}

/**
 * Record an audit log entry for security and compliance
 */
export async function logAuditEvent(options: {
  actorType: ActorType;
  actorId?: string;
  adminUserId?: string;
  registrationId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown> | string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    const detailsStr =
      typeof options.details === "object"
        ? JSON.stringify(options.details)
        : options.details || null;

    await prisma.auditLog.create({
      data: {
        actorType: options.actorType,
        actorId: options.actorId || null,
        adminUserId: options.adminUserId || null,
        registrationId: options.registrationId || null,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId || null,
        details: detailsStr,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
      },
    });
  } catch (err) {
    // Audit logging failure should not crash the main thread, but must be logged to stderr
    console.error("[AUDIT LOG ERROR] Failed to record audit log:", err);
  }
}

/**
 * RBAC Permission Checker
 */
export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  SUPER_ADMIN: [
    "admin:read",
    "admin:manage",
    "registrations:read",
    "registrations:review",
    "registrations:edit",
    "registrations:replace_photo",
    "academies:manage",
    "weight_categories:manage",
    "cards:generate",
    "cards:download",
    "cards:bulk_generate",
    "audit:read",
  ],
  REGISTRATION_ADMIN: [
    "registrations:read",
    "registrations:review",
    "registrations:edit",
    "registrations:replace_photo",
    "academies:manage",
    "weight_categories:manage",
    "cards:read",
    "audit:read",
  ],
  CARD_OPERATOR: [
    "registrations:read",
    "cards:generate",
    "cards:download",
    "cards:bulk_generate",
  ],
  AUDITOR: [
    "registrations:read",
    "cards:read",
    "audit:read",
  ],
};

export function hasPermission(role: AdminRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Authentication and authorization validator for administrative routes
 */
export async function authenticateAdminRequest(
  req: NextRequest,
  requiredPermission?: string
): Promise<{ errorResponse?: ReturnType<typeof apiError>; session?: AdminSessionPayload }> {
  const authHeader = req.headers.get("authorization");
  const cookieToken = req.cookies.get("kyorix_admin_session")?.value;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : cookieToken;

  if (!token) {
    return {
      errorResponse: apiError("Authentication required. Please sign in to the Admin Portal.", "UNAUTHORIZED", 401),
    };
  }

  const payload = await verifyAdminSessionToken(token);
  if (!payload) {
    return {
      errorResponse: apiError("Invalid or expired administrative session.", "UNAUTHORIZED", 401),
    };
  }

  // Verify account is active in database
  const admin = await prisma.adminUser.findUnique({
    where: { id: payload.adminId },
    select: { id: true, role: true, isActive: true },
  });

  if (!admin || !admin.isActive) {
    return {
      errorResponse: apiError("Administrative account is inactive or revoked.", "FORBIDDEN", 403),
    };
  }

  if (requiredPermission && !hasPermission(admin.role, requiredPermission)) {
    return {
      errorResponse: apiError(`Forbidden: insufficient privileges for action '${requiredPermission}'.`, "FORBIDDEN", 403),
    };
  }

  return { session: payload };
}

/**
 * In-memory sliding-window rate limiter
 * Protects public endpoints (registration, auth login) from automated abuse
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}
