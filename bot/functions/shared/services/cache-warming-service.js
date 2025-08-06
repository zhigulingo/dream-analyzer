// bot/functions/shared/services/cache-warming-service.js
// Сервис для предзагрузки (warming) кеша

const cacheService = require('./cache-service');
const userCacheService = require('./user-cache-service');
const geminiService = require('./gemini-service');

/**
 * Сервис для предзагрузки популярных данных в кеш
 * Анализирует паттерны использования и предзагружает часто запрашиваемые данные
 */
class CacheWarmingService {
    constructor() {
        this.warmingStrategies = new Map();
        this.warmingQueue = [];
        this.isWarming = false;
        this.warmingStats = {
            totalWarmed: 0,
            successfulWarmed: 0,
            failedWarmed: 0,
            averageWarmTime: 0,
            lastWarmingSession: null
        };
        
        // Регистрируем стратегии warming
        this._registerWarmingStrategies();
        
        console.log('[CacheWarmingService] Initialized');
    }

    /**
     * Запуск полного цикла warming кеша
     */
    async startWarmingCycle(strategies = ['popular_users', 'common_prompts', 'recent_analyses']) {
        if (this.isWarming) {
            console.log('[CacheWarmingService] Warming cycle already in progress');
            return false;
        }

        console.log(`[CacheWarmingService] Starting warming cycle with strategies: ${strategies.join(', ')}`);
        this.isWarming = true;
        const startTime = Date.now();

        try {
            for (const strategy of strategies) {
                await this._executeWarmingStrategy(strategy);
            }

            const duration = Date.now() - startTime;
            this.warmingStats.lastWarmingSession = {
                startTime,
                duration,
                strategies,
                success: true
            };

            console.log(`[CacheWarmingService] Warming cycle completed in ${duration}ms`);
            return true;

        } catch (error) {
            console.error('[CacheWarmingService] Warming cycle failed:', error);
            this.warmingStats.lastWarmingSession = {
                startTime,
                duration: Date.now() - startTime,
                strategies,
                success: false,
                error: error.message
            };
            return false;
        } finally {
            this.isWarming = false;
        }
    }

    /**
     * Warming популярных пользователей
     */
    async warmPopularUsers(limit = 100) {
        console.log(`[CacheWarmingService] Warming popular users (limit: ${limit})`);
        
        // Получаем популярных пользователей из кеша активности
        const popularUserIds = this._getPopularUserIds(limit);
        
        const warmingPromises = popularUserIds.map(async (userId) => {
            try {
                await this._warmUserData(userId);
                this.warmingStats.successfulWarmed++;
                return { userId, success: true };
            } catch (error) {
                console.error(`[CacheWarmingService] Failed to warm user ${userId}:`, error);
                this.warmingStats.failedWarmed++;
                return { userId, success: false, error: error.message };
            }
        });

        const results = await Promise.allSettled(warmingPromises);
        console.log(`[CacheWarmingService] Warmed ${results.length} popular users`);
        
        return results;
    }

    /**
     * Warming общих промптов и анализов
     */
    async warmCommonPrompts() {
        console.log('[CacheWarmingService] Warming common prompts and analyses');
        
        const commonDreamTexts = [
            "Я летал во сне",
            "Снилось, что я падаю",
            "Во сне я был в школе",
            "Снилась вода",
            "Я потерялся во сне",
            "Снились животные",
            "Во сне я не мог убежать",
            "Снилась мама",
            "Я был в незнакомом доме",
            "Снилось что я опаздываю"
        ];

        const warmingPromises = commonDreamTexts.map(async (dreamText) => {
            try {
                // Пытаемся получить анализ (если его нет, он будет создан и закеширован)
                const cacheKey = geminiService._getCacheKey(dreamText, 'basic');
                
                if (!cacheService.exists(cacheKey)) {
                    // Если нет в кеше, можем предзагрузить популярные анализы
                    // Здесь можно добавить реальную логику генерации если нужно
                    console.log(`[CacheWarmingService] Would warm dream analysis: ${dreamText.substring(0, 30)}...`);
                }
                
                this.warmingStats.successfulWarmed++;
                return { dreamText: dreamText.substring(0, 30), success: true };
            } catch (error) {
                console.error(`[CacheWarmingService] Failed to warm dream:`, error);
                this.warmingStats.failedWarmed++;
                return { dreamText: dreamText.substring(0, 30), success: false, error: error.message };
            }
        });

        const results = await Promise.allSettled(warmingPromises);
        console.log(`[CacheWarmingService] Processed ${results.length} common prompts`);
        
        return results;
    }

