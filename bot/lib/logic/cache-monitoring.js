// bot/functions/cache-monitoring.js
// Endpoint для мониторинга кеша и метрик

const cacheService = require('./shared/services/cache-service');
const userCacheService = require('./shared/services/user-cache-service');
const geminiService = require('./shared/services/gemini-service');
const cacheInvalidationService = require('./shared/services/cache-invalidation-service');
const cacheWarmingService = require('./shared/services/cache-warming-service');

// CORS Configuration
const allowedOrigins = [
    process.env.ALLOWED_TMA_ORIGIN,
    process.env.ALLOWED_WEB_ORIGIN,
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:5173', 'http://localhost:3000'] : [])
].filter(Boolean);

/**
 * Функция для настройки CORS заголовков
 */
function getCORSHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };
}

/**
 * Главный обработчик для мониторинга кеша
 */
exports.handler = async (event) => {
    const requestOrigin = event.headers.origin || event.headers.Origin;
    const corsHeaders = getCORSHeaders(requestOrigin);

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        const path = event.path || '';
        const method = event.httpMethod;
        const queryParams = event.queryStringParameters || {};

        console.log(`[CacheMonitoring] ${method} ${path}`, queryParams);

        // Роутинг запросов
        if (path.includes('/cache/stats')) {
            return await handleCacheStats(method, queryParams, corsHeaders);
        }
        
        if (path.includes('/cache/health')) {
            return await handleCacheHealth(method, queryParams, corsHeaders);
        }
        
        if (path.includes('/cache/invalidate')) {
            return await handleCacheInvalidation(method, event.body, corsHeaders);
        }
        
        if (path.includes('/cache/warm')) {
            return await handleCacheWarming(method, event.body, corsHeaders);
        }
        
        if (path.includes('/cache/keys')) {
            return await handleCacheKeys(method, queryParams, corsHeaders);
        }

        // Dashboard - общая статистика
        return await handleCacheDashboard(corsHeaders);

    } catch (error) {
        console.error('[CacheMonitoring] Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

/**
 * Обработка запросов статистики кеша
 */
async function handleCacheStats(method, queryParams, corsHeaders) {
    if (method !== 'GET') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const statsType = queryParams.type || 'all';
    let stats = {};

    switch (statsType) {
        case 'cache':
            stats = cacheService.info();
            break;
        case 'user':
            stats = userCacheService.getUserCacheStats();
            break;
        case 'gemini':
            stats = geminiService.getCacheStats();
            break;
        case 'invalidation':
            stats = cacheInvalidationService.getInvalidationStats();
            break;
        case 'warming':
            stats = cacheWarmingService.getWarmingStats();
            break;
        case 'all':
        default:
            stats = {
                cache: cacheService.info(),
                user: userCacheService.getUserCacheStats(),
                gemini: geminiService.getCacheStats(),
                invalidation: cacheInvalidationService.getInvalidationStats(),
                warming: cacheWarmingService.getWarmingStats()
            };
            break;
    }

    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
            success: true,
            type: statsType,
            stats,
            timestamp: new Date().toISOString()
        })
    };
}

/**
 * Обработка проверки здоровья кеша
 */
async function handleCacheHealth(method, queryParams, corsHeaders) {
    if (method !== 'GET') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const cacheInfo = cacheService.info();
    const hitRate = parseFloat(cacheInfo.hit_rate) || 0;
    
    // Определяем здоровье на основе метрик
    let status = 'healthy';
    const issues = [];
    
    if (hitRate < 50) {
        status = 'degraded';
        issues.push('Low hit rate');
    }
    
    if (cacheInfo.used_memory > cacheInfo.max_memory * 0.9) {
        status = 'degraded';
        issues.push('High memory usage');
    }
    
    if (cacheInfo.db0_keys === 0) {
        status = 'warning';
        issues.push('Empty cache');
    }

    const healthCheck = {
        status,
        issues,
        metrics: {
            hit_rate: hitRate,
            memory_usage_percent: (cacheInfo.used_memory / cacheInfo.max_memory * 100).toFixed(2),
            total_keys: cacheInfo.db0_keys,
            uptime_seconds: cacheInfo.uptime_seconds
        },
        timestamp: new Date().toISOString()
    };

    const statusCode = status === 'healthy' ? 200 : 
                      status === 'degraded' ? 503 : 200;

    return {
        statusCode,
        headers: corsHeaders,
        body: JSON.stringify({
            success: true,
            health: healthCheck
        })
    };
}

/**
 * Обработка инвалидации кеша
 */
async function handleCacheInvalidation(method, body, corsHeaders) {
    if (method !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    let requestData;
    try {
        requestData = JSON.parse(body || '{}');
    } catch {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Invalid JSON body' })
        };
    }

    const { type, target, userId, pattern, reason } = requestData;
    let result = 0;

    try {
        switch (type) {
            case 'user':
                if (!userId) throw new Error('userId required for user invalidation');
                result = await cacheInvalidationService.invalidateOnUserEvent(userId, target || 'user_updated');
                break;
                
            case 'pattern':
                if (!pattern) throw new Error('pattern required for pattern invalidation');
                result = cacheService.invalidatePattern(pattern);
                break;
                
            case 'tag':
                if (!target) throw new Error('tag required for tag invalidation');
                result = cacheService.invalidateTag(target);
                break;
                
            case 'gemini':
                result = geminiService.invalidateCache(target || 'all');
                break;
                
            case 'all':
                result = cacheService.flushall();
                break;
                
            default:
                throw new Error(`Unknown invalidation type: ${type}`);
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                invalidated: result,
                type,
                target,
                reason: reason || 'Manual invalidation',
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
                error: error.message,
                type,
                target
            })
        };
    }
}

/**
 * Обработка warming кеша
 */
async function handleCacheWarming(method, body, corsHeaders) {
    if (method !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    let requestData;
    try {
        requestData = JSON.parse(body || '{}');
    } catch {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Invalid JSON body' })
        };
    }

    const { type, strategies, userId } = requestData;

    try {
        let result;

        switch (type) {
            case 'full':
                result = await cacheWarmingService.startWarmingCycle(strategies || ['popular_users', 'common_prompts']);
                break;
                
            case 'users':
                result = await cacheWarmingService.warmPopularUsers();
                break;
                
            case 'prompts':
                result = await cacheWarmingService.warmCommonPrompts();
                break;
                
            case 'predictive':
                if (!userId) throw new Error('userId required for predictive warming');
                result = await cacheWarmingService.predictiveWarming(userId);
                break;
                
            default:
                throw new Error(`Unknown warming type: ${type}`);
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                result,
                type,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
                error: error.message,
                type
            })
        };
    }
}

/**
 * Обработка запросов ключей кеша
 */
async function handleCacheKeys(method, queryParams, corsHeaders) {
    if (method !== 'GET') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const pattern = queryParams.pattern || '*';
    const limit = parseInt(queryParams.limit) || 100;
    const includeValues = queryParams.values === 'true';

    try {
        const keys = cacheService.keys(pattern).slice(0, limit);
        const result = {
            keys: keys.length,
            pattern,
            limit,
            data: keys
        };

        if (includeValues) {
            result.values = {};
            keys.forEach(key => {
                const value = cacheService.get(key);
                result.values[key] = {
                    exists: value !== null,
                    ttl: cacheService.ttl(key),
                    size: value ? JSON.stringify(value).length : 0
                };
            });
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                result,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
                error: error.message,
                pattern
            })
        };
    }
}

/**
 * Dashboard - общая информация о кеше
 */
async function handleCacheDashboard(corsHeaders) {
    const dashboard = {
        overview: {
            cache_service: cacheService.info(),
            system_health: 'healthy'
        },
        services: {
            user_cache: {
                stats: userCacheService.getUserCacheStats(),
                description: 'User profile and subscription caching'
            },
            gemini_cache: {
                stats: geminiService.getCacheStats(),
                description: 'AI analysis response caching'
            },
            invalidation: {
                stats: cacheInvalidationService.getInvalidationStats(),
                description: 'Cache invalidation management'
            },
            warming: {
                stats: cacheWarmingService.getWarmingStats(),
                description: 'Proactive cache warming'
            }
        },
        quick_actions: {
            available_endpoints: [
                'GET /cache/stats?type=all',
                'GET /cache/health',
                'POST /cache/invalidate',
                'POST /cache/warm',
                'GET /cache/keys?pattern=*'
            ]
        },
        timestamp: new Date().toISOString()
    };

    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
            success: true,
            dashboard
        })
    };
}