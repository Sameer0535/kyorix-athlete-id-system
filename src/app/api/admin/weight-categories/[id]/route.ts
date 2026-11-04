import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest, logAuditEvent } from "@/lib/security";
import { apiSuccess, apiError } from "@/lib/api-response";
import { AgeDivision, Gender } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdminRequest(req, "weight_categories:manage");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const { id: categoryId } = await params;
    const body = await req.json();
    const { name, division, gender, minWeightKg, maxWeightKg, isActive } = body;

    const existing = await prisma.weightCategory.findUnique({
      where: { id: categoryId },
    });

    if (!existing) {
      return apiError("Weight category not found.", "NOT_FOUND", 404);
    }

    const updated = await prisma.weightCategory.update({
      where: { id: categoryId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(division ? { division: division as AgeDivision } : {}),
        ...(gender ? { gender: gender as Gender } : {}),
        ...(minWeightKg !== undefined ? { minWeightKg: minWeightKg !== null ? parseFloat(minWeightKg) : null } : {}),
        ...(maxWeightKg !== undefined ? { maxWeightKg: parseFloat(maxWeightKg) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    // Record audit event
    await logAuditEvent({
      actorType: "ADMIN",
      actorId: auth.session.adminId,
      adminUserId: auth.session.adminId,
      action: "WEIGHT_CATEGORY_UPDATED",
      entityType: "WeightCategory",
      entityId: updated.id,
      details: {
        code: updated.code,
        name: updated.name,
        isActive: updated.isActive,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return apiSuccess({ category: updated, message: "Weight category updated successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating weight category";
    return apiError(message, "CATEGORY_UPDATE_ERROR", 500);
  }
}

