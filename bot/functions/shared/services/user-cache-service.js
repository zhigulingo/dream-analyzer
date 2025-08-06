// bot/functions/shared/services/user-cache-service.js
// Сервис для кеширования данных пользователей

const cacheService = require('./cache-service');

/**
 * Сервис для кеширования пользовательских данных
 * Обеспечивает быстрый доступ к профилям пользователей и их настройкам
 */
class UserCacheService {
    constructor() {
        this.cache = cacheService;
        this.userProfileTTL = 30 * 60 * 1000; // 30 минут для профилей
        this.userStatsTTL = 5 * 60 * 1000; // 5 минут для статистики
        this.subscriptionTTL = 60 * 60 * 1000; // 1 час для подписок
        
        console.log('[UserCacheService] Initialized');
    }

    /**
     * Кеширование профиля пользователя
     */
    cacheUserProfile(userId, profileData) {
        const cacheKey = this._getUserProfileKey(userId);
        return this.cache.setWithTags(
            cacheKey, 
            profileData, 
            this.userProfileTTL,
            ['user-profile', `user-${userId}`]
        );
    }

    /**
     * Получение профиля пользователя из кеша
     */
    getUserProfile(userId) {
        const cacheKey = this._getUserProfileKey(userId);
        return this.cache.get(cacheKey);
    }

    /**
     * Кеширование статистики пользователя
     */
    cacheUserStats(userId, statsData) {
        const cacheKey = this._getUserStatsKey(userId);
        return this.cache.setWithTags(
            cacheKey,
            statsData,
            this.userStatsTTL,
            ['user-stats', `user-${userId}`]
        );
    }

    /**
     * Получение статистики пользователя из кеша
     */
    getUserStats(userId) {
        const cacheKey = this._getUserStatsKey(userId);
        return this.cache.get(cacheKey);
    }

    /**
     * Кеширование данных подписки пользователя
     */
    cacheUserSubscription(userId, subscriptionData) {
        const cacheKey = this._getUserSubscriptionKey(userId);
        return this.cache.setWithTags(
            cacheKey,
            subscriptionData,
            this.subscriptionTTL,
            ['user-subscription', `user-${userId}`]
        );
    }

    /**
     * Получение данных подписки пользователя из кеша
     */
    getUserSubscription(userId) {
        const cacheKey = this._getUserSubscriptionKey(userId);
        return this.cache.get(cacheKey);
    }

    /**
     * Кеширование токенов пользователя
     */
    cacheUserTokens(userId, tokenData) {
        const cacheKey = this._getUserTokensKey(userId);
        return this.cache.setWithTags(
            cacheKey,
            tokenData,
            this.userStatsTTL, // Короткий TTL для токенов (часто меняются)
            ['user-tokens', `user-${userId}`]
        );
    }

    /**
     * Получение токенов пользователя из кеша
     */
    getUserTokens(userId) {
        const cacheKey = this._getUserTokensKey(userId);
        return this.cache.get(cacheKey);
    }

    /**
     * Кеширование полных данных пользователя (агрегированные)
     */
    cacheFullUserData(userId, userData) {
        const cacheKey = this._getFullUserDataKey(userId);
        return this.cache.setWithTags(
            cacheKey,
            userData,
            this.userProfileTTL,
            ['user-full', `user-${userId}`]
        );
    }

    /**
     * Получение полных данных пользователя из кеша
     */
    getFullUserData(userId) {
        const cacheKey = this._getFullUserDataKey(userId);
        return this.cache.get(cacheKey);
    }

    /**
     * Инвалидация всех данных пользователя
     */
    invalidateUser(userId) {
        console.log(`[UserCacheService] Invalidating all data for user ${userId}`);
        return this.cache.invalidateTag(`user-${userId}`);
    }

    /**
     * Инвалидация профиля пользователя
     */
    invalidateUserProfile(userId) {
        const cacheKey = this._getUserProfileKey(userId);
        return this.cache.delete(cacheKey);
    }

    /**
     * Инвалидация статистики пользователя
     */
    invalidateUserStats(userId) {
        const cacheKey = this._getUserStatsKey(userId);
        return this.cache.delete(cacheKey);
    }

    /**
     * Инвалидация подписки пользователя
     */
    invalidateUserSubscription(userId) {
        const cacheKey = this._getUserSubscriptionKey(userId);
        return this.cache.delete(cacheKey);
    }

    /**
     * Инвалидация токенов пользователя
     */
    invalidateUserTokens(userId) {
        const cacheKey = this._getUserTokensKey(userId);
        return this.cache.delete(cacheKey);
    }

