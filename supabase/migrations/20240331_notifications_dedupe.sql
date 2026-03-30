-- Migration to add idempotency support for notifications
-- Run this in your Supabase SQL Editor

-- 1. Add dedupe_key column
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

-- 2. Create unique index for atomic deduplication
-- This ensures that (user_id, type, related_topic) can only have one entry per dedupe_key (60s bucket).
CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_idx 
ON notifications (user_id, type, related_topic, dedupe_key) 
WHERE dedupe_key IS NOT NULL;