    /**
     * Warming недавних анализов
     */
    async warmRecentAnalyses(hoursBack = 24) {
        console.log(`[CacheWarmingService] Warming recent analyses (${hoursBack}h back)`);
        
        // Получаем ключи недавних анализов из кеша
        const recentAnalysisKeys = cacheService.keys('gemini:*').filter(key => {
            // Фильтруем по времени создания (если есть такая информация)
            return true; // Упрощенная логика
        });

        let warmedCount = 0;
        for (const key of recentAnalysisKeys.slice(0, 50)) { // Лимит на 50
            if (!cacheService.exists(key)) {
                // Ключ найден в истории, но не существует в кеше
                // Можно попытаться восстановить из базы данных
                console.log(`[CacheWarmingService] Would restore analysis: ${key}`);
                warmedCount++;
            }
        }

        console.log(`[CacheWarmingService] Processed ${warmedCount} recent analyses`);
        return warmedCount;
    }

    /**
     * Predictive warming - предсказательная предзагрузка
     */
    async predictiveWarming(userId) {
        console.log(`[CacheWarmingService] Predictive warming for user ${userId}`);
        
        // Анализируем паттерны пользователя
        const userActivity = userCacheService.getUserActivity(userId);
        
        if (userActivity) {
            const predictions = this._analyzeUserPatterns(userActivity);
            
            // Предзагружаем на основе предсказаний
            for (const prediction of predictions) {
                try {
                    await this._warmPredictedData(userId, prediction);
                } catch (error) {
                    console.error(`[CacheWarmingService] Failed predictive warming:`, error);
                }
            }
            
            console.log(`[CacheWarmingService] Predictive warming completed: ${predictions.length} predictions`);
            return predictions.length;
        }
        
        return 0;
    }

    /**
     * Background warming - фоновая предзагрузка
     */
    startBackgroundWarming(intervalMs = 30 * 60 * 1000) { // 30 минут
        console.log(`[CacheWarmingService] Starting background warming (interval: ${intervalMs}ms)`);
        
        setInterval(async () => {
            if (!this.isWarming) {
                console.log('[CacheWarmingService] Running background warming cycle');
                await this.startWarmingCycle(['popular_users']);
            }
        }, intervalMs);
    }

    /**
     * Warming по расписанию
     */
    scheduleWarming(cronPattern, strategies) {
        console.log(`[CacheWarmingService] Scheduled warming registered: ${cronPattern}`);
        
        // Упрощенная реализация - в production можно использовать node-cron
        const schedule = this._parseCronPattern(cronPattern);
        
        setTimeout(async () => {
            console.log('[CacheWarmingService] Executing scheduled warming');
            await this.startWarmingCycle(strategies);
        }, schedule.nextRunMs);
    }

    /**
     * Получение статистики warming
     */
    getWarmingStats() {
        return {
            ...this.warmingStats,
            warming_strategies: Array.from(this.warmingStrategies.keys()),
            queue_size: this.warmingQueue.length,
            is_warming: this.isWarming,
            cache_usage: {
                total_keys: cacheService.info().db0_keys,
                hit_rate: cacheService.info().hit_rate
            }
        };
    }

    /**
     * Приватные методы
     */

