// /.netlify/functions/analysis
// DELETE: remove user's analysis by id

const { createClient } = require('@supabase/supabase-js')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const userCacheService = require('./shared/services/user-cache-service')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BOT_TOKEN = process.env.BOT_TOKEN
const JWT_SECRET = process.env.JWT_SECRET
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN
const ALLOWED_WEB_ORIGIN = process.env.ALLOWED_WEB_ORIGIN

function validateTelegramData(initData, botToken) {
  if (!initData || !botToken) return { valid: false }
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return { valid: false }
  params.delete('hash')
  const arr = []
  params.sort(); params.forEach((v,k)=>arr.push(`${k}=${v}`))
  const s = arr.join('\n')
  const key = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const chk = crypto.createHmac('sha256', key).update(s).digest('hex')
  if (chk !== hash) return { valid: false }
  try { const u = JSON.parse(decodeURIComponent(params.get('user')||'')); return { valid: true, data: u } } catch (_) { return { valid: true, data: null } }
}

exports.handler = async (event) => {
  const allowed = [ALLOWED_TMA_ORIGIN, ALLOWED_WEB_ORIGIN].filter(Boolean)
  const reqOrigin = event.headers.origin || event.headers.Origin
  const cors = {
    'Access-Control-Allow-Origin': allowed.includes(reqOrigin) ? reqOrigin : allowed[0] || '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'DELETE') return { statusCode: 405, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN || !JWT_SECRET) return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Server misconfigured' }) }

  // Auth
  const initDataHeader = event.headers['x-telegram-init-data']
  const authHeader = event.headers['authorization']
  const cookies = event.headers.cookie || ''
  let tgId = null, userDbId = null
  if (initDataHeader) {
    const vr = validateTelegramData(initDataHeader, BOT_TOKEN)
    if (!vr.valid || !vr.data?.id) return { statusCode: 403, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) }
    tgId = vr.data.id
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    try { const d = jwt.verify(authHeader.substring(7), JWT_SECRET); tgId = d.tgId; userDbId = d.userId } catch { return { statusCode: 401, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) } }
  } else if (cookies.includes('dream_analyzer_jwt=')) {
    try { const token = (cookies.match(/dream_analyzer_jwt=([^;]+)/)||[])[1]; const d = jwt.verify(token, JWT_SECRET); tgId = d.tgId; userDbId = d.userId } catch { return { statusCode: 401, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) } }
  } else { return { statusCode: 401, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) } }

  // Payload
  let body = {}
  try { body = JSON.parse(event.body || '{}') } catch {}
  const analysisId = Number(body.analysisId)
  if (!analysisId) return { statusCode: 400, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid analysisId' }) }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  try {
    if (!userDbId) {
      const { data: row, error: uErr } = await supabase.from('users').select('id').eq('tg_id', tgId).single()
      if (uErr || !row) throw new Error('User not found')
      userDbId = row.id
    }

    const { data, error } = await supabase
      .from('analyses')
      .delete()
      .eq('id', analysisId)
      .eq('user_id', userDbId)
      .select('id')
      .single()
    if (error) throw error

    try { await userCacheService.invalidateUser(tgId) } catch (_) {}
    return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) }
  } catch (e) {
    return { statusCode: 500, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Failed to delete analysis' }) }
  }
}


