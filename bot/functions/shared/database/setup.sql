-- bot/functions/shared/database/setup.sql
-- SQL функции для оптимизации работы с базой данных

-- Функция для получения профиля пользователя со статистикой
-- Заменяет множественные SELECT запросы одним оптимизированным запросом
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
        COALESCE(u.tokens, 0) as tokens,
        COALESCE(u.subscription_type, 'free') as subscription_type,
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

-- Onboarding stage tracking: add column if not exists
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS onboarding_stage TEXT;

-- Helper RPC to run ad-hoc SQL (admin-only; for migration function)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'execute' AND pg_get_functiondef(oid) LIKE '%TEXT%') THEN
    CREATE OR REPLACE FUNCTION execute(query TEXT)
    RETURNS VOID AS $$
    BEGIN
      EXECUTE query;
    END; $$ LANGUAGE plpgsql SECURITY DEFINER;
  END IF;
END $$;

-- Функция для атомарного увеличения кредитов глубокого анализа
-- Заменяет fetch+update операции атомарной операцией
CREATE OR REPLACE FUNCTION increment_deep_analysis_credits(user_tg_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    new_credits INTEGER;
BEGIN
    UPDATE users 
    SET deep_analysis_credits = COALESCE(deep_analysis_credits, 0) + 1
    WHERE tg_id = user_tg_id
    RETURNING deep_analysis_credits INTO new_credits;
    
    IF new_credits IS NULL THEN
        RAISE EXCEPTION 'User with tg_id % not found', user_tg_id;
    END IF;
    
    RETURN new_credits;
END;
$$ LANGUAGE plpgsql;

-- Функция для безопасного списания кредитов с проверкой доступности
-- Предотвращает race conditions и обеспечивает консистентность данных
CREATE OR REPLACE FUNCTION decrement_deep_analysis_credits_safe(user_tg_id BIGINT)
RETURNS TABLE (
    success BOOLEAN,
    remaining_credits INTEGER
) AS $$
DECLARE
    current_credits INTEGER;
    new_credits INTEGER;
BEGIN
    -- Получаем текущие кредиты с блокировкой строки для предотвращения race conditions
    SELECT COALESCE(deep_analysis_credits, 0) INTO current_credits
    FROM users 
    WHERE tg_id = user_tg_id
    FOR UPDATE;
    
    -- Проверяем, найден ли пользователь
    IF current_credits IS NULL THEN
        RETURN QUERY SELECT false, 0;
        RETURN;
    END IF;
    
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

-- Добавляем поля для фидбэка пользователя по анализам (если их нет)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='analyses' AND column_name='user_feedback'
    ) THEN
        ALTER TABLE public.analyses ADD COLUMN user_feedback SMALLINT NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='analyses' AND column_name='feedback_at'
    ) THEN
        ALTER TABLE public.analyses ADD COLUMN feedback_at TIMESTAMPTZ;
    END IF;
    -- Добавляем CHECK, если его нет (через попытку и игнор ошибки)
    BEGIN
        ALTER TABLE public.analyses ADD CONSTRAINT analyses_user_feedback_check CHECK (user_feedback IN (0,1,2));
    EXCEPTION WHEN duplicate_object THEN
        -- already exists
        NULL;
    END;
END$$;

-- Функция для batch операций: массовая вставка анализов
-- Оптимизирует вставку множественных записей одной операцией
CREATE OR REPLACE FUNCTION batch_insert_analyses(
    analyses_data JSON[]
)
RETURNS TABLE (
    inserted_count INTEGER,
    analysis_ids BIGINT[]
) AS $$
DECLARE
    analysis_record JSON;
    inserted_ids BIGINT[] := '{}';
    new_id BIGINT;
    counter INTEGER := 0;
BEGIN
    -- Итерируем по массиву данных для вставки
    FOREACH analysis_record IN ARRAY analyses_data
    LOOP
        INSERT INTO analyses (user_id, dream_text, analysis, created_at)
        VALUES (
            (analysis_record->>'user_id')::BIGINT,
            analysis_record->>'dream_text',
            analysis_record->>'analysis',
            COALESCE(
                (analysis_record->>'created_at')::TIMESTAMP WITH TIME ZONE,
                NOW()
            )
        )
        RETURNING id INTO new_id;
        
        inserted_ids := array_append(inserted_ids, new_id);
        counter := counter + 1;
    END LOOP;
    
    RETURN QUERY SELECT counter, inserted_ids;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения пользователя с созданием при отсутствии
