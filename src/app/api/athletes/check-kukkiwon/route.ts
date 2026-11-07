import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateKukkiwonId, checkRateLimit } from "@/lib/security";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rateCheck = checkRateLimit(`check-kukkiwon:${ip}`, 60, 60000);
    if (!rateCheck.allowed) {
      return apiError("Too many requests. Please wait a moment.", "RATE_LIMIT_EXCEEDED", 429);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("kukkiwonId");

    if (!id) {
      return apiError("Kukkiwon ID is required.", "MISSING_PARAMETER", 400);
    }

    const validation = validateKukkiwonId(id);
    if (!validation.valid || !validation.normalized) {
      return apiSuccess({
        validFormat: false,
        isAvailable: false,
        error: validation.error || "Invalid Kukkiwon ID format.",
      });
    }

    const normalized = validation.normalized;
    const existing = await prisma.athlete.findUnique({
      where: { kukkiwonId: normalized },
      select: { id: true, fullName: true },
    });

    const isAvailable = !existing;
    return apiSuccess({
      validFormat: true,
      normalized,
      available: isAvailable,
      isAvailable,
      message: existing
        ? `Kukkiwon ID '${normalized}' is already registered in the system.`
        : `Kukkiwon ID '${normalized}' is available for registration.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error validating Kukkiwon ID";
    return apiError(message, "VALIDATION_ERROR", 500);
  }
}

