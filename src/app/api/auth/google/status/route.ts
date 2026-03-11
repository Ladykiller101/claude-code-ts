import { NextResponse } from "next/server";
import { isGoogleConnected } from "@/lib/google";

// GET /api/auth/google/status — Check if Google account is connected
export async function GET() {
  try {
    const connected = await isGoogleConnected();
    return NextResponse.json({ connected });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
