# Dream Analyzer — Техническая документация и архитектура

## 📋 Общее описание

Dream Analyzer - это система анализа снов, состоящая из трех основных компонентов:
1. **Telegram Bot** - серверная часть с функциями (Grammy.js)
2. **TMA (Telegram Mini App)** - мини-приложение для Telegram (Vue.js)
3. **Web приложение** - веб-интерфейс (Vue.js)

## 🛠 Технологический стек

### Разработка и развертывание
- **IDE:** Cursor с GPT‑5 для написания и редактирования кода
- **VCS:** GitHub монорепозиторий (автодеплой по push)
- **Хостинг:** Netlify (3 отдельных приложения из монорепозитория)
  - Bot: `sparkling-cupcake-940504.netlify.app` (Netlify Functions)
  - TMA: `tourmaline-eclair-9d40ea.netlify.app` (статический фронтенд; открывается внутри Telegram)
  - Web: `bot.dreamstalk.ru` (статический фронтенд)
- **База данных:** Supabase (PostgreSQL)

### Фронтенд
- **Framework:** Vue.js 3 + Composition API
- **State Management:** Pinia
- **HTTP клиент:** Axios
- **Сборщик:** Vite
- **Стили:** TailwindCSS (TMA), обычный CSS (Web)
- **UX (TMA):** в мини‑приложении не используются hover‑состояния (это мобильное приложение)

### Бэкенд
- **Runtime:** Node.js 20
- **Functions:** Netlify Functions (serverless)
- **Bot Framework:** Grammy.js
- **AI:** Google Gemini API
- **Auth:** JWT + httpOnly cookies (Web), Telegram InitData (TMA)

### Развертывание
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

## 🔐 Система авторизации (актуальная)

### TMA (Telegram Mini App)
- **Метод**: Telegram WebApp InitData
- **Поток**: InitData → Telegram validation → API access
- **Headers**: `X-Telegram-Init-Data`

### Web приложение
- **Метод**: JWT токены + пароли (логин)
- **Поток**: Telegram ID + password → `/web-login` → JSON `{ accessToken, refreshToken }` → клиент хранит токены (память + sessionStorage) → все API с `Authorization: Bearer <accessToken>` → при 401 обновление через `/refresh-token` (JSON `{ refreshToken }`).
- **Storage**: краткоживущий accessToken в памяти/sessionStorage; refreshToken — в sessionStorage; httpOnly cookies — только как fallback.
- **Важно:** все вызовы Web идут через `/api/*` на домене Web (SPA прокси Netlify). CORS настроен на echo Origin и `Allow-Credentials: true`.

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
- `analyses` - Анализы снов (включая глубокие анализы)
- `subscriptions` - Подписки пользователей

### Кеширование:
- Memory cache (Redis-compatible)
- Кеш пользователей, Gemini ответов
- Инвалидация по событиям

### Изменения схемы (актуально)
- В `analyses` добавлены поля:
  - `is_deep_analysis BOOLEAN DEFAULT FALSE` — признак глубокого анализа
  - `deep_source JSONB` — метаданные источника (например, количество снов)
- В `users` добавлены поля:
  - `free_deep_analysis INTEGER DEFAULT 0` — бесплатные кредиты глубокого анализа
  - `free_deep_granted BOOLEAN DEFAULT FALSE` — флаг одноразовой выдачи бесплатного кредита
- RPC:
  - `decrement_token_if_available(user_tg_id)` — списание обычного токена
  - `decrement_deep_analysis_credits_safe(user_tg_id)` — списание платного кредита глубокого анализа
  - `process_successful_payment(user_tg_id, plan_type, duration_months)` — обработка платежа за подписку
  - `grant_free_deep_if_eligible(user_tg_id)` — выдать 1 бесплатный кредит при тарифе premium и ≥5 снов
  - `consume_free_deep_if_available(user_tg_id)` — списать бесплатный кредит, если доступен

## 🚀 Деплой и окружения

### Netlify Sites:
1. **Bot site** - основные функции API
2. **TMA site** - статические файлы TMA
3. **Web site** - статические файлы веб-приложения

### Environment Variables (ключевые)
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

### Диагностика и операции (обязательно к выполнению)

#### Проверка успешности деплоя
1. Просмотри логи последнего билда каждого сайта (Bot/Web/TMA) в Netlify — раздел Build logs. Не ориентируйся только на “current deploy ready”.
2. Через Netlify MCP получи сведения о проекте/деплое и окружении (быстро для чата/CLI).
3. Убедись, что у Web собрался Vite (alias `@` → `./src`), а у TMA нет синтаксических ошибок.

