-- Добавляем колонки демографии в таблицу users
-- Idempotent script: безопасен для повторного запуска

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS age_range VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender VARCHAR(50);

-- Опционально: проверяем названия колонок и типов
COMMENT ON COLUMN public.users.age_range IS 'Возрастная группа: 0-20, 20-30, 30-40, 40-50, 50+';
COMMENT ON COLUMN public.users.gender IS 'Пол: male, female';
