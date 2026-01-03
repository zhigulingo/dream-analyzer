// bot/functions/performance-metrics.js
const { createClient } = require("@supabase/supabase-js");
const { createLogger } = require("./shared/utils/logger");
const { wrapApiHandler } = require("./shared/middleware/api-wrapper");

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const logger = createLogger({ module: 'performance-metrics' });

// In-memory metrics storage (in production, use Redis or external service)
let performanceMetrics = {
    api: {
        requests: 0,
        errors: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        lastReset: new Date()
    },
    database: {
        queries: 0,
        errors: 0,
        totalQueryTime: 0,
        averageQueryTime: 0,
        slowQueries: 0 // queries > 1000ms
    },
    bot: {
        messages: 0,
        commands: 0,
        analyses: 0,
        errors: 0
    },
    gemini: {
        requests: 0,
        errors: 0,
        totalTokens: 0,
        totalResponseTime: 0,
        averageResponseTime: 0
    },
    system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
    }
};

/**
 * Get current performance metrics
 */
async function getPerformanceMetrics(timeRange = '1h') {
    try {
        const correlationId = logger.generateCorrelationId();
        logger.setCorrelationId(correlationId);

        // Update system metrics
        performanceMetrics.system = {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            timestamp: new Date().toISOString()
        };

        // Get database metrics
        const dbMetrics = await getDatabaseMetrics();
        
        // Calculate derived metrics
        const currentTime = new Date();
        const timeSinceReset = (currentTime - performanceMetrics.api.lastReset) / 1000; // seconds
        
        const enrichedMetrics = {
            ...performanceMetrics,
            database: {
                ...performanceMetrics.database,
                ...dbMetrics
            },
            derived: {
                requestsPerSecond: performanceMetrics.api.requests / Math.max(timeSinceReset, 1),
                errorRate: performanceMetrics.api.errors / Math.max(performanceMetrics.api.requests, 1),
                dbErrorRate: performanceMetrics.database.errors / Math.max(performanceMetrics.database.queries, 1),
                botErrorRate: performanceMetrics.bot.errors / Math.max(performanceMetrics.bot.messages, 1),
                geminiErrorRate: performanceMetrics.gemini.errors / Math.max(performanceMetrics.gemini.requests, 1)
            },
            meta: {
                timeRange,
                collectedAt: currentTime.toISOString(),
                correlationId
            }
        };

        logger.info('Performance metrics collected', {
            requestsPerSecond: enrichedMetrics.derived.requestsPerSecond,
            errorRate: enrichedMetrics.derived.errorRate,
            memoryUsage: enrichedMetrics.system.memoryUsage.heapUsed
        });

        return enrichedMetrics;

    } catch (error) {
        logger.error('Failed to collect performance metrics', {}, error);
        throw error;
    }
}

/**
 * Get database-specific metrics
 */
async function getDatabaseMetrics() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return { error: 'Database not configured' };
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const startTime = Date.now();

        // Get user count
        const { count: userCount, error: userError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        // Get analysis count  
        const { count: analysisCount, error: analysisError } = await supabase
            .from('analyses')
            .select('*', { count: 'exact', head: true });

        // Get recent analyses for business metrics
        const { data: recentAnalyses, error: recentError } = await supabase
            .from('analyses')
            .select('created_at')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false });

        const queryTime = Date.now() - startTime;

        if (userError || analysisError || recentError) {
            throw new Error('Database metrics query failed');
        }

        return {
            userCount: userCount || 0,
            analysisCount: analysisCount || 0,
            analysesToday: recentAnalyses?.length || 0,
            lastQueryTime: queryTime,
            queryTimestamp: new Date().toISOString()
        };

    } catch (error) {
        logger.dbError('metrics-collection', 'multiple', error);
        return {
            error: error.message,
            queryTimestamp: new Date().toISOString()
        };
    }
}

/**
 * Record API request metrics
 */
function recordApiRequest(method, path, statusCode, responseTime) {
    performanceMetrics.api.requests++;
    performanceMetrics.api.totalResponseTime += responseTime;
    performanceMetrics.api.averageResponseTime = 
        performanceMetrics.api.totalResponseTime / performanceMetrics.api.requests;
    
    if (statusCode >= 400) {
        performanceMetrics.api.errors++;
    }

    logger.apiRequest(method, path, statusCode, responseTime);
}

/**
 * Record database operation metrics
 */
function recordDatabaseOperation(operation, table, queryTime, error = null) {
    performanceMetrics.database.queries++;
    
    if (error) {
        performanceMetrics.database.errors++;
    } else {
        performanceMetrics.database.totalQueryTime += queryTime;
        performanceMetrics.database.averageQueryTime = 
            performanceMetrics.database.totalQueryTime / 
            (performanceMetrics.database.queries - performanceMetrics.database.errors);
        
        if (queryTime > 1000) {
            performanceMetrics.database.slowQueries++;
        }
    }

    if (error) {
        logger.dbError(operation, table, error);
    } else {
        logger.dbOperation(operation, table, queryTime);
    }
}

