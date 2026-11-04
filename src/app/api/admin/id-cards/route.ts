import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest } from "@/lib/security";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(req, "cards:read");
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const academyId = searchParams.get("academyId") || "";
    const weightCategoryId = searchParams.get("weightCategoryId") || "";
    const statusParam = searchParams.get("status") || "ALL"; // ALL | GENERATED | PENDING_GENERATION

    // Only approved registrations can have ID cards
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      approvalStatus: "APPROVED",
    };

    if (academyId) where.academyId = academyId;
    if (weightCategoryId) where.weightCategoryId = weightCategoryId;

    if (search) {
      where.OR = [
        { registrationNumber: { contains: search, mode: "insensitive" } },
        { athlete: { kukkiwonId: { contains: search, mode: "insensitive" } } },
        { athlete: { fullName: { contains: search, mode: "insensitive" } } },
        { idCard: { cardNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (statusParam === "GENERATED") {
      where.idCard = { status: "GENERATED", generatedFileKey: { not: null } };
    } else if (statusParam === "PENDING_GENERATION") {
      where.OR = [
        { idCard: null },
        { idCard: { status: "PENDING_GENERATION" } },
        { idCard: { generatedFileKey: null } },
      ];
    }

    const [
      registrations,
      totalApproved,
      cardsGenerated,
      recentBatches,
    ] = await Promise.all([
      prisma.registration.findMany({
        where,
        include: {
          athlete: true,
          academy: true,
          weightCategory: true,
          photograph: true,
          idCard: {
            include: {
              batch: true,
              generationHistory: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.registration.count({ where: { approvalStatus: "APPROVED" } }),
      prisma.idCardRecord.count({ where: { status: "GENERATED", generatedFileKey: { not: null } } }),
      prisma.cardGenerationBatch.findMany({
        orderBy: { startedAt: "desc" },
        take: 5,
        include: {
          initiatedByAdmin: {
            select: { fullName: true, email: true },
          },
        },
      }),
    ]);

    const pendingGeneration = Math.max(0, totalApproved - cardsGenerated);

    return apiSuccess({
      registrations,
      stats: {
        totalApproved,
        cardsGenerated,
        pendingGeneration,
        failedGenerations: 0,
      },
      recentBatches,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching ID cards";
    return apiError(message, "CARDS_FETCH_ERROR", 500);
  }
}

