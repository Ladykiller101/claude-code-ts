import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { createClient } from "@/lib/supabase/server";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/calendar",
];

function getOAuthClient(origin: string) {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${origin}/api/auth/google/callback`
  );
}

// GET /api/auth/google/callback — Handle OAuth2 authorization code
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/settings?google_error=${error}`);
  }

  if (!code) {
    // No code = initiate OAuth flow
    const oauth2Client = getOAuthClient(origin);
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
    });
    return NextResponse.redirect(authUrl);
  }

  try {
    const oauth2Client = getOAuthClient(origin);
    const { tokens } = await oauth2Client.getToken(code);

    // Store tokens in Supabase
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${origin}/login?error=not_authenticated`);
    }

    await supabase.from("google_tokens").upsert({
      user_email: user.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      scopes: SCOPES,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_email" });

    return NextResponse.redirect(`${origin}/settings?google_connected=true`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth token exchange failed";
    console.error("Google OAuth callback error:", message);
    return NextResponse.redirect(`${origin}/settings?google_error=token_exchange_failed`);
  }
}
