import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { createAdminClient } from "@/lib/supabase/admin";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/calendar",
];

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

export function getAuthUrl() {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

export async function exchangeCode(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

async function getStoredTokens() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("google_tokens")
    .select("*")
    .eq("id", "primary")
    .single();

  if (error || !data) return null;
  return data;
}

export async function storeTokens(tokens: {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}) {
  const supabase = createAdminClient();
  await supabase.from("google_tokens").upsert({
    id: "primary",
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    scopes: SCOPES,
    updated_at: new Date().toISOString(),
  });
}

async function getAuthenticatedClient(): Promise<OAuth2Client> {
  const stored = await getStoredTokens();
  if (!stored?.refresh_token) {
    throw new Error("Google account not connected. Visit /api/auth/google/connect to authorize.");
  }

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
    expiry_date: stored.token_expiry ? new Date(stored.token_expiry).getTime() : undefined,
  });

  // Auto-refresh if expired
  client.on("tokens", async (tokens) => {
    await storeTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || stored.refresh_token,
      expiry_date: tokens.expiry_date,
    });
  });

  return client;
}

export async function getGmailClient() {
  const auth = await getAuthenticatedClient();
  return google.gmail({ version: "v1", auth });
}

export async function getDriveClient() {
  const auth = await getAuthenticatedClient();
  return google.drive({ version: "v3", auth });
}

export async function getSheetsClient() {
  const auth = await getAuthenticatedClient();
  return google.sheets({ version: "v4", auth });
}

export async function getCalendarClient() {
  const auth = await getAuthenticatedClient();
  return google.calendar({ version: "v3", auth });
}

export async function isGoogleConnected(): Promise<boolean> {
  const stored = await getStoredTokens();
  return !!stored?.refresh_token;
}
