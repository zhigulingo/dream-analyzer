const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async () => {
  const headers = { 'Content-Type': 'application/json' };
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing DB config' }) };
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    // 1) Users with null stage and free → onboarding1
    await supabase.rpc('execute', {
      query: `UPDATE users SET onboarding_stage='stage1', subscription_type='onboarding1' WHERE (onboarding_stage IS NULL OR onboarding_stage='') AND (LOWER(COALESCE(subscription_type,'free'))='free')`,
    });
    // 2) Users who claimed channel but no stage → onboarding2
    await supabase.rpc('execute', {
      query: `UPDATE users SET onboarding_stage='stage2', subscription_type='onboarding2' WHERE (onboarding_stage IS NULL OR onboarding_stage='') AND channel_reward_claimed = true`,
    });
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e?.message || 'Migration failed' }) };
  }
};