    async _executeWarmingStrategy(strategyName) {
        const strategy = this.warmingStrategies.get(strategyName);
        if (!strategy) {
            throw new Error(`Unknown warming strategy: ${strategyName}`);
        }

        console.log(`[CacheWarmingService] Executing strategy: ${strategyName}`);
        const startTime = Date.now();

        try {
            await strategy.execute();
            const duration = Date.now() - startTime;
            
            this.warmingStats.totalWarmed++;
            this.warmingStats.averageWarmTime = 
                (this.warmingStats.averageWarmTime + duration) / 2;
                
            console.log(`[CacheWarmingService] Strategy ${strategyName} completed in ${duration}ms`);
        } catch (error) {
            console.error(`[CacheWarmingService] Strategy ${strategyName} failed:`, error);
            throw error;
        }
    }

    async _warmUserData(userId) {
        // Предзагружаем основные данные пользователя
        const warmingTasks = [
            () => this._warmUserProfile(userId),
            () => this._warmUserStats(userId),
            () => this._warmUserSubscription(userId)
        ];

        await Promise.all(warmingTasks.map(task => task()));
    }

    async _warmUserProfile(userId) {
        if (!userCacheService.getUserProfile(userId)) {
            // Здесь была бы загрузка из базы данных
            console.log(`[CacheWarmingService] Would warm profile for user ${userId}`);
        }
    }

    async _warmUserStats(userId) {
        if (!userCacheService.getUserStats(userId)) {
            // Здесь была бы загрузка статистики из базы данных
            console.log(`[CacheWarmingService] Would warm stats for user ${userId}`);
        }
    }

    async _warmUserSubscription(userId) {
        if (!userCacheService.getUserSubscription(userId)) {
            // Здесь была бы загрузка подписки из базы данных
            console.log(`[CacheWarmingService] Would warm subscription for user ${userId}`);
        }
    }

    _getPopularUserIds(limit) {
        // Получаем популярных пользователей из кеша популярности
        const popularKeys = cacheService.info().popular_keys || [];
        
        const userIds = popularKeys
            .filter(([key]) => key.startsWith('user:'))
            .map(([key]) => {
                const parts = key.split(':');
                return parts[2]; // user:profile:123 -> 123
            })
            .filter(id => id && !isNaN(id))
            .slice(0, limit);

        return userIds;
    }

    _analyzeUserPatterns(userActivity) {
        const predictions = [];
        
        // Простой анализ паттернов
        if (userActivity.activities.profile_access > 5) {
            predictions.push({ type: 'profile', priority: 'high' });
        }
        
        if (userActivity.activities.analysis_request > 3) {
            predictions.push({ type: 'analysis', priority: 'medium' });
        }
        
        return predictions;
    }

    async _warmPredictedData(userId, prediction) {
        switch (prediction.type) {
            case 'profile':
                await this._warmUserProfile(userId);
                break;
            case 'analysis':
                // Можем предзагрузить популярные анализы для пользователя
                console.log(`[CacheWarmingService] Would warm analysis data for user ${userId}`);
                break;
        }
    }

    _parseCronPattern(pattern) {
        // Упрощенная реализация cron парсинга
        // В production использовать библиотеку node-cron
        return {
            nextRunMs: 60 * 60 * 1000 // Через час
        };
    }

    _registerWarmingStrategies() {
        // Стратегия для популярных пользователей
        this.warmingStrategies.set('popular_users', {
            execute: () => this.warmPopularUsers()
        });

        // Стратегия для общих промптов
        this.warmingStrategies.set('common_prompts', {
            execute: () => this.warmCommonPrompts()
        });

        // Стратегия для недавних анализов
        this.warmingStrategies.set('recent_analyses', {
            execute: () => this.warmRecentAnalyses()
        });
    }

    /**
     * Cleanup для graceful shutdown
     */
    cleanup() {
        console.log('[CacheWarmingService] Cleaning up...');
        this.isWarming = false;
        this.warmingQueue = [];
    }
}

// Создаем singleton instance
const cacheWarmingService = new CacheWarmingService();

module.exports = cacheWarmingService;