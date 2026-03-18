-- Migration: Add sender_name and attachments columns to ticket_messages
-- Run this in the Supabase SQL editor AFTER the initial schema

-- Add sender_name for display purposes (so we don't need joins to show names)
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Add attachments as JSONB array of {name, url} objects
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT NULL;
