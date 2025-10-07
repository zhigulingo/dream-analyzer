// bot/functions/beta-whitelist-processor.js
// Scans for newly whitelisted users and assigns beta_approved_at / beta_access_at, sends "approved" message

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const DEFAULT_DELAY_HOURS = Number(process.env.BETA_ACCESS_DELAY_HOURS || 24);

async function sendTelegramMessage(chatId, text) {
  if (!BOT_TOKEN || !chatId) return;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = { chat_id: chatId, text };
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
}

exports.handler = async () => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN) {
      return { statusCode: 500, body: 'Server not configured' };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: users, error } = await supabase
      .from('users')
      .select('id, tg_id, beta_whitelisted, beta_approved_at, beta_access_at, beta_notified_approved')
      .eq('beta_whitelisted', true);
    if (error) {
      return { statusCode: 500, body: 'DB select error' };
    }

    const list = Array.isArray(users) ? users : [];
    let processed = 0;
    for (const u of list) {
      let patch = {};
      const now = new Date();
      if (!u.beta_approved_at) {
        patch.beta_approved_at = now.toISOString();
      }
      if (!u.beta_access_at) {
        const base = u.beta_approved_at ? new Date(u.beta_approved_at) : now;
        const accessAt = new Date(base.getTime() + Math.max(1, DEFAULT_DELAY_HOURS) * 3600 * 1000);
        patch.beta_access_at = accessAt.toISOString();
      }

      if (Object.keys(patch).length > 0) {
        const { error: updErr } = await supabase.from('users').update(patch).eq('id', u.id);
        if (updErr) continue;
      }

      if (!u.beta_notified_approved) {
        try {
          // Удалим прошлое "approved" если по какой-то причине есть
          const { data: rows } = await supabase
            .from('beta_survey_responses')
            .select('answers')
            .eq('tg_id', u.tg_id)
            .limit(1);
          const ans = Array.isArray(rows) && rows[0] && rows[0].answers && typeof rows[0].answers === 'object' ? rows[0].answers : {};
          const status = ans._status || {};
          const prevApproved = status.approved?.message_id;
          if (prevApproved) {
            try {
              const url = `https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`;
              await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: u.tg_id, message_id: prevApproved }) });
            } catch (_) {}
          }
          // Отправим "одобрены"
          const urlSend = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
          const resp = await fetch(urlSend, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: u.tg_id, text: 'Вы одобрены для бета-теста! Доступ к приложению откроется в течение 24 часов. Мы уведомим вас, когда всё будет готово.' }) });
          const dataResp = await resp.json().catch(() => ({}));
          const msgId = dataResp?.result?.message_id || null;
          const newStatus = { ...(ans._status || {}), approved: { message_id: msgId, chat_id: u.tg_id, updated_at: new Date().toISOString() } };
          await supabase
            .from('beta_survey_responses')
            .update({ answers: { ...ans, _status: newStatus } })
            .eq('tg_id', u.tg_id);
        } catch (_) {
          await sendTelegramMessage(u.tg_id, 'Вы одобрены для бета-теста! Доступ к приложению откроется в течение 24 часов. Мы уведомим вас, когда всё будет готово.');
        }
        await supabase.from('users').update({ beta_notified_approved: true }).eq('id', u.id);
      }

      processed++;
    }

    return { statusCode: 200, body: JSON.stringify({ processed }) };
  } catch (e) {
    return { statusCode: 500, body: 'Internal error' };
  }
};
