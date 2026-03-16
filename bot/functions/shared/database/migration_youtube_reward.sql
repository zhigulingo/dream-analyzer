-- Migration: Add youtube_reward_claimed field to users table
-- Run this in Supabase SQL editor

ALTER TABLE users
ADD COLUMN IF NOT EXISTS youtube_reward_claimed boolean DEFAULT false;

-- Index for faster lookups (optional)
CREATE INDEX IF NOT EXISTS idx_users_youtube_reward_claimed
ON users (youtube_reward_claimed)
WHERE youtube_reward_claimed = false;

COMMENT ON COLUMN users.youtube_reward_claimed IS 'True if user has already received the YouTube subscription reward token';
