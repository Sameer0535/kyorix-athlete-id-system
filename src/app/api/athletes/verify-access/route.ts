import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateKukkiwonId, checkRateLimit, logAuditEvent } from "@/lib/security";
import {
  createAthleteAccessToken,
  createSingleUseDownloadGrant,
  verifyAthleteAccessCode,
} from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

/**
 * POST /api/athletes/verify-access
 * Authenticate an athlete using their Kukkiwon ID / Registration Number AND their secret Access Token.
 * Returns a cryptographically signed JWT download token and a single-use download grant.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rateCheck = checkRateLimit(`athlete-verify:${ip}`, 15, 60000);
    if (!rateCheck.allowed) {
      return apiError(
        "Too many verification attempts. Please wait a minute before trying again.",
        "RATE_LIMIT_EXCEEDED",
        429
      );
    }

    const body = await req.json().catch(() => ({}));
    const { identifier, accessToken } = body;

    if (!identifier || !accessToken) {
      return apiError(
        "Both Athlete Identifier (Kukkiwon ID or Registration Number) and Access Token are required.",
        "MISSING_CREDENTIALS",
        400
      );
    }

    const trimmedId = String(identifier).trim().toUpperCase();
    const trimmedToken = String(accessToken).trim();

    // Find registration matching the identifier
    const registration = await prisma.registration.findFirst({
      where: {
        OR: [
          { registrationNumber: trimmedId },
          { athlete: { kukkiwonId: trimmedId } },
        ],
      },
      include: {
        athlete: {
          select: {
            id: true,
            kukkiwonId: true,
            fullName: true,
            gender: true,
            danOrPoom: true,
          },
        },
        academy: {
          select: {
            name: true,
            city: true,
          },
        },
        weightCategory: {
          select: {
            name: true,
            division: true,
          },
        },
        idCard: {
          select: {
            id: true,
            cardNumber: true,
            status: true,
            generatedAt: true,
          },
        },
      },
    });

    if (!registration) {
      return apiError("No registration found matching the provided identifier.", "NOT_FOUND", 404);
    }

    // Verify secret access token against cryptographic HMAC-SHA256 hash
    let isValidCode = false;
    if (registration.athleteAccessTokenHash) {
      isValidCode = verifyAthleteAccessCode(trimmedToken, registration.athleteAccessTokenHash);
    } else if (registration.athleteAccessToken) {
      isValidCode = registration.athleteAccessToken === trimmedToken;
    }

    if (!isValidCode) {
      await logAuditEvent({
        actorType: "ATHLETE_PORTAL",
        action: "ATHLETE_VERIFICATION_FAILED_INVALID_TOKEN",
        entityType: "Registration",
        entityId: registration.id,
        details: {
          identifier: trimmedId,
          ipAddress: ip,
        },
        ipAddress: ip,
        userAgent: req.headers.get("user-agent") || undefined,
      });

      return apiError("Invalid Access Token. Please verify the code received upon registration.", "INVALID_TOKEN", 401);
    }

    // 1. Create short-lived single-use download grant (valid 5 minutes, single consumption)
    const singleUseGrantToken = await createSingleUseDownloadGrant({
      registrationId: registration.id,
      athleteId: registration.athleteId,
      ipAddress: ip,
      maxAgeMinutes: 5,
    });

    // 2. Create signed JWT token
    const downloadToken = await createAthleteAccessToken({
      registrationId: registration.id,
      athleteId: registration.athleteId,
      kukkiwonId: registration.athlete.kukkiwonId,
    });

    return apiSuccess({
      verified: true,
      downloadToken,
      singleUseGrantToken,
      registration: {
        id: registration.id,
        registrationNumber: registration.registrationNumber,
        approvalStatus: registration.approvalStatus,
        cardRole: registration.cardRole || "PARTICIPANT",
        athlete: registration.athlete,
        academy: registration.academy,
        weightCategory: registration.weightCategory,
        idCard: registration.idCard,
        canDownloadCard: registration.approvalStatus === "APPROVED",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return apiError(message, "VERIFICATION_ERROR", 500);
  }
}
