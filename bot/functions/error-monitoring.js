// bot/functions/error-monitoring.js
const { createClient } = require("@supabase/supabase-js");
const { createLogger } = require("./shared/utils/logger");
const { wrapApiHandler } = require("./shared/middleware/api-wrapper");

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ALERT_CHAT_ID = process.env.ALERT_CHAT_ID; // Admin chat for alerts

const logger = createLogger({ module: 'error-monitoring' });

// Error tracking storage (in production, use persistent storage)
let errorMetrics = {
    api: {
        total: 0,
        by_status: {},
        by_endpoint: {},
        recent: []
    },
    database: {
        total: 0,
        by_operation: {},
        connection_errors: 0,
        timeout_errors: 0,
        recent: []
    },
    bot: {
        total: 0,
        by_type: {},
        user_errors: 0,
        system_errors: 0,
        recent: []
    },
    gemini: {
        total: 0,
        rate_limit_errors: 0,
        quota_errors: 0,
        api_errors: 0,
        recent: []
    },
    alerts: {
        sent: 0,
        last_sent: null,
        suppressed: 0
    },
    thresholds: {
        error_rate: 0.1, // 10% error rate threshold
        errors_per_minute: 10,
        consecutive_errors: 5
    }
};

/**
 * Record and analyze API error
 */
function recordApiError(method, path, statusCode, error, userId = null) {
    const errorRecord = {
        timestamp: new Date().toISOString(),
        method,
        path,
        statusCode,
        error: error.message,
        userId,
        stack: error.stack
    };

    errorMetrics.api.total++;
    errorMetrics.api.by_status[statusCode] = (errorMetrics.api.by_status[statusCode] || 0) + 1;
    errorMetrics.api.by_endpoint[`${method} ${path}`] = 
        (errorMetrics.api.by_endpoint[`${method} ${path}`] || 0) + 1;
    
    errorMetrics.api.recent.unshift(errorRecord);
    if (errorMetrics.api.recent.length > 100) {
        errorMetrics.api.recent = errorMetrics.api.recent.slice(0, 100);
    }

    logger.apiError(method, path, error, userId);
    
    // Check for alert conditions
    checkAndSendAlert('api', errorRecord);
}

/**
 * Record and analyze database error
 */
function recordDatabaseError(operation, table, error, query = null) {
    const errorRecord = {
        timestamp: new Date().toISOString(),
        operation,
        table,
        error: error.message,
        query: query ? query.substring(0, 200) : null, // Truncate long queries
        stack: error.stack
    };

    errorMetrics.database.total++;
    errorMetrics.database.by_operation[operation] = 
        (errorMetrics.database.by_operation[operation] || 0) + 1;
    
    // Categorize error types
    if (error.message.includes('connection') || error.message.includes('timeout')) {
        if (error.message.includes('timeout')) {
            errorMetrics.database.timeout_errors++;
        } else {
            errorMetrics.database.connection_errors++;
        }
    }
    
    errorMetrics.database.recent.unshift(errorRecord);
    if (errorMetrics.database.recent.length > 100) {
        errorMetrics.database.recent = errorMetrics.database.recent.slice(0, 100);
    }

    logger.dbError(operation, table, error);
    
    // Check for alert conditions
    checkAndSendAlert('database', errorRecord);
}

/**
 * Record and analyze bot error
 */
function recordBotError(eventType, error, userId = null, chatId = null, updateId = null) {
    const errorRecord = {
        timestamp: new Date().toISOString(),
        eventType,
        error: error.message,
        userId,
        chatId,
        updateId,
        stack: error.stack
    };

    errorMetrics.bot.total++;
    errorMetrics.bot.by_type[eventType] = (errorMetrics.bot.by_type[eventType] || 0) + 1;
    
    // Categorize by error source
    if (userId) {
        errorMetrics.bot.user_errors++;
    } else {
        errorMetrics.bot.system_errors++;
    }
    
    errorMetrics.bot.recent.unshift(errorRecord);
    if (errorMetrics.bot.recent.length > 100) {
        errorMetrics.bot.recent = errorMetrics.bot.recent.slice(0, 100);
    }

    logger.botError(eventType, error, userId, chatId);
    
    // Check for alert conditions
    checkAndSendAlert('bot', errorRecord);
}

