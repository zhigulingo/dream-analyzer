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
        // Allow Telegram InitData header for TMA and Authorization for Web
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Telegram-Init-Data',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        // Enable credentials so httpOnly cookies work for Web
        'Access-Control-Allow-Credentials': 'true',
        // Helpful for caches when echoing Origin
        'Vary': 'Origin'
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