-- Атомарная операция "upsert" для пользователей
CREATE OR REPLACE FUNCTION get_or_create_user_atomic(user_tg_id BIGINT)
RETURNS TABLE (
    id BIGINT,
    channel_reward_claimed BOOLEAN,
    last_start_message_id BIGINT,
    was_created BOOLEAN
) AS $$
DECLARE
    user_record RECORD;
    user_exists BOOLEAN := false;
BEGIN
    -- Сначала пытаемся найти существующего пользователя
    SELECT u.id, u.channel_reward_claimed, u.last_start_message_id 
    INTO user_record
    FROM users u
    WHERE u.tg_id = user_tg_id;
    
    IF FOUND THEN
        -- Пользователь найден
        RETURN QUERY SELECT user_record.id, 
                           COALESCE(user_record.channel_reward_claimed, false), 
                           user_record.last_start_message_id,
                           false;
    ELSE
        -- Пользователь не найден, создаем нового
        INSERT INTO users (tg_id, subscription_type, tokens, channel_reward_claimed, deep_analysis_credits)
        VALUES (user_tg_id, 'free', 0, false, 0)
        ON CONFLICT (tg_id) DO NOTHING  -- На случай race condition
        RETURNING users.id INTO user_record.id;
        
        IF user_record.id IS NOT NULL THEN
            -- Успешно создан новый пользователь
            RETURN QUERY SELECT user_record.id, false, NULL::BIGINT, true;
        ELSE
            -- Race condition: пользователь был создан другим процессом
            SELECT u.id, u.channel_reward_claimed, u.last_start_message_id 
            INTO user_record
            FROM users u
            WHERE u.tg_id = user_tg_id;
            
            RETURN QUERY SELECT user_record.id, 
                               COALESCE(user_record.channel_reward_claimed, false), 
                               user_record.last_start_message_id,
                               false;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения статистики производительности базы данных
-- Используется в health check для мониторинга
CREATE OR REPLACE FUNCTION get_database_performance_stats()
RETURNS TABLE (
    total_users BIGINT,
    total_analyses BIGINT,
    avg_analyses_per_user NUMERIC,
    recent_activity_24h BIGINT,
    database_size_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM analyses) as total_analyses,
        (SELECT ROUND(AVG(analysis_count), 2) 
         FROM (SELECT COUNT(a.id) as analysis_count 
               FROM users u 
               LEFT JOIN analyses a ON u.id = a.user_id 
               GROUP BY u.id) sub) as avg_analyses_per_user,
        (SELECT COUNT(*) 
         FROM analyses 
         WHERE created_at > NOW() - INTERVAL '24 hours') as recent_activity_24h,
        (SELECT ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 2)) as database_size_mb;
END;
$$ LANGUAGE plpgsql;

-- Создание индексов для оптимизации производительности
-- Если индексы не существуют, создаем их

-- Индекс для быстрого поиска пользователей по Telegram ID
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tg_id ON users(tg_id);

-- Составной индекс для анализов по пользователю и дате создания
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analyses_user_created ON analyses(user_id, created_at DESC);

-- Индекс для быстрого подсчета анализов пользователя
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);

-- Индекс для фильтрации по типу подписки
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_subscription_type ON users(subscription_type);

-- Частичный индекс для активных подписок
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_subscription 
ON users(subscription_end) 
WHERE subscription_end IS NOT NULL AND subscription_end > NOW();

