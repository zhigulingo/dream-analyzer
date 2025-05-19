const crypto = require('crypto');

const BOT_SECRET = process.env.BOT_SECRET || 'default_bot_secret_key_change_this';

// Verify an authentication token
const verifyAuthToken = (token) => {
  try {
    // Decode token
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const { payload, signature } = decoded;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', BOT_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.expires_at < now) {
      return { valid: false, error: 'Token expired' };
    }
    
    return { 
      valid: true, 
      user_id: payload.user_id,
      expires_at: payload.expires_at
    };
    
  } catch (error) {
    return { valid: false, error: 'Invalid token format' };
  }
};

/**
 * Authentication middleware for serverless functions
 * @param {Object} event - The Lambda event object
 * @param {Object} corsHeaders - CORS headers to include in responses
 * @returns {Object|null} - Returns error response or null if authenticated
 */
const authMiddleware = (event, corsHeaders) => {
  // Get the authorization header
  const authHeader = event.headers.authorization || event.headers.Authorization;
  
  // If no auth header, check for bot authentication
  const webAuthHeader = event.headers['x-web-auth-user'] || event.headers['X-Web-Auth-User'];
  const botAuthHeader = event.headers['x-bot-auth-token'] || event.headers['X-Bot-Auth-Token'];
  const initDataHeader = event.headers['x-telegram-init-data'] || event.headers['X-Telegram-Init-Data'];
  
  // Debug authentication headers
  console.log('[auth/middleware] Auth headers:', { 
    standardAuth: !!authHeader,
    webAuth: !!webAuthHeader,
    botAuth: !!botAuthHeader,
    telegramInitData: !!initDataHeader
  });
  
  // Check for bot token authentication first (our new preferred method)
  if (botAuthHeader) {
    console.log('[auth/middleware] Using Bot Token Authentication');
    
    // Extract token from header
    const token = botAuthHeader.startsWith('Bearer ') 
      ? botAuthHeader.substring(7) 
      : botAuthHeader;
    
    // Verify the token
    const verification = verifyAuthToken(token);
    
    if (!verification.valid) {
      console.warn(`[auth/middleware] Invalid bot auth token: ${verification.error}`);
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Unauthorized: ${verification.error}` })
      };
    }
    
    console.log(`[auth/middleware] Bot auth successful for user: ${verification.user_id}`);
    return { userId: verification.user_id };
  }
  
  // If bot auth is not available, we'll still accept the existing methods
  // But we'll log that the client should be updated
  
  // Traditional Authorization header
  if (authHeader) {
    console.log('[auth/middleware] Using Standard Authorization Header (deprecated)');
    // Legacy auth logic here if needed
  }
  
  // Legacy Web Auth
  if (webAuthHeader) {
    console.log('[auth/middleware] Using Legacy Web Auth (deprecated)');
    try {
      const webUserData = JSON.parse(webAuthHeader);
      if (webUserData && webUserData.id) {
        const userId = String(webUserData.id);
        console.log(`[auth/middleware] Legacy web auth successful for user: ${userId}`);
        console.log('[auth/middleware] Client should update to use Bot Token Authentication');
        return { userId };
      }
    } catch (error) {
      console.error('[auth/middleware] Failed to parse Web Auth header:', error);
    }
  }
  
  // If we reach here without returning, authentication failed
  if (botAuthHeader || authHeader || webAuthHeader) {
    // Only return error if an auth method was attempted but failed
    return {
      statusCode: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized: Invalid authentication credentials' })
    };
  }
  
  // If no auth method was attempted, return null to indicate auth wasn't present
  // The calling function can decide if that's an error
  return null;
};

module.exports = {
  verifyAuthToken,
  authMiddleware
}; 