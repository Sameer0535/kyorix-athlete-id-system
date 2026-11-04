import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminSessionToken } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("kyorix_admin_session")?.value;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : cookieToken;

    if (!token) {
      return apiError("Session missing or expired.", "UNAUTHORIZED", 401);
    }

    const payload = await verifyAdminSessionToken(token);
    if (!payload) {
      return apiError("Session token invalid or expired.", "UNAUTHORIZED", 401);
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: payload.adminId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!admin || !admin.isActive) {
      return apiError("Admin account inactive or removed.", "UNAUTHORIZED", 401);
    }

    return apiSuccess({ admin });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Session verification failed";
    return apiError(message, "AUTH_VERIFICATION_FAILED", 500);
  }
}

