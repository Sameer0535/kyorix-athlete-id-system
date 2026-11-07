import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const [academies, weightCategories] = await Promise.all([
      prisma.academy.findMany({
        where: { isVerified: true },
        select: {
          id: true,
          code: true,
          name: true,
          city: true,
          state: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.weightCategory.findMany({
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          division: true,
          gender: true,
          name: true,
          minWeightKg: true,
          maxWeightKg: true,
        },
        orderBy: [{ division: "asc" }, { gender: "asc" }, { maxWeightKg: "asc" }],
      }),
    ]);

    const response = apiSuccess({
      academies,
      weightCategories,
    });
    response.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load options";
    return apiError(message, "FETCH_FAILED", 500);
  }
}

