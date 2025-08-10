# Agent Description

Краткая инструкция для агентов (актуально на 2025‑08‑10).

## Компоненты
- Bot (Netlify Functions, Node 20, Grammy.js) — каталог `bot/functions/`
- TMA (Vue 3 + Pinia + Axios) — каталог `tma/`
- Web (Vue 3 + Pinia + fetch) — каталог `web/`
- БД — Supabase (PostgreSQL + RPC), Service Role key в функциях

## API и авторизация
- Все публичные endpoints находятся под `/.netlify/functions/*` (см. `ARCHITECTURE.md` → таблица endpoints)
- TMA авторизация: заголовок `X-Telegram-Init-Data`
- Web авторизация: Bearer JWT в `Authorization` + refresh по `/refresh-token`
- CORS: echo `Origin`, `Access-Control-Allow-Credentials: true`, allow `X-Telegram-Init-Data`
 - Для TMA используем общий валидатор: `bot/functions/shared/auth/telegram-validator.js`

## Ключевые файлы (для задач анализа снов)
- `bot/functions/analyze-dream.js` — обычный анализ сна
- `bot/functions/deep-analysis.js` — глубокий анализ серии снов (платный/кредиты)
- `bot/functions/analyses-history.js` — история анализов, включает `deep_source`
- `bot/functions/shared/prompts/dream-prompts.js` — промпты Gemini (используем `basic_meta`)
- `bot/functions/shared/services/gemini-service.js` — вызовы Gemini, ретраи, парсинг
- `tma/src/components/DreamCard.vue` — карточка сна: заголовок и теги берутся из `deep_source`

## Текущий стандарт анализа (упрощённый с метаданными)
- Промпт: `basic_meta` — просит обычный текст анализа, а в самом конце:
  - строка `Заголовок: <2–3 слова>`
  - строка `Теги: <3–5 тегов через запятую>`
- Бэкенд парсит эти две строки, сохраняет `deep_source.title` и `deep_source.tags`, тело анализа — в `analysis`.
- Ответ API также содержит `{ analysis, title, tags }`.

## Правила UI (TMA)
- Заголовок карточки: `deep_source.title` (если нет — fallback локально)
- Теги: `deep_source.tags[]` (показываются при развороте)

## База данных (важное)
- Таблица `analyses`: `id, user_id, dream_text, analysis, is_deep_analysis, deep_source, created_at`
- RPC должно существовать: `decrement_token_if_available(user_tg_id)` (обычный анализ)
- Для deep: `consume_free_deep_if_available`, `decrement_deep_analysis_credits_safe`

## Переменные окружения
- Функции: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `JWT_SECRET`, `ALLOWED_TMA_ORIGIN`, `ALLOWED_WEB_ORIGIN`
- TMA/Web: `VITE_API_BASE_URL` указывает на Bot site `/.netlify/functions`
- Web: прямые `VITE_*_API_URL` опциональны — по умолчанию используется прокси `/api/*`

## Частые задачи
- Изменить поведение анализа: редактировать `dream-prompts.js` и/или обработку в `analyze-dream.js`
- Добавить поля в выдачу истории: править `analyses-history.js` и выборку в `shared/database/queries.js`
- Проблемы с CORS: проверять `bot/functions/shared/middleware/cors.js`

## Тесты
- Запуск unit: `npm run test:unit`
- При изменении CORS и Gemini сервисов — обновить тесты, не трогая отчёты покрытий

## Риски и лимиты
- Netlify Functions ~10 секунд/запрос → избегать тяжелых ремонтов JSON и долгих ретраев
- Telegram webhook должен быстро отвечать; для бота используется `webhookCallback(bot, 'aws-lambda')`

## Быстрые чек-листы
- После анализа инвалидировать кэш профиля (см. `user-cache-service`)
- Для Safari — вся авторизация Web через Bearer (куки только fallback)
- Всегда проверяй `ALLOWED_*_ORIGIN` и наличие `X-Telegram-Init-Data` в TMA


