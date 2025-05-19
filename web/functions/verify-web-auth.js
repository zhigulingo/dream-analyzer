const { createClient } = require('@supabase/supabase-js');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN || '*';

// CORS headers
const generateCorsHeaders = () => {
  console.log(`[verify-web-auth] CORS Headers: Allowing Origin: ${ALLOWED_TMA_ORIGIN}`);
  return {
    'Access-Control-Allow-Origin': ALLOWED_TMA_ORIGIN,
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, X-Web-Auth-User, X-Telegram-Init-Data',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };
};

exports.handler = async (event, context) => {
  const corsHeaders = generateCorsHeaders();
  
  // Debug the headers we received
  console.log('[verify-web-auth] Headers received:', {
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
    const userData = JSON.parse(event.body || '{}');
    
    console.log('[verify-web-auth] Received user data for verification:', {
      id: userData?.id,
      username: userData?.username,
      hasName: !!(userData?.first_name || userData?.last_name)
    });
    
    if (!userData || !userData.id) {
      console.warn('[verify-web-auth] Invalid user data received:', userData);
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid user data' })
      };
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    console.log(`[verify-web-auth] Looking up user with ID: ${userData.id}`);
    
    // Check if user exists in the database
    const { data, error } = await supabase
      .from('users')
      .select('id, username, first_name, last_name, tokens, subscription_type')
      .eq('tg_id', userData.id)
      .single();

    if (error) {
      console.log('[verify-web-auth] Supabase error:', error);
      
      // If the error is that the user doesn't exist, create the user
      if (error.code === 'PGRST116') {
        console.log(`[verify-web-auth] User not found, creating new user: ${userData.id}`);
        
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([
            { 
              tg_id: userData.id,
              username: userData.username || null,
              first_name: userData.first_name || null,
              last_name: userData.last_name || null,
              tokens: 1, // Give new user 1 token
              subscription_type: 'free'
            }
          ])
          .select();

        if (insertError) {
          console.error('[verify-web-auth] Failed to create user:', insertError);
          return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to create user account' })
          };
        }

        console.log(`[verify-web-auth] Successfully created new user: ${userData.id}`);
        
        return {
          statusCode: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: true, 
            message: 'User account created successfully',
            user: newUser[0]
          })
        };
      }

      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Database error' })
      };
    }

    // User exists, authentication successful
    console.log(`[verify-web-auth] Successfully authenticated user: ${userData.id}`);
    
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        message: 'Authentication successful',
        user: data
      })
    };

  } catch (error) {
    console.error('[verify-web-auth] Error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server error' })
    };
  }
}; 