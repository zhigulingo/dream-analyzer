/**
 * Error handling middleware for Netlify Functions
 */

/**
 * Create standardized error response
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} corsHeaders - CORS headers to include
 * @param {Object} additionalData - Additional data to include in response
 * @returns {Object} Standardized error response
 */
function createErrorResponse(statusCode, message, corsHeaders = {}, additionalData = {}) {
    return {
        statusCode,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            success: false,
            error: message,
            ...additionalData
        })
    };
}

/**
 * Create standardized success response
 * @param {Object} data - Success data
 * @param {Object} corsHeaders - CORS headers to include
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} Standardized success response
 */
function createSuccessResponse(data, corsHeaders = {}, statusCode = 200) {
    return {
        statusCode,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            success: true,
            ...data
        })
    };
}

/**
 * Handle method validation
 * @param {Object} event - Netlify function event
 * @param {string|string[]} allowedMethods - Allowed HTTP methods
 * @param {Object} corsHeaders - CORS headers
 * @returns {Object|null} Error response if method not allowed, null otherwise
 */
function validateHttpMethod(event, allowedMethods, corsHeaders) {
    const methods = Array.isArray(allowedMethods) ? allowedMethods : [allowedMethods];
    
    if (!methods.includes(event.httpMethod)) {
        return createErrorResponse(
            405, 
            'Method Not Allowed', 
            corsHeaders
        );
    }
    
    return null;
}

/**
 * Validate required environment variables
 * @param {string[]} requiredEnvVars - Array of required environment variable names
 * @param {Object} corsHeaders - CORS headers
 * @returns {Object|null} Error response if config missing, null otherwise
 */
function validateEnvironmentConfig(requiredEnvVars, corsHeaders) {
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.error(`[config] Missing environment variables: ${missingVars.join(', ')}`);
        return createErrorResponse(
            500,
            'Internal Server Error: Configuration missing.',
            corsHeaders
        );
    }
    
    return null;
}

/**
 * Parse and validate JSON body
 * @param {Object} event - Netlify function event
 * @param {Object} corsHeaders - CORS headers
 * @returns {Object} Object with parsed body or error response
 */
function parseJsonBody(event, corsHeaders) {
    try {
        if (!event.body) {
            return {
                error: createErrorResponse(400, 'Missing request body', corsHeaders)
            };
        }
        
        const body = JSON.parse(event.body);
        return { body };
    } catch (error) {
        console.error('[parse-body] Failed to parse JSON body:', error);
        return {
            error: createErrorResponse(400, `Bad Request: ${error.message}`, corsHeaders)
        };
    }
}

/**
 * Global error handler wrapper
 * @param {Function} handler - The actual handler function
 * @param {Object} corsHeaders - CORS headers
 * @returns {Function} Wrapped handler with error handling
 */
function withErrorHandler(handler, corsHeaders) {
    return async (...args) => {
        try {
            return await handler(...args);
        } catch (error) {
            console.error('[error-handler] Unhandled error:', error);
            
            // If error has statusCode, use it (for known errors)
            const statusCode = error.statusCode || 500;
            const message = error.message || 'Internal Server Error';
            
            return createErrorResponse(statusCode, message, corsHeaders);
        }
    };
}

module.exports = {
    createErrorResponse,
    createSuccessResponse,
    validateHttpMethod,
    validateEnvironmentConfig,
    parseJsonBody,
    withErrorHandler
};