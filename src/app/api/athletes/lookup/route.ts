import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateKukkiwonId } from "@/lib/security";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kukkiwonIdParam = searchParams.get("kukkiwonId");

    if (!kukkiwonIdParam) {
      return apiError("Query parameter 'kukkiwonId' is required.", "MISSING_PARAMETER", 400);
    }

    const validation = validateKukkiwonId(kukkiwonIdParam);
    if (!validation.valid || !validation.normalized) {
      return apiError(validation.error || "Invalid Kukkiwon ID format.", "INVALID_KUKKIWON_ID", 400);
    }

    const athlete = await prisma.athlete.findUnique({
      where: { kukkiwonId: validation.normalized },
      include: {
        academy: {
          select: {
            id: true,
            code: true,
            name: true,
            city: true,
            state: true,
          },
        },
        registrations: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            weightCategory: {
              select: {
                id: true,
                code: true,
                name: true,
                division: true,
                gender: true,
              },
            },
            idCard: {
              select: {
                id: true,
                cardNumber: true,
                status: true,
                generatedAt: true,
                downloadCountAthlete: true,
              },
            },
          },
        },
      },
    });

    if (!athlete) {
      return apiSuccess({
        found: false,
        kukkiwonId: validation.normalized,
        message: "No athlete registered with this Kukkiwon ID.",
      });
    }

    const latestRegistration = athlete.registrations[0] || null;

    return apiSuccess({
      found: true,
      athlete: {
        id: athlete.id,
        kukkiwonId: athlete.kukkiwonId,
        fullName: athlete.fullName,
        gender: athlete.gender,
        danOrPoom: athlete.danOrPoom,
        academyName: athlete.academy.name,
        academyCity: athlete.academy.city,
        registrationStatus: latestRegistration?.approvalStatus || "UNREGISTERED",
        weightCategory: latestRegistration?.weightCategory?.name || "Not assigned",
        idCard: latestRegistration?.idCard || null,
        canDownloadCard: latestRegistration?.approvalStatus === "APPROVED" && !!latestRegistration?.idCard?.generatedAt,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    return apiError(message, "LOOKUP_ERROR", 500);
  }
}

