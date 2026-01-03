-- Migration: Add credit rollback functions for deep analysis
-- Purpose: Allow rolling back credits if Gemini request fails or times out
-- Date: 2025-10-17

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS increment_deep_analysis_credits(BIGINT, INT);
DROP FUNCTION IF EXISTS increment_deep_analysis_credits(BIGINT);
DROP FUNCTION IF EXISTS restore_free_deep_credit(BIGINT);

-- Function 1: Increment deep analysis credits (for paid credit rollback)
CREATE FUNCTION increment_deep_analysis_credits(
    user_tg_id BIGINT,
    amount INT DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE user_profile
    SET deep_analysis_credits = COALESCE(deep_analysis_credits, 0) + amount,
        updated_at = NOW()
    WHERE tg_user_id = user_tg_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User with tg_user_id % not found', user_tg_id;
    END IF;
END;
$$;

-- Function 2: Restore free deep credit (for free credit rollback)
CREATE FUNCTION restore_free_deep_credit(
    user_tg_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INT;
BEGIN
    UPDATE user_profile
    SET free_deep_used = FALSE,
        updated_at = NOW()
    WHERE tg_user_id = user_tg_id
      AND free_deep_used = TRUE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count > 0;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION increment_deep_analysis_credits IS 
'Increments deep analysis credits for a user. Used for rolling back credits after failed analysis.';

COMMENT ON FUNCTION restore_free_deep_credit IS 
'Restores free deep credit flag to unused state. Returns TRUE if credit was restored, FALSE otherwise.';

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_deep_analysis_credits TO authenticated;
GRANT EXECUTE ON FUNCTION restore_free_deep_credit TO authenticated;
GRANT EXECUTE ON FUNCTION increment_deep_analysis_credits TO anon;
GRANT EXECUTE ON FUNCTION restore_free_deep_credit TO anon;
