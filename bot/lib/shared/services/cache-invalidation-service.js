// bot/functions/shared/services/cache-invalidation-service.js
// Сервис для управления инвалидацией кеша

const cacheService = require('./cache-service');
const userCacheService = require('./user-cache-service');
const geminiService = require('./gemini-service');

/**
 * Сервис для управления стратегиями инвалидации кеша
 * Координирует инвалидацию между различными типами кеша
 */
class CacheInvalidationService {
    constructor() {
        this.invalidationRules = new Map();
        this.scheduleCallbacks = new Map();
        
        // Регистрируем базовые правила инвалидации
        this._registerInvalidationRules();
        
        console.log('[CacheInvalidationService] Initialized with invalidation rules');
    }

    /**
     * Инвалидация кеша при событиях пользователя
     */
    async invalidateOnUserEvent(userId, eventType, eventData = {}) {
        console.log(`[CacheInvalidationService] Processing user event: ${eventType} for user ${userId}`);
        
        switch (eventType) {
            case 'user_updated':
                return this._invalidateUserData(userId);
                
            case 'subscription_changed':
                return this._invalidateUserSubscription(userId);
                
            case 'tokens_changed':
                return this._invalidateUserTokens(userId);
                
            case 'analysis_completed':
                return this._invalidateUserStats(userId);
                
            case 'payment_processed':
                return this._invalidateUserSubscriptionAndTokens(userId);
                
            case 'deep_analysis_purchased':
                return this._invalidateUserCredits(userId);
                
            default:
                console.warn(`[CacheInvalidationService] Unknown event type: ${eventType}`);
                return 0;
        }
    }

    /**
     * Инвалидация кеша при системных событиях
     */
    async invalidateOnSystemEvent(eventType, eventData = {}) {
        console.log(`[CacheInvalidationService] Processing system event: ${eventType}`);
        
        switch (eventType) {
            case 'model_updated':
                return this._invalidateGeminiCache();
                
            case 'prompts_updated':
                return this._invalidateGeminiByPromptType(eventData.promptType);
                
            case 'subscription_plans_changed':
                return this._invalidateAllSubscriptions();
                
            case 'maintenance_mode':
                return this._invalidateAllCaches();
                
            case 'data_migration':
                return this._invalidateSpecificPattern(eventData.pattern);
                
            default:
                console.warn(`[CacheInvalidationService] Unknown system event: ${eventType}`);
                return 0;
        }
    }

    /**
     * Time-based инвалидация (TTL-based)
     */
    scheduleInvalidation(key, delay, reason = 'scheduled') {
        console.log(`[CacheInvalidationService] Scheduling invalidation for key ${key} in ${delay}ms (${reason})`);
        
        const timeoutId = setTimeout(() => {
            console.log(`[CacheInvalidationService] Executing scheduled invalidation for key: ${key}`);
            cacheService.delete(key);
            this.scheduleCallbacks.delete(key);
        }, delay);
        
        // Сохраняем callback для возможной отмены
        this.scheduleCallbacks.set(key, {
            timeoutId,
            reason,
            scheduledAt: Date.now(),
            executeAt: Date.now() + delay
        });
        
        return timeoutId;
    }

    /**
     * Отмена запланированной инвалидации
     */
    cancelScheduledInvalidation(key) {
        const scheduled = this.scheduleCallbacks.get(key);
        if (scheduled) {
            clearTimeout(scheduled.timeoutId);
            this.scheduleCallbacks.delete(key);
            console.log(`[CacheInvalidationService] Cancelled scheduled invalidation for key: ${key}`);
            return true;
        }
        return false;
    }

    /**
     * Bulk инвалидация по списку ключей
     */
    bulkInvalidate(keys, reason = 'bulk operation') {
        console.log(`[CacheInvalidationService] Bulk invalidating ${keys.length} keys (${reason})`);
        
        let invalidatedCount = 0;
        keys.forEach(key => {
            if (cacheService.delete(key)) {
                invalidatedCount++;
            }
        });
        
        console.log(`[CacheInvalidationService] Bulk invalidation completed: ${invalidatedCount}/${keys.length} keys`);
        return invalidatedCount;
    }

    /**
     * Conditional инвалидация (с проверкой условий)
     */
    conditionalInvalidate(pattern, conditionFn, reason = 'conditional') {
        console.log(`[CacheInvalidationService] Conditional invalidation for pattern: ${pattern}`);
        
        const matchingKeys = cacheService.keys(pattern);
        const keysToInvalidate = [];
        
        matchingKeys.forEach(key => {
            const value = cacheService.get(key);
            if (value && conditionFn(key, value)) {
                keysToInvalidate.push(key);
            }
        });
        
        return this.bulkInvalidate(keysToInvalidate, reason);
    }

