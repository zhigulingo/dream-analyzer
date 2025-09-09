# Beta Survey

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

Если у вас монорепо (как здесь) и создаёте сайт Netlify:
- Base directory: `survey`
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

## Endpoints
- GET /api/survey-status
- POST /api/submit-survey
  - partial: { answerKey, answerValue, index, completed, sessionId, clientId }
  - final: { answers, sessionId, clientId }
  - Telegram WebApp: заголовок `X-Telegram-Init-Data` (валидация по `BOT_TOKEN`); фолбэк — `initData` в теле; локально — `clientId`.

## Примечания
- TMA интеграция:
  - Подключён `https://telegram.org/js/telegram-web-app.js`.
  - Источники initData на клиенте: WebApp.initData, `tgWebAppData`/`initData` из URL/хэша, кэш `localStorage:tma_init_data`.
  - Заголовок `X-Telegram-Init-Data` + дублирование в теле запроса.
  - WebApp.MainButton используется вместо локальных кнопок (Start/Finish). На десктопе есть BackButton и tg:// fallback.
- Сохранение ответов:
  - Частичные сохранения после каждого вопроса + финальный submit (keepalive). Fallback: `sendBeacon` и очередь `survey_pending_queue` (авто‑флаш при старте приложения).
  - Новая строка создаётся для каждой сессии `sessionId`; прогресс в `answers._progress`.

