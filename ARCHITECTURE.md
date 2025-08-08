# Dream Analyzer - Архитектура системы

## 📋 Общее описание

Dream Analyzer - это система анализа снов, состоящая из трех основных компонентов:
1. **Telegram Bot** - серверная часть с функциями (Grammy.js)
2. **TMA (Telegram Mini App)** - мини-приложение для Telegram (Vue.js)
3. **Web приложение** - веб-интерфейс (Vue.js)

## 🛠 Технологический стек

### Разработка и развертывание:
- **IDE:** Cursor с GPT‑5 для написания и редактирования кода
- **VCS:** GitHub монорепозиторий (автодеплой по push)
- **Хостинг:** Netlify (3 отдельных приложения из монорепозитория)
  - Bot: `sparkling-cupcake-940504.netlify.app` (Netlify Functions)
  - TMA: `tourmaline-eclair-9d40ea.netlify.app` (статический фронтенд; открывается внутри Telegram)
  - Web: `bot.dreamstalk.ru` (статический фронтенд)
- **База данных:** Supabase (PostgreSQL)

### Фронтенд:
- **Framework:** Vue.js 3 + Composition API
- **State Management:** Pinia
- **HTTP клиент:** Axios
- **Сборщик:** Vite
- **Стили:** TailwindCSS (TMA), обычный CSS (Web)

### Бэкенд:
- **Runtime:** Node.js 20
- **Functions:** Netlify Functions (serverless)
- **Bot Framework:** Grammy.js
- **AI:** Google Gemini API
- **Auth:** JWT + httpOnly cookies (Web), Telegram InitData (TMA)

### Развертывание:
- **CI/CD:** Автоматический деплой после push в GitHub (3 сайта Netlify)
- **Тестирование:** Только после деплоя (production testing)

## 🏗 Архитектура системы

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   TMA (Vue.js)  │    │  Web (Vue.js)   │    │  Telegram Bot   │
│     Client      │    │     Client      │    │   (Grammy.js)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │    HTTPS API Calls   │    HTTPS API Calls   │
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │   Netlify Functions      │
                    │  (Bot Backend Services)  │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │    Supabase Database     │
                    │   (PostgreSQL + Auth)    │
                    └──────────────────────────┘
