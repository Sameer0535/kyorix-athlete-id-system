import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest } from "@/lib/security";
import { getPrivateFile } from "@/lib/storage";
import { generateIndividualCardPdf, AthleteCardData } from "@/lib/pdf-generator";
import { apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(req, "cards:read");
    if (auth.errorResponse || !auth.session) return auth.errorResponse!;

    const { searchParams } = new URL(req.url);
    const registrationId = searchParams.get("registrationId");
    const cardId = searchParams.get("cardId");

    if (!registrationId && !cardId) {
      return apiError("Registration ID or Card ID is required for preview.", "MISSING_ID", 400);
    }

    const registration = await prisma.registration.findFirst({
      where: {
        OR: [
          ...(registrationId ? [{ id: registrationId }] : []),
          ...(cardId ? [{ idCard: { id: cardId } }] : []),
        ],
      },
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

    // Always generate on-the-fly for real-time accurate preview matching latest layout rules
    const cardNumber = registration.idCard?.cardNumber || `KYX-ID-PREVIEW`;
    const cardData: AthleteCardData = {
      cardNumber,
      registrationNumber: registration.registrationNumber,
      kukkiwonId: registration.athlete.kukkiwonId,
      fullName: registration.athlete.fullName,
      gender: registration.athlete.gender,
      danOrPoom: registration.athlete.danOrPoom,
      academyName: registration.academy.name,
      academyCity: registration.academy.city,
      weightCategoryName: registration.weightCategory.name,
      division: registration.weightCategory.division,
      countryCode: registration.countryCode || registration.athlete.countryCode || "IND",
      countryName: registration.countryName || registration.athlete.countryName || "India",
      photoStorageKey: registration.photograph.storageKey,
      photoMimeType: registration.photograph.mimeType,
      photoBase64: registration.photograph.photoBase64,
      cardRole: registration.cardRole || "PARTICIPANT",
      notes: registration.notes,
      issueDate: new Date(),
    };

    const { buffer } = await generateIndividualCardPdf(cardData);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=\"preview.pdf\"",
        "Cache-Control": "private, no-cache, no-store",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error generating preview";
    return apiError(message, "PREVIEW_ERROR", 500);
  }
}