/**
 * Record bot event metrics
 */
function recordBotEvent(eventType, userId, error = null) {
    if (error) {
        performanceMetrics.bot.errors++;
        logger.botError(eventType, error, userId);
    } else {
        switch (eventType) {
            case 'message':
                performanceMetrics.bot.messages++;
                break;
            case 'command':
                performanceMetrics.bot.commands++;
                break;
            case 'analysis':
                performanceMetrics.bot.analyses++;
                break;
        }
        logger.botEvent(eventType, userId);
    }
}

/**
 * Record Gemini operation metrics
 */
function recordGeminiOperation(operation, responseTime, tokensUsed = 0, error = null) {
    if (error) {
        performanceMetrics.gemini.errors++;
        logger.geminiError(operation, error);
    } else {
        performanceMetrics.gemini.requests++;
        performanceMetrics.gemini.totalResponseTime += responseTime;
        performanceMetrics.gemini.averageResponseTime = 
            performanceMetrics.gemini.totalResponseTime / performanceMetrics.gemini.requests;
        performanceMetrics.gemini.totalTokens += tokensUsed;
        
        logger.geminiOperation(operation, 'gemini-pro', responseTime, tokensUsed);
    }
}

/**
 * Reset metrics (for testing or periodic reset)
 */
function resetMetrics() {
    const resetTime = new Date();
    performanceMetrics = {
        api: {
            requests: 0,
            errors: 0,
            totalResponseTime: 0,
            averageResponseTime: 0,
            lastReset: resetTime
        },
        database: {
            queries: 0,
            errors: 0,
            totalQueryTime: 0,
            averageQueryTime: 0,
            slowQueries: 0
        },
        bot: {
            messages: 0,
            commands: 0,
            analyses: 0,
            errors: 0
        },
        gemini: {
            requests: 0,
            errors: 0,
            totalTokens: 0,
            totalResponseTime: 0,
            averageResponseTime: 0
        },
        system: {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage()
        }
    };
    
    logger.info('Performance metrics reset', { resetTime: resetTime.toISOString() });
}

/**
 * Main handler
 */
async function handlePerformanceMetrics(event, context, corsHeaders) {
    const method = event.httpMethod;
    const path = event.path || '';
    const query = event.queryStringParameters || {};

    try {
        if (method === 'GET') {
            // Get metrics
            const timeRange = query.timeRange || '1h';
            const metrics = await getPerformanceMetrics(timeRange);
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(metrics)
            };
        }
        
        if (method === 'POST') {
            // Record metric (webhook from other services)
            const body = JSON.parse(event.body || '{}');
            
            switch (body.type) {
                case 'api_request':
                    recordApiRequest(body.method, body.path, body.statusCode, body.responseTime);
                    break;
                case 'db_operation':
                    recordDatabaseOperation(body.operation, body.table, body.queryTime, body.error);
                    break;
                case 'bot_event':
                    recordBotEvent(body.eventType, body.userId, body.error);
                    break;
                case 'gemini_operation':
                    recordGeminiOperation(body.operation, body.responseTime, body.tokensUsed, body.error);
                    break;
                default:
                    throw new Error(`Unknown metric type: ${body.type}`);
            }
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ success: true, recorded: body.type })
            };
        }
        
        if (method === 'DELETE' && path.includes('/reset')) {
            resetMetrics();
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ success: true, message: 'Metrics reset' })
            };
        }
        
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };

    } catch (error) {
        logger.error('Performance metrics handler error', {}, error);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
}

// Export wrapped handler
exports.handler = wrapApiHandler(handlePerformanceMetrics, {
    allowedMethods: ['GET', 'POST', 'DELETE'],
    allowedOrigins: [
        process.env.ALLOWED_TMA_ORIGIN,  // ✅ ИСПРАВЛЕНО: используем правильную переменную без слэша
        process.env.ALLOWED_WEB_ORIGIN,  // ✅ ИСПРАВЛЕНО: используем правильную переменную
        'https://dream-analyzer.netlify.app',
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    skipConfigValidation: true
});

// Export functions for internal use
exports.recordApiRequest = recordApiRequest;
exports.recordDatabaseOperation = recordDatabaseOperation;
exports.recordBotEvent = recordBotEvent;
exports.recordGeminiOperation = recordGeminiOperation;
exports.getPerformanceMetrics = getPerformanceMetrics;
exports.resetMetrics = resetMetrics;