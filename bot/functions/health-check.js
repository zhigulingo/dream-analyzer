// bot/functions/health-check.js
const { createClient } = require("@supabase/supabase-js");
const { createLogger } = require("./shared/utils/logger");
const { wrapApiHandler } = require("./shared/middleware/api-wrapper");

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;

const logger = createLogger({ module: 'health-check' });

/**
 * Comprehensive health check for all system components
 */
async function performHealthCheck() {
    const startTime = Date.now();
    const correlationId = logger.generateCorrelationId();
    logger.setCorrelationId(correlationId);
    
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        correlationId,
        components: {},
        metrics: {}
    };

    try {
        // Check environment variables
        const envCheck = checkEnvironmentVariables();
        healthStatus.components.environment = envCheck;

        // Check database connectivity
        const dbCheck = await checkDatabaseHealth();
        healthStatus.components.database = dbCheck;

        // Check Telegram bot connectivity  
        const botCheck = await checkBotHealth();
        healthStatus.components.bot = botCheck;

        // Check Gemini AI service
        const geminiCheck = await checkGeminiHealth();
        healthStatus.components.gemini = geminiCheck;

        // Overall status determination
        const componentStatuses = Object.values(healthStatus.components);
        const hasFailure = componentStatuses.some(comp => comp.status === 'unhealthy');
        const hasWarning = componentStatuses.some(comp => comp.status === 'warning');
        
        if (hasFailure) {
            healthStatus.status = 'unhealthy';
        } else if (hasWarning) {
            healthStatus.status = 'warning';
        }

        // Performance metrics
        healthStatus.metrics.checkDuration = Date.now() - startTime;
        healthStatus.metrics.uptime = process.uptime();
        healthStatus.metrics.memoryUsage = process.memoryUsage();

        logger.info('Health check completed', { 
            status: healthStatus.status,
            duration: healthStatus.metrics.checkDuration,
            components: Object.keys(healthStatus.components).reduce((acc, key) => {
                acc[key] = healthStatus.components[key].status;
                return acc;
            }, {})
        });

        return healthStatus;

    } catch (error) {
        logger.error('Health check failed', {}, error);
        
        return {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            correlationId,
            error: error.message,
            metrics: {
                checkDuration: Date.now() - startTime
            }
        };
    }
}

/**
 * Check environment variables
 */
function checkEnvironmentVariables() {
    const requiredVars = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY', 
        'BOT_TOKEN',
        'GEMINI_API_KEY',
        'TMA_URL'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        return {
            status: 'unhealthy',
            message: `Missing environment variables: ${missing.join(', ')}`
        };
    }

    return {
        status: 'healthy',
        message: 'All required environment variables present'
    };
}

/**
 * Check database connectivity and performance
 */
async function checkDatabaseHealth() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return {
            status: 'unhealthy',
            message: 'Database configuration missing'
        };
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const startTime = Date.now();
        
        // Simple query to check connectivity
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);

        const queryTime = Date.now() - startTime;

        if (error) {
            throw new Error(`Database query failed: ${error.message}`);
        }

        const status = queryTime > 1000 ? 'warning' : 'healthy';
        
        return {
            status,
            message: `Database responsive in ${queryTime}ms`,
            metrics: {
                responseTime: queryTime,
                threshold: 1000
            }
        };

    } catch (error) {
        return {
            status: 'unhealthy',
            message: `Database check failed: ${error.message}`
        };
    }
}

/**
 * Check Telegram bot health
 */
async function checkBotHealth() {
    if (!BOT_TOKEN) {
        return {
            status: 'unhealthy',
            message: 'Bot token not configured'
        };
    }

    try {
        const startTime = Date.now();
        
        // Check bot info via Telegram API
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
        const data = await response.json();
        
        const responseTime = Date.now() - startTime;

        if (!data.ok) {
            throw new Error(`Bot API error: ${data.description}`);
        }

        const status = responseTime > 2000 ? 'warning' : 'healthy';

        return {
            status,
            message: `Bot API responsive in ${responseTime}ms`,
            metrics: {
                responseTime,
                threshold: 2000,
                botInfo: {
                    username: data.result.username,
                    firstName: data.result.first_name
                }
            }
        };

    } catch (error) {
        return {
            status: 'unhealthy',
            message: `Bot check failed: ${error.message}`
        };
    }
}

/**
 * Check Gemini AI service health
 */
async function checkGeminiHealth() {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
        return {
            status: 'unhealthy',
            message: 'Gemini API key not configured'
        };
    }

    try {
        const startTime = Date.now();
        
        // Simple test request to Gemini
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
        );
        
        const responseTime = Date.now() - startTime;

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const status = responseTime > 3000 ? 'warning' : 'healthy';

        return {
            status,
            message: `Gemini API responsive in ${responseTime}ms`,
            metrics: {
                responseTime,
                threshold: 3000
            }
        };

    } catch (error) {
        return {
            status: 'unhealthy',  
            message: `Gemini check failed: ${error.message}`
        };
    }
}

/**
 * Main handler
 */
async function handleHealthCheck(event, context, corsHeaders) {
    const healthData = await performHealthCheck();
    
    const statusCode = healthData.status === 'healthy' ? 200 
                    : healthData.status === 'warning' ? 200 
                    : 503;

    return {
        statusCode,
        headers: corsHeaders,
        body: JSON.stringify(healthData)
    };
}

// Export wrapped handler
exports.handler = wrapApiHandler(handleHealthCheck, {
    allowedMethods: ['GET', 'POST'],
    allowedOrigins: [
        process.env.TMA_URL,
        process.env.WEB_URL,
        'https://dream-analyzer.netlify.app',
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    skipConfigValidation: true
});