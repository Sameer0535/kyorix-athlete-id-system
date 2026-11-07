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
    const statusParam = searchParams.get("cardStatus") || searchParams.get("status") || "ALL"; // ALL | GENERATED | PENDING_GENERATION

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const andConditions: any[] = [{ approvalStatus: "APPROVED" }];

    if (academyId) andConditions.push({ academyId });
    if (weightCategoryId) andConditions.push({ weightCategoryId });

    if (search) {
      andConditions.push({
        OR: [
          { registrationNumber: { contains: search, mode: "insensitive" } },
          { athlete: { kukkiwonId: { contains: search, mode: "insensitive" } } },
          { athlete: { fullName: { contains: search, mode: "insensitive" } } },
          { idCard: { cardNumber: { contains: search, mode: "insensitive" } } },
        ],
      });
    }

    if (statusParam === "GENERATED") {
      andConditions.push({ idCard: { status: "GENERATED" } });
    } else if (statusParam === "PENDING_GENERATION") {
      andConditions.push({
        OR: [
          { idCard: null },
          { idCard: { status: "PENDING_GENERATION" } },
          { idCard: { generatedFileKey: null } },
        ],
      });
    }

    const where = { AND: andConditions };

    const [
      registrations,
      totalApproved,
      cardsGenerated,
      recentBatches,
      academies,
      weightCategories,
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
      prisma.idCardRecord.count({ where: { status: "GENERATED" } }),
      prisma.cardGenerationBatch.findMany({
        orderBy: { startedAt: "desc" },
        take: 5,
        include: {
          initiatedByAdmin: {
            select: { fullName: true, email: true },
          },
        },
      }),
      prisma.academy.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.weightCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
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
      academies,
      weightCategories,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching ID cards";
    return apiError(message, "CARDS_FETCH_ERROR", 500);
  }
}

