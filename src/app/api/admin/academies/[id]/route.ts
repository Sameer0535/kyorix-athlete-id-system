import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest, logAuditEvent } from "@/lib/security";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdminRequest(req, "academies:manage");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const { id: academyId } = await params;
    const body = await req.json();
    const { name, city, state, contactPerson, contactPhone, contactEmail, isVerified } = body;

    const existing = await prisma.academy.findUnique({
      where: { id: academyId },
    });

    if (!existing) {
      return apiError("Academy not found.", "NOT_FOUND", 404);
    }

    const updated = await prisma.academy.update({
      where: { id: academyId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(city ? { city: city.trim() } : {}),
        ...(state ? { state: state.trim() } : {}),
        ...(contactPerson !== undefined ? { contactPerson: contactPerson?.trim() || null } : {}),
        ...(contactPhone !== undefined ? { contactPhone: contactPhone?.trim() || null } : {}),
        ...(contactEmail !== undefined ? { contactEmail: contactEmail?.trim() || null } : {}),
        ...(isVerified !== undefined ? { isVerified: Boolean(isVerified) } : {}),
      },
    });

    // Record audit event
    await logAuditEvent({
      actorType: "ADMIN",
      actorId: auth.session.adminId,
      adminUserId: auth.session.adminId,
      action: "ACADEMY_UPDATED",
      entityType: "Academy",
      entityId: updated.id,
      details: {
        code: updated.code,
        name: updated.name,
        isVerified: updated.isVerified,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return apiSuccess({ academy: updated, message: "Academy updated successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating academy";
    return apiError(message, "ACADEMY_UPDATE_ERROR", 500);
  }
}

