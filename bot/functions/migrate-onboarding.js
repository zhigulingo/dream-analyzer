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
    // Пользователи с claimed=true, у которых сейчас free → onboarding2
    updates.push(
      supabase.from('users')
        .update({ subscription_type: 'onboarding2' })
        .eq('channel_reward_claimed', true)
        .or('subscription_type.is.null, lower(subscription_type).eq.free')
    )
    // Остальные с free → onboarding1
    updates.push(
      supabase.from('users')
        .update({ subscription_type: 'onboarding1' })
        .eq('channel_reward_claimed', false)
        .or('subscription_type.is.null, lower(subscription_type).eq.free')
    )
    const results = await Promise.allSettled(updates)
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, results }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e?.message || 'Migration failed' }) };
  }
};