#### Проверка API и CORS
1. Прямой вызов функции (curl) — должен вернуть JSON и корректные CORS заголовки.
2. Если несколько Set‑Cookie — ответ должен использовать `multiValueHeaders.Set-Cookie` (а не массив в `headers`).
3. При ошибках 5xx зафиксируй `x-nf-request-id` и смотри логи функций в Netlify.

#### Проверка авторизации (Web)
1. Логин → JSON с токенами; последующие запросы — с Bearer.
2. Refresh: при 401 — POST `/refresh-token` с `{ refreshToken }` → новые токены в JSON.
3. Logout: POST `/logout` очищает куки через `multiValueHeaders.Set-Cookie` и завершает 200.

#### Проверка базы данных
1. Структура таблиц `users`, `analyses` и RPC (см. ниже). 
2. RPC `decrement_token_if_available(user_tg_id BIGINT) RETURNS BOOLEAN` должен существовать и уменьшать `users.tokens`.
3. Несоответствие UI/БД → проверить кэш: профиль инвалидируется после анализа; фронт после анализа вызывает `fetchProfile()`.

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

### ✅ Исправлено
1. **Web авторизация:** переведена на Bearer‑токены; `/web-login` и `/refresh-token` работают через JSON, куки — fallback; устранены ошибки Safari.
2. **Logout/502:** заголовки Set‑Cookie отдаются через `multiValueHeaders.Set-Cookie`, 502 устранены.
3. **Баланс токенов в UI:** после анализа инвалидируется кэш профиля; фронт обновляет профиль сразу.

### 📌 В работе
1. **TMA deep‑list:** итоговая валидация рендера `/analyses-history?type=deep`.
2. **Стабильность сети:** автоповторы для logout/refresh.

### 📌 Причины (по коду)
- **Web (Safari ITP и кросс‑доменные cookies):** httpOnly cookies, установленные функциями бот‑сайта, остаются сторонними для домена `bot.dreamstalk.ru` и блокируются (ITP). Прокси `/api/*` не меняет домен `Set-Cookie`, поэтому куки не становятся first‑party. Текущее решение с httpOnly cookies для кросс‑доменных функций в Safari не жизнеспособно без функций на самом домене Web.
- **TMA deep‑list:** данные сохраняются (видны в общей истории), но рендеринг списка «Глубокий анализ» пока требует синхронизации с `analyses-history?type=deep`.

### ✅ Частично работает
1. **TMA** — профиль и история загружаются; платеж Stars проходит; базовый анализ снов работает.
2. **Bot** — обработчики команд/платежа корректны; добавление кредита deep‑analysis реализовано на стороне бота.

### 🎯 Что исправляем в первую очередь
1. **Web авторизация — перейти на токены в заголовке для Web:**
   - Возвращать из `/web-login` JSON `{ success, accessToken, refreshToken }` вместо/в дополнение к httpOnly cookies.
   - В Web клиенте хранить `accessToken` (в памяти/нечувствительный cookie) и отправлять `Authorization: Bearer <token>` на `/api/user-profile`, `/api/analyses-history`, `/api/analyze-dream`.
   - Эндпойнты уже поддерживают `Authorization` (см. `user-profile.js`, `analyses-history.js`, `analyze-dream.js`).
   - Итог: убрать зависимость от кросс‑доменных httpOnly cookies, починить Safari.
2. **TMA deep‑list:** гарантировать загрузку `GET /analyses-history?type=deep` и отображение записей с `is_deep_analysis=true`.
3. **Бесплатный кредит для тестов:** выдать 1 бесплатный кредит пользователям с тарифом premium и ≥5 снов через `grant_free_deep_if_eligible`, списывать через `consume_free_deep_if_available`.

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

### Этап 1: Web авторизация — переход на Bearer токены
- В `bot/functions/web-login.js`: кроме Set‑Cookie, вернуть JSON `{ success, accessToken, refreshToken }`.
- В `web/src/utils/api.js`: для всех вызовов добавлять `Authorization: Bearer <accessToken>`; хранить токен в памяти/в cookie домена web (не httpOnly) и обновлять через `/api/refresh-token`.
- В `web/src/components/Login.vue`: после логина сохранять токен и вызывать `emit('login-success')`.
- Прокси `/api/*` оставить (для унификации домена запросов), но аутентификация — через заголовок.

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
- Убедиться, что применены:
  - `analyses.is_deep_analysis`, `analyses.deep_source`
  - `users.free_deep_analysis`, `users.free_deep_granted`
  - `grant_free_deep_if_eligible`, `consume_free_deep_if_available`
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
1. Списывание кредитов: сначала `consume_free_deep_if_available`, затем — `decrement_deep_analysis_credits_safe`.
2. Сохранение результата: запись в `analyses` с `is_deep_analysis=true`, `deep_source={...}`.
3. Отображение: `GET /analyses-history?type=deep` для вкладки «Глубокий анализ».
4. Уведомления: DM от бота о готовности глубокого анализа.

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
- ✅ Глубокий анализ в TMA работает (списывается бесплатный/платный кредит, результат сохраняется в `analyses`, показывается во вкладке «Глубокий анализ»)
- ✅ Web версия открывается, выполняется авторизация по Bearer токену; профиль/история загружаются
- ✅ Web версия показывает профиль пользователя
- ✅ Bot отвечает на команды /start и анализирует сны

