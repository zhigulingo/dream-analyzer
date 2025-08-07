// bot/functions/shared/database/queries.js
// Централизованные оптимизированные запросы к базе данных

const { createClient } = require("@supabase/supabase-js");

/**
 * Конфигурация connection pooling для Supabase
 */
const CONNECTION_CONFIG = {
    auth: { 
        autoRefreshToken: false, 
        persistSession: false 
    },
    db: {
        schema: 'public'
    },
    // Настройки для оптимизации производительности
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
};

/**
 * Создает клиент Supabase с оптимизированной конфигурацией
 */
function createOptimizedClient(url, key) {
    return createClient(url, key, CONNECTION_CONFIG);
}

/**
 * Prepared statements для основных операций
 */
const PREPARED_QUERIES = {
    // Получение пользователя с кредитами и количеством снов (JOIN)
    getUserWithDreamStats: `
        SELECT 
            u.id,
            u.deep_analysis_credits,
            u.subscription_type,
            u.subscription_end,
            u.tokens,
            COUNT(a.id) as dreams_count
        FROM users u
        LEFT JOIN analyses a ON u.id = a.user_id
        WHERE u.tg_id = $1
        GROUP BY u.id, u.deep_analysis_credits, u.subscription_type, u.subscription_end, u.tokens
    `,
    
    // Получение последних снов пользователя
    getUserDreams: `
        SELECT dream_text, created_at
        FROM analyses
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
    `,
    
    // Получение пользователя с полной информацией для профиля
    getUserProfile: `
        SELECT 
            u.id,
            u.tokens,
            u.subscription_type,
            u.subscription_end,
            u.deep_analysis_credits,
            u.channel_reward_claimed,
            u.last_start_message_id,
            COUNT(a.id) as total_analyses
        FROM users u
        LEFT JOIN analyses a ON u.id = a.user_id
        WHERE u.tg_id = $1
        GROUP BY u.id, u.tokens, u.subscription_type, u.subscription_end, 
                 u.deep_analysis_credits, u.channel_reward_claimed, u.last_start_message_id
    `,
    
    // Получение истории анализов с пагинацией
    getAnalysesHistory: `
        SELECT 
            a.id,
            a.dream_text,
            a.analysis,
            a.created_at
        FROM analyses a
        WHERE a.user_id = $1
        ORDER BY a.created_at DESC
        LIMIT $2 OFFSET $3
    `,
    
    // Атомарное обновление кредитов глубокого анализа
    incrementDeepAnalysisCredits: `
        UPDATE users 
        SET deep_analysis_credits = COALESCE(deep_analysis_credits, 0) + 1
        WHERE tg_id = $1
        RETURNING deep_analysis_credits
    `,
    
    // Атомарное списание кредита с проверкой
    decrementDeepAnalysisCredits: `
        UPDATE users 
        SET deep_analysis_credits = deep_analysis_credits - 1
        WHERE tg_id = $1 AND deep_analysis_credits > 0
        RETURNING deep_analysis_credits
    `
};

/**
 * Класс для выполнения оптимизированных запросов к базе данных
 */
class DatabaseQueries {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Получение пользователя с статистикой снов одним запросом
     * Заменяет множественные SELECT в deep-analysis.js
     */
    async getUserWithDreamStats(tgUserId) {
        console.log(`[DatabaseQueries] Getting user with dream stats for ${tgUserId}`);
        
        const { data, error } = await this.supabase
            .from('users')
            .select(`
                id,
                subscription_type,
                subscription_end,
                tokens,
                analyses!inner(count)
            `)
            .eq('tg_id', tgUserId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw new Error(`Failed to get user with dream stats: ${error.message}`);
        }

        return data;
    }

