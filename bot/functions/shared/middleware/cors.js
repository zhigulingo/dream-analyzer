/**
 * CORS middleware for Netlify Functions
 */

/**
 * Get CORS headers based on request origin
 * @param {Object} event - Netlify function event
 * @param {string[]} allowedOrigins - Array of allowed origins
 * @returns {Object} CORS headers
 */
function getCorsHeaders(event, allowedOrigins = []) {
    const requestOrigin = event.headers.origin || event.headers.Origin;
    const filteredOrigins = allowedOrigins.filter(Boolean);
    
    return {
        'Access-Control-Allow-Origin': filteredOrigins.includes(requestOrigin) 
            ? requestOrigin 
            : filteredOrigins[0] || '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    };
}

/**
 * Handle CORS preflight requests
 * @param {Object} event - Netlify function event
 * @param {string[]} allowedOrigins - Array of allowed origins
 * @returns {Object|null} Response object for OPTIONS request, or null for other methods
 */
function handleCorsPrelight(event, allowedOrigins = []) {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: getCorsHeaders(event, allowedOrigins),
            body: ''
        };
    }
    return null;
}

module.exports = {
    getCorsHeaders,
    handleCorsPrelight
};