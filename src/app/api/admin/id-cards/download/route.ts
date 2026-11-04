import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest, logAuditEvent } from "@/lib/security";
import { getPrivateFile } from "@/lib/storage";
import { apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(req, "cards:download");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const { searchParams } = new URL(req.url);
    const cardId = searchParams.get("cardId");
    const registrationId = searchParams.get("registrationId");
    const cardNumber = searchParams.get("cardNumber");

    if (!cardId && !registrationId && !cardNumber) {
      return apiError("Card identifier (cardId, registrationId, or cardNumber) is required.", "MISSING_ID", 400);
    }

    const card = await prisma.idCardRecord.findFirst({
      where: {
        OR: [
          ...(cardId ? [{ id: cardId }] : []),
          ...(registrationId ? [{ registrationId }] : []),
          ...(cardNumber ? [{ cardNumber }] : []),
        ],
      },
      include: {
        athlete: true,
        registration: true,
      },
    });

    if (!card || !card.generatedFileKey) {
      return apiError("ID Card file has not been generated yet. Please generate the card first.", "NOT_GENERATED", 404);
    }

    // Retrieve file from private storage
    const { buffer } = await getPrivateFile(card.generatedFileKey);

    // Increment admin download counter
    await prisma.idCardRecord.update({
      where: { id: card.id },
      data: {
        downloadCountAdmin: { increment: 1 },
        lastDownloadedAt: new Date(),
      },
    });

    // Record audit event
    await logAuditEvent({
      actorType: "ADMIN",
      actorId: auth.session.adminId,
      adminUserId: auth.session.adminId,
      registrationId: card.registrationId,
      action: "ADMIN_CARD_DOWNLOADED",
      entityType: "IdCardRecord",
      entityId: card.id,
      details: {
        cardNumber: card.cardNumber,
        athleteKukkiwonId: card.athlete.kukkiwonId,
        athleteName: card.athlete.fullName,
        fileSizeBytes: buffer.length,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${card.cardNumber}.pdf"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error downloading card";
    return apiError(message, "DOWNLOAD_ERROR", 500);
  }
}

