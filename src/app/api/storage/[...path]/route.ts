import { NextRequest, NextResponse } from "next/server";
import { getPrivateFile } from "@/lib/storage";
import { verifyAdminSessionToken, verifyAthleteAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    if (!segments || segments.length === 0) {
      return new NextResponse("Invalid file path.", { status: 400 });
    }

    const storageKey = segments.join("/");

    // 1. Authorization check
    // Check for admin session
    const authHeader = req.headers.get("authorization");
    const adminCookie = req.cookies.get("kyorix_admin_session")?.value;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : adminCookie;

    let isAuthorized = false;

    if (token) {
      const adminPayload = await verifyAdminSessionToken(token);
      if (adminPayload) {
        isAuthorized = true;
      }
    }

    // Check for athlete token in query param or bearer header
    if (!isAuthorized) {
      const athleteToken = req.nextUrl.searchParams.get("token");
      if (athleteToken) {
        const athletePayload = await verifyAthleteAccessToken(athleteToken);
        if (athletePayload) {
          // If accessing a photo, verify it belongs to this athlete
          if (storageKey.startsWith("photos/")) {
            const photoRecord = await prisma.athletePhotograph.findUnique({
              where: { storageKey },
              select: { athleteId: true },
            });
            if (photoRecord && photoRecord.athleteId === athletePayload.athleteId) {
              isAuthorized = true;
            }
          }
          // If accessing an ID card, verify it belongs to this athlete's registration
          if (storageKey.startsWith("cards/")) {
            const cardRecord = await prisma.idCardRecord.findFirst({
              where: { generatedFileKey: storageKey },
              select: { athleteId: true, registrationId: true },
            });
            if (
              cardRecord &&
              cardRecord.athleteId === athletePayload.athleteId &&
              cardRecord.registrationId === athletePayload.registrationId
            ) {
              isAuthorized = true;
            }
          }
        }
      }
    }

    if (!isAuthorized) {
      return new NextResponse("Unauthorized: Access to private athlete asset is restricted.", {
        status: 403,
      });
    }

    // 2. Retrieve file from private filesystem
    const { buffer } = await getPrivateFile(storageKey);

    // Determine MIME type
    let contentType = "application/octet-stream";
    if (storageKey.endsWith(".jpg") || storageKey.endsWith(".jpeg")) contentType = "image/jpeg";
    else if (storageKey.endsWith(".png")) contentType = "image/png";
    else if (storageKey.endsWith(".webp")) contentType = "image/webp";
    else if (storageKey.endsWith(".pdf")) contentType = "application/pdf";
    else if (storageKey.endsWith(".zip")) contentType = "application/zip";

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "File retrieval error";
    return new NextResponse(message, { status: 404 });
  }
}