    /**
     * Инвалидация всех профилей пользователей
     */
    invalidateAllProfiles() {
        console.log('[UserCacheService] Invalidating all user profiles');
        return this.cache.invalidateTag('user-profile');
    }

    /**
     * Инвалидация всех подписок
     */
    invalidateAllSubscriptions() {
        console.log('[UserCacheService] Invalidating all user subscriptions');
        return this.cache.invalidateTag('user-subscription');
    }

    /**
     * Предзагрузка популярных пользователей
     */
    async warmPopularUsers(userIds) {
        console.log(`[UserCacheService] Warming cache for ${userIds.length} popular users`);
        
        // Здесь можно добавить логику для предзагрузки данных популярных пользователей
        // Например, из базы данных
        
        for (const userId of userIds) {
            // Проверяем, есть ли данные в кеше
            if (!this.getUserProfile(userId)) {
                console.log(`[UserCacheService] Would warm user ${userId} profile`);
                // Здесь была бы загрузка из БД
            }
        }
    }

    /**
     * Пакетная инвалидация пользователей
     */
    invalidateUsers(userIds) {
        console.log(`[UserCacheService] Batch invalidating ${userIds.length} users`);
        let totalInvalidated = 0;
        
        userIds.forEach(userId => {
            totalInvalidated += this.invalidateUser(userId);
        });
        
        return totalInvalidated;
    }

    /**
     * Получение статистики кеша пользователей
     */
    getUserCacheStats() {
        const baseStats = this.cache.info();
        
        return {
            ...baseStats,
            user_specific: {
                profile_keys: this.cache.keys('user:profile:*').length,
                stats_keys: this.cache.keys('user:stats:*').length,
                subscription_keys: this.cache.keys('user:subscription:*').length,
                tokens_keys: this.cache.keys('user:tokens:*').length,
                full_data_keys: this.cache.keys('user:full:*').length
            },
            ttl_settings: {
                profile_ttl_ms: this.userProfileTTL,
                stats_ttl_ms: this.userStatsTTL,
                subscription_ttl_ms: this.subscriptionTTL
            }
        };
    }

    /**
     * Мониторинг активности пользователей
     */
    trackUserActivity(userId, activityType) {
        const activityKey = `user:activity:${userId}`;
        const currentActivity = this.cache.get(activityKey) || {
            lastSeen: Date.now(),
            activities: {}
        };
        
        currentActivity.lastSeen = Date.now();
        currentActivity.activities[activityType] = (currentActivity.activities[activityType] || 0) + 1;
        
        // Сохраняем активность на короткое время
        this.cache.set(activityKey, currentActivity, 24 * 60 * 60 * 1000); // 24 часа
    }

    /**
     * Получение активности пользователя
     */
    getUserActivity(userId) {
        const activityKey = `user:activity:${userId}`;
        return this.cache.get(activityKey);
    }

    /**
     * Приватные методы для генерации ключей
     */

    _getUserProfileKey(userId) {
        return `user:profile:${userId}`;
    }

    _getUserStatsKey(userId) {
        return `user:stats:${userId}`;
    }

    _getUserSubscriptionKey(userId) {
        return `user:subscription:${userId}`;
    }

    _getUserTokensKey(userId) {
        return `user:tokens:${userId}`;
    }

    _getFullUserDataKey(userId) {
        return `user:full:${userId}`;
    }

    /**
     * Утилиты для работы с кешем
     */

    /**
     * Получение или установка данных с fallback функцией
     */
    async getOrSet(cacheKey, fallbackFunction, ttl = null, tags = []) {
        let data = this.cache.get(cacheKey);
        
        if (data === null) {
            try {
                data = await fallbackFunction();
                if (data !== null && data !== undefined) {
                    this.cache.setWithTags(cacheKey, data, ttl || this.userProfileTTL, tags);
                }
            } catch (error) {
                console.error(`[UserCacheService] Error in fallback function for key ${cacheKey}:`, error);
                return null;
            }
        }
        
        return data;
    }

    /**
     * Очистка всех данных пользователей
     */
    clearAllUserData() {
        const patterns = [
            'user:profile:*',
            'user:stats:*',
            'user:subscription:*',
            'user:tokens:*',
            'user:full:*',
            'user:activity:*'
        ];
        
        let totalCleared = 0;
        patterns.forEach(pattern => {
            totalCleared += this.cache.invalidatePattern(pattern);
        });
        
        console.log(`[UserCacheService] Cleared ${totalCleared} user-related cache entries`);
        return totalCleared;
    }
}

// Создаем singleton instance
const userCacheService = new UserCacheService();

module.exports = userCacheService;