    /**
     * Получение последних снов пользователя
     */
    async getUserDreams(userDbId, limit = 5) {
        console.log(`[DatabaseQueries] Getting ${limit} dreams for user ${userDbId}`);
        
        const { data, error } = await this.supabase
            .from('analyses')
            .select('dream_text, created_at')
            .eq('user_id', userDbId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            throw new Error(`Failed to get user dreams: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Получение полного профиля пользователя одним запросом
     * Заменяет множественные SELECT в user-profile.js
     */
    async getUserProfile(tgUserId) {
        console.log(`[DatabaseQueries] Getting complete profile for ${tgUserId}`);
        
        // Временно заменяем RPC на простой запрос для диагностики
        console.log(`[DatabaseQueries] Attempting to get user profile for tgUserId: ${tgUserId}`);
        
        const { data, error } = await this.supabase
            .from('users')
            .select(`
                id,
                tokens,
                subscription_type,
                subscription_end,
                channel_reward_claimed
            `)
            .eq('tg_id', tgUserId)
            .single();
            
        console.log(`[DatabaseQueries] Query result:`, { data: !!data, error: error?.message });

        if (error) {
            throw new Error(`Failed to get user profile: ${error.message}`);
        }

        return data;
    }

    /**
     * Получение истории анализов с пагинацией
     */
    async getAnalysesHistory(userDbId, limit = 50, offset = 0) {
        console.log(`[DatabaseQueries] Getting analyses history for user ${userDbId}`);
        
        const { data, error } = await this.supabase
            .from('analyses')
            .select('id, dream_text, analysis, created_at')
            .eq('user_id', userDbId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            throw new Error(`Failed to get analyses history: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Атомарное добавление кредита глубокого анализа
     * Заменяет fetch+update в UserService
     */
    async incrementDeepAnalysisCredits(tgUserId) {
        console.log(`[DatabaseQueries] Incrementing deep analysis credits for ${tgUserId}`);
        
        const { data, error } = await this.supabase
            .rpc('increment_deep_analysis_credits', { 
                user_tg_id: tgUserId 
            });

        if (error) {
            throw new Error(`Failed to increment credits: ${error.message}`);
        }

        return data;
    }

    /**
     * Атомарное списание кредита глубокого анализа с проверкой
     */
    async decrementDeepAnalysisCredits(tgUserId) {
        console.log(`[DatabaseQueries] Decrementing deep analysis credits for ${tgUserId}`);
        
        const { data, error } = await this.supabase
            .rpc('decrement_deep_analysis_credits_safe', { 
                user_tg_id: tgUserId 
            });

        if (error) {
            throw new Error(`Failed to decrement credits: ${error.message}`);
        }

        return data;
    }

    /**
     * Batch операции для массовых вставок анализов
     */
    async batchInsertAnalyses(analyses) {
        console.log(`[DatabaseQueries] Batch inserting ${analyses.length} analyses`);
        
        const { data, error } = await this.supabase
            .from('analyses')
            .insert(analyses)
            .select();

        if (error) {
            throw new Error(`Failed to batch insert analyses: ${error.message}`);
        }

        return data;
    }

    /**
     * Health check для проверки состояния базы данных
     */
    async healthCheck() {
        try {
            console.log(`[DatabaseQueries] Performing health check`);
            
            // Простой запрос для проверки соединения
            const { data, error } = await this.supabase
                .from('users')
                .select('count', { count: 'exact', head: true });

            if (error) {
                return {
                    status: 'unhealthy',
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }

            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                connection: 'ok'
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

/**
 * SQL функции для создания в базе данных (RPC)
 * Эти функции нужно создать в Supabase для оптимальной работы
 */
const DATABASE_FUNCTIONS = {
    // Функция для получения профиля пользователя со статистикой
    getUserProfileWithStats: `
        CREATE OR REPLACE FUNCTION get_user_profile_with_stats(user_tg_id BIGINT)
        RETURNS TABLE (
            id BIGINT,
            tokens INTEGER,
            subscription_type TEXT,
            subscription_end TIMESTAMP WITH TIME ZONE,
            deep_analysis_credits INTEGER,
            channel_reward_claimed BOOLEAN,
            last_start_message_id BIGINT,
            total_analyses BIGINT
        ) AS $$
        BEGIN
            RETURN QUERY
            SELECT 
                u.id,
                u.tokens,
                u.subscription_type,
                u.subscription_end,
                COALESCE(u.deep_analysis_credits, 0) as deep_analysis_credits,
                COALESCE(u.channel_reward_claimed, false) as channel_reward_claimed,
                u.last_start_message_id,
                COUNT(a.id) as total_analyses
            FROM users u
            LEFT JOIN analyses a ON u.id = a.user_id
            WHERE u.tg_id = user_tg_id
            GROUP BY u.id, u.tokens, u.subscription_type, u.subscription_end, 
                     u.deep_analysis_credits, u.channel_reward_claimed, u.last_start_message_id;
        END;
        $$ LANGUAGE plpgsql;
    `,
    
    // Функция для атомарного увеличения кредитов
    incrementDeepAnalysisCredits: `
        CREATE OR REPLACE FUNCTION increment_deep_analysis_credits(user_tg_id BIGINT)
        RETURNS INTEGER AS $$
        DECLARE
            new_credits INTEGER;
        BEGIN
            UPDATE users 
            SET deep_analysis_credits = COALESCE(deep_analysis_credits, 0) + 1
            WHERE tg_id = user_tg_id
            RETURNING deep_analysis_credits INTO new_credits;
            
            RETURN new_credits;
        END;
        $$ LANGUAGE plpgsql;
    `,
    
    // Функция для безопасного списания кредитов
    decrementDeepAnalysisCredits: `
        CREATE OR REPLACE FUNCTION decrement_deep_analysis_credits_safe(user_tg_id BIGINT)
        RETURNS TABLE (
            success BOOLEAN,
            remaining_credits INTEGER
        ) AS $$
        DECLARE
            current_credits INTEGER;
            new_credits INTEGER;
        BEGIN
            -- Получаем текущие кредиты с блокировкой строки
            SELECT COALESCE(deep_analysis_credits, 0) INTO current_credits
            FROM users 
            WHERE tg_id = user_tg_id
            FOR UPDATE;
            
            -- Проверяем наличие кредитов
            IF current_credits <= 0 THEN
                RETURN QUERY SELECT false, current_credits;
                RETURN;
            END IF;
            
            -- Списываем кредит
            UPDATE users 
            SET deep_analysis_credits = current_credits - 1
            WHERE tg_id = user_tg_id
            RETURNING deep_analysis_credits INTO new_credits;
            
            RETURN QUERY SELECT true, new_credits;
        END;
        $$ LANGUAGE plpgsql;
    `
};

module.exports = {
    DatabaseQueries,
    createOptimizedClient,
    CONNECTION_CONFIG,
    PREPARED_QUERIES,
    DATABASE_FUNCTIONS
};