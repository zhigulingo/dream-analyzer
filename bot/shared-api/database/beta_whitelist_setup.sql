-- Beta whitelist setup for Supabase: run this script as-is in SQL editor

-- 1) Columns (idempotent)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS beta_whitelisted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS beta_approved_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS beta_access_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS beta_notified_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS beta_notified_access BOOLEAN DEFAULT FALSE;

-- 2) Trigger function: set approved/access timestamps and mark 'whitelisted'
CREATE OR REPLACE FUNCTION public.set_whitelist_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.beta_whitelisted IS TRUE THEN
    IF NEW.beta_approved_at IS NULL THEN
      NEW.beta_approved_at := NOW();
    END IF;
    IF NEW.beta_access_at IS NULL THEN
      NEW.beta_access_at := NOW() + INTERVAL '24 hours';
    END IF;
    IF NEW.subscription_type IS NULL OR NEW.subscription_type NOT IN ('beta','onboarding1','onboarding2','free') THEN
      NEW.subscription_type := 'whitelisted';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Triggers (safe recreate)
DROP TRIGGER IF EXISTS trg_users_set_whitelist_fields_ins ON public.users;
CREATE TRIGGER trg_users_set_whitelist_fields_ins
BEFORE INSERT ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_whitelist_fields();

DROP TRIGGER IF EXISTS trg_users_set_whitelist_fields_upd ON public.users;
CREATE TRIGGER trg_users_set_whitelist_fields_upd
BEFORE UPDATE OF beta_whitelisted ON public.users
FOR EACH ROW
WHEN (NEW.beta_whitelisted IS DISTINCT FROM OLD.beta_whitelisted)
EXECUTE FUNCTION public.set_whitelist_fields();