/**
 * Record and analyze Gemini API error
 */
function recordGeminiError(operation, error, model = 'gemini-pro') {
    const errorRecord = {
        timestamp: new Date().toISOString(),
        operation,
        model,
        error: error.message,
        stack: error.stack
    };

    errorMetrics.gemini.total++;
    
    // Categorize Gemini-specific errors
    if (error.message.includes('quota') || error.message.includes('limit')) {
        if (error.message.includes('rate')) {
            errorMetrics.gemini.rate_limit_errors++;
        } else {
            errorMetrics.gemini.quota_errors++;
        }
    } else {
        errorMetrics.gemini.api_errors++;
    }
    
    errorMetrics.gemini.recent.unshift(errorRecord);
    if (errorMetrics.gemini.recent.length > 100) {
        errorMetrics.gemini.recent = errorMetrics.gemini.recent.slice(0, 100);
    }

    logger.geminiError(operation, error);
    
    // Check for alert conditions
    checkAndSendAlert('gemini', errorRecord);
}

/**
 * Check if alerts should be sent based on error patterns
 */
async function checkAndSendAlert(category, errorRecord) {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const lastAlertTime = errorMetrics.alerts.last_sent ? 
        new Date(errorMetrics.alerts.last_sent).getTime() : 0;
    
    // Prevent spam - don't send alerts more than once per 5 minutes
    if (now - lastAlertTime < 5 * 60 * 1000) {
        errorMetrics.alerts.suppressed++;
        return;
    }

    let shouldAlert = false;
    let alertReason = '';

    // Check error rate threshold
    const recentErrors = getRecentErrors(category, oneMinuteAgo);
    if (recentErrors.length >= errorMetrics.thresholds.errors_per_minute) {
        shouldAlert = true;
        alertReason = `High error rate: ${recentErrors.length} ${category} errors in the last minute`;
    }

    // Check for consecutive errors
    const lastErrors = errorMetrics[category].recent.slice(0, errorMetrics.thresholds.consecutive_errors);
    if (lastErrors.length === errorMetrics.thresholds.consecutive_errors) {
        const allRecent = lastErrors.every(err => 
            new Date(err.timestamp).getTime() > oneMinuteAgo
        );
        if (allRecent) {
            shouldAlert = true;
            alertReason = `${errorMetrics.thresholds.consecutive_errors} consecutive ${category} errors`;
        }
    }

    // Check for critical errors
    if (category === 'database' && errorRecord.error.includes('connection')) {
        shouldAlert = true;
        alertReason = 'Database connection error detected';
    }

    if (shouldAlert) {
        await sendAlert(category, alertReason, errorRecord);
    }
}

/**
 * Get recent errors for a category
 */
function getRecentErrors(category, timeThreshold) {
    return errorMetrics[category].recent.filter(error => 
        new Date(error.timestamp).getTime() > timeThreshold
    );
}

/**
 * Send alert to admin via Telegram
 */
async function sendAlert(category, reason, errorRecord) {
    if (!BOT_TOKEN || !ALERT_CHAT_ID) {
        logger.warn('Alert configuration missing', { 
            hasBotToken: !!BOT_TOKEN,
            hasAlertChatId: !!ALERT_CHAT_ID 
        });
        return;
    }

    try {
        const alertMessage = `🚨 *Dream Analyzer Alert*\n\n` +
            `**Category:** ${category}\n` +
            `**Reason:** ${reason}\n` +
            `**Time:** ${errorRecord.timestamp}\n` +
            `**Error:** \`${errorRecord.error.substring(0, 100)}...\`\n\n` +
            `**Stats:**\n` +
            `• Total ${category} errors: ${errorMetrics[category].total}\n` +
            `• Alerts sent: ${errorMetrics.alerts.sent + 1}\n` +
            `• Alerts suppressed: ${errorMetrics.alerts.suppressed}`;

        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: ALERT_CHAT_ID,
                text: alertMessage,
                parse_mode: 'Markdown'
            })
        });

        if (response.ok) {
            errorMetrics.alerts.sent++;
            errorMetrics.alerts.last_sent = new Date().toISOString();
            logger.info('Alert sent successfully', { category, reason });
        } else {
            throw new Error(`Telegram API error: ${response.status}`);
        }

    } catch (error) {
        logger.error('Failed to send alert', { category, reason }, error);
    }
}

