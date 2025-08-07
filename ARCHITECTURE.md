# Dream Analyzer - Архитектура системы

## 📋 Общее описание

Dream Analyzer - это система анализа снов, состоящая из трех основных компонентов:
1. **Telegram Bot** - серверная часть с функциями (Grammy.js)
2. **TMA (Telegram Mini App)** - мини-приложение для Telegram (Vue.js)
3. **Web приложение** - веб-интерфейс (Vue.js)

## 🛠 Технологический стек

### Разработка и развертывание:
- **IDE:** Cursor с Claude-4-Sonnet для написания и редактирования кода
- **VCS:** GitHub монорепозиторий для версионирования
- **Хостинг:** Netlify (3 отдельных приложения)
  - Bot: `sparkling-cupcake-940504.netlify.app` (API functions)
  - TMA: `tourmaline-eclair-9d40ea.netlify.app` (статические файлы)
  - Web: `bot.dreamstalk.ru` (статические файлы)
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
- **CI/CD:** Автоматический деплой после push в GitHub
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

### 🚫 Не работает:
1. **Web версия** - отсутствуют переменные окружения в Vite конфиге
2. **Глубокий анализ в TMA** - не настроен API URL в конфигурации
3. **RPC функции в Supabase** - возможно не применены из setup.sql

### ✅ Частично работает:
1. **TMA основной функционал** - обычный анализ снов работает
2. **Bot функции** - базовые операции выполняются
3. **База данных** - подключение есть, но оптимизированные запросы могут не работать

### 🎯 Приоритетные проблемы:
1. **Переменные окружения** - основная причина проблем
2. **Конфигурация Vite** - неправильные настройки сборки
3. **Supabase RPC** - отсутствуют оптимизированные функции

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

## 🔧 ПЛАН ИСПРАВЛЕНИЯ ПРОБЛЕМ

### Этап 1: Исправление конфигураций Vite

#### 1.1 Исправить web/vite.config.js
```javascript
// Добавить define секцию с переменными окружения
define: {
  'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
    process.env.VITE_API_BASE_URL || 'https://sparkling-cupcake-940504.netlify.app/.netlify/functions'
  ),
  'import.meta.env.VITE_WEB_LOGIN_API_URL': JSON.stringify(
    process.env.VITE_WEB_LOGIN_API_URL || 'https://sparkling-cupcake-940504.netlify.app/.netlify/functions/web-login'
  ),
  'import.meta.env.VITE_REFRESH_TOKEN_API_URL': JSON.stringify(
    process.env.VITE_REFRESH_TOKEN_API_URL || 'https://sparkling-cupcake-940504.netlify.app/.netlify/functions/refresh-token'
  ),
  'import.meta.env.VITE_LOGOUT_API_URL': JSON.stringify(
    process.env.VITE_LOGOUT_API_URL || 'https://sparkling-cupcake-940504.netlify.app/.netlify/functions/logout'
  )
}
```

#### 1.2 Исправить tma/vite.config.js
```javascript
// Добавить define секцию с API URL
define: {
  'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
    process.env.VITE_API_BASE_URL || 'https://sparkling-cupcake-940504.netlify.app/.netlify/functions'
  )
}
```

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

### Этап 3: Настройка базы данных Supabase

#### 3.1 Применить RPC функции
1. Открыть Supabase Dashboard → SQL Editor
2. Скопировать содержимое `bot/functions/shared/database/setup.sql`
3. Выполнить SQL скрипт для создания всех RPC функций

#### 3.2 Проверить структуру таблиц
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
1. Коммит изменений в GitHub
2. Дождаться автоматического деплоя всех трех сайтов
3. Проверить TMA: глубокий анализ должен работать
4. Проверить Web: авторизация и основной функционал
5. Проверить Bot: команды должны работать корректно

#### 5.2 Критерии успеха:
- ✅ TMA загружается и показывает данные пользователя
- ✅ Глубокий анализ в TMA работает после покупки
- ✅ Web версия открывается и позволяет авторизоваться
- ✅ Web версия показывает профиль пользователя
- ✅ Bot отвечает на команды /start и анализирует сны

### Этап 6: Мониторинг и отладка

#### 6.1 Логи для проверки:
- Netlify Functions Logs (каждого сайта)
- Supabase Dashboard → API Logs
- Browser DevTools → Network/Console

#### 6.2 Типичные ошибки:
- CORS errors → проверить ALLOWED_*_ORIGIN переменные
- 401/403 errors → проверить токены и секреты
- Database errors → проверить RPC функции в Supabase
- Environment variable undefined → проверить Netlify settings

---

*Документ обновлен: $(date)*
*Версия: 2.0 - с планом исправления*