```

## 🗂 Структура проекта

### 1. `/bot/` - Серверная часть
```
bot/
├── functions/                 # Netlify Functions (API endpoints)
│   ├── analyze-dream.js      # Анализ снов через Gemini AI
│   ├── user-profile.js       # Получение профиля пользователя
│   ├── analyses-history.js   # История анализов
│   ├── web-login.js          # Авторизация для веб-версии
│   ├── create-invoice.js     # Создание инвойсов Telegram Stars
│   ├── deep-analysis.js      # Глубокий анализ снов
│   ├── bot.js               # Основной бот (webhook handler)
│   └── shared/              # Общие модули
│       ├── auth/            # Авторизация (Telegram validation)
│       ├── database/        # Работа с БД (оптимизированные запросы)
│       ├── services/        # Сервисы (cache, Gemini AI, etc)
│       ├── middleware/      # Middleware (CORS, error handling)
│       └── utils/           # Утилиты (логирование)
├── auth-test.html           # Тестовая страница для авторизации
└── netlify.toml            # Конфигурация Netlify (функции)
```

### 2. `/tma/` - Telegram Mini App
```
tma/
├── src/
│   ├── components/          # Vue компоненты
│   ├── stores/             # Pinia stores (user, notifications, history)
│   ├── services/           # API сервисы и обработка ошибок
│   ├── views/              # Страницы (PersonalAccount)
│   └── composables/        # Переиспользуемая логика
├── package.json            # Зависимости (Vue 3, Pinia, Axios, etc)
├── vite.config.js         # Конфигурация сборки
└── netlify.toml           # Конфигурация деплоя
```

### 3. `/web/` - Веб-приложение
```
web/
├── src/
│   ├── components/          # Vue компоненты
│   ├── stores/             # Pinia stores (⚠️ возможно отсутствует user.js)
│   ├── services/           # API сервисы и авторизация
│   ├── utils/              # Утилиты (API, cookies)
│   └── views/              # Страницы
├── package.json            # Зависимости (Vue 3, Pinia, Axios)
├── vite.config.js         # Конфигурация сборки
└── netlify.toml           # Конфигурация деплоя
```

## 🔐 Система авторизации

### TMA (Telegram Mini App)
- **Метод**: Telegram WebApp InitData
- **Поток**: InitData → Telegram validation → API access
- **Headers**: `X-Telegram-Init-Data`

### Web приложение
- **Метод**: JWT токены + пароли
- **Поток**: Telegram ID + password → JWT tokens → API access
- **Storage**: httpOnly cookies + Authorization header
- Важно: cookies должны быть установлены как `SameSite=None; Secure` и сервер обязан отвечать `Access-Control-Allow-Credentials: true`, т.к. фронтенд (`bot.dreamstalk.ru`) обращается к домену функций (`sparkling-cupcake-940504.netlify.app`).

### Bot
- **Метод**: Telegram Bot API
- **Поток**: Webhook → Grammy.js → обработка команд

## 🌐 API Endpoints

Все функции развернуты на Netlify Functions (`/.netlify/functions/`):

| Endpoint | Методы | Описание |
|----------|--------|----------|
| `/user-profile` | POST | Получение профиля пользователя |
| `/analyses-history` | GET | История анализов снов |
| `/analyze-dream` | POST | Анализ нового сна |
| `/deep-analysis` | POST | Глубокий анализ (платный) |
| `/create-invoice` | POST | Создание Telegram Stars invoice |
| `/web-login` | POST | Авторизация для веб-версии |
| `/refresh-token` | POST | Обновление JWT токенов |
| `/claim-channel-token` | POST | Получение награды за подписку |
| `/bot` | POST | Telegram Bot webhook |

## 🗄 База данных (Supabase)

### Основные таблицы:
- `users` - Пользователи (tg_id, tokens, subscription_type, passwords)
- `dream_analyses` - Анализы снов
- `subscriptions` - Подписки пользователей

### Кеширование:
- Memory cache (Redis-compatible)
- Кеш пользователей, Gemini ответов
- Инвалидация по событиям

## 🚀 Деплой и окружения

### Netlify Sites:
1. **Bot site** - основные функции API
2. **TMA site** - статические файлы TMA
3. **Web site** - статические файлы веб-приложения

### Environment Variables:
```bash
# Database
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Telegram
BOT_TOKEN=
WEBHOOK_URL=

# Authentication
JWT_SECRET=
REFRESH_SECRET=

# CORS
ALLOWED_TMA_ORIGIN=
ALLOWED_WEB_ORIGIN=

# AI
GEMINI_API_KEY=

