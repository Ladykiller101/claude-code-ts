-- AIFred Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- Jobs table to track video generation requests
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Input
  instagram_url TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  personalization TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scraping', 'analyzing', 'generating', 'completed', 'failed')),

  -- Results
  video_metadata JSONB,          -- caption, hashtags, original video URL
  analysis_result TEXT,          -- Gemini analysis markdown
  optimized_prompt TEXT,         -- GPT-4o-mini output
  generated_video_url TEXT,      -- Final KIE AI video URL

  -- External IDs
  kie_task_id TEXT,              -- KIE AI task ID for tracking

  -- Error handling
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_kie_task_id ON jobs(kie_task_id);

-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
CREATE POLICY "Users can view own jobs" ON jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update any job (for n8n callbacks)
-- This uses the service_role key which bypasses RLS
CREATE POLICY "Service can update jobs" ON jobs
  FOR UPDATE USING (true);

-- Enable Realtime for live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
