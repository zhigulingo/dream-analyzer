// bot/functions/shared/middleware/metrics-middleware.js
const { createLogger } = require("../utils/logger");

const logger = createLogger({ module: 'metrics-middleware' });

// Import metrics recording functions (will be loaded dynamically to avoid circular deps)
let recordApiRequest, recordDatabaseOperation, recordBotEvent, recordGeminiOperation;
let recordApiError, recordDatabaseError, recordBotError, recordGeminiError;

// Load metrics functions dynamically
try {
    const performanceMetrics = require("../../performance-metrics");
    const errorMonitoring = require("../../error-monitoring");
    
    recordApiRequest = performanceMetrics.recordApiRequest;
    recordDatabaseOperation = performanceMetrics.recordDatabaseOperation;
    recordBotEvent = performanceMetrics.recordBotEvent;
    recordGeminiOperation = performanceMetrics.recordGeminiOperation;
    
    recordApiError = errorMonitoring.recordApiError;
    recordDatabaseError = errorMonitoring.recordDatabaseError;
    recordBotError = errorMonitoring.recordBotError;
    recordGeminiError = errorMonitoring.recordGeminiError;
} catch (error) {
    logger.warn('Could not load metrics functions', { error: error.message });
}

/**
 * Middleware to automatically record API metrics
 */
function withMetricsTracking(handler) {
    return async (event, context, corsHeaders) => {
        const startTime = Date.now();
        const method = event.httpMethod;
        const path = event.path || event.rawPath || '';
        
        try {
            // Call the original handler
            const result = await handler(event, context, corsHeaders);
            const responseTime = Date.now() - startTime;
            const statusCode = result.statusCode || 200;

            // Record API request metrics
            if (recordApiRequest) {
                recordApiRequest(method, path, statusCode, responseTime);
            }

            // Log performance info
            logger.apiRequest(method, path, statusCode, responseTime);

            return result;

        } catch (error) {
            const responseTime = Date.now() - startTime;
            const statusCode = error.statusCode || 500;

            // Record API error
            if (recordApiError) {
                recordApiError(method, path, statusCode, error);
            }

            // Log error
            logger.apiError(method, path, error);

            // Re-throw error to maintain normal error handling
            throw error;
        }
    };
}

/**
 * Database operation wrapper with metrics
 */
function withDatabaseMetrics(operation, table) {
    return async (dbFunction) => {
        const startTime = Date.now();
        
        try {
            const result = await dbFunction();
            const queryTime = Date.now() - startTime;

            // Record successful database operation
            if (recordDatabaseOperation) {
                recordDatabaseOperation(operation, table, queryTime);
            }

            logger.dbOperation(operation, table, queryTime);
            return result;

        } catch (error) {
            const queryTime = Date.now() - startTime;

            // Record database error
            if (recordDatabaseError) {
                recordDatabaseError(operation, table, error);
            }

            logger.dbError(operation, table, error);
            throw error;
        }
    };
}

/**
 * Bot event wrapper with metrics
 */
function withBotMetrics(eventType) {
    return (userId = null) => {
        try {
            // Record bot event
            if (recordBotEvent) {
                recordBotEvent(eventType, userId);
            }

            logger.botEvent(eventType, userId);

        } catch (error) {
            // Record bot error
            if (recordBotError) {
                recordBotError(eventType, error, userId);
            }

            logger.botError(eventType, error, userId);
        }
    };
}

/**
 * Gemini operation wrapper with metrics
 */
function withGeminiMetrics(operation) {
    return async (geminiFunction) => {
        const startTime = Date.now();
        
        try {
            const result = await geminiFunction();
            const responseTime = Date.now() - startTime;
            
            // Extract token usage if available
            let tokensUsed = 0;
            if (result && result.response && result.response.usageMetadata) {
                tokensUsed = result.response.usageMetadata.totalTokenCount || 0;
            }

            // Record successful Gemini operation
            if (recordGeminiOperation) {
                recordGeminiOperation(operation, responseTime, tokensUsed);
            }

            logger.geminiOperation(operation, 'gemini-pro', responseTime, tokensUsed);
            return result;

        } catch (error) {
            const responseTime = Date.now() - startTime;

            // Record Gemini error
            if (recordGeminiError) {
                recordGeminiError(operation, error);
            }

            logger.geminiError(operation, error);
            throw error;
        }
    };
}

/**
 * Create metrics context for tracking related operations
 */
function createMetricsContext(correlationId = null) {
    const context = {
        correlationId: correlationId || logger.generateCorrelationId(),
        startTime: Date.now(),
        operations: []
    };

    return {
        ...context,
        
        // Track API call
        trackApi: (method, path, statusCode) => {
            const operation = {
                type: 'api',
                method,
                path,
                statusCode,
                timestamp: new Date().toISOString()
            };
            context.operations.push(operation);
            return operation;
        },

        // Track database operation
        trackDb: (operation, table, queryTime) => {
            const dbOperation = {
                type: 'database',
                operation,
                table,
                queryTime,
                timestamp: new Date().toISOString()
            };
            context.operations.push(dbOperation);
            return dbOperation;
        },

        // Track bot event
        trackBot: (eventType, userId) => {
            const botOperation = {
                type: 'bot',
                eventType,
                userId,
                timestamp: new Date().toISOString()
            };
            context.operations.push(botOperation);
            return botOperation;
        },

        // Get summary
        getSummary: () => ({
            correlationId: context.correlationId,
            duration: Date.now() - context.startTime,
            operationCount: context.operations.length,
            operations: context.operations
        })
    };
}

/**
 * Bulk metrics sender for batch operations
 */
async function sendBulkMetrics(metrics) {
    try {
        // Send to performance metrics endpoint
        const performanceEndpoint = process.env.NETLIFY_URL + '/.netlify/functions/performance-metrics';
        
        const promises = metrics.map(metric => {
            return fetch(performanceEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metric)
            }).catch(error => {
                logger.warn('Failed to send bulk metric', { metric, error: error.message });
            });
        });

        await Promise.allSettled(promises);
        logger.debug('Bulk metrics sent', { count: metrics.length });

    } catch (error) {
        logger.error('Bulk metrics sending failed', {}, error);
    }
}

module.exports = {
    withMetricsTracking,
    withDatabaseMetrics,
    withBotMetrics,
    withGeminiMetrics,
    createMetricsContext,
    sendBulkMetrics
};