-- Комментарии к функциям для документации
COMMENT ON FUNCTION get_user_profile_with_stats(BIGINT) IS 'Получает полный профиль пользователя со статистикой одним запросом';
COMMENT ON FUNCTION increment_deep_analysis_credits(BIGINT) IS 'Атомарно увеличивает кредиты глубокого анализа';
COMMENT ON FUNCTION decrement_deep_analysis_credits_safe(BIGINT) IS 'Безопасно списывает кредиты с проверкой доступности';
COMMENT ON FUNCTION batch_insert_analyses(JSON[]) IS 'Массовая вставка анализов для оптимизации производительности';
COMMENT ON FUNCTION get_or_create_user_atomic(BIGINT) IS 'Атомарная операция получения или создания пользователя';
COMMENT ON FUNCTION get_database_performance_stats() IS 'Получает статистику производительности для мониторинга';

-- Таблица для хранения результатов глубоких анализов
CREATE TABLE IF NOT EXISTS deep_analyses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deep_analyses_user_created ON deep_analyses(user_id, created_at DESC);

-- Миграция существующей таблицы analyses: добавляем флаги для глубокого анализа
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='analyses' AND column_name='is_deep_analysis'
    ) THEN
        ALTER TABLE public.analyses ADD COLUMN is_deep_analysis BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='analyses' AND column_name='deep_source'
    ) THEN
        ALTER TABLE public.analyses ADD COLUMN deep_source JSONB;
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_analyses_user_deep_created ON analyses(user_id, is_deep_analysis, created_at DESC);

-- Бесплатный кредит для глубокого анализа
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='users' AND column_name='free_deep_analysis'
    ) THEN
        ALTER TABLE public.users ADD COLUMN free_deep_analysis INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='users' AND column_name='free_deep_granted'
    ) THEN
        ALTER TABLE public.users ADD COLUMN free_deep_granted BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END$$;

CREATE OR REPLACE FUNCTION grant_free_deep_if_eligible(user_tg_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  uid BIGINT;
  dreams_count INTEGER;
BEGIN
  SELECT id INTO uid FROM users WHERE tg_id = user_tg_id;
  IF uid IS NULL THEN RETURN FALSE; END IF;

  SELECT COUNT(*) INTO dreams_count FROM analyses WHERE user_id = uid;

  -- Условие: первый раз достигнуто >= 5 снов и ранее бесплатный кредит не выдавался
  IF (COALESCE(dreams_count, 0) >= 5) AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = uid AND COALESCE(free_deep_granted, FALSE) = FALSE
  ) THEN
      UPDATE users 
        SET free_deep_analysis = 1, free_deep_granted = TRUE
      WHERE id = uid;
      RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- RPC: атомарное списание бесплатного кредита
CREATE OR REPLACE FUNCTION consume_free_deep_if_available(user_tg_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE current_free INTEGER;
BEGIN
  SELECT COALESCE(free_deep_analysis,0) INTO current_free FROM users WHERE tg_id = user_tg_id FOR UPDATE;
  IF current_free <= 0 THEN RETURN FALSE; END IF;
  UPDATE users SET free_deep_analysis = current_free - 1 WHERE tg_id = user_tg_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Дополнительные изменения для Web/TMA интеграции

-- Гарантируем наличие колонки для кредитов глубокого анализа
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'deep_analysis_credits'
    ) THEN
        ALTER TABLE public.users ADD COLUMN deep_analysis_credits INTEGER DEFAULT 0;
    END IF;
END$$;

