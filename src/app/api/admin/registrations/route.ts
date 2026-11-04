import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest } from "@/lib/security";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ApprovalStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(req, "registrations:read");
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const academyId = searchParams.get("academyId") || "";
    const weightCategoryId = searchParams.get("weightCategoryId") || "";
    const statusParam = searchParams.get("status") || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    // Build filter query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (statusParam !== "ALL" && Object.values(ApprovalStatus).includes(statusParam as ApprovalStatus)) {
      where.approvalStatus = statusParam as ApprovalStatus;
    }

    if (academyId) {
      where.academyId = academyId;
    }

    if (weightCategoryId) {
      where.weightCategoryId = weightCategoryId;
    }

    if (search) {
      where.OR = [
        { registrationNumber: { contains: search, mode: "insensitive" } },
        { athlete: { kukkiwonId: { contains: search, mode: "insensitive" } } },
        { athlete: { fullName: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Execute queries in parallel
    const [
      registrations,
      totalCount,
      countPending,
      countApproved,
      countRejected,
      countChanges,
    ] = await Promise.all([
      prisma.registration.findMany({
        where,
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
              fileName: true,
              mimeType: true,
              fileSizeBytes: true,
              checksumSha256: true,
              uploadedAt: true,
            },
          },
          approvedByAdmin: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          idCard: {
            select: {
              id: true,
              cardNumber: true,
              status: true,
              generatedAt: true,
              downloadCountAthlete: true,
              downloadCountAdmin: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.registration.count({ where }),
      prisma.registration.count({ where: { approvalStatus: "PENDING_REVIEW" } }),
      prisma.registration.count({ where: { approvalStatus: "APPROVED" } }),
      prisma.registration.count({ where: { approvalStatus: "REJECTED" } }),
      prisma.registration.count({ where: { approvalStatus: "CHANGES_REQUESTED" } }),
    ]);

    const totalRegistrations = countPending + countApproved + countRejected + countChanges;

    return apiSuccess({
      registrations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      stats: {
        total: totalRegistrations,
        pending: countPending,
        approved: countApproved,
        rejected: countRejected,
        changesRequested: countChanges,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error loading registrations";
    return apiError(message, "REGISTRATIONS_LOAD_ERROR", 500);
  }
}

