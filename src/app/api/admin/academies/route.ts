import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest, logAuditEvent } from "@/lib/security";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(req, "academies:manage");
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { state: { contains: search, mode: "insensitive" } },
      ];
    }

    const academies = await prisma.academy.findMany({
      where,
      include: {
        _count: {
          select: {
            athletes: true,
            registrations: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const totalCount = academies.length;
    const verifiedCount = academies.filter((a) => a.isVerified).length;
    const totalAthletes = academies.reduce((acc, a) => acc + a._count.athletes, 0);

    return apiSuccess({
      academies,
      stats: {
        total: totalCount,
        verified: verifiedCount,
        unverified: totalCount - verifiedCount,
        totalAthletes,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching academies";
    return apiError(message, "ACADEMIES_FETCH_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(req, "academies:manage");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const body = await req.json();
    const { code, name, city, state, contactPerson, contactPhone, contactEmail, isVerified } = body;

    if (!name || !city || !state) {
      return apiError("Academy name, city, and state are required.", "VALIDATION_ERROR", 400);
    }

    // Auto-generate code if omitted (e.g. ACA-DELHI-001)
    let finalCode = code?.trim().toUpperCase();
    if (!finalCode) {
      const cityPrefix = city.trim().substring(0, 3).toUpperCase();
      const count = await prisma.academy.count();
      finalCode = `ACA-${cityPrefix}-${String(count + 1).padStart(3, "0")}`;
    }

    // Prevent duplicate academy code
    const existingCode = await prisma.academy.findUnique({
      where: { code: finalCode },
    });

    if (existingCode) {
      return apiError(`Academy code '${finalCode}' already exists.`, "DUPLICATE_CODE", 409);
    }

    // Prevent duplicate academy name in same city
    const existingName = await prisma.academy.findFirst({
      where: {
        name: { equals: name.trim(), mode: "insensitive" },
        city: { equals: city.trim(), mode: "insensitive" },
      },
    });

    if (existingName) {
      return apiError(
        `An academy named '${name.trim()}' is already registered in ${city.trim()}. Duplicate academies are prevented.`,
        "DUPLICATE_ACADEMY",
        409
      );
    }

    const academy = await prisma.academy.create({
      data: {
        code: finalCode,
        name: name.trim(),
        city: city.trim(),
        state: state.trim(),
        contactPerson: contactPerson?.trim() || null,
        contactPhone: contactPhone?.trim() || null,
        contactEmail: contactEmail?.trim() || null,
        isVerified: isVerified !== undefined ? Boolean(isVerified) : true,
      },
    });

    // Record audit event
    await logAuditEvent({
      actorType: "ADMIN",
      actorId: auth.session.adminId,
      adminUserId: auth.session.adminId,
      action: "ACADEMY_CREATED",
      entityType: "Academy",
      entityId: academy.id,
      details: {
        code: academy.code,
        name: academy.name,
        city: academy.city,
        state: academy.state,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return apiSuccess({ academy, message: "Academy created successfully." }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error creating academy";
    return apiError(message, "ACADEMY_CREATE_ERROR", 500);
  }
}

