-- Messages table for direct client-firm communication
-- Run this migration in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN (
    'firm_admin', 'accountant', 'payroll_manager',
    'client_admin', 'client_hr', 'client_readonly'
  )),
  sender_name TEXT,
  sender_email TEXT,
  content TEXT NOT NULL CHECK (char_length(content) > 0),
  read_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookup by client_id (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);

-- Index for ordering by creation time
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Index for unread message counts
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(client_id, read_at) WHERE read_at IS NULL;

-- RLS policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Firm users (admin, accountant, payroll_manager) can see all messages
CREATE POLICY "Firm users can view all messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('firm_admin', 'accountant', 'payroll_manager')
    )
  );

-- Client users can only see messages for their own company
CREATE POLICY "Client users can view their own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    client_id = (
      SELECT company_id FROM profiles WHERE profiles.id = auth.uid()
    )
  );

-- Authenticated users can insert messages (API route handles authorization)
CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Allow updates (for read_at marking) by firm users
CREATE POLICY "Firm users can update messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('firm_admin', 'accountant', 'payroll_manager')
    )
  );

-- Allow clients to mark messages as read in their own thread
CREATE POLICY "Client users can mark their messages as read"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    client_id = (
      SELECT company_id FROM profiles WHERE profiles.id = auth.uid()
    )
  );

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
