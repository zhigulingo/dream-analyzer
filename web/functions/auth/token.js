const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BOT_SECRET = process.env.BOT_SECRET || 'default_bot_secret_key_change_this';
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN || '*';
const TOKEN_EXPIRY = 86400 * 7; // 7 days in seconds

// CORS headers
const generateCorsHeaders = () => {
  console.log(`[auth/token] CORS Headers: Allowing Origin: ${ALLOWED_TMA_ORIGIN}`);
  return {
    'Access-Control-Allow-Origin': ALLOWED_TMA_ORIGIN,
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };
};

// Generate a secure authentication token
const generateAuthToken = (userId) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const expiry = timestamp + TOKEN_EXPIRY;
  
  // Data to sign
  const payload = {
    user_id: userId,
    issued_at: timestamp,
    expires_at: expiry
  };
  
  const payloadStr = JSON.stringify(payload);
  
  // Create HMAC signature
  const signature = crypto
    .createHmac('sha256', BOT_SECRET)
    .update(payloadStr)
    .digest('hex');
  
  // Combine payload and signature
  const token = Buffer.from(JSON.stringify({
    payload,
    signature
  })).toString('base64');
  
  return token;
};

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

exports.handler = async (event, context) => {
  const corsHeaders = generateCorsHeaders();
  
  // Debug the headers we received
  console.log('[auth/token] Headers received:', {
    headerNames: Object.keys(event.headers),
    method: event.httpMethod,
    path: event.path
  });
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const requestData = JSON.parse(event.body || '{}');
    
    console.log('[auth/token] Received authentication request:', {
      botSignature: requestData.botSignature ? 'present' : 'missing',
      userId: requestData.userId || 'missing',
      timestamp: requestData.timestamp || 'missing'
    });
    
    // Validate required fields
    if (!requestData.botSignature || !requestData.userId || !requestData.timestamp) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required authentication parameters' })
      };
    }
    
    // Verify timestamp is recent (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(requestData.timestamp, 10);
    
    if (isNaN(requestTime) || Math.abs(now - requestTime) > 300) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Request timestamp expired or invalid' })
      };
    }
    
    // Verify bot signature
    const expectedSignature = crypto
      .createHmac('sha256', BOT_SECRET)
      .update(`${requestData.userId}:${requestData.timestamp}`)
      .digest('hex');
    
    if (requestData.botSignature !== expectedSignature) {
      console.warn('[auth/token] Invalid bot signature');
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid bot signature' })
      };
    }
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Check if user exists in the database
    const { data, error } = await supabase
      .from('users')
      .select('id, tg_id, username, first_name, last_name, tokens, subscription_type')
      .eq('tg_id', requestData.userId)
      .single();

    if (error) {
      console.log('[auth/token] Supabase error:', error);
      
      // If the error is that the user doesn't exist, create the user
      if (error.code === 'PGRST116') {
        console.log(`[auth/token] User not found, creating new user: ${requestData.userId}`);
        
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([
            { 
              tg_id: requestData.userId,
              username: requestData.username || null,
              first_name: requestData.firstName || null,
              last_name: requestData.lastName || null,
              tokens: 1, // Give new user 1 token
              subscription_type: 'free'
            }
          ])
          .select();

        if (insertError) {
          console.error('[auth/token] Failed to create user:', insertError);
          return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to create user account' })
          };
        }

        console.log(`[auth/token] Successfully created new user: ${requestData.userId}`);
        
        // Generate auth token for the new user
        const authToken = generateAuthToken(requestData.userId);
        
        return {
          statusCode: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: true, 
            message: 'User account created successfully',
            token: authToken,
            user: newUser[0],
            expiresAt: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY
          })
        };
      }

      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Database error' })
      };
    }

    // User exists, generate auth token
    const authToken = generateAuthToken(requestData.userId);
    
    console.log(`[auth/token] Successfully authenticated user: ${requestData.userId}`);
    
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        message: 'Authentication successful',
        token: authToken,
        user: data,
        expiresAt: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY
      })
    };

  } catch (error) {
    console.error('[auth/token] Error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server error' })
    };
  }
};

// Export the verify function for use in other serverless functions
exports.verifyAuthToken = verifyAuthToken; 