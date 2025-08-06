// bot/functions/shared/services/cache-service.js
// Redis-совместимый memory cache сервис

/**
 * Redis-совместимый Memory Cache Service
 * Поддерживает TTL, различные типы данных, мониторинг и warming
 */
class CacheService {
    constructor(options = {}) {
        this.cache = new Map();
        this.ttlMap = new Map(); // Хранит timestamp + TTL для каждого ключа
        this.defaultTTL = options.defaultTTL || 3600000; // 1 час по умолчанию
        this.maxSize = options.maxSize || 10000; // Максимальный размер кеша
        this.cleanupInterval = options.cleanupInterval || 300000; // 5 минут
        
        // Статистика
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            startTime: Date.now()
        };
        
        // Популярные ключи для warming
        this.popularKeys = new Map(); // key -> count
        this.warmingEnabled = options.enableWarming || false;
        
        // Запускаем периодическую очистку
        this.startCleanupTimer();
        
        console.log('[CacheService] Initialized with options:', {
            defaultTTL: this.defaultTTL,
            maxSize: this.maxSize,
            warmingEnabled: this.warmingEnabled
        });
    }

    /**
     * Установить значение с TTL (Redis-совместимый API)
     */
    set(key, value, ttl = null) {
        try {
            // Проверяем размер кеша
            if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
                this._evictLRU();
            }

            const actualTTL = ttl || this.defaultTTL;
            const expirationTime = Date.now() + actualTTL;
            
            this.cache.set(key, {
                value,
                accessTime: Date.now(),
                setTime: Date.now()
            });
            
            this.ttlMap.set(key, expirationTime);
            this.stats.sets++;
            
            // Обновляем популярность ключа
            if (this.warmingEnabled) {
                this._updatePopularity(key);
            }
            
            return true;
        } catch (error) {
            console.error('[CacheService] Error setting key:', key, error);
            return false;
        }
    }

    /**
     * Получить значение (Redis-совместимый API)
     */
    get(key) {
        try {
            // Проверяем TTL
            if (this._isExpired(key)) {
                this.delete(key);
                this.stats.misses++;
                return null;
            }

            const item = this.cache.get(key);
            if (item) {
                // Обновляем время доступа для LRU
                item.accessTime = Date.now();
                this.stats.hits++;
                
                // Обновляем популярность ключа
                if (this.warmingEnabled) {
                    this._updatePopularity(key);
                }
                
                return item.value;
            }
            
            this.stats.misses++;
            return null;
        } catch (error) {
            console.error('[CacheService] Error getting key:', key, error);
            this.stats.misses++;
            return null;
        }
    }

    /**
     * Удалить ключ (Redis-совместимый API)
     */
    delete(key) {
        try {
            const deleted = this.cache.delete(key);
            this.ttlMap.delete(key);
            
            if (deleted) {
                this.stats.deletes++;
            }
            
            return deleted;
        } catch (error) {
            console.error('[CacheService] Error deleting key:', key, error);
            return false;
        }
    }

    /**
     * Проверить существование ключа (Redis-совместимый API)
     */
    exists(key) {
        if (this._isExpired(key)) {
            this.delete(key);
            return false;
        }
        return this.cache.has(key);
    }

    /**
     * Установить TTL для существующего ключа (Redis-совместимый API)
     */
    expire(key, ttl) {
        if (!this.cache.has(key)) {
            return false;
        }
        
        const expirationTime = Date.now() + ttl;
        this.ttlMap.set(key, expirationTime);
        return true;
    }

    /**
     * Получить TTL ключа в миллисекундах (Redis-совместимый API)
     */
    ttl(key) {
        const expirationTime = this.ttlMap.get(key);
        if (!expirationTime) {
            return -1; // Ключ не существует или не имеет TTL
        }
        
        const remaining = expirationTime - Date.now();
        return remaining > 0 ? remaining : -2; // -2 означает истекший
    }

    /**
     * Получить все ключи по паттерну (упрощенная версия Redis KEYS)
     */
    keys(pattern = '*') {
        const allKeys = Array.from(this.cache.keys());
        
        if (pattern === '*') {
            return allKeys.filter(key => !this._isExpired(key));
        }
        
        // Простая поддержка wildcard
        const regex = new RegExp(
            pattern
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.')
        );
        
        return allKeys.filter(key => 
            !this._isExpired(key) && regex.test(key)
        );
    }

    /**
     * Очистить весь кеш (Redis-совместимый API)
     */
    flushall() {
        const size = this.cache.size;
        this.cache.clear();
        this.ttlMap.clear();
        this.popularKeys.clear();
        
        console.log(`[CacheService] Cleared ${size} cached items`);
        return size;
    }

    /**
     * Получить информацию о кеше (Redis-совместимый INFO)
     */
    info() {
        const now = Date.now();
        const uptime = now - this.stats.startTime;
        const totalOperations = this.stats.hits + this.stats.misses;
        const hitRate = totalOperations > 0 ? (this.stats.hits / totalOperations * 100).toFixed(2) : 0;
        
        return {
            // Основная информация
            version: '1.0.0',
            uptime_seconds: Math.floor(uptime / 1000),
            
            // Память
            used_memory: this._calculateMemoryUsage(),
            used_memory_human: this._formatBytes(this._calculateMemoryUsage()),
            max_memory: this.maxSize,
            
            // Статистика
            total_commands_processed: this.stats.sets + this.stats.deletes,
            keyspace_hits: this.stats.hits,
            keyspace_misses: this.stats.misses,
            hit_rate: `${hitRate}%`,
            
            // Ключи
            db0_keys: this.cache.size,
            db0_expires: this.ttlMap.size,
            
            // Кастомная статистика
            evictions: this.stats.evictions,
            popular_keys: this.warmingEnabled ? Array.from(this.popularKeys.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10) : []
        };
    }

    /**
     * Cache invalidation по паттернам
     */
    invalidatePattern(pattern) {
        const keysToDelete = this.keys(pattern);
        let deletedCount = 0;
        
        keysToDelete.forEach(key => {
            if (this.delete(key)) {
                deletedCount++;
            }
        });
        
        console.log(`[CacheService] Invalidated ${deletedCount} keys matching pattern: ${pattern}`);
        return deletedCount;
    }

    /**
     * Cache invalidation по тегам
     */
    setWithTags(key, value, ttl = null, tags = []) {
        const success = this.set(key, value, ttl);
        
        if (success && tags.length > 0) {
            // Сохраняем теги отдельно
            tags.forEach(tag => {
                const tagKey = `tag:${tag}`;
                const taggedKeys = this.get(tagKey) || [];
                if (!taggedKeys.includes(key)) {
                    taggedKeys.push(key);
                    this.set(tagKey, taggedKeys, ttl);
                }
            });
        }
        
        return success;
    }

    /**
     * Инвалидация по тегу
     */
    invalidateTag(tag) {
        const tagKey = `tag:${tag}`;
        const taggedKeys = this.get(tagKey) || [];
        let deletedCount = 0;
        
        taggedKeys.forEach(key => {
            if (this.delete(key)) {
                deletedCount++;
            }
        });
        
        this.delete(tagKey);
        
        console.log(`[CacheService] Invalidated ${deletedCount} keys with tag: ${tag}`);
        return deletedCount;
    }

    /**
     * Cache warming - предзагрузка популярных ключей
     */
    async warmCache(warmingFunction) {
        if (!this.warmingEnabled) {
            console.log('[CacheService] Warming disabled');
            return;
        }

        const popularKeysList = Array.from(this.popularKeys.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50) // Топ 50 популярных ключей
            .map(([key]) => key);

        console.log(`[CacheService] Starting cache warming for ${popularKeysList.length} popular keys`);

        for (const key of popularKeysList) {
            try {
                if (!this.exists(key)) {
                    await warmingFunction(key);
                }
            } catch (error) {
                console.error(`[CacheService] Error warming key ${key}:`, error);
            }
        }

        console.log('[CacheService] Cache warming completed');
    }

    /**
     * Приватные методы
     */

    _isExpired(key) {
        const expirationTime = this.ttlMap.get(key);
        if (!expirationTime) {
            return false; // Нет TTL - не истекает
        }
        return Date.now() > expirationTime;
    }

    _evictLRU() {
        // Находим самый старый элемент по времени доступа
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, item] of this.cache.entries()) {
            if (item.accessTime < oldestTime) {
                oldestTime = item.accessTime;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.delete(oldestKey);
            this.stats.evictions++;
            console.log(`[CacheService] Evicted LRU key: ${oldestKey}`);
        }
    }

    _updatePopularity(key) {
        const currentCount = this.popularKeys.get(key) || 0;
        this.popularKeys.set(key, currentCount + 1);
        
        // Ограничиваем размер популярных ключей
        if (this.popularKeys.size > 1000) {
            const entries = Array.from(this.popularKeys.entries());
            entries.sort((a, b) => b[1] - a[1]);
            
            this.popularKeys.clear();
            entries.slice(0, 500).forEach(([k, v]) => {
                this.popularKeys.set(k, v);
            });
        }
    }

    _calculateMemoryUsage() {
        // Приблизительный подсчет использования памяти
        let totalSize = 0;
        
        for (const [key, value] of this.cache.entries()) {
            totalSize += key.length * 2; // UTF-16
            totalSize += JSON.stringify(value).length * 2;
        }
        
        return totalSize;
    }

    _formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    startCleanupTimer() {
        setInterval(() => {
            this._cleanup();
        }, this.cleanupInterval);
    }

    _cleanup() {
        const before = this.cache.size;
        let cleaned = 0;

        // Удаляем истекшие ключи
        for (const key of this.cache.keys()) {
            if (this._isExpired(key)) {
                this.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[CacheService] Cleanup: removed ${cleaned} expired keys (${before} -> ${this.cache.size})`);
        }
    }

    /**
     * Graceful shutdown
     */
    shutdown() {
        console.log('[CacheService] Shutting down...');
        this.flushall();
    }
}

// Создаем singleton instance
const cacheService = new CacheService({
    defaultTTL: 3600000, // 1 час
    maxSize: 10000,
    enableWarming: true,
    cleanupInterval: 300000 // 5 минут
});

module.exports = cacheService;