    /**
     * Cascade инвалидация (цепочная инвалидация связанных данных)
     */
    cascadeInvalidate(userId, cascadeRules = []) {
        console.log(`[CacheInvalidationService] Cascade invalidation for user ${userId}`);
        
        let totalInvalidated = 0;
        
        // Базовая инвалидация пользователя
        totalInvalidated += userCacheService.invalidateUser(userId);
        
        // Применяем каскадные правила
        cascadeRules.forEach(rule => {
            switch (rule.type) {
                case 'related_users':
                    rule.userIds.forEach(relatedUserId => {
                        totalInvalidated += userCacheService.invalidateUser(relatedUserId);
                    });
                    break;
                    
                case 'pattern':
                    totalInvalidated += cacheService.invalidatePattern(rule.pattern);
                    break;
                    
                case 'tag':
                    totalInvalidated += cacheService.invalidateTag(rule.tag);
                    break;
            }
        });
        
        console.log(`[CacheInvalidationService] Cascade invalidation completed: ${totalInvalidated} keys`);
        return totalInvalidated;
    }

    /**
     * Получение статистики инвалидации
     */
    getInvalidationStats() {
        return {
            scheduled_invalidations: this.scheduleCallbacks.size,
            invalidation_rules: this.invalidationRules.size,
            pending_invalidations: Array.from(this.scheduleCallbacks.entries()).map(([key, data]) => ({
                key,
                reason: data.reason,
                scheduledAt: data.scheduledAt,
                executeAt: data.executeAt,
                remainingMs: data.executeAt - Date.now()
            }))
        };
    }

    /**
     * Приватные методы для специфичных инвалидаций
     */

    _invalidateUserData(userId) {
        return userCacheService.invalidateUser(userId);
    }

    _invalidateUserSubscription(userId) {
        return userCacheService.invalidateUserSubscription(userId);
    }

    _invalidateUserTokens(userId) {
        return userCacheService.invalidateUserTokens(userId);
    }

    _invalidateUserStats(userId) {
        return userCacheService.invalidateUserStats(userId);
    }

    _invalidateUserSubscriptionAndTokens(userId) {
        let count = 0;
        count += userCacheService.invalidateUserSubscription(userId);
        count += userCacheService.invalidateUserTokens(userId);
        count += userCacheService.invalidateUserProfile(userId);
        return count;
    }

    _invalidateUserCredits(userId) {
        return userCacheService.invalidateUserProfile(userId);
    }

    _invalidateGeminiCache() {
        return geminiService.clearCache();
    }

    _invalidateGeminiByPromptType(promptType) {
        return geminiService.invalidateCache(promptType);
    }

    _invalidateAllSubscriptions() {
        return userCacheService.invalidateAllSubscriptions();
    }

    _invalidateAllCaches() {
        let total = 0;
        total += cacheService.flushall();
        console.log(`[CacheInvalidationService] All caches invalidated: ${total} keys`);
        return total;
    }

    _invalidateSpecificPattern(pattern) {
        return cacheService.invalidatePattern(pattern);
    }

    /**
     * Регистрация правил инвалидации
     */
    _registerInvalidationRules() {
        // Правило: при изменении пользователя инвалидируем связанные данные
        this.invalidationRules.set('user_update', {
            patterns: ['user:*', 'gemini:*'],
            condition: 'user_modified',
            action: 'invalidate_user_data'
        });
        
        // Правило: при изменении подписки инвалидируем профиль
        this.invalidationRules.set('subscription_update', {
            patterns: ['user:subscription:*', 'user:profile:*'],
            condition: 'subscription_modified',
            action: 'invalidate_subscription_data'
        });
        
        // Правило: при обновлении модели Gemini очищаем все анализы
        this.invalidationRules.set('model_update', {
            patterns: ['gemini:*'],
            condition: 'model_changed',
            action: 'clear_analysis_cache'
        });
    }

    /**
     * Интеллектуальная инвалидация на основе паттернов использования
     */
    smartInvalidate(userId, context = {}) {
        console.log(`[CacheInvalidationService] Smart invalidation for user ${userId}`);
        
        // Получаем активность пользователя
        const userActivity = userCacheService.getUserActivity(userId);
        let totalInvalidated = 0;
        
        if (userActivity) {
            // Инвалидируем только часто используемые данные
            if (userActivity.activities.profile_access > 10) {
                totalInvalidated += userCacheService.invalidateUserProfile(userId);
            }
            
            if (userActivity.activities.analysis_request > 5) {
                totalInvalidated += this._invalidateUserStats(userId);
            }
            
            // Если последняя активность была давно, инвалидируем все
            const lastSeen = userActivity.lastSeen;
            const hoursSinceLastSeen = (Date.now() - lastSeen) / (1000 * 60 * 60);
            
            if (hoursSinceLastSeen > 24) {
                totalInvalidated += userCacheService.invalidateUser(userId);
            }
        } else {
            // Нет данных об активности - стандартная инвалидация
            totalInvalidated += userCacheService.invalidateUser(userId);
        }
        
        console.log(`[CacheInvalidationService] Smart invalidation completed: ${totalInvalidated} keys`);
        return totalInvalidated;
    }

    /**
     * Cleanup метод для graceful shutdown
     */
    cleanup() {
        console.log('[CacheInvalidationService] Cleaning up scheduled invalidations...');
        
        // Отменяем все запланированные инвалидации
        for (const [key, scheduled] of this.scheduleCallbacks.entries()) {
            clearTimeout(scheduled.timeoutId);
        }
        
        this.scheduleCallbacks.clear();
        console.log('[CacheInvalidationService] Cleanup completed');
    }
}

// Создаем singleton instance
const cacheInvalidationService = new CacheInvalidationService();

module.exports = cacheInvalidationService;