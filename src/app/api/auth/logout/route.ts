import { NextResponse } from "next/server";
import { apiSuccess } from "@/lib/api-response";

export async function POST() {
  const response = apiSuccess({ message: "Logged out successfully." });
  response.cookies.set({
    name: "kyorix_admin_session",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

