import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateKukkiwonId, checkRateLimit } from "@/lib/security";
import { apiSuccess, apiError } from "@/lib/api-response";
import { createAthleteAccessToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rateCheck = checkRateLimit(`status-query:${ip}`, 45, 60000);
    if (!rateCheck.allowed) {
      return apiError("Too many status queries. Please wait a minute.", "RATE_LIMIT_EXCEEDED", 429);
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();

    if (!query) {
      return apiError("Please provide a Kukkiwon ID or Registration Number.", "MISSING_QUERY", 400);
    }

    const upperQuery = query.toUpperCase();

    // Query by Kukkiwon ID or Registration Number or Token
    const registration = await prisma.registration.findFirst({
      where: {
        OR: [
          { registrationNumber: upperQuery },
          { athlete: { kukkiwonId: upperQuery } },
          { athleteAccessToken: query },
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
            contactPhone: true,
            contactEmail: true,
          },
        },
        academy: {
          select: {
            id: true,
            code: true,
            name: true,
            city: true,
            state: true,
          },
        },
        weightCategory: {
          select: {
            id: true,
            code: true,
            name: true,
            division: true,
            gender: true,
            minWeightKg: true,
            maxWeightKg: true,
          },
        },
        photograph: {
          select: {
            id: true,
            storageKey: true,
            mimeType: true,
            fileSizeBytes: true,
            uploadedAt: true,
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
      orderBy: { createdAt: "desc" },
    });

    if (!registration) {
      return apiSuccess({
        found: false,
        message: "No registration matching the provided identifier was found.",
      });
    }

    let downloadToken: string | undefined = undefined;
    if (registration.approvalStatus === "APPROVED") {
      downloadToken = await createAthleteAccessToken({
        registrationId: registration.id,
        athleteId: registration.athleteId,
        kukkiwonId: registration.athlete.kukkiwonId,
      });
    }

    return apiSuccess({
      found: true,
      registration: {
        id: registration.id,
        registrationNumber: registration.registrationNumber,
        approvalStatus: registration.approvalStatus,
        approvalDate: registration.approvalDate,
        rejectionReason: registration.rejectionReason,
        correctionsRequested: registration.notes,
        submittedAt: registration.createdAt,
        updatedAt: registration.updatedAt,
        athlete: registration.athlete,
        academy: registration.academy,
        weightCategory: registration.weightCategory,
        photograph: {
          id: registration.photograph.id,
          // Private authenticated streaming URL
          streamUrl: `/api/storage/${registration.photograph.storageKey}?token=${registration.athleteAccessToken}`,
        },
        idCard: registration.idCard,
        canDownloadCard: registration.approvalStatus === "APPROVED",
        requiresChanges: registration.approvalStatus === "CHANGES_REQUESTED",
        athleteAccessToken: registration.athleteAccessToken,
        downloadToken,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching registration status";
    return apiError(message, "STATUS_QUERY_ERROR", 500);
  }
}

