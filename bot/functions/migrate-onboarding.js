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
    // Выполняем безопасные апдейты без ALTER (колонку предполагаем созданной вручную)
    const updates = []
    // claimed=true and subscription_type is null → onboarding2
    updates.push(
      supabase.from('users')
        .update({ subscription_type: 'onboarding2' })
        .eq('channel_reward_claimed', true)
        .is('subscription_type', null)
    )
    // claimed=true and subscription_type='free' → onboarding2
    updates.push(
      supabase.from('users')
        .update({ subscription_type: 'onboarding2' })
        .eq('channel_reward_claimed', true)
        .eq('subscription_type', 'free')
    )
    // claimed=false/null and subscription_type is null → onboarding1
    updates.push(
      supabase.from('users')
        .update({ subscription_type: 'onboarding1' })
        .or('channel_reward_claimed.is.null,channel_reward_claimed.eq.false')
        .is('subscription_type', null)
    )
    // claimed=false/null and subscription_type='free' → onboarding1
    updates.push(
      supabase.from('users')
        .update({ subscription_type: 'onboarding1' })
        .or('channel_reward_claimed.is.null,channel_reward_claimed.eq.false')
        .eq('subscription_type', 'free')
    )
    const results = await Promise.allSettled(updates)
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, results }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e?.message || 'Migration failed' }) };
  }
};


