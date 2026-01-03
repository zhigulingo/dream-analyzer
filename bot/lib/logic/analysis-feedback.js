// /.netlify/functions/analysis-feedback
// Sets user feedback for a specific analysis (0=no vote, 1=like, 2=dislike)

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
  const dataCheckArr = []
  params.sort()
  params.forEach((value, key) => dataCheckArr.push(`${key}=${value}`))
  const dataCheckString = dataCheckArr.join('\n')
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const checkHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  if (checkHash !== hash) return { valid: false }
  try {
    const userStr = params.get('user')
    if (!userStr) return { valid: true, data: null }
    const user = JSON.parse(decodeURIComponent(userStr))
    return { valid: true, data: user }
  } catch (_) { return { valid: true, data: null } }
}

exports.handler = async (event) => {
  const allowedOrigins = [ALLOWED_TMA_ORIGIN, ALLOWED_WEB_ORIGIN].filter(Boolean)
  const requestOrigin = event.headers.origin || event.headers.Origin
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0] || '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN || !JWT_SECRET) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Server misconfigured' }) }
  }

  // Auth
  const initDataHeader = event.headers['x-telegram-init-data']
  const authHeader = event.headers['authorization']
  const cookies = event.headers.cookie || ''
  let verifiedTgId = null
  let userDbId = null

  if (initDataHeader) {
    const vr = validateTelegramData(initDataHeader, BOT_TOKEN)
    if (!vr.valid || !vr.data?.id) {
      return { statusCode: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden: Invalid InitData' }) }
    }
    verifiedTgId = vr.data.id
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET)
      verifiedTgId = decoded.tgId
      userDbId = decoded.userId
    } catch (e) {
      return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
  } else if (cookies.includes('dream_analyzer_jwt=')) {
    try {
      const token = (cookies.match(/dream_analyzer_jwt=([^;]+)/) || [])[1]
      const decoded = jwt.verify(token, JWT_SECRET)
      verifiedTgId = decoded.tgId
      userDbId = decoded.userId
    } catch (e) {
      return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
  } else {
    return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  // Parse body
  let body
  try { body = JSON.parse(event.body || '{}') } catch (_) { body = {} }
  const analysisId = Number(body.analysisId)
  const feedback = Number(body.feedback)
  if (!analysisId || ![0, 1, 2].includes(feedback)) {
    return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid input' }) }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  try {
    // Resolve userDbId if needed
    if (!userDbId) {
      const { data: userRow, error: uErr } = await supabase.from('users').select('id').eq('tg_id', verifiedTgId).single()
      if (uErr || !userRow) throw new Error('User not found')
      userDbId = userRow.id
    }

    // Primary path: update dedicated columns (requires migration)
    let upd = await supabase
      .from('analyses')
      .update({ user_feedback: feedback, feedback_at: new Date().toISOString() })
      .eq('id', analysisId)
      .eq('user_id', userDbId)
      .select('id, user_feedback, feedback_at')
      .single()

    if (upd.error) {
      const msg = String(upd.error.message || '').toLowerCase()
      const missingColumn = msg.includes('column') && (msg.includes('user_feedback') || msg.includes('feedback_at'))
      if (!missingColumn) throw upd.error

      // Fallback path: persist feedback into deep_source JSON (no migration required)
      const { data: row, error: fetchErr } = await supabase
        .from('analyses')
        .select('id, deep_source')
        .eq('id', analysisId)
        .eq('user_id', userDbId)
        .single()
      if (fetchErr || !row) throw (fetchErr || new Error('Not found'))

      const now = new Date().toISOString()
      const nextDeep = { ...(row.deep_source || {}), user_feedback: feedback, feedback_at: now }
      const { error: updJsonErr } = await supabase
        .from('analyses')
        .update({ deep_source: nextDeep })
        .eq('id', analysisId)
        .eq('user_id', userDbId)
      if (updJsonErr) throw updJsonErr

      return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, userFeedback: feedback, feedbackAt: now, persisted: 'deep_source' }) }
    }

    // Optionally track activity
    try { userCacheService.trackUserActivity(verifiedTgId, 'feedback') } catch (_) {}

    return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, userFeedback: upd.data.user_feedback, feedbackAt: upd.data.feedback_at, persisted: 'columns' }) }
  } catch (e) {
    return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Failed to save feedback' }) }
  }
}


