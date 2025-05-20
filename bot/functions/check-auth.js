// check-auth.js - Function to check authentication status

// Generate CORS headers
const generateCorsHeaders = () => {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };
};

exports.handler = async (event) => {
    const corsHeaders = generateCorsHeaders();

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: corsHeaders,
            body: ''
        };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        // Get the session ID from the query parameters
        const params = new URLSearchParams(event.queryStringParameters || {});
        const sessionId = params.get('session_id') || '';

        if (!sessionId) {
            return {
                statusCode: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Missing session_id parameter' })
            };
        }

        console.log(`[check-auth] Checking auth status for session: ${sessionId}`);

        // Check if we have a token for this session
        const global = global || {};
        global.authTokens = global.authTokens || {};
        
        const token = global.authTokens[sessionId];
        
        if (token) {
            console.log(`[check-auth] Found token for session ${sessionId}`);
            
            // Return the token and mark as approved
            return {
                statusCode: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approved: true,
                    token: token
                })
            };
        } else {
            console.log(`[check-auth] No token found for session ${sessionId}`);
            
            // No token found, not approved yet
            return {
                statusCode: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approved: false
                })
            };
        }
    } catch (error) {
        console.error('[check-auth] Error:', error);
        
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
}; 