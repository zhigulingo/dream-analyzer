-- Migration: Add increment_token function for token rollback on analysis failure
-- Purpose: Safely increment user token count (used when Gemini fails after deducting token)
-- Date: 2026-03-12

DROP FUNCTION IF EXISTS increment_token(BIGINT);

CREATE FUNCTION increment_token(
    user_tg_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE users
    SET tokens = COALESCE(tokens, 0) + 1,
        updated_at = NOW()
    WHERE tg_id = user_tg_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User with tg_id % not found', user_tg_id;
    END IF;
END;
$$;

COMMENT ON FUNCTION increment_token IS
'Increments token count for a user. Used for rolling back a token deduction when analysis fails.';

GRANT EXECUTE ON FUNCTION increment_token TO authenticated;
GRANT EXECUTE ON FUNCTION increment_token TO anon;
