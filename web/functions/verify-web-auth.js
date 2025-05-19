const { createClient } = require('@supabase/supabase-js');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, X-Web-Auth-User, X-Telegram-Init-Data',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

exports.handler = async (event, context) => {
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
    
    if (!userData || !userData.id) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid user data' })
      };
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Check if user exists in the database
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userData.id)
      .single();

    if (error) {
      console.error('[verify-web-auth] Supabase error:', error);
      
      // If the error is that the user doesn't exist, create the user
      if (error.code === 'PGRST116') {
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([
            { 
              id: userData.id,
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