# API URLs (для клиентов)
VITE_API_BASE_URL=  # URL к bot site с /.netlify/functions
```

## 🔧 Инструкции для разработки

### Пошаговое внесение изменений:

#### 1. Изменения в API (Backend)
```bash
# 1. Редактируй файлы в bot/functions/
# 2. Тестируй локально (если нужно)
# 3. Коммит и пуш в основную ветку
# 4. Автоматический деплой на Netlify (bot site)
```

#### 2. Изменения в TMA
```bash
# 1. Работа в tma/src/
# 2. Проверка переменных окружения:
#    - VITE_API_BASE_URL должен указывать на bot site
# 3. npm run build (локально для проверки)
# 4. Коммит и пуш
# 5. Автоматический деплой на Netlify (TMA site)
```

#### 3. Изменения в Web
```bash
# 1. Работа в web/src/
# 2. Проверка переменных окружения:
#    - VITE_API_BASE_URL должен указывать на bot site
#    - VITE_REFRESH_TOKEN_API_URL
#    - VITE_LOGOUT_API_URL
# 3. npm run build (локально для проверки)
# 4. Коммит и пуш
# 5. Автоматический деплой на Netlify (Web site)
```

#### 4. Обновление общих модулей
```bash
# При изменении shared/ модулей в bot/functions/shared/:
# 1. Убедись, что все функции используют обновленные модули
# 2. Протестируй критические endpoints
# 3. Деплой через пуш
```

### Диагностика проблем:

#### Проверка API подключения:
1. Проверь переменные окружения на Netlify
2. Проверь CORS headers в функциях
3. Проверь валидацию авторизации
4. Посмотри логи Netlify Functions

#### Проверка авторизации:
1. **TMA**: Проверь Telegram WebApp InitData
2. **Web**: Проверь JWT токены и cookies
3. Проверь соответствие секретов в переменных окружения

#### Проверка базы данных:
1. Подключение к Supabase
2. Права доступа SERVICE_ROLE_KEY
3. Структура таблиц и индексы

## ⚠️ Текущие проблемы и статус

### 🚫 Не работает сейчас
1. **Web‑версия** — после авторизации запросы к API не считают/не присылают httpOnly cookies.
2. **Глубокий анализ (TMA)** — после оплаты не выполняется из‑за отсутствия кредитов/ошибок RPC.

### 📌 Причины (по коду)
- **Куки и CORS для Web настроены некорректно:**
  - Куки выставляются как `SameSite=Strict`, что блокирует их в cross‑site сценарии (Web → Netlify Functions). Нужно `SameSite=None; Secure`.
  - Не везде возвращается `Access-Control-Allow-Credentials: true` и точный `Access-Control-Allow-Origin`.
  - См. выставление куки и CORS:
    - web‑login (Set‑Cookie и CORS):
      ```1:131:bot/functions/web-login.js
      // ... existing code ...
      'Access-Control-Allow-Origin': process.env.ALLOWED_WEB_ORIGIN || '*',
      'Access-Control-Allow-Credentials': 'true',
      // ...
      'Set-Cookie': [
        `dream_analyzer_jwt=...; Path=/; HttpOnly; SameSite=Strict; ...`,
        `dream_analyzer_refresh=...; Path=/; HttpOnly; SameSite=Strict; ...`
      ]
      // ... existing code ...
      ```
    - refresh‑token (Set‑Cookie и CORS):
      ```1:174:bot/functions/refresh-token.js
      // ... existing code ...
      'Access-Control-Allow-Origin': process.env.ALLOWED_WEB_ORIGIN || '*',
      'Access-Control-Allow-Credentials': 'true',
      // ...
      `SameSite=Strict;`
      // ... existing code ...
      ```
    - user‑profile (CORS для web без credentials):
      ```1:218:bot/functions/user-profile.js
      // ... existing code ...
      const corsHeaders = {
        'Access-Control-Allow-Origin': allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0] || '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      };
      // ... existing code ...
      ```
    - analyses‑history (нет credentials):
      ```1:192:bot/functions/analyses-history.js
      // ... existing code ...
      const corsHeaders = {
        'Access-Control-Allow-Origin': allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0] || '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      };
      // ... existing code ...
      ```

- **RPC/схема Supabase не полностью применены:**
  - Глубокий анализ списывает кредиты и читает последние N снов:
    ```1:204:bot/functions/deep-analysis.js
    // ... existing code ...
    const { data: decrementResult } = await supabase
      .rpc('decrement_deep_analysis_credits_safe', { user_tg_id: verifiedUserId });
    // ... existing code ...
    ```
  - Оплата deep‑analysis добавляет кредиты через RPC:
    ```1:199:bot/functions/bot/services/user-service.js
    // ... existing code ...
    const newCredits = await this.dbQueries.incrementDeepAnalysisCredits(userId);
    // ... existing code ...
    ```
  - Эти RPC определены в `setup.sql`, их нужно применить. Дополнительно в коде используются RPC, которых нет в `setup.sql`:
    - `decrement_token_if_available` (используется в `analyze-dream.js`)
    - `process_successful_payment` (используется в `user-service.js`)

### ✅ Частично работает
1. **TMA** — профиль и история загружаются; платеж Stars проходит; базовый анализ снов работает.
2. **Bot** — обработчики команд/платежа корректны; добавление кредита deep‑analysis реализовано на стороне бота.

### 🎯 Что исправляем в первую очередь
1. CORS и cookie‑флаги для Web (SameSite=None; Secure, Credentials=true).
2. Применение схемы БД и RPC из `setup.sql` + добавление двух отсутствующих RPC.
3. Включение `Access-Control-Allow-Credentials: true` на всех веб‑эндпойнтах.

### Мониторинг:
- Логи Netlify Functions
- Supabase Dashboard
- Error tracking через errorService

## 🔄 Workflow для агентов

### При получении задач:
1. **Определи область изменений**: TMA, Web, Bot, или DB
2. **Прочитай соответствующие файлы** для понимания контекста
3. **Проверь зависимости** между компонентами
4. **Используй правильные API endpoints** в соответствии с архитектурой
5. **Тестируй интеграцию** между компонентами
6. **Обнови документацию** при необходимости

### Типичные паттерны:
- Все API calls идут к bot site (VITE_API_BASE_URL)
- Авторизация различается для TMA и Web
- Shared модули переиспользуются в функциях
- Vue компоненты используют Pinia stores
- Offline detection в TMA
- Error handling centralized

## 🔧 ПЛАН ИСПРАВЛЕНИЯ ПРОБЛЕМ (ссылки на код и точные правки)

### Этап 1: Web авторизация — куки и CORS
Обновить CORS и флаги Set‑Cookie для кросс‑доменных запросов (Web → Functions):
- В `bot/functions/web-login.js` и `bot/functions/refresh-token.js`:
  - В заголовках ответа добавить/оставить: `Access-Control-Allow-Credentials: true` и точный `Access-Control-Allow-Origin: https://bot.dreamstalk.ru` (через `ALLOWED_WEB_ORIGIN`).
  - В Set‑Cookie заменить `SameSite=Strict` на `SameSite=None; Secure`.
  - Пример мест правки см. блоки кода выше (раздел Причины → «Куки и CORS для Web»).
