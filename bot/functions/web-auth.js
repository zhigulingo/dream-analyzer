const { createClient } = require("@supabase/supabase-js");
const webAuthFlow = require("../auth/webAuthFlow");

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Handle GET requests to check session status
 */
async function handleGetRequest(event) {
  const params = new URLSearchParams(event.queryStringParameters || {});
  const sessionId = params.get('session_id');
  
  if (!sessionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing session_id parameter' })
    };
  }
  
  // Check session status
  const sessionStatus = webAuthFlow.checkAuthRequestStatus(sessionId);
  
  if (!sessionStatus.exists) {
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        exists: false, 
        expired: true,
        message: 'Session expired or not found' 
      })
    };
  }
  
  // Return status without token (tokens are only returned on approval)
  return {
    statusCode: 200,
    body: JSON.stringify({
      exists: true,
      approved: sessionStatus.approved,
      expires_in: sessionStatus.expiresIn,
      message: sessionStatus.approved ? 'Session approved' : 'Waiting for approval'
    })
  };
}

/**
 * Handle POST requests for creating new sessions or approving existing ones
 */
async function handlePostRequest(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action;
    
    // Create a new session
    if (action === 'create_session' && body.user_id) {
      const userId = parseInt(body.user_id, 10);
      if (isNaN(userId)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid user_id' })
        };
      }
      
      // Get user data from Supabase
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('tg_id, username, first_name, last_name')
        .eq('tg_id', userId)
        .single();
        
      if (userError) {
        console.error('Error fetching user data:', userError);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Error fetching user data' })
        };
      }
      
      if (!userData) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'User not found' })
        };
      }
      
      // Create auth request
      const authRequest = webAuthFlow.createAuthRequest(userId, {
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name
      });
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          session_id: authRequest.sessionId,
          expires_at: authRequest.expiresAt
        })
      };
    }
    
    // Approve an existing session
    if (action === 'approve_session' && body.session_id) {
      const result = await webAuthFlow.approveAuthRequest(body.session_id);
      
      if (!result.success) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: result.error })
        };
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          token: result.token,
          expires_at: result.expiresAt
        })
      };
    }
    
    // Deny a session
    if (action === 'deny_session' && body.session_id) {
      const result = webAuthFlow.denyAuthRequest(body.session_id);
      
      if (!result.success) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: result.error })
        };
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      };
    }
    
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid action or missing parameters' })
    };
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

// Main handler function
exports.handler = async (event) => {
  console.log('[web-auth] Request received:', event.httpMethod, event.path);
  
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    } else if (event.httpMethod === 'POST') {
      response = await handlePostRequest(event);
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