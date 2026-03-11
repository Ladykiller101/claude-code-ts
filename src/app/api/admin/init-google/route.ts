import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/admin/init-google — Create google_tokens table if it doesn't exist
export async function POST() {
  try {
    const supabase = createAdminClient();

    // Try to query the table first
    const { error: checkError } = await supabase
      .from("google_tokens")
      .select("id")
      .limit(1);

    if (checkError?.code === "PGRST205") {
      // Table doesn't exist — create it via rpc or raw SQL
      // Since we can't run DDL via PostgREST, we'll use a workaround:
      // Create a postgres function that creates the table, then call it
      // For now, return instructions
      return NextResponse.json({
        error: "Table 'google_tokens' does not exist. Please create it in the Supabase Dashboard SQL Editor:",
        sql: `CREATE TABLE IF NOT EXISTS google_tokens (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow service role full access
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON google_tokens
  FOR ALL USING (true) WITH CHECK (true);`,
      }, { status: 428 });
    }

    return NextResponse.json({ status: "ok", message: "google_tokens table exists" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
