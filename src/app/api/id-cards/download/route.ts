import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, validateKukkiwonId } from "@/lib/security";
import { getPrivateFile, savePrivateFile } from "@/lib/storage";
import { generateIndividualCardPdf, AthleteCardData } from "@/lib/pdf-generator";
import { apiError } from "@/lib/api-response";
import { verifyAdminSessionToken, verifyAthleteAccessToken, AthleteTokenPayload } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kukkiwonIdParam = searchParams.get("kukkiwonId");
    const registrationIdParam = searchParams.get("registrationId");
    const previewMode = searchParams.get("preview") === "true";

    // Extract authorization credentials from header, cookie, or query parameter
    let authHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")?.trim();
    const tokenParam = searchParams.get("token")?.trim();
    const candidateToken = authHeader || tokenParam || "";
    const adminCookie = req.cookies.get("admin_session")?.value;

    let isAdmin = false;
    let adminUserId = "";

    // 1. Check for valid Admin Session
    if (adminCookie) {
      const adminPayload = await verifyAdminSessionToken(adminCookie);
      if (adminPayload) {
        isAdmin = true;
        adminUserId = adminPayload.adminId;
      }
    } else if (candidateToken) {
      const adminPayload = await verifyAdminSessionToken(candidateToken);
      if (adminPayload) {
        isAdmin = true;
        adminUserId = adminPayload.adminId;
      }
    }

    // 2. Security Remediation: Check for missing credentials for non-admin downloads
    let athleteJwtPayload: AthleteTokenPayload | null = null;
    let candidateSecretToken = "";

    if (!isAdmin) {
      if (!candidateToken) {
        return apiError(
          "Authentication required. Official athlete credentials cannot be downloaded using Kukkiwon ID or registration ID alone. A cryptographically verified athlete access token or active administrator session is required.",
          "AUTHENTICATION_REQUIRED",
          401
        );
      }

      // Verify if candidateToken is a signed JWT athlete token
      athleteJwtPayload = await verifyAthleteAccessToken(candidateToken);
      if (!athleteJwtPayload) {
        // If not a signed JWT, could be the direct registration access token string
        candidateSecretToken = candidateToken;
      }
    }

    if (!kukkiwonIdParam && !registrationIdParam) {
      // If no ID param provided, try to resolve from athlete JWT payload
      if (athleteJwtPayload?.registrationId) {
        // Handled below via athleteJwtPayload
      } else {
        return apiError("Kukkiwon ID or Registration ID is required.", "MISSING_PARAMETERS", 400);
      }
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

    // Target query criteria
    const queryCriteria = {
      ...(athleteId ? { athleteId } : {}),
      ...(registrationIdParam ? { id: registrationIdParam } : {}),
      ...(athleteJwtPayload && !athleteId && !registrationIdParam
        ? { id: athleteJwtPayload.registrationId }
        : {}),
    };

    // Find latest registration
    const registration = await prisma.registration.findFirst({
      where: queryCriteria,
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

    // 3. Security Remediation: Enforce strict athlete token ownership & cross-athlete isolation
    if (!isAdmin) {
      let authorizedForRecord = false;

      if (athleteJwtPayload) {
        // Ensure token matches this specific registration and athlete
        if (
          athleteJwtPayload.registrationId === registration.id &&
          athleteJwtPayload.athleteId === registration.athleteId
        ) {
          authorizedForRecord = true;
        }
      } else if (candidateSecretToken && candidateSecretToken === registration.athleteAccessToken) {
        authorizedForRecord = true;
      }

      if (!authorizedForRecord) {
        // Log unauthorized cross-athlete access attempt in audit logs
        await logAuditEvent({
          actorType: "ATHLETE_PORTAL",
          actorId: athleteJwtPayload?.athleteId || "unauthorized-client",
          registrationId: registration.id,
          action: "UNAUTHORIZED_CROSS_ATHLETE_ACCESS_ATTEMPT",
          entityType: "Registration",
          entityId: registration.id,
          details: {
            attemptedRegistration: registration.registrationNumber,
            attemptedKukkiwonId: registration.athlete.kukkiwonId,
            tokenOwnerAthleteId: athleteJwtPayload?.athleteId || "invalid-token",
            ipAddress: req.headers.get("x-forwarded-for") || undefined,
          },
          ipAddress: req.headers.get("x-forwarded-for") || undefined,
          userAgent: req.headers.get("user-agent") || undefined,
        });

        return apiError(
          "Access denied: You are not authorized to download this athlete's official ID card. Cross-athlete credential access is strictly prohibited.",
          "CROSS_ATHLETE_ACCESS_DENIED",
          403
        );
      }
    }

    // 4. Approval Status Gate: Cards can only be downloaded after approval
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
        ...(isAdmin
          ? { downloadCountAdmin: { increment: 1 } }
          : { downloadCountAthlete: { increment: 1 } }),
        lastDownloadedAt: new Date(),
      },
    });

    // Record audit event
    await logAuditEvent({
      actorType: isAdmin ? "ADMIN" : "ATHLETE_PORTAL",
      actorId: isAdmin ? adminUserId : registration.athleteId,
      registrationId: registration.id,
      action: isAdmin ? "ADMIN_CARD_DOWNLOADED" : "ATHLETE_CARD_DOWNLOADED",
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
