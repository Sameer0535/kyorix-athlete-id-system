import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest, logAuditEvent } from "@/lib/security";
import { apiSuccess, apiError } from "@/lib/api-response";
import { AgeDivision, Gender } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(req, "weight_categories:manage");
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const division = searchParams.get("division");
    const gender = searchParams.get("gender");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (division && Object.values(AgeDivision).includes(division as AgeDivision)) {
      where.division = division as AgeDivision;
    }
    if (gender && Object.values(Gender).includes(gender as Gender)) {
      where.gender = gender as Gender;
    }

    const categories = await prisma.weightCategory.findMany({
      where,
      include: {
        _count: {
          select: {
            registrations: true,
          },
        },
      },
      orderBy: [{ division: "asc" }, { gender: "asc" }, { maxWeightKg: "asc" }],
    });

    const activeCount = categories.filter((c) => c.isActive).length;

    return apiSuccess({
      categories,
      stats: {
        total: categories.length,
        active: activeCount,
        inactive: categories.length - activeCount,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching weight categories";
    return apiError(message, "CATEGORIES_FETCH_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(req, "weight_categories:manage");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const body = await req.json();
    const { code, name, division, gender, minWeightKg, maxWeightKg, isActive } = body;

    if (!code || !name || !division || !gender || maxWeightKg === undefined) {
      return apiError("Code, name, division, gender, and max weight are required.", "VALIDATION_ERROR", 400);
    }

    const finalCode = code.trim().toUpperCase();

    // Prevent duplicate code
    const existing = await prisma.weightCategory.findUnique({
      where: { code: finalCode },
    });

    if (existing) {
      return apiError(`Weight category code '${finalCode}' already exists.`, "DUPLICATE_CODE", 409);
    }

    const category = await prisma.weightCategory.create({
      data: {
        code: finalCode,
        name: name.trim(),
        division: division as AgeDivision,
        gender: gender as Gender,
        minWeightKg: minWeightKg !== undefined && minWeightKg !== null ? parseFloat(minWeightKg) : null,
        maxWeightKg: parseFloat(maxWeightKg),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    // Record audit event
    await logAuditEvent({
      actorType: "ADMIN",
      actorId: auth.session.adminId,
      adminUserId: auth.session.adminId,
      action: "WEIGHT_CATEGORY_CREATED",
      entityType: "WeightCategory",
      entityId: category.id,
      details: {
        code: category.code,
        name: category.name,
        division: category.division,
        gender: category.gender,
        maxWeightKg: category.maxWeightKg,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return apiSuccess({ category, message: "Weight category created successfully." }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error creating weight category";
    return apiError(message, "CATEGORY_CREATE_ERROR", 500);
  }
}

