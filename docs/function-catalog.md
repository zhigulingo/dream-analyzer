# Function Catalog

Актуальная спецификация основных функций, сервисов и компонентов. Для каждого элемента указаны путь, назначение, ключевые I/O, ошибки, зависимости и ссылки.

Обновляйте этот документ при изменении контрактов/поведения. Добавляйте ссылки на ADR/PR/CHANGELOG.

## Backend Functions (Netlify)

### analyze-dream.js
- Path: bot/functions/analyze-dream.js
- Purpose: Анализ одного сна через Gemini; возвращает title, tags, analysis, hvdc
- Input: HTTP POST { dreamText }, Header: X-Telegram-Init-Data
- Output: { title, tags[], analysis, hvdc{ characters, emotions, actions, settings, demographics } }
- Errors: 400 (validation), 401 (init data), 5xx (Gemini/DB)
- Dependencies: telegram-validator, gemini-service, hvdc-service, cache-service, queries
- Links: ADR-2025-10-19-deterministic-gemini, CHANGELOG 1.0.0

### deep-analysis.js
- Path: bot/functions/deep-analysis.js
- Purpose: Триггер глубокого анализа 5 снов; списывает кредит; возвращает 202
- Input: HTTP POST, Header: X-Telegram-Init-Data
- Output: 202 { processing: true, message }
- Errors: 400/401, 409 (нет кредитов), 5xx (DB)
- Dependencies: telegram-validator, queries (dreams, credits), background trigger
- Links: ADR-2025-10-18-background-functions, CHANGELOG 1.0.0

### deep-analysis-background.js
- Path: bot/functions/deep-analysis-background.js
- Purpose: Длительная обработка (до 15 мин); вызов Gemini deep_json; сохранение в БД; уведомление в Telegram
- Input: { tgUserId, userDbId, chatId, combinedDreamsText, requiredDreams, usedFree }
- Output: none (side-effects: DB insert deep_analyses, notification)
- Errors: обработка ошибок с rollback кредитов (RPC)
- Dependencies: gemini-service, queries, Telegram Bot API
- Links: ADR-2025-10-18-background-functions, CHANGELOG 1.0.0

### user-profile.js
- Path: bot/functions/user-profile.js
- Purpose: Получение профиля пользователя
- Output: { id, telegram_user_id, tokens, subscription_type, subscription_end, deep_analysis_credits, free_deep_analysis, deep_analyses_count, total_dreams_count, onboarding_stage }
- Dependencies: queries

### analyses-history.js
- Path: bot/functions/analyses-history.js
- Purpose: История анализов (обычные и глубокие)
- Output: список записей с агрегированной информацией
- Dependencies: queries

### create-invoice.js
- Path: bot/functions/create-invoice.js
- Purpose: Создание инвойса Telegram Stars
- Input: { plan, duration, amount, payload }
- Output: invoice payload/URL
- Dependencies: Telegram Payments API, queries

### claim-channel-token.js
- Path: bot/functions/claim-channel-token.js
- Purpose: Выдача награды за канал
- Dependencies: Telegram Bot API, queries

### bot.js
- Path: bot/functions/bot.js
- Purpose: Webhook бота (grammy); обработка /start, текстов, платежей
- Dependencies: Telegram Bot API, analyses endpoints

## Shared Modules

### auth/telegram-validator.js
- Path: bot/functions/shared/auth/telegram-validator.js
- Purpose: Валидация InitData TMA

### database/queries.js
- Path: bot/functions/shared/database/queries.js
- Purpose: Оптимизированные запросы к БД (Supabase)

### services/gemini-service.js
- Path: bot/functions/shared/services/gemini-service.js
- Purpose: Взаимодействие с Gemini; retry/backoff; модельный fallback; детерминизм
- Methods: analyzeDream, analyzeDreamJSON, deepAnalyzeDreamsJSON
- Config: temperature=0, topK=1, topP=0.1
- Links: ADR-2025-10-19-deterministic-gemini, CHANGELOG 1.0.0

### services/hvdc-service.js
- Path: bot/functions/shared/services/hvdc-service.js
- Purpose: Контентный анализ Hall & Van de Castle; демографические нормы

### services/cache-service.js
- Path: bot/functions/shared/services/cache-service.js
- Purpose: Кэширование результатов (TTL 1–2 часа)

### services/embedding-service.js
- Path: bot/functions/shared/services/embedding-service.js
- Purpose: Текстовые эмбеддинги (по мере необходимости)

### middleware/{cors,error-handler,api-wrapper}.js
- Purpose: CORS заголовки, унифицированная обработка ошибок и ответов

### prompts/dream-prompts.js
- Path: bot/functions/shared/prompts/dream-prompts.js
- Purpose: Промпты: basic_json, deep_json, deep_json_fast

### utils/logger.js
- Path: bot/functions/shared/utils/logger.js
- Purpose: Логирование

## Frontend (TMA) Key Components

### AnalysisHistoryList.vue
- Path: tma/src/components/AnalysisHistoryList.vue
- Purpose: История с табами (Дневник | Глубокий анализ)

### DreamCard.vue
- Path: tma/src/components/DreamCard.vue
- Purpose: Карточка обычного сна и глубокого анализа (символы, динамика, заключение)

### DynamicsChart.vue
- Path: tma/src/components/DynamicsChart.vue
- Purpose: Визуализация HVdC динамики; демографические зоны; пагинация/swipe

### DeepAnalysisCard.vue
- Path: tma/src/components/DeepAnalysisCard.vue
- Purpose: Баннер запуска глубокого анализа; состояния: доступен/обработка/готов/ошибка

## Update Pointers

- При изменении контрактов обновляйте этот файл и добавляйте ссылки на соответствующие ADR и записи в CHANGELOG.
- Старайтесь фиксировать SLA/тайминги и ключевые метрики (latency, error rate) по мере появления.