### Мониторинг и отладка

#### 6.1 Логи для проверки:
- Netlify Functions Logs (каждого сайта)
- Supabase Dashboard → API Logs
- Browser DevTools → Network/Console

#### 6.2 Типичные ошибки (шпаргалка)
- 502 “invalid type for headers” → заменить `headers['Set-Cookie']` на `multiValueHeaders.Set-Cookie`.
- 401/403 → проверить Bearer/refresh, истечение токенов и инициализацию sessionStorage.
- CORS → сопоставить Origin с `ALLOWED_*_ORIGIN`, проверить echo Origin и Allow‑Credentials.
- DB → проверить RPC `decrement_token_if_available`, наличие нужных столбцов.
- UI видит старый баланс → проверить инвалидацию кэша и повторную загрузку профиля на фронте.

---

*Документ обновлен: $(date)*
*Версия: 2.0 - с планом исправления*

## 🧭 Итоги текущей сессии (2025‑08‑10)

### Что сделано
- **TMA / UI глубокого анализа**: уведомление внутри баннера; отдельная вкладка «Глубокий анализ»; корректная логика кнопок (выполнить/получить); обновление профиля/истории сразу после анализа; относительные даты по таймзоне пользователя; показ тегов‑символов (бейджи) и коротких заголовков, если они есть.
- **Backend API**:
  - `analyses-history`: добавлены `is_deep_analysis` и `deep_source` в выдачу для фронта.
  - `deep-analysis`: сохраняет результат с `is_deep_analysis=true`, записывает `deep_source.title` и `deep_source.tags` (при JSON‑ответе Gemini, иначе фолбэк).
  - `analyze-dream` (web): внедрён поток «JSON от Gemini → парс/ремонт → сохранение `deep_source.title/tags`». 
  - **Gemini‑сервис**: промпты `basic_json`/`deep_json`, парсинг JSON (включая ремонт при «мусоре»/fences), фолбэки, ограничение ретраев для deep.
- **Bot / Telegram**:
  - Исправлен вебхук: переход на `aws-lambda` (синхронный) и передача `context` → устранён 502.
  - Добавлена служебная функция `/.netlify/functions/set-webhook` (set/info, поддержка `?drop=1`).
  - Фолбэк в анализе бота: при сбое основного промпта используется упрощённый; как крайний случай — безопасный краткий текст (чтобы пользователь всегда получил ответ).
- **CORS/прочее**: убран кастомный заголовок `x-bypass-cache`; проверены и обновлены выборки в SQL; устранены ошибки с top‑level await.

### Нюансы стека и ограничения
- **Netlify Functions**: на текущем тарифе фактические лимиты по времени исполнения ~10 сек на запрос. Долгие операции (глубокий анализ) необходимо держать быстрыми или выносить в Background Function/очередь.
- **Вебхук Telegram**: чувствителен к типу хендлера и времени ответа. Для Netlify стабилен `webhookCallback(bot, 'aws-lambda')`.
- **Gemini**: может возвращать текст с «fences» и без строгого JSON. Нужны строгие промпты + парс/ремонт + фолбэк. Для deep ограничиваем ретраи и избегаем тяжёлых «ремонтов», чтобы не упираться в тайм‑лимиты.

### Оставшиеся задачи / next steps
- **Унифицировать бот‑ветку анализа** с web/TMA: использовать `basic_json` + парс/ремонт, сохранять `deep_source.title/tags` и для анализов из бота (сейчас фолбэки есть, но JSON не всегда применяется в бот‑ветке).
- При необходимости **выделить deep‑анализ** в Background Function и сделать UI‑поллинг до готовности.
- Доработать промпты (строго «только JSON»), снизить температуру/вариативность для стабильности.
- (Опционально) миграция БД: завести явную колонку `analyses.title` (вместо хранения в `deep_source`).
- Улучшить наблюдаемость: добавить структурные логи входящих апдейтов Telegram и ответы TG API; алёрты при 5xx/502.
