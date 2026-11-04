import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  const startTime = Date.now();
  try {
    // Ping PostgreSQL
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startTime;

    return apiSuccess({
      status: "HEALTHY",
      service: "Kyorix Athlete ID Generation System",
      version: "1.0.0",
      phase: "Phase 1 Foundation",
      database: {
        connected: true,
        latencyMs,
        provider: "PostgreSQL",
        schema: "athlete_id_system",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database connection failed";
    return apiError(`Health check failed: ${message}`, "DATABASE_OFFLINE", 503);
  }
}

