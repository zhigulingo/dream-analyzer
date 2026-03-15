-- Migration: Referral System
-- Run this in Supabase SQL Editor

-- 1. Add referral_code column to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referrals_count INTEGER DEFAULT 0;

-- 2. Generate referral codes for existing users (short alphanumeric from tg_id)
UPDATE users 
SET referral_code = UPPER(SUBSTRING(MD5(tg_id::TEXT || 'dreamstalk'), 1, 8))
WHERE referral_code IS NULL;

-- 3. Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activated BOOLEAN DEFAULT FALSE,        -- True when referred user completes first analysis
  reward_given BOOLEAN DEFAULT FALSE,     -- True when +3 tokens given to referrer
  created_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  UNIQUE(referred_id)                     -- Each user can only be referred once
);

-- 4. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- 5. Function: activate referral and give reward (+3 tokens)
CREATE OR REPLACE FUNCTION activate_referral(p_referred_tg_id BIGINT)
RETURNS VOID AS $$
DECLARE
  v_referred_user_id BIGINT;
  v_referral_record referrals%ROWTYPE;
BEGIN
  -- Get referred user's internal id
  SELECT id INTO v_referred_user_id FROM users WHERE tg_id = p_referred_tg_id;
  IF v_referred_user_id IS NULL THEN RETURN; END IF;
  
  -- Get referral record
  SELECT * INTO v_referral_record FROM referrals WHERE referred_id = v_referred_user_id;
  IF v_referral_record IS NULL OR v_referral_record.activated THEN RETURN; END IF;
  
  -- Mark as activated
  UPDATE referrals 
  SET activated = TRUE, activated_at = NOW()
  WHERE id = v_referral_record.id;
  
  -- If reward not yet given, give +3 tokens to referrer
  IF NOT v_referral_record.reward_given THEN
    UPDATE users 
    SET tokens = tokens + 3,
        referrals_count = COALESCE(referrals_count, 0) + 1
    WHERE id = v_referral_record.referrer_id;
    
    UPDATE referrals SET reward_given = TRUE WHERE id = v_referral_record.id;
  END IF;
END;
$$ LANGUAGE plpgsql;
