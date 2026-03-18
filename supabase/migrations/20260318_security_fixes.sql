-- =============================================================================
-- Security fixes: DreamStalk Supabase
-- Date: 2026-03-18
-- Issues fixed:
--   1. function_search_path_mutable — 17 functions (WARN)
--   2. rls_disabled_in_public — 6 tables (ERROR)
-- Not fixed here (requires manual Supabase dashboard action):
--   3. extension_in_public (vector, pg_net) — move to extensions schema
--   4. vulnerable_postgres_version — upgrade via Supabase dashboard
-- =============================================================================


-- =============================================================================
-- PART 1: RLS — Enable Row Level Security on all public tables
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hvdc_norms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Backend uses service_role key which bypasses RLS by design.
-- Anon key never accesses DB directly.
-- Policy: deny all anon access (safe default).

DROP POLICY IF EXISTS "deny_anon_users" ON public.users;
CREATE POLICY "deny_anon_users" ON public.users
  AS RESTRICTIVE FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "deny_anon_analyses" ON public.analyses;
CREATE POLICY "deny_anon_analyses" ON public.analyses
  AS RESTRICTIVE FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "deny_anon_beta_survey" ON public.beta_survey_responses;
CREATE POLICY "deny_anon_beta_survey" ON public.beta_survey_responses
  AS RESTRICTIVE FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "deny_anon_referrals" ON public.referrals;
CREATE POLICY "deny_anon_referrals" ON public.referrals
  AS RESTRICTIVE FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "deny_anon_hvdc_norms" ON public.hvdc_norms;
CREATE POLICY "deny_anon_hvdc_norms" ON public.hvdc_norms
  AS RESTRICTIVE FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "deny_anon_knowledge_chunks" ON public.knowledge_chunks;
CREATE POLICY "deny_anon_knowledge_chunks" ON public.knowledge_chunks
  AS RESTRICTIVE FOR ALL TO anon USING (false);


-- =============================================================================
-- PART 2: Fix mutable search_path — pin to public, pg_catalog
-- Exact signatures from pg_proc.
-- =============================================================================

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.set_updated_at()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.set_whitelist_fields()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.sync_beta_approval()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.on_beta_survey_approved()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.on_beta_survey_approved_notify()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.trg_set_engagement()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.fn_calculate_engagement(ans jsonb)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.increment_token(user_tg_id bigint)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.decrement_token_if_available(user_tg_id bigint)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.increment_deep_analysis_credits(user_tg_id bigint, amount integer)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.decrement_deep_analysis_credits_safe(user_tg_id bigint)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.restore_free_deep_credit(user_tg_id bigint)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.activate_referral(p_referred_tg_id bigint)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_user_profile_with_stats(user_tg_id bigint)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.process_successful_payment(user_tg_id bigint, plan_type text, duration_months integer)
  SET search_path = public, pg_catalog;

-- match_knowledge uses vector type from extensions schema — include it
ALTER FUNCTION public.match_knowledge(query_embedding vector, match_limit integer, min_similarity double precision)
  SET search_path = public, pg_catalog, extensions;

-- =============================================================================
-- END
-- =============================================================================