/**
 * Get error monitoring dashboard data
 */
function getErrorMonitoringData(timeRange = '1h') {
    const now = Date.now();
    const timeThresholds = {
        '1h': now - 60 * 60 * 1000,
        '24h': now - 24 * 60 * 60 * 1000,
        '7d': now - 7 * 24 * 60 * 60 * 1000
    };
    
    const threshold = timeThresholds[timeRange] || timeThresholds['1h'];

    const recentErrorsByCategory = {
        api: getRecentErrors('api', threshold),
        database: getRecentErrors('database', threshold),
        bot: getRecentErrors('bot', threshold),
        gemini: getRecentErrors('gemini', threshold)
    };

    return {
        summary: {
            totalErrors: Object.values(recentErrorsByCategory)
                .reduce((sum, errors) => sum + errors.length, 0),
            errorsByCategory: Object.entries(recentErrorsByCategory)
                .reduce((acc, [category, errors]) => {
                    acc[category] = errors.length;
                    return acc;
                }, {}),
            alertStatus: {
                sent: errorMetrics.alerts.sent,
                suppressed: errorMetrics.alerts.suppressed,
                lastSent: errorMetrics.alerts.last_sent
            }
        },
        details: errorMetrics,
        recentErrors: recentErrorsByCategory,
        thresholds: errorMetrics.thresholds,
        timeRange,
        generatedAt: new Date().toISOString()
    };
}

/**
 * Reset error metrics
 */
function resetErrorMetrics() {
    Object.keys(errorMetrics).forEach(category => {
        if (category === 'thresholds') return;
        
        if (typeof errorMetrics[category] === 'object') {
            Object.keys(errorMetrics[category]).forEach(key => {
                if (Array.isArray(errorMetrics[category][key])) {
                    errorMetrics[category][key] = [];
                } else if (typeof errorMetrics[category][key] === 'number') {
                    errorMetrics[category][key] = 0;
                } else if (typeof errorMetrics[category][key] === 'object') {
                    errorMetrics[category][key] = {};
                }
            });
        }
    });
    
    errorMetrics.alerts.last_sent = null;
    logger.info('Error metrics reset');
}

/**
 * Main handler
 */
async function handleErrorMonitoring(event, context, corsHeaders) {
    const method = event.httpMethod;
    const path = event.path || '';
    const query = event.queryStringParameters || {};

    try {
        if (method === 'GET') {
            // Get error monitoring data
            const timeRange = query.timeRange || '1h';
            const data = getErrorMonitoringData(timeRange);
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(data)
            };
        }
        
        if (method === 'POST') {
            // Record error (webhook from other services)
            const body = JSON.parse(event.body || '{}');
            
            switch (body.category) {
                case 'api':
                    recordApiError(body.method, body.path, body.statusCode, 
                        new Error(body.error), body.userId);
                    break;
                case 'database':
                    recordDatabaseError(body.operation, body.table, 
                        new Error(body.error), body.query);
                    break;
                case 'bot':
                    recordBotError(body.eventType, new Error(body.error), 
                        body.userId, body.chatId, body.updateId);
                    break;
                case 'gemini':
                    recordGeminiError(body.operation, new Error(body.error), body.model);
                    break;
                default:
                    throw new Error(`Unknown error category: ${body.category}`);
            }
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ success: true, recorded: body.category })
            };
        }
        
        if (method === 'DELETE' && path.includes('/reset')) {
            resetErrorMetrics();
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ success: true, message: 'Error metrics reset' })
            };
        }
        
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };

    } catch (error) {
        logger.error('Error monitoring handler error', {}, error);
        
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
exports.handler = wrapApiHandler(handleErrorMonitoring, {
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
exports.recordApiError = recordApiError;
exports.recordDatabaseError = recordDatabaseError;
exports.recordBotError = recordBotError;
exports.recordGeminiError = recordGeminiError;
exports.getErrorMonitoringData = getErrorMonitoringData;
exports.resetErrorMetrics = resetErrorMetrics;