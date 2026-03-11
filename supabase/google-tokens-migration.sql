-- Create google_tokens table for OAuth token storage
-- Run this in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS google_tokens (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and allow service role full access
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on google_tokens"
  ON google_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);
