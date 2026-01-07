-- Добавление колонки beta_notified_approved для отслеживания уведомлений об одобрении
-- Выполните этот SQL в редакторе Supabase (SQL Editor)

-- Добавляем колонку если её нет
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS beta_notified_approved BOOLEAN DEFAULT FALSE;

-- Комментарий для документации
COMMENT ON COLUMN public.users.beta_notified_approved IS 'Флаг: отправлено ли пользователю уведомление о том, что он прошел отбор в бета-тест';
