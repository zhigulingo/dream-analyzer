# Credit Rollback Migration

## Purpose
This migration adds database functions to roll back deep analysis credits when Gemini API requests fail or timeout.

## Problem
When a deep analysis request times out (Netlify Functions have 10-30s limit), the credit is already decremented but no analysis is created. Users lose tokens without receiving results.

## Solution
Two new RPC functions:

1. **`increment_deep_analysis_credits(user_tg_id, amount)`** - Adds credits back to user account
2. **`restore_free_deep_credit(user_tg_id)`** - Restores the free credit flag if it was consumed

## How to Apply

### Via Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Copy content from `migration_credit_rollback.sql`
3. Paste and run the SQL

### Via Supabase CLI
```bash
supabase db push --file bot/functions/shared/database/migration_credit_rollback.sql
```

## Testing

After applying migration, test with:

```sql
-- Test increment function
SELECT increment_deep_analysis_credits(YOUR_TG_USER_ID, 1);
SELECT deep_analysis_credits FROM user_profile WHERE tg_user_id = YOUR_TG_USER_ID;

-- Test restore free credit
SELECT restore_free_deep_credit(YOUR_TG_USER_ID);
SELECT free_deep_used FROM user_profile WHERE tg_user_id = YOUR_TG_USER_ID;
```

## Code Changes
The `deep-analysis.js` function now:
1. Wraps Gemini API call in try-catch
2. On error, calls appropriate rollback function
3. Logs rollback success/failure
4. Returns user-friendly error message

## Deployment Order
1. **First**: Apply SQL migration to Supabase
2. **Then**: Deploy updated `deep-analysis.js` function
3. **Verify**: Check logs for any rollback attempts
