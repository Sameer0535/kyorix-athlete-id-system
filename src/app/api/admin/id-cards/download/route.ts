import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest, logAuditEvent } from "@/lib/security";
import { getPrivateFile, savePrivateFile } from "@/lib/storage";
import { generateIndividualCardPdf, AthleteCardData } from "@/lib/pdf-generator";
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

    let card = await prisma.idCardRecord.findFirst({
      where: {
        OR: [
          ...(cardId ? [{ id: cardId }] : []),
          ...(registrationId ? [{ registrationId }] : []),
          ...(cardNumber ? [{ cardNumber }] : []),
        ],
      },
      include: {
        athlete: true,
        registration: {
          include: {
            athlete: true,
            academy: true,
            weightCategory: true,
            photograph: true,
          },
        },
      },
    });

    let pdfBuffer: Buffer | null = null;
    let finalCardNumber = card?.cardNumber || "";

    const forceFresh = searchParams.get("fresh") === "true";

    if (!forceFresh && card?.generatedFileKey) {
      try {
        const fileRes = await getPrivateFile(card.generatedFileKey);
        pdfBuffer = fileRes.buffer;
      } catch {
        // Fallback to on-the-fly generation below
      }
    }

    if (!pdfBuffer) {
      // Find registration to generate
      const reg = card?.registration || (registrationId ? await prisma.registration.findUnique({
        where: { id: registrationId },
        include: {
          athlete: true,
          academy: true,
          weightCategory: true,
          photograph: true,
          idCard: true,
        },
      }) : null);

      if (!reg) {
        return apiError("Registration or ID Card record not found.", "NOT_FOUND", 404);
      }

      if (!finalCardNumber) {
        const count = await prisma.idCardRecord.count();
        finalCardNumber = `KYX-ID-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
      }

      const cardData: AthleteCardData = {
        cardNumber: finalCardNumber,
        registrationNumber: reg.registrationNumber,
        kukkiwonId: reg.athlete.kukkiwonId,
        fullName: reg.athlete.fullName,
        gender: reg.athlete.gender,
        danOrPoom: reg.athlete.danOrPoom,
        academyName: reg.academy.name,
        academyCity: reg.academy.city,
        weightCategoryName: reg.weightCategory.name,
        division: reg.weightCategory.division,
        countryCode: reg.countryCode || reg.athlete.countryCode || "IND",
        countryName: reg.countryName || reg.athlete.countryName || "India",
        photoStorageKey: reg.photograph.storageKey,
        photoMimeType: reg.photograph.mimeType,
        photoBase64: reg.photograph.photoBase64,
        cardRole: reg.cardRole || "PARTICIPANT",
        notes: reg.notes,
        issueDate: new Date(),
      };

      const genRes = await generateIndividualCardPdf(cardData);
      pdfBuffer = genRes.buffer;

      let fileKey = `cards/${finalCardNumber}.pdf`;
      try {
        const saveRes = await savePrivateFile({
          buffer: pdfBuffer,
          originalFilename: `${finalCardNumber}.pdf`,
          subfolder: "cards",
          allowedMimeTypes: ["application/pdf"],
        });
        fileKey = saveRes.storageKey;
      } catch {
        // ignore
      }

      // Upsert IdCardRecord
      card = await prisma.idCardRecord.upsert({
        where: { registrationId: reg.id },
        update: {
          cardNumber: finalCardNumber,
          status: "GENERATED",
          generatedFileKey: fileKey,
          generatedFileSizeBytes: pdfBuffer.length,
          pdfBase64: pdfBuffer.toString("base64"),
          generatedAt: new Date(),
        },
        create: {
          cardNumber: finalCardNumber,
          registrationId: reg.id,
          athleteId: reg.athleteId,
          status: "GENERATED",
          generatedFileKey: fileKey,
          generatedFileSizeBytes: pdfBuffer.length,
          pdfBase64: pdfBuffer.toString("base64"),
          generatedAt: new Date(),
        },
        include: {
          athlete: true,
          registration: {
            include: {
              athlete: true,
              academy: true,
              weightCategory: true,
              photograph: true,
            },
          },
        },
      });
    }

    if (!card) {
      return apiError("ID Card record could not be loaded or generated.", "NOT_FOUND", 404);
    }

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
        fileSizeBytes: pdfBuffer.length,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${card.cardNumber}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error downloading card";
    return apiError(message, "DOWNLOAD_ERROR", 500);
  }
}