- В `bot/functions/user-profile.js` и `bot/functions/analyses-history.js` добавить `Access-Control-Allow-Credentials: true` в `corsHeaders`.

Проверка после деплоя: открыть Web, выполнить логин, убедиться что в DevTools → Application → Cookies появились `dream_analyzer_jwt` и `dream_analyzer_refresh`, а запросы к `/user-profile` возвращают 200.

### Этап 2: Настройка переменных окружения в Netlify

#### 2.1 Bot site (sparkling-cupcake-940504)
- `SUPABASE_URL` - URL Supabase проекта
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `BOT_TOKEN` - Telegram bot token
- `GEMINI_API_KEY` - Google Gemini API key
- `JWT_SECRET` - Секрет для JWT
- `REFRESH_SECRET` - Секрет для refresh токенов
- `ALLOWED_TMA_ORIGIN` - `https://tourmaline-eclair-9d40ea.netlify.app`
- `ALLOWED_WEB_ORIGIN` - `https://bot.dreamstalk.ru`

#### 2.2 TMA site (tourmaline-eclair-9d40ea)
- `VITE_API_BASE_URL` - `https://sparkling-cupcake-940504.netlify.app/.netlify/functions`

#### 2.3 Web site (bot.dreamstalk.ru)
- `VITE_API_BASE_URL` - `https://sparkling-cupcake-940504.netlify.app/.netlify/functions`
- `VITE_WEB_LOGIN_API_URL` - `https://sparkling-cupcake-940504.netlify.app/.netlify/functions/web-login`
- `VITE_REFRESH_TOKEN_API_URL` - `https://sparkling-cupcake-940504.netlify.app/.netlify/functions/refresh-token`
- `VITE_LOGOUT_API_URL` - `https://sparkling-cupcake-940504.netlify.app/.netlify/functions/logout`
Примечание: переменные уже проброшены в `web/vite.config.js` и `tma/vite.config.js` (см. файлы), так что правок Vite не требуется.

### Этап 3: Настройка базы данных Supabase

#### 3.1 Применить RPC функции
1. Открыть Supabase Dashboard → SQL Editor
2. Скопировать содержимое `bot/functions/shared/database/setup.sql`
3. Выполнить SQL скрипт для создания всех RPC функций

