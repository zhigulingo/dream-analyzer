# Beta Survey (local)

## Запуск локально

1. Установить зависимости:
```bash
cd survey
npm i
```

2. Задать env для функций (можно через Netlify CLI или shell):
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- ALLOWED_SURVEY_ORIGIN (например, http://localhost:8888)
- SURVEY_START_AT, SURVEY_END_AT (опционально)
- BOT_TOKEN (для валидации Telegram initData; не обязателен при локальном client_id)

3. Запустить:
```bash
npm run netlify:dev
```
Фронтенд: http://localhost:8888
Функции: http://localhost:8888/.netlify/functions

## Endpoints
- GET /api/survey-status
- POST /api/submit-survey { answers, clientId }
  - Если приложение открыто как Telegram WebApp, автоматически передаётся заголовок X-Telegram-Init-Data, и запись сохраняется по tg_id.

## Примечания
- В режиме локального теста идентификатор сохраняется в localStorage как clientId и пишется в колонку client_id.
- В проде будет использоваться tg_id через Telegram InitData, валидация переиспользуется из bot/functions/shared/auth/telegram-validator.js.

