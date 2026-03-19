import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  // Clear ALL Supabase auth cookies by name pattern
  const cookies = request.cookies.getAll();
  for (const cookie of cookies) {
    if (
      cookie.name.startsWith("sb-") ||
      cookie.name.includes("auth-token") ||
      cookie.name.includes("supabase")
    ) {
      response.cookies.set(cookie.name, "", {
        path: "/",
        maxAge: 0,
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  }

  return response;
}