#### 3.2 Проверить структуру таблиц
- Дополнительно создать два RPC, которые используются кодом, но не входят в `setup.sql`:
  1) `decrement_token_if_available(user_tg_id BIGINT) RETURNS BOOLEAN` — атомарное списание обычного токена анализа. Минимальная реализация:
     ```sql
     CREATE OR REPLACE FUNCTION decrement_token_if_available(user_tg_id BIGINT)
     RETURNS BOOLEAN AS $$
     DECLARE current_tokens INTEGER;
     BEGIN
       SELECT COALESCE(tokens, 0) INTO current_tokens FROM users WHERE tg_id = user_tg_id FOR UPDATE;
       IF current_tokens <= 0 THEN RETURN FALSE; END IF;
       UPDATE users SET tokens = current_tokens - 1 WHERE tg_id = user_tg_id;
       RETURN TRUE;
     END; $$ LANGUAGE plpgsql;
     ```
  2) `process_successful_payment(user_tg_id BIGINT, plan_type TEXT, duration_months INT)` — обновляет подписку/токены после оплаты подписки. Минимально можно инкрементировать токены и продлить подписку:
     ```sql
     CREATE OR REPLACE FUNCTION process_successful_payment(user_tg_id BIGINT, plan_type TEXT, duration_months INT)
     RETURNS VOID AS $$
     DECLARE now_ts TIMESTAMPTZ := NOW();
     BEGIN
       UPDATE users
       SET subscription_type = plan_type,
           subscription_end = COALESCE(subscription_end, now_ts) + (duration_months || ' months')::INTERVAL,
           tokens = COALESCE(tokens, 0) + CASE WHEN plan_type = 'premium' THEN 30 ELSE 15 END
       WHERE tg_id = user_tg_id;
     END; $$ LANGUAGE plpgsql;
     ```
  После добавления — повторно проверить `analyze-dream` и оплату подписки из бота.

### Этап 4: Глубокий анализ (TMA)
1. Убедиться, что после оплаты добавляется кредит:
   - Бот вызывает `addDeepAnalysisCredit` → `increment_deep_analysis_credits` RPC
     ```1:126:bot/functions/bot/handlers/payment-handlers.js
     // ... existing code ...
     const newCredits = await userService.addDeepAnalysisCredit(userId);
     // ... existing code ...
     ```
2. Вызов эндпойнта TMA `/deep-analysis` списывает кредит и собирает последние 5 снов. Требуется наличие RPC `decrement_deep_analysis_credits_safe` и колонки `deep_analysis_credits`.
3. Если снов < 5 — вернётся 400 (ожидаемо) — добавьте/проанализируйте ещё сны.

### Этап 5: Тестирование и валидация
Убедиться, что таблицы содержат все необходимые поля:
- `users`: id, tg_id, tokens, subscription_type, subscription_end, deep_analysis_credits, channel_reward_claimed, last_start_message_id, web_password_hash
- `analyses`: id, user_id, dream_text, analysis, created_at

### Этап 4: Исправление кода

#### 4.1 Обновить deep-analysis.js
Заменить вызов:
```javascript
// Старый код
const decrementResult = await dbQueries.decrementDeepAnalysisCredits(verifiedUserId);

// Новый код (использовать RPC функцию)
const { data: decrementResult, error } = await supabase
  .rpc('decrement_deep_analysis_credits_safe', { user_tg_id: verifiedUserId });
```

#### 4.2 Обновить queries.js
Использовать RPC функции вместо обычных запросов в методах DatabaseQueries.

### Этап 5: Тестирование и валидация

#### 5.1 Последовательность тестирования:
1. Коммит изменений в GitHub → дождаться автодеплоя 3 сайтов Netlify.
2. Web:
   - Выполнить логин → проверить, что установились куки (`SameSite=None; Secure`) и API возвращает 200.
   - Проверить загрузку профиля/истории и анализ нового сна.
3. TMA:
   - Купить 1 кредит deep‑analysis через Stars → убедиться, что кредиты увеличились в профиле.
   - Выполнить «Глубокий анализ» при наличии ≥ 5 снов.
4. Bot:
   - Проверить обработку `/start`, `/setpassword`, оплат.

#### 5.2 Критерии успеха:
- ✅ TMA загружается и показывает данные пользователя
- ✅ Глубокий анализ в TMA работает после покупки (списывается 1 кредит)
- ✅ Web версия открывается, выполняется авторизация (куки установлены), профиль/история загружаются
- ✅ Web версия показывает профиль пользователя
- ✅ Bot отвечает на команды /start и анализирует сны

### Этап 6: Мониторинг и отладка

#### 6.1 Логи для проверки:
- Netlify Functions Logs (каждого сайта)
- Supabase Dashboard → API Logs
- Browser DevTools → Network/Console

#### 6.2 Типичные ошибки:
- CORS errors → проверить ALLOWED_*_ORIGIN и `Access-Control-Allow-Credentials`
- 401/403 errors → проверить токены и секреты
- Database errors → проверить RPC функции в Supabase и наличие колонок (например, `deep_analysis_credits`)
- Environment variable undefined → проверить Netlify settings

---

*Документ обновлен: $(date)*
*Версия: 2.0 - с планом исправления*