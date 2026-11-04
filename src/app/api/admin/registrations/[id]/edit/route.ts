import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest, logAuditEvent } from "@/lib/security";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdminRequest(req, "registrations:edit");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const { id: registrationId } = await params;
    const body = await req.json();
    const { fullName, danOrPoom, academyId, weightCategoryId, contactPhone, contactEmail, notes } = body;

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        athlete: true,
        academy: true,
        weightCategory: true,
      },
    });

    if (!registration) {
      return apiError("Registration record not found.", "NOT_FOUND", 404);
    }

    // Verify academy and weight category if changing
    if (academyId && academyId !== registration.academyId) {
      const acadExists = await prisma.academy.findUnique({ where: { id: academyId } });
      if (!acadExists) return apiError("Selected academy does not exist.", "ACADEMY_NOT_FOUND", 404);
    }

    if (weightCategoryId && weightCategoryId !== registration.weightCategoryId) {
      const catExists = await prisma.weightCategory.findUnique({ where: { id: weightCategoryId } });
      if (!catExists) return apiError("Selected weight category does not exist.", "CATEGORY_NOT_FOUND", 404);
    }

    const previousData = {
      fullName: registration.athlete.fullName,
      danOrPoom: registration.athlete.danOrPoom,
      academyName: registration.academy.name,
      weightCategoryName: registration.weightCategory.name,
    };

    // Execute updates atomically
    const updated = await prisma.$transaction(async (tx) => {
      // Update athlete record
      await tx.athlete.update({
        where: { id: registration.athleteId },
        data: {
          ...(fullName ? { fullName: fullName.trim() } : {}),
          ...(danOrPoom !== undefined ? { danOrPoom } : {}),
          ...(contactPhone !== undefined ? { contactPhone } : {}),
          ...(contactEmail !== undefined ? { contactEmail } : {}),
          ...(academyId ? { academyId } : {}),
        },
      });

      // Update registration record
      return tx.registration.update({
        where: { id: registrationId },
        data: {
          ...(academyId ? { academyId } : {}),
          ...(weightCategoryId ? { weightCategoryId } : {}),
          ...(notes !== undefined ? { notes } : {}),
        },
        include: {
          athlete: true,
          academy: true,
          weightCategory: true,
        },
      });
    });

    // Record audit event
    await logAuditEvent({
      actorType: "ADMIN",
      actorId: auth.session.adminId,
      adminUserId: auth.session.adminId,
      registrationId: registration.id,
      action: "REGISTRATION_ADMIN_EDITED",
      entityType: "Registration",
      entityId: registration.id,
      details: {
        athleteKukkiwonId: registration.athlete.kukkiwonId,
        before: previousData,
        after: {
          fullName: updated.athlete.fullName,
          danOrPoom: updated.athlete.danOrPoom,
          academyName: updated.academy.name,
          weightCategoryName: updated.weightCategory.name,
        },
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return apiSuccess({
      registration: updated,
      message: `Registration data for ${updated.athlete.fullName} updated successfully.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error editing registration";
    return apiError(message, "EDIT_ERROR", 500);
  }
}

