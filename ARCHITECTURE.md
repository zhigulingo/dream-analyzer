# Dream Analyzer - Архитектура системы

## 📋 Общее описание

Dream Analyzer - это система анализа снов, состоящая из трех основных компонентов:
1. **Telegram Bot** - серверная часть с функциями
2. **TMA (Telegram Mini App)** - мини-приложение для Telegram
3. **Web приложение** - веб-интерфейс

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

## ⚠️ Известные проблемы

### Потенциальные issues:
1. **CORS настройки** - возможны проблемы между сайтами
2. **Environment variables** - не все переменные могут быть настроены
3. **Cache invalidation** - кеш может устареть
4. **JWT tokens expiration** - токены могут истечь

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

---

*Документ создан: $(date)*
*Версия: 1.0*