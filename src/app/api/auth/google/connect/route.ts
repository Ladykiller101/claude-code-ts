import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google";

// GET /api/auth/google/connect — Redirect to Google OAuth consent screen
export async function GET() {
  try {
    const authUrl = getAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate auth URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
