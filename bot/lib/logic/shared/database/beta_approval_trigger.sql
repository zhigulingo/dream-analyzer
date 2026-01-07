-- Автоматическая синхронизация статуса при одобрении анкеты
-- Выполните этот SQL в редакторе Supabase (SQL Editor)

-- ПРАВИЛЬНАЯ СЕМАНТИКА СТАТУСОВ:
-- 'beta' = прошел опрос, ждет одобрения администратора
-- 'whitelisted' = одобрен, ждет истечения таймера доступа (24ч)
-- 'onboarding1/2/free' = доступ открыт, проходит/прошел онбординг

-- 1) Функция триггера: обновляет users при изменении approved в beta_survey_responses
CREATE OR REPLACE FUNCTION public.sync_beta_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_record RECORD;
  v_access_at TIMESTAMPTZ;
BEGIN
  -- Триггер срабатывает только если approved изменился с false/null на true
  IF NEW.approved IS TRUE AND (OLD.approved IS NULL OR OLD.approved IS FALSE) THEN
    
    -- Ищем пользователя по tg_id
    SELECT id, beta_whitelisted INTO v_user_record
    FROM public.users
    WHERE tg_id = NEW.tg_id
    LIMIT 1;
    
    -- Если пользователя нет - создаём его (на случай старых записей или ошибок)
    IF v_user_record.id IS NULL THEN
      INSERT INTO public.users (
        tg_id,
        beta_whitelisted,
        beta_approved_at,
        beta_access_at,
        subscription_type,
        tokens,
        channel_reward_claimed
      )
      VALUES (
        NEW.tg_id,
        TRUE,
        NOW(),
        NOW() + INTERVAL '24 hours',
        'whitelisted',
        0,
        FALSE
      );
      
      RAISE NOTICE 'Created new user % from approved survey', NEW.tg_id;
    ELSE
      -- Если пользователь существует - обновляем его статус с 'beta' на 'whitelisted'
      v_access_at := NOW() + INTERVAL '24 hours';
      
      UPDATE public.users
      SET 
        beta_whitelisted = TRUE,
        beta_approved_at = NOW(),
        beta_access_at = v_access_at,
        subscription_type = 'whitelisted'
      WHERE id = v_user_record.id;
      
      RAISE NOTICE 'Updated user % status from beta to whitelisted with access at %', NEW.tg_id, v_access_at;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2) Удаляем триггер если он был создан ранее
DROP TRIGGER IF EXISTS trg_beta_survey_approval ON public.beta_survey_responses;

-- 3) Создаём триггер на UPDATE таблицы beta_survey_responses
CREATE TRIGGER trg_beta_survey_approval
AFTER UPDATE OF approved ON public.beta_survey_responses
FOR EACH ROW
EXECUTE FUNCTION public.sync_beta_approval();

-- 4) Единоразовый UPDATE: синхронизируем все уже одобренные анкеты
-- (для тех случаев, когда вы одобрили вчера, но статус не обновился)
DO $$
DECLARE
  r RECORD;
  v_user_record RECORD;
  v_access_at TIMESTAMPTZ;
BEGIN
  FOR r IN 
    SELECT tg_id 
    FROM public.beta_survey_responses 
    WHERE approved = TRUE
  LOOP
    -- Ищем пользователя
    SELECT id, beta_whitelisted INTO v_user_record
    FROM public.users
    WHERE tg_id = r.tg_id
    LIMIT 1;
    
    IF v_user_record.id IS NULL THEN
      -- Создаём нового пользователя (только для старых записей)
      INSERT INTO public.users (
        tg_id,
        beta_whitelisted,
        beta_approved_at,
        beta_access_at,
        subscription_type,
        tokens,
        channel_reward_claimed
      )
      VALUES (
        r.tg_id,
        TRUE,
        NOW(),
        NOW() + INTERVAL '24 hours',
        'whitelisted',
        0,
        FALSE
      );
      RAISE NOTICE 'Created user % from existing approved survey', r.tg_id;
    ELSE
      -- Обновляем только если ещё не whitelisted
      IF v_user_record.beta_whitelisted IS NULL OR v_user_record.beta_whitelisted = FALSE THEN
        v_access_at := NOW() + INTERVAL '24 hours';
        UPDATE public.users
        SET 
          beta_whitelisted = TRUE,
          beta_approved_at = NOW(),
          beta_access_at = v_access_at,
          subscription_type = 'whitelisted'
        WHERE id = v_user_record.id;
        RAISE NOTICE 'Fixed user % status (was beta, now whitelisted)', r.tg_id;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Готово! Теперь каждый раз, когда вы меняете approved на true в таблице beta_survey_responses,
-- статус пользователя в таблице users автоматически обновится с 'beta' на 'whitelisted'.
