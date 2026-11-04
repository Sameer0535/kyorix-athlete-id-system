import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, validateKukkiwonId } from "@/lib/security";
import { getPrivateFile, savePrivateFile } from "@/lib/storage";
import { generateIndividualCardPdf, AthleteCardData } from "@/lib/pdf-generator";
import { apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kukkiwonIdParam = searchParams.get("kukkiwonId");
    const registrationIdParam = searchParams.get("registrationId");
    const previewMode = searchParams.get("preview") === "true";

    if (!kukkiwonIdParam && !registrationIdParam) {
      return apiError("Kukkiwon ID or Registration ID is required.", "MISSING_PARAMETERS", 400);
    }

    let athleteId = "";
    if (kukkiwonIdParam) {
      const val = validateKukkiwonId(kukkiwonIdParam);
      if (!val.valid || !val.normalized) {
        return apiError("Invalid Kukkiwon ID format.", "INVALID_KUKKIWON_ID", 400);
      }
      const athlete = await prisma.athlete.findUnique({
        where: { kukkiwonId: val.normalized },
        select: { id: true },
      });
      if (!athlete) {
        return apiError("Athlete not found.", "NOT_FOUND", 404);
      }
      athleteId = athlete.id;
    }

    // Find latest registration
    const registration = await prisma.registration.findFirst({
      where: {
        ...(athleteId ? { athleteId } : {}),
        ...(registrationIdParam ? { id: registrationIdParam } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        athlete: {
          include: { academy: true },
        },
        weightCategory: true,
        photograph: true,
        idCard: true,
      },
    });

    if (!registration) {
      return apiError("No registration record found.", "NOT_FOUND", 404);
    }

    if (registration.approvalStatus !== "APPROVED") {
      return apiError(
        `Your registration is currently '${registration.approvalStatus}'. Official ID cards can only be downloaded after administrative approval.`,
        "NOT_APPROVED",
        403,
        { status: registration.approvalStatus, rejectionReason: registration.rejectionReason }
      );
    }

    // Check or generate Card Number
    let idCard = registration.idCard;
    let cardNumber = idCard?.cardNumber;

    if (!cardNumber) {
      const cardCount = await prisma.idCardRecord.count();
      cardNumber = `KYX-ID-${new Date().getFullYear()}-${String(cardCount + 1).padStart(5, "0")}`;
    }

    let pdfBuffer: Buffer;

    // Check if PDF is already generated on disk
    if (idCard?.generatedFileKey) {
      try {
        const file = await getPrivateFile(idCard.generatedFileKey);
        pdfBuffer = file.buffer;
      } catch {
        // Fallback to regenerate
        pdfBuffer = Buffer.alloc(0);
      }
    } else {
      pdfBuffer = Buffer.alloc(0);
    }

    // If PDF buffer is empty (first time download or missing file), generate PDF on demand
    if (pdfBuffer.length === 0) {
      const cardData: AthleteCardData = {
        cardNumber,
        registrationNumber: registration.registrationNumber,
        kukkiwonId: registration.athlete.kukkiwonId,
        fullName: registration.athlete.fullName,
        gender: registration.athlete.gender,
        danOrPoom: registration.athlete.danOrPoom,
        academyName: registration.athlete.academy.name,
        academyCity: registration.athlete.academy.city,
        weightCategoryName: registration.weightCategory.name,
        division: registration.weightCategory.division,
        photoStorageKey: registration.photograph.storageKey,
        photoMimeType: registration.photograph.mimeType,
        issueDate: new Date(),
      };

      const renderResult = await generateIndividualCardPdf(cardData);
      pdfBuffer = renderResult.buffer;

      // Save to private storage
      const storageResult = await savePrivateFile({
        buffer: pdfBuffer,
        originalFilename: `${cardNumber}.pdf`,
        subfolder: "cards",
        allowedMimeTypes: ["application/pdf"],
      });

      // Upsert IdCardRecord
      idCard = await prisma.idCardRecord.upsert({
        where: { registrationId: registration.id },
        create: {
          cardNumber,
          registrationId: registration.id,
          athleteId: registration.athleteId,
          status: "GENERATED",
          generatedFileKey: storageResult.storageKey,
          generatedFileSizeBytes: storageResult.fileSizeBytes,
          checksumSha256: storageResult.checksumSha256,
          generatedAt: new Date(),
          cardTemplateVersion: "v1.0",
        },
        update: {
          cardNumber,
          status: "GENERATED",
          generatedFileKey: storageResult.storageKey,
          generatedFileSizeBytes: storageResult.fileSizeBytes,
          checksumSha256: storageResult.checksumSha256,
          generatedAt: new Date(),
        },
      });
    }

    if (!idCard) {
      return apiError("Unable to locate or generate athlete ID card record.", "SERVER_ERROR", 500);
    }

    // Increment download counter
    await prisma.idCardRecord.update({
      where: { id: idCard.id },
      data: {
        downloadCountAthlete: { increment: 1 },
        lastDownloadedAt: new Date(),
      },
    });

    // Record audit event
    await logAuditEvent({
      actorType: "ATHLETE_PORTAL",
      actorId: registration.athleteId,
      registrationId: registration.id,
      action: "ATHLETE_CARD_DOWNLOADED",
      entityType: "IdCardRecord",
      entityId: idCard.id,
      details: {
        cardNumber: idCard.cardNumber,
        kukkiwonId: registration.athlete.kukkiwonId,
        fileSizeBytes: pdfBuffer.length,
        previewMode,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    const disposition = previewMode
      ? `inline; filename="${cardNumber}.pdf"`
      : `attachment; filename="${cardNumber}.pdf"`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Download failed";
    return apiError(message, "DOWNLOAD_ERROR", 500);
  }
}
