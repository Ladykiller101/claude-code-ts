import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, storeTokens } from "@/lib/google";

// GET /api/auth/google/callback — Handle OAuth2 authorization code exchange
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/dashboard?google_error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard?google_error=no_code`);
  }

  try {
    const tokens = await exchangeCode(code);

    await storeTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    return NextResponse.redirect(`${origin}/dashboard?google_connected=true`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth token exchange failed";
    console.error("Google OAuth callback error:", message);
    return NextResponse.redirect(`${origin}/dashboard?google_error=token_exchange_failed`);
  }
}
