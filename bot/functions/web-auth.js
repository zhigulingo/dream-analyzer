const { createClient } = require("@supabase/supabase-js");
const crypto = require('crypto');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_SECRET = process.env.BOT_SECRET || 'default_bot_secret_key_change_this';

// Initialize Supabase client
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Import the pendingAuthSessions map from bot.js
// This is a bit hacky but works for serverless functions
let pendingAuthSessions;
try {
  const botModule = require('./bot');
  pendingAuthSessions = botModule.pendingAuthSessions;
  console.log('[web-auth] Successfully imported pendingAuthSessions from bot.js');
} catch (err) {
  console.error('[web-auth] Failed to import pendingAuthSessions:', err);
  // Create a fallback map if we can't import it
  pendingAuthSessions = new Map();
}

/**
 * Verify that a token is valid
 * @param {string} token - The token to verify
 * @returns {object} The token payload if valid, null otherwise
 */
function verifyToken(token) {
  try {
    // Decode the token
    const tokenData = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    
    // Check if the token has the expected format
    if (!tokenData.payload || !tokenData.signature) {
      console.error('[web-auth] Invalid token format');
      return null;
    }
    
    // Recreate the signature to verify
    const payloadStr = JSON.stringify(tokenData.payload);
    const expectedSignature = crypto
      .createHmac('sha256', BOT_SECRET)
      .update(payloadStr)
      .digest('hex');
    
    // Check if the signatures match
    if (tokenData.signature !== expectedSignature) {
      console.error('[web-auth] Token signature verification failed');
      return null;
    }
    
    // Check if the token has expired
    const now = Math.floor(Date.now() / 1000);
    if (tokenData.payload.expires_at < now) {
      console.error('[web-auth] Token has expired');
      return null;
    }
    
    return tokenData.payload;
  } catch (err) {
    console.error('[web-auth] Token verification error:', err);
    return null;
  }
}

/**
 * Handle GET requests to check session status
 */
async function handleGetRequest(event) {
  const params = new URLSearchParams(event.queryStringParameters || {});
  const sessionId = params.get('session_id');
  const authToken = params.get('auth_token');
  
  // If auth_token is provided, verify it
  if (authToken) {
    const payload = verifyToken(authToken);
    
    if (payload) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          valid: true,
          user_id: payload.user_id,
          expires_at: payload.expires_at
        })
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({
          valid: false,
          error: 'Invalid or expired token'
        })
      };
    }
  }
  
  // If session_id is provided, check its status
  if (sessionId) {
    // Check if the session exists
    if (!pendingAuthSessions.has(sessionId)) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          exists: false, 
          expired: true,
          message: 'Session expired or not found' 
        })
      };
    }
    
    const session = pendingAuthSessions.get(sessionId);
    const now = Math.floor(Date.now() / 1000);
    
    // Check if the session has expired
    if (session.expiresAt < now) {
      pendingAuthSessions.delete(sessionId);
      return {
        statusCode: 200,
        body: JSON.stringify({
          exists: false,
          expired: true,
          message: 'Session expired'
        })
      };
    }
    
    // If the session is approved, generate a token
    if (session.approved) {
      // Create a token similar to the one in bot.js
      const timestamp = Math.floor(Date.now() / 1000);
      const payload = {
        user_id: session.userId,
        user_data: session.userData,
        session_id: sessionId,
        issued_at: timestamp,
        expires_at: timestamp + 604800 // 7 days
      };
      
      // Sign the token
      const payloadStr = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', BOT_SECRET)
        .update(payloadStr)
        .digest('hex');
      
      // Create the final token
      const token = Buffer.from(JSON.stringify({
        payload,
        signature
      })).toString('base64');
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          exists: true,
          approved: true,
          token: token,
          user_id: session.userId,
          expires_at: payload.expires_at
        })
      };
    }
    
    // Return the current session status
    return {
      statusCode: 200,
      body: JSON.stringify({
        exists: true,
        approved: session.approved,
        expires_in: session.expiresAt - now,
        message: 'Waiting for approval'
      })
    };
  }
  
  return {
    statusCode: 400,
    body: JSON.stringify({ error: 'Missing session_id or auth_token parameter' })
  };
}

// Main handler function
exports.handler = async (event) => {
  console.log('[web-auth] Request received:', event.httpMethod, event.path);
  
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Bot-Auth-Token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
  
  // Handle OPTIONS request (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }
  
  try {
    let response;
    
    // Handle based on HTTP method
    if (event.httpMethod === 'GET') {
      response = await handleGetRequest(event);
    } else {
      response = {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
    
    // Add headers to response
    response.headers = { ...response.headers, ...headers };
    return response;
    
  } catch (error) {
    console.error('[web-auth] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Export the verifyToken function for use in other files
exports.verifyToken = verifyToken; 