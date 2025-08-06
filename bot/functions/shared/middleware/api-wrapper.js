/**
 * API wrapper for Netlify Functions with standardized middleware
 */

const { getCorsHeaders, handleCorsPrelight } = require('./cors');
const { 
    validateHttpMethod, 
    validateEnvironmentConfig, 
    withErrorHandler 
} = require('./error-handler');

/**
 * Configuration object for API wrapper
 * @typedef {Object} ApiConfig
 * @property {string|string[]} allowedMethods - Allowed HTTP methods (default: 'POST')
 * @property {string[]} allowedOrigins - Allowed CORS origins
 * @property {string[]} requiredEnvVars - Required environment variables
 * @property {boolean} skipMethodValidation - Skip HTTP method validation
 * @property {boolean} skipConfigValidation - Skip environment config validation
 */

/**
 * Wrap Netlify function with standardized middleware
 * @param {Function} handler - The actual handler function
 * @param {ApiConfig} config - Configuration object
 * @returns {Function} Wrapped handler
 */
function wrapApiHandler(handler, config = {}) {
    const {
        allowedMethods = 'POST',
        allowedOrigins = [],
        requiredEnvVars = [],
        skipMethodValidation = false,
        skipConfigValidation = false
    } = config;

    return async (event, context) => {
        // Get CORS headers for this request
        const corsHeaders = getCorsHeaders(event, allowedOrigins);

        // Handle CORS preflight
        const corsResponse = handleCorsPrelight(event, allowedOrigins);
        if (corsResponse) {
            return corsResponse;
        }

        // Validate HTTP method
        if (!skipMethodValidation) {
            const methodError = validateHttpMethod(event, allowedMethods, corsHeaders);
            if (methodError) {
                return methodError;
            }
        }

        // Validate environment configuration
        if (!skipConfigValidation) {
            const configError = validateEnvironmentConfig(requiredEnvVars, corsHeaders);
            if (configError) {
                return configError;
            }
        }

        // Wrap handler with error handling and call it
        const wrappedHandler = withErrorHandler(handler, corsHeaders);
        return await wrappedHandler(event, context, corsHeaders);
    };
}

/**
 * Create a custom error with status code
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Error} Error with statusCode property
 */
function createApiError(message, statusCode = 500) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

module.exports = {
    wrapApiHandler,
    createApiError
};