import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest, logAuditEvent } from "@/lib/security";
import { apiSuccess, apiError } from "@/lib/api-response";

/**
 * GET /api/admin/registrations/[id]
 * Fetch individual registration record
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdminRequest(req, "registrations:read");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const { id } = await params;
    const registration = await prisma.registration.findUnique({
      where: { id },
      include: {
        athlete: true,
        academy: true,
        weightCategory: true,
        photograph: true,
        idCard: true,
      },
    });

    if (!registration) {
      return apiError("Registration not found.", "NOT_FOUND", 404);
    }

    return apiSuccess({ registration });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve registration";
    return apiError(message, "FETCH_ERROR", 500);
  }
}

/**
 * PATCH /api/admin/registrations/[id]
 * Update registration details or status
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdminRequest(req, "registrations:edit");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const { id } = await params;
    const body = await req.json();

    // Check if status update action
    if (body.action && ["APPROVE", "REJECT", "REQUEST_CHANGES"].includes(body.action)) {
      const reg = await prisma.registration.findUnique({
        where: { id },
        include: { athlete: true },
      });
      if (!reg) return apiError("Registration not found", "NOT_FOUND", 404);

      let status = "PENDING_REVIEW";
      let rejectionReason = null;
      let notes = null;
      let approvalDate = null;

      if (body.action === "APPROVE") {
        status = "APPROVED";
        approvalDate = new Date();
      } else if (body.action === "REJECT") {
        status = "REJECTED";
        rejectionReason = body.reason || "Administrative rejection";
      } else if (body.action === "REQUEST_CHANGES") {
        status = "CHANGES_REQUESTED";
        notes = body.notes || "Corrections requested";
      }

      const updated = await prisma.registration.update({
        where: { id },
        data: {
          approvalStatus: status as any,
          approvedByAdminId: status === "APPROVED" ? auth.session.adminId : null,
          approvalDate,
          rejectionReason,
          notes,
        },
      });

      return apiSuccess({ registration: updated });
    }

    // Otherwise standard edit update
    const { fullName, danOrPoom, academyId, weightCategoryId } = body;
    const reg = await prisma.registration.findUnique({
      where: { id },
      include: { athlete: true },
    });
    if (!reg) return apiError("Registration not found", "NOT_FOUND", 404);

    if (fullName || danOrPoom) {
      await prisma.athlete.update({
        where: { id: reg.athleteId },
        data: {
          ...(fullName ? { fullName: String(fullName).trim() } : {}),
          ...(danOrPoom ? { danOrPoom: String(danOrPoom).trim() } : {}),
        },
      });
    }

    const updated = await prisma.registration.update({
      where: { id },
      data: {
        ...(academyId ? { academyId } : {}),
        ...(weightCategoryId ? { weightCategoryId } : {}),
      },
      include: {
        athlete: true,
        academy: true,
        weightCategory: true,
      },
    });

    return apiSuccess({ registration: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
    return apiError(message, "UPDATE_ERROR", 500);
  }
}