-- RPC: Атомарное списание обычного токена анализа (используется в analyze-dream.js)
CREATE OR REPLACE FUNCTION decrement_token_if_available(user_tg_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE current_tokens INTEGER;
BEGIN
  SELECT COALESCE(tokens, 0) INTO current_tokens FROM users WHERE tg_id = user_tg_id FOR UPDATE;
  IF current_tokens <= 0 THEN
    RETURN FALSE;
  END IF;
  UPDATE users SET tokens = current_tokens - 1 WHERE tg_id = user_tg_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- RPC: Обработка успешной оплаты подписки (используется в bot/services/user-service.js)
CREATE OR REPLACE FUNCTION process_successful_payment(user_tg_id BIGINT, plan_type TEXT, duration_months INT)
RETURNS VOID AS $$
DECLARE now_ts TIMESTAMPTZ := NOW();
BEGIN
  UPDATE users
  SET subscription_type = plan_type,
      subscription_end = COALESCE(subscription_end, now_ts) + (duration_months || ' months')::INTERVAL,
      tokens = COALESCE(tokens, 0) + CASE WHEN plan_type = 'premium' THEN 30 ELSE 15 END
  WHERE tg_id = user_tg_id;
END;
$$ LANGUAGE plpgsql;

-- =============================
-- БЕТА-ОПРОС: ХРАНИЛИЩЕ РЕЗУЛЬТАТОВ
-- =============================
-- Таблица для ответов бета-опроса. Поддерживает два режима идентификации:
-- 1) tg_id (BIGINT) — когда пользователь авторизован через Telegram
-- 2) client_id (TEXT) — локальный/браузерный идентификатор для предварительного теста UI
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema='public' AND table_name='beta_survey_responses'
    ) THEN
        CREATE TABLE public.beta_survey_responses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tg_id BIGINT,
            client_id TEXT,
            answers JSONB NOT NULL,
            submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            approved BOOLEAN NOT NULL DEFAULT FALSE
        );
        CREATE UNIQUE INDEX ux_beta_survey_tg ON public.beta_survey_responses(tg_id) WHERE tg_id IS NOT NULL;
        CREATE UNIQUE INDEX ux_beta_survey_client ON public.beta_survey_responses(client_id) WHERE client_id IS NOT NULL;
        CREATE INDEX ix_beta_survey_approved ON public.beta_survey_responses(approved);
        CREATE INDEX ix_beta_survey_submitted_at ON public.beta_survey_responses(submitted_at);
    END IF;
END$$;

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_beta_survey_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_beta_survey_set_updated_at
    BEFORE UPDATE ON public.beta_survey_responses
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- Флаг доступа к бете в таблице users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='users' AND column_name='beta_whitelisted'
    ) THEN
        ALTER TABLE public.users ADD COLUMN beta_whitelisted BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='users' AND column_name='beta_approved_at'
    ) THEN
        ALTER TABLE public.users ADD COLUMN beta_approved_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='users' AND column_name='beta_access_at'
    ) THEN
        ALTER TABLE public.users ADD COLUMN beta_access_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='users' AND column_name='beta_notified_approved'
    ) THEN
        ALTER TABLE public.users ADD COLUMN beta_notified_approved BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='users' AND column_name='beta_notified_access'
    ) THEN
        ALTER TABLE public.users ADD COLUMN beta_notified_access BOOLEAN DEFAULT FALSE;
    END IF;
END$$;

-- Триггер: при установке beta_whitelisted=true заполняем beta_approved_at/beta_access_at и переводим в 'whitelisted'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'set_whitelist_fields'
    ) THEN
        CREATE OR REPLACE FUNCTION set_whitelist_fields()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.beta_whitelisted IS TRUE THEN
                IF NEW.beta_approved_at IS NULL THEN
                    NEW.beta_approved_at := NOW();
                END IF;
                IF NEW.beta_access_at IS NULL THEN
                    NEW.beta_access_at := NOW() + INTERVAL '24 hours';
                END IF;
                IF NEW.subscription_type IS NULL OR NEW.subscription_type NOT IN ('beta','onboarding1','onboarding2','free') THEN
                    NEW.subscription_type := 'whitelisted';
                END IF;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    END IF;

    -- Создаем триггеры, если их нет
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_set_whitelist_fields_ins'
    ) THEN
        CREATE TRIGGER trg_users_set_whitelist_fields_ins
        BEFORE INSERT ON public.users
        FOR EACH ROW EXECUTE FUNCTION set_whitelist_fields();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_set_whitelist_fields_upd'
    ) THEN
        CREATE TRIGGER trg_users_set_whitelist_fields_upd
        BEFORE UPDATE OF beta_whitelisted ON public.users
        FOR EACH ROW WHEN (NEW.beta_whitelisted IS DISTINCT FROM OLD.beta_whitelisted)
        EXECUTE FUNCTION set_whitelist_fields();
    END IF;
END$$;

-- Демографические поля для персонализации статистики
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS age_range TEXT CHECK (age_range IN ('0-20','20-30','30-40','40-50','50+')),
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male','female'));