// bot/functions/shared/services/cache-manager.js
// Главный менеджер кеширования - координирует все кеш-сервисы

const cacheService = require('./cache-service');
const userCacheService = require('./user-cache-service');
const geminiService = require('./gemini-service');
const cacheInvalidationService = require('./cache-invalidation-service');
const cacheWarmingService = require('./cache-warming-service');

/**
 * Главный менеджер кеширования
 * Координирует работу всех кеш-сервисов и предоставляет единый API
 */
class CacheManager {
    constructor() {
        this.services = {
            cache: cacheService,
            userCache: userCacheService,
            gemini: geminiService,
            invalidation: cacheInvalidationService,
            warming: cacheWarmingService
        };
        
        this.isInitialized = false;
        
        console.log('[CacheManager] Initialized with all cache services');
    }

    /**
     * Инициализация всех кеш-сервисов
     */
    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            console.log('[CacheManager] Initializing cache services...');
            
            // Запускаем background warming если нужно
            if (process.env.CACHE_BACKGROUND_WARMING === 'true') {
                this.services.warming.startBackgroundWarming();
                console.log('[CacheManager] Background warming started');
            }
            
            // Можем добавить другую инициализацию если нужно
            this.isInitialized = true;
            
            console.log('[CacheManager] All cache services initialized successfully');
            return true;
            
        } catch (error) {
            console.error('[CacheManager] Failed to initialize cache services:', error);
            throw error;
        }
    }

    /**
     * Единая точка для кеширования пользовательских данных
     */
    async cacheUserData(userId, userData, options = {}) {
        try {
            // Кешируем разные типы данных пользователя
            if (userData.profile) {
                this.services.userCache.cacheUserProfile(userId, userData.profile);
            }
            
            if (userData.stats) {
                this.services.userCache.cacheUserStats(userId, userData.stats);
            }
            
            if (userData.subscription) {
                this.services.userCache.cacheUserSubscription(userId, userData.subscription);
            }
            
            if (userData.tokens !== undefined) {
                this.services.userCache.cacheUserTokens(userId, { tokens: userData.tokens });
            }
            
            // Полные данные
            if (userData.full) {
                this.services.userCache.cacheFullUserData(userId, userData.full);
            }
            
            // Трекинг активности
            if (options.trackActivity) {
                this.services.userCache.trackUserActivity(userId, options.activityType || 'cache_update');
            }
            
            console.log(`[CacheManager] Cached user data for ${userId}`);
            return true;
            
        } catch (error) {
            console.error(`[CacheManager] Failed to cache user data for ${userId}:`, error);
            return false;
        }
    }

    /**
     * Единая точка для получения пользовательских данных
     */
    async getUserData(userId, options = {}) {
        try {
            const result = {};
            
            // Получаем данные из кеша
            if (options.includeProfile !== false) {
                result.profile = this.services.userCache.getUserProfile(userId);
            }
            
            if (options.includeStats) {
                result.stats = this.services.userCache.getUserStats(userId);
            }
            
            if (options.includeSubscription) {
                result.subscription = this.services.userCache.getUserSubscription(userId);
            }
            
            if (options.includeTokens) {
                result.tokens = this.services.userCache.getUserTokens(userId);
            }
            
            if (options.includeFull) {
                result.full = this.services.userCache.getFullUserData(userId);
            }
            
            if (options.includeActivity) {
                result.activity = this.services.userCache.getUserActivity(userId);
            }
            
            // Трекинг активности
            if (options.trackAccess) {
                this.services.userCache.trackUserActivity(userId, 'data_access');
            }
            
            return result;
            
        } catch (error) {
            console.error(`[CacheManager] Failed to get user data for ${userId}:`, error);
            return null;
        }
    }

    /**
     * Обработка событий для автоматической инвалидации
     */
    async handleUserEvent(userId, eventType, eventData = {}) {
        try {
            console.log(`[CacheManager] Handling user event: ${eventType} for user ${userId}`);
            
            // Инвалидируем соответствующие данные
            const invalidated = await this.services.invalidation.invalidateOnUserEvent(userId, eventType, eventData);
            
            // Если нужно, запускаем predictive warming
            if (eventData.predictiveWarming) {
                await this.services.warming.predictiveWarming(userId);
            }
            
            console.log(`[CacheManager] Event processed: ${invalidated} items invalidated`);
            return invalidated;
            
        } catch (error) {
            console.error(`[CacheManager] Failed to handle user event:`, error);
            return 0;
        }
    }

    /**
     * Обработка системных событий
     */
    async handleSystemEvent(eventType, eventData = {}) {
        try {
            console.log(`[CacheManager] Handling system event: ${eventType}`);
            
            const invalidated = await this.services.invalidation.invalidateOnSystemEvent(eventType, eventData);
            
            // После системных событий может потребоваться warming
            if (eventData.triggerWarming) {
                await this.services.warming.startWarmingCycle(eventData.warmingStrategies);
            }
            
            console.log(`[CacheManager] System event processed: ${invalidated} items invalidated`);
            return invalidated;
            
        } catch (error) {
            console.error(`[CacheManager] Failed to handle system event:`, error);
            return 0;
        }
    }

    /**
     * Получение полной статистики всех кеш-сервисов
     */
    getComprehensiveStats() {
        try {
            return {
                manager: {
                    initialized: this.isInitialized,
                    services_count: Object.keys(this.services).length,
                    uptime: process.uptime()
                },
                cache_service: this.services.cache.info(),
                user_cache: this.services.userCache.getUserCacheStats(),
                gemini_cache: this.services.gemini.getCacheStats(),
                invalidation: this.services.invalidation.getInvalidationStats(),
                warming: this.services.warming.getWarmingStats(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[CacheManager] Failed to get comprehensive stats:', error);
            return { error: error.message };
        }
    }

    /**
     * Периодическая оптимизация кеша
     */
    async performOptimization() {
        console.log('[CacheManager] Starting cache optimization...');
        
        try {
            const stats = this.getComprehensiveStats();
            
            // Проверяем нужна ли оптимизация
            const cacheInfo = stats.cache_service;
            const hitRate = parseFloat(cacheInfo.hit_rate) || 0;
            
            if (hitRate < 60) {
                // Низкий hit rate - запускаем warming
                console.log('[CacheManager] Low hit rate detected, starting warming...');
                await this.services.warming.startWarmingCycle(['popular_users']);
            }
            
            if (cacheInfo.used_memory > cacheInfo.max_memory * 0.8) {
                // Высокое использование памяти - чистим старые данные
                console.log('[CacheManager] High memory usage, cleaning old data...');
                // Здесь можно добавить логику очистки
            }
            
            console.log('[CacheManager] Cache optimization completed');
            return true;
            
        } catch (error) {
            console.error('[CacheManager] Cache optimization failed:', error);
            return false;
        }
    }

    /**
     * Создание snapshot кеша для бэкапа
     */
    createSnapshot() {
        try {
            console.log('[CacheManager] Creating cache snapshot...');
            
            const snapshot = {
                timestamp: new Date().toISOString(),
                stats: this.getComprehensiveStats(),
                keys: {
                    total: this.services.cache.info().db0_keys,
                    user_keys: this.services.cache.keys('user:*').length,
                    gemini_keys: this.services.cache.keys('gemini:*').length
                }
            };
            
            console.log(`[CacheManager] Snapshot created: ${snapshot.keys.total} total keys`);
            return snapshot;
            
        } catch (error) {
            console.error('[CacheManager] Failed to create snapshot:', error);
            return null;
        }
    }

    /**
     * Graceful shutdown всех сервисов
     */
    async shutdown() {
        console.log('[CacheManager] Shutting down cache services...');
        
        try {
            // Создаем финальный snapshot
            const finalSnapshot = this.createSnapshot();
            
            // Останавливаем все сервисы
            this.services.warming.cleanup();
            this.services.invalidation.cleanup();
            this.services.cache.shutdown();
            
            this.isInitialized = false;
            
            console.log('[CacheManager] All cache services shut down successfully');
            return finalSnapshot;
            
        } catch (error) {
            console.error('[CacheManager] Error during shutdown:', error);
            throw error;
        }
    }

    /**
     * Health check всех кеш-сервисов
     */
    async healthCheck() {
        try {
            const health = {
                status: 'healthy',
                services: {},
                issues: [],
                timestamp: new Date().toISOString()
            };
            
            // Проверяем основной кеш-сервис
            const cacheInfo = this.services.cache.info();
            const hitRate = parseFloat(cacheInfo.hit_rate) || 0;
            
            health.services.cache = {
                status: hitRate > 50 ? 'healthy' : 'degraded',
                hit_rate: hitRate,
                memory_usage: cacheInfo.used_memory,
                keys: cacheInfo.db0_keys
            };
            
            if (hitRate < 50) {
                health.issues.push('Low cache hit rate');
                health.status = 'degraded';
            }
            
            // Проверяем warming сервис
            const warmingStats = this.services.warming.getWarmingStats();
            health.services.warming = {
                status: warmingStats.is_warming ? 'active' : 'idle',
                total_warmed: warmingStats.totalWarmed,
                success_rate: warmingStats.totalWarmed > 0 ? 
                    (warmingStats.successfulWarmed / warmingStats.totalWarmed * 100).toFixed(2) : 0
            };
            
            return health;
            
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Создаем singleton instance
const cacheManager = new CacheManager();

// Автоматическая инициализация
cacheManager.initialize().catch(error => {
    console.error('[CacheManager] Auto-initialization failed:', error);
});

module.exports = cacheManager;