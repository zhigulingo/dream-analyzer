# Dream Analyzer - Полное руководство по проекту

> **Документ для работы с Droid AI**  
> Последнее обновление: 19 октября 2025

---

## 📑 Содержание

1. [Обзор проекта](#обзор-проекта)
2. [Технологический стек](#технологический-стек)
3. [Архитектура системы](#архитектура-системы)
4. [Структура файлов](#структура-файлов)
5. [Основные компоненты](#основные-компоненты)
6. [Backend функции](#backend-функции)
7. [Frontend компоненты](#frontend-компоненты)
8. [Интеграции](#интеграции)
9. [Глубокий анализ снов](#глубокий-анализ-снов)
10. [История изменений](#история-изменений)
11. [Как работать с проектом](#как-работать-с-проектом)

---

## Обзор проекта

**Dream Analyzer** - это система анализа снов с использованием AI (Google Gemini), состоящая из трех компонентов:

### Компоненты системы

1. **Telegram Bot** 
   - Grammy.js framework
   - Serverless functions (Netlify)
   - Webhook handler для взаимодействия с пользователями

2. **TMA (Telegram Mini App)**
   - Vue.js 3 приложение
   - Открывается внутри Telegram
   - Мобильный UX (без hover состояний)

3. **Web приложение**
   - Vue.js 3 веб-интерфейс
   - JWT авторизация
   - Desktop/Mobile адаптивность

### Основной функционал

- ✅ Анализ снов через Google Gemini AI
- ✅ История анализов (обычные + глубокие)
- ✅ Глубокий анализ 5 последних снов
- ✅ HVdC контентный анализ с демографическими нормами
- ✅ Визуализация динамики снов (графики)
- ✅ Система подписок (Telegram Stars)
- ✅ Кредиты на глубокий анализ
- ✅ Telegram уведомления

---

## Технологический стек

### Frontend
- **Framework:** Vue.js 3 (Composition API)
- **State Management:** Pinia
- **HTTP Client:** Axios
- **Build Tool:** Vite
- **Styling:** 
  - TailwindCSS (TMA)
  - CSS Modules (Web)
- **UI/UX:** Mobile-first (TMA), Responsive (Web)

### Backend
- **Runtime:** Node.js 20
- **Functions:** Netlify Serverless Functions
- **Bot Framework:** Grammy.js
- **AI Provider:** Google Gemini API
  - Model: `gemini-2.5-flash` (fallback: `gemini-2.0-flash`)
  - **Детерминированная генерация**: `temperature=0`, `topK=1`, `topP=0.1`
- **Authentication:**
  - JWT + httpOnly cookies (Web)
  - Telegram InitData validation (TMA)

### Database & Storage
- **Database:** Supabase (PostgreSQL)
- **Caching:** In-memory cache service
- **File Storage:** Netlify CDN

### Deployment
- **Hosting:** Netlify
  - Bot: `sparkling-cupcake-940504.netlify.app`
  - TMA: `tourmaline-eclair-9d40ea.netlify.app`
  - Web: `bot.dreamstalk.ru`
- **CI/CD:** Auto-deploy on git push
- **Testing:** Production testing approach

---

## Архитектура системы

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Users / Clients                         │
└─────────────┬───────────────┬───────────────┬───────────────┘
              │               │               │
       ┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
       │   Telegram  │ │ TMA (Vue)  │ │ Web (Vue)  │
       │     Bot     │ │   Client   │ │   Client   │
       └──────┬──────┘ └─────┬──────┘ └─────┬──────┘
              │               │               │
              │      HTTPS API Calls          │
              │               │               │
              └───────────────┼───────────────┘
                              │
                   ┌──────────▼──────────┐
                   │ Netlify Functions   │
                   │  (Backend Services) │
                   └──────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
       ┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
       │   Supabase  │ │  Gemini AI │ │  Telegram  │
       │  PostgreSQL │ │     API    │ │  Bot API   │
       └─────────────┘ └────────────┘ └────────────┘
```

### Data Flow: Dream Analysis

```
User → TMA/Web → analyze-dream.js → Gemini API → Database → Response
                      ↓
                Cache Service
                      ↓
                  HVdC Analysis
```

### Data Flow: Deep Analysis (Background)

```
User → TMA → deep-analysis.js → Trigger Background Job
                                        ↓
                             deep-analysis-background.js
                                        ↓
                                   Gemini API
                                   (15+ min)
                                        ↓
                              Save to Database
                                        ↓
                            Send Telegram Notification
```

---

## Структура файлов

### Root Structure

```
dream-analyzer/
├── bot/                    # Backend (Netlify Functions)
├── tma/                    # Telegram Mini App (Vue)
├── web/                    # Web Application (Vue)
├── scripts/                # Utility scripts
├── tests/                  # Test files
├── docs/                   # Documentation
├── coverage/               # Test coverage reports
├── netlify.toml           # Netlify configuration
├── package.json           # Root dependencies
└── PROJECT_GUIDE.md       # This file
```

### Backend Structure (`/bot`)

```
bot/
├── functions/
│   ├── analyze-dream.js              # Single dream analysis
│   ├── deep-analysis.js              # Trigger deep analysis (202 response)
│   ├── deep-analysis-background.js   # Long-running deep analysis
│   ├── user-profile.js               # Get user profile
│   ├── analyses-history.js           # Get analysis history
│   ├── create-invoice.js             # Telegram Stars payments
│   ├── claim-channel-token.js        # Channel reward
│   ├── bot.js                        # Telegram bot webhook
│   │
│   └── shared/
│       ├── auth/
│       │   └── telegram-validator.js  # InitData validation
│       │
│       ├── database/
│       │   └── queries.js             # Optimized DB queries
│       │
│       ├── services/
│       │   ├── gemini-service.js      # AI analysis (deterministic)
│       │   ├── hvdc-service.js        # HVdC content analysis
│       │   ├── cache-service.js       # Caching layer
│       │   └── embedding-service.js   # Text embeddings
│       │
│       ├── middleware/
│       │   ├── cors.js                # CORS headers
│       │   ├── error-handler.js       # Error processing
│       │   └── api-wrapper.js         # API response wrapper
│       │
│       ├── prompts/
│       │   └── dream-prompts.js       # Gemini prompts
│       │
│       └── utils/
│           └── logger.js              # Logging utility
│
├── auth-test.html         # Test page for auth
└── netlify.toml          # Function-specific config
```

### Frontend Structure (`/tma`)

```
tma/
├── src/
│   ├── components/
│   │   ├── AnalysisHistoryList.vue   # Main history with tabs
│   │   ├── DreamCard.vue              # Dream display card
│   │   ├── DeepAnalysisCard.vue       # Deep analysis trigger
│   │   ├── UserInfoCard.vue           # User info + credits
│   │   ├── DynamicsChart.vue          # HVdC visualization
│   │   ├── SymbolCard.vue             # Recurring symbols
│   │   └── Onboarding.vue             # First-time tour
│   │
│   ├── stores/
│   │   ├── user.js                    # User state + API calls
│   │   └── notifications.js           # Toast notifications
│   │
│   ├── services/
│   │   ├── api.js                     # Axios API client
│   │   └── errorService.js            # Error handling
│   │
│   ├── composables/
│   │   └── useOfflineDetection.js     # Network status
│   │
│   ├── views/
│   │   └── PersonalAccount.vue        # Main page
│   │
│   ├── App.vue                        # Root component
│   └── main.js                        # Entry point
│
├── public/                # Static assets
├── dist/                  # Build output
├── package.json          # Dependencies
├── vite.config.js        # Vite config
└── netlify.toml          # Deploy config
```

---

## Основные компоненты

### 1. Gemini Service (AI Core)

**Файл:** `bot/functions/shared/services/gemini-service.js`

**Ключевые особенности:**
- Singleton pattern для инициализации
- Retry mechanism с exponential backoff
- Model fallback chain: `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-1.5-flash`
- **Детерминированная генерация** (одинаковые сны → одинаковый результат):
  ```javascript
  generationConfig: {
      temperature: 0,     // Deterministic output
      topK: 1,           // Only most probable token
      topP: 0.1,         // Minimal randomness
  }
  ```
- Кэширование результатов (1-2 часа TTL)
- JSON structured output parsing

**Основные методы:**
- `analyzeDream(dreamText, promptKey)` - анализ одного сна
- `deepAnalyzeDreamsJSON(combinedDreams, useFast)` - глубокий анализ 5 снов
- `analyzeDreamJSON(dreamText)` - анализ с JSON парсингом

**Промпты:**
- `basic_json` - обычный анализ
- `deep_json` - полный глубокий анализ (35-45 сек)
- `deep_json_fast` - быстрый анализ (15-20 сек)

### 2. HVdC Service (Content Analysis)

**Файл:** `bot/functions/shared/services/hvdc-service.js`

**Функционал:**
- Контентный анализ по методологии Hall & Van de Castle
- Категории: Персонажи, Эмоции, Действия, Сцены
- Процентное соотношение (0-100%)
- Демографические нормы (мужчины/женщины)
- Сравнение с нормативами

**Интеграция:**
```javascript
const hvdcResult = await hvdcService.analyzeWithDemographics(
    dreamText, 
    userDemographics
);
```

### 3. User Store (State Management)

**Файл:** `tma/src/stores/user.js`

**Основной state:**
```javascript
{
    profile: {
        tokens: Number,
        subscription_type: String,
        deep_analysis_credits: Number,
        deep_analyses_count: Number,
        total_dreams_count: Number,
    },
    history: Array,
    deepAnalysisProcessing: Boolean,  // Фоновая обработка
    deepAnalysisSuccess: Boolean,
    deepAnalysisError: String,
}
```

**Ключевые actions:**
- `fetchProfile()` - загрузка профиля
- `fetchHistory()` - загрузка истории
- `performDeepAnalysis()` - запуск глубокого анализа
- `startDeepAnalysisPolling()` - проверка готовности анализа

**UX оптимизации:**
- Нет частых обновлений страницы
- Polling обновляет только при появлении нового анализа
- Баннерные сообщения вместо snackbar

---

## Backend функции

### Основные Endpoints

#### 1. `analyze-dream.js`
**Purpose:** Анализ одного сна

**Request:**
```javascript
POST /analyze-dream
Headers: {
    'X-Telegram-Init-Data': <telegram_init_data>
}
Body: {
    dreamText: String
}
```

**Response:**
```javascript
{
    title: String,          // 2-3 слова
    tags: [String],         // 3-5 тегов
    analysis: String,       // Полный анализ
    hvdc: {                 // HVdC анализ
        characters: Number,
        emotions: Number,
        actions: Number,
        settings: Number,
        demographics: {...}
    }
}
```

#### 2. `deep-analysis.js`
**Purpose:** Инициация глубокого анализа 5 снов

**Flow:**
1. Проверка кредитов (платные или бесплатный)
2. Списание кредита
3. Получение 5 последних снов
4. Trigger background function
5. **Возврат 202 Accepted** (не ждет завершения)

**Request:**
```javascript
POST /deep-analysis
Headers: {
    'X-Telegram-Init-Data': <telegram_init_data>
}
```

**Response (202):**
```javascript
{
    processing: true,
    message: "Глубокий анализ запущен в фоновом режиме"
}
```

#### 3. `deep-analysis-background.js`
**Purpose:** Long-running deep analysis (до 15 минут)

**Process:**
1. Получает combinedDreamsText из trigger
2. Вызывает Gemini с полным `deep_json` промптом
3. Парсит структурированный JSON
4. Сохраняет в БД (таблица `deep_analyses`)
5. Отправляет Telegram уведомление с deep link

**Output Structure:**
```javascript
{
    title: String,
    tags: [String],
    analysis: String,
    symbolsIntro: String,
    recurringSymbols: [
        {
            symbol: String,
            frequency: Number,      // 2-5 (из 5 снов)
            description: String,
            userContext: String
        }
    ],
    dynamicsContext: [
        {
            category: "Персонажи" | "Эмоции" | "Действия" | "Сцены",
            values: [Number],       // 5 значений (0-100%)
            analysis: String,
            insight: String
        }
    ],
    conclusion: {
        periodThemes: String,
        dreamFunctionsAnalysis: String,
        psychologicalSupport: String,
        integrationExercise: {
            title: String,
            description: String,
            rationale: String
        }
    }
}
```

#### 4. `user-profile.js`
**Purpose:** Получение профиля пользователя

**Response:**
```javascript
{
    id: Number,
    telegram_user_id: Number,
    tokens: Number,
    subscription_type: String,
    subscription_end: Date,
    deep_analysis_credits: Number,
    free_deep_analysis: Number,
    deep_analyses_count: Number,
    total_dreams_count: Number,
    onboarding_stage: String
}
```

#### 5. `create-invoice.js`
**Purpose:** Создание Telegram Stars invoice

**Request:**
```javascript
POST /create-invoice
Body: {
    plan: "premium" | "deep_analysis",
    duration: Number,        // Месяцы (для подписки)
    amount: Number,          // Звезды
    payload: String          // Unique identifier
}
```

---

## Frontend компоненты

### 1. AnalysisHistoryList.vue

**Назначение:** Главный компонент истории с табами

**Структура:**
```vue
<template>
  <!-- Табы для переключения -->
  <div class="tabs">
    <button @click="switchTab('history')">
      Дневник снов
    </button>
    <button @click="switchTab('deep')">
      Глубокий анализ
    </button>
  </div>
  
  <!-- Контент вкладок -->
  <div v-if="activeTab === 'history'">
    <DreamCard v-for="dream in regularDreams" />
  </div>
  
  <div v-else-if="activeTab === 'deep'">
    <DreamCard v-for="dream in deepAnalyses" />
  </div>
</template>
```

**Особенности UI:**
- Активный таб: белый текст + подчеркивание снизу
- Неактивный таб: затемненный (40% opacity)
- Плавные transition анимации (200ms)
- Haptic feedback при переключении

### 2. DreamCard.vue

**Назначение:** Отображение одного сна или глубокого анализа

**Режимы:**
1. **Обычный сон:**
   - Заголовок
   - Теги
   - Анализ
   - HVdC график (если есть)

2. **Глубокий анализ:**
   - Заголовок
   - Символы (collapsible block)
   - Динамика (DynamicsChart)
   - Заключение (collapsible block)

**Структура блоков:**
```vue
<!-- Символы -->
<div class="collapsible-block">
  <h4>Повторяющиеся символы</h4>
  <ul>
    <li v-for="symbol in recurringSymbols">
      <span class="frequency">×{{ symbol.frequency }}</span>
      {{ symbol.symbol }}
      <p>{{ symbol.description }}</p>
      <p>{{ symbol.userContext }}</p>
    </li>
  </ul>
</div>

<!-- Динамика -->
<DynamicsChart :data="dynamicsContext" />

<!-- Заключение -->
<div class="collapsible-block">
  <div>{{ conclusion.periodThemes }}</div>
  <div>{{ conclusion.dreamFunctionsAnalysis }}</div>
  <div>{{ conclusion.psychologicalSupport }}</div>
  <div>{{ conclusion.integrationExercise }}</div>
</div>
```

### 3. DynamicsChart.vue

**Назначение:** Визуализация динамики по HVdC категориям

**Особенности:**
- Pagination с swipe навигацией
- 4 графика (Персонажи, Эмоции, Действия, Сцены)
- Демографические зоны (желтые полосы)
- Dynamic Y-axis масштабирование
- Подписи с анализом и insights

**Props:**
```vue
props: {
  data: Array<{
    category: String,
    values: Array<Number>,      // 5 точек
    analysis: String,
    insight: String
  }>,
  demographics: Object
}
```

### 4. DeepAnalysisCard.vue

**Назначение:** Баннер для запуска глубокого анализа

**Состояния:**
1. **Доступен анализ:**
   - Кнопка "Выполнить анализ" (если есть кредиты)
   - Кнопка "Получить анализ (1 ⭐️)" (если нет кредитов)

2. **Обработка:** 
   - Баннер с индикатором загрузки
   - "Анализ запущен! Вы получите уведомление..."

3. **Готов:**
   - Зеленый баннер "Глубокий анализ готов!"

4. **Ошибка:**
   - Красный баннер с описанием ошибки

**UX improvements:**
- Без snackbar уведомлений
- Только баннерные сообщения
- Нет частых обновлений страницы
- Polling обновляет только при готовности

---

## Интеграции

### 1. Telegram Bot API

**Grammy.js Framework**

**Webhook URL:** `https://sparkling-cupcake-940504.netlify.app/bot`

**Обработчики:**
- `/start` - приветствие и регистрация
- Text message - анализ сна
- Payment handlers - обработка Telegram Stars

**Уведомления:**
```javascript
bot.api.sendMessage(chatId, message, {
    parse_mode: 'HTML',
    reply_markup: {
        inline_keyboard: [[{
            text: 'Открыть анализ',
            url: tmaDeepLink
        }]]
    }
});
```

### 2. Telegram Mini Apps (TMA)

**InitData Validation:**
```javascript
// bot/functions/shared/auth/telegram-validator.js
const validationResult = validateTelegramData(initDataHeader, BOT_TOKEN);

if (!validationResult.valid) {
    throw new Error('Invalid InitData');
}

const userId = validationResult.data.id;
```

**Frontend Integration:**
```javascript
// tma/src/main.js
const tg = window.Telegram?.WebApp;
tg.ready();
tg.expand();

// API calls with InitData
axios.defaults.headers.common['X-Telegram-Init-Data'] = tg.initData;
```

### 3. Supabase Database

**Schema (основные таблицы):**

```sql
-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_user_id BIGINT UNIQUE,
    tokens INTEGER DEFAULT 1,
    subscription_type VARCHAR DEFAULT 'free',
    subscription_end TIMESTAMP,
    deep_analysis_credits INTEGER DEFAULT 0,
    free_deep_analysis INTEGER DEFAULT 1,
    deep_analyses_count INTEGER DEFAULT 0,
    total_dreams_count INTEGER DEFAULT 0
);

-- Dreams (single analyses)
CREATE TABLE dreams (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    dream_text TEXT,
    title VARCHAR(100),
    tags VARCHAR[],
    analysis TEXT,
    hvdc_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Deep Analyses
CREATE TABLE deep_analyses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    deep_source JSONB,              -- Full structured output
    dreams_analyzed INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Оптимизированные запросы:**
```javascript
// Получение последних N снов
const { data: dreams } = await supabase
    .from('dreams')
    .select('id, dream_text, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);
```

**RPC функции:**
```sql
-- Списание кредита
CREATE OR REPLACE FUNCTION decrement_deep_analysis_credits_safe(user_tg_id BIGINT)
RETURNS TABLE(success BOOLEAN, remaining_credits INTEGER);

-- Откат кредита при ошибке
CREATE OR REPLACE FUNCTION increment_deep_analysis_credits(user_tg_id BIGINT, amount INTEGER)
RETURNS VOID;
```

### 4. Google Gemini AI

**Model Configuration:**
```javascript
const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
        temperature: 0,      // Детерминированность
        topK: 1,
        topP: 0.1,
    }
});
```

**Основные промпты** (`bot/functions/shared/prompts/dream-prompts.js`):

**basic_json** - Анализ одного сна:
```javascript
{
    title: "2-3 слова",
    tags: ["тег1", "тег2", "тег3"],
    analysis: "2-4 параграфа анализа"
}
```

**deep_json** - Глубокий анализ 5 снов:
```javascript
{
    title: String,
    tags: [String],
    analysis: String,
    symbolsIntro: String,
    recurringSymbols: [...],
    dynamicsContext: [...],
    conclusion: {...}
}
```

**Ключевые требования в промпте:**
- ОБЯЗАТЕЛЬНО ВСЕ 4 категории HVdC
- Процентное соотношение (0-100) для каждого сна
- Частота символов ≥ 2 из 5 снов
- Эмпатичный тон без морализации

---

## Глубокий анализ снов

### Полный Flow

```
1. Пользователь → Нажимает "Выполнить анализ"
   ↓
2. TMA → performDeepAnalysis()
   ↓
3. API /deep-analysis
   ├─ Проверка кредитов
   ├─ Списание кредита
   ├─ Получение 5 последних снов
   ├─ Объединение текстов (от старого к новому)
   └─ Trigger background function
   ↓
4. Return 202 Accepted
   ├─ deepAnalysisProcessing = true
   └─ Start polling (каждые 10 сек)
   ↓
5. Background function (deep-analysis-background.js)
   ├─ Вызов Gemini API (35-45 сек)
   ├─ Парсинг JSON структуры
   ├─ Сохранение в БД
   └─ Отправка Telegram уведомления
   ↓
6. Polling обнаруживает новый анализ
   ├─ deep_analyses_count увеличился
   ├─ Обновление истории (fetchHistory)
   └─ deepAnalysisSuccess = true
   ↓
7. Пользователь видит готовый анализ
```

### Background Processing

**Netlify Functions Timeout:**
- Обычные функции: 10-26 секунд
- Background функции: до **15 минут**

**Конфигурация** (`netlify.toml`):
```toml
[functions]
  directory = "bot/functions"
  node_bundler = "esbuild"

[[functions]]
  path = "/deep-analysis-background"
  schedule = "manual"
```

**Trigger механизм:**
```javascript
// deep-analysis.js
const backgroundUrl = `${NETLIFY_FUNCTIONS_URL}/deep-analysis-background`;
await fetch(backgroundUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        tgUserId,
        userDbId,
        chatId,
        combinedDreamsText,
        requiredDreams: 5,
        usedFree
    })
});
```

### Credit System

**Типы кредитов:**
1. **Бесплатный кредит:** `free_deep_analysis = 1` (выдается при 5 снах)
2. **Платные кредиты:** `deep_analysis_credits` (покупка за 1 ⭐️)

**Rollback при ошибке:**
```javascript
try {
    const analysis = await geminiService.deepAnalyzeDreamsJSON(...);
    // Сохранение в БД
} catch (error) {
    // Rollback кредита
    if (usedFree) {
        await supabase.rpc('restore_free_deep_credit', { user_tg_id });
    } else {
        await supabase.rpc('increment_deep_analysis_credits', { 
            user_tg_id, 
            amount: 1 
        });
    }
    throw error;
}
```

### UX Optimizations (Последнее обновление)

**Проблема:** Частые обновления страницы после нажатия кнопки

**Решение:**
1. **Убрана немедленная fetchProfile()** после запуска
2. **Polling использует getUserProfileFresh()** вместо полного fetchProfile()
3. **История обновляется только** когда `deep_analyses_count` увеличился
4. **Удалены snackbar уведомления** - только баннерные сообщения
5. **Флаг deepAnalysisProcessing** для отслеживания состояния

```javascript
// До
performDeepAnalysis() {
    await api.getDeepAnalysis();
    await this.fetchProfile();        // ❌ Обновление сразу
    this.notificationStore.success(); // ❌ Snackbar
}

// После
performDeepAnalysis() {
    await api.getDeepAnalysis();
    this.deepAnalysisProcessing = true;  // ✅ Флаг состояния
    this.startDeepAnalysisPolling();     // ✅ Polling
}

startDeepAnalysisPolling() {
    setInterval(async () => {
        const { data: freshProfile } = await api.getUserProfileFresh();
        if (freshProfile.deep_analyses_count > initialCount) {
            await this.fetchHistory();       // ✅ Обновление только здесь
            this.deepAnalysisSuccess = true; // ✅ Баннер
            this.deepAnalysisProcessing = false;
        }
    }, 10000);
}
```

---

## История изменений

### Октябрь 2025

#### 19.10.2025 - Session 3: UX Improvements & Documentation

**1. Детерминированная генерация в Gemini API** (PR #8)
- **Проблема:** Одинаковые 5 снов давали разные результаты при повторном анализе
- **Причина:** Дефолтные настройки Gemini (temperature > 0) - случайная генерация
- **Решение:**
  ```javascript
  generationConfig: {
      temperature: 0,      // Детерминированный вывод
      topK: 1,            // Только самый вероятный токен
      topP: 0.1,          // Минимальная случайность
  }
  ```
- **Результат:** Воспроизводимые и стабильные анализы
- **Тесты:** ✅ 28/28 passed

**2. Обновление UI истории - Табы вместо селектора** (PR #9)
- **Референс:** Минималистичный дизайн с подчеркиванием активного таба
- **Изменения:**
  - Удален заголовок "История" + dropdown селектор
  - Добавлены горизонтальные табы: "Дневник снов" | "Глубокий анализ"
  - Активный таб: белый цвет + подчеркивание (0.5px)
  - Неактивный таб: затемненный (40% opacity) + hover (60%)
  - Плавные transition анимации (200ms)
- **Файлы:** `tma/src/components/AnalysisHistoryList.vue`

**3. Документация проекта**
- Создан `PROJECT_GUIDE.md` - comprehensive руководство
- Собрана информация из всех предыдущих сессий
- Документированы все компоненты, функции, интеграции
- История изменений и best practices

#### 18.10.2025 - Session 2: Deep Analysis Optimization

**1. Background Functions для глубокого анализа**
- **Проблема:** Netlify Functions timeout (10-26 сек) vs Gemini время ответа (35-45 сек)
- **Решение:** Архитектура с background функциями (до 15 минут)
  - `deep-analysis.js` - trigger (202 Accepted)
  - `deep-analysis-background.js` - long-running processing
- **Механизм:**
  - Немедленный возврат 202
  - Background обработка
  - Telegram уведомление при готовности
  - Polling на фронтенде для обновления

**2. Credit Rollback механизм**
- SQL функции для возврата кредитов при ошибках:
  - `increment_deep_analysis_credits(user_tg_id, amount)`
  - `restore_free_deep_credit(user_tg_id)`
- Автоматический rollback при сбое Gemini API

**3. Улучшение структуры контента**
- **Новые поля в deep_json:**
  - `symbolsIntro` - вводный текст о символах
  - `recurringSymbols` - массив с frequency, description, userContext
  - `dynamicsContext` - категории HVdC с analysis и insight
  - `conclusion` - единый блок с темами, функциями, поддержкой, упражнением
- **UI компоненты:**
  - Collapsible blocks для символов и заключения
  - DynamicsChart с pagination и swipe
  - Персонализированный контекст

**4. Фиксы UI и данных**
- Исправлен масштаб dynamicsContext: 0-10 → 0-100% (HVdC методология)
- Добавлена динамическая Y-axis масштабирование на графиках
- Унифицированы стили блоков глубокого анализа
- Добавлены демографические зоны на графиках

**5. UX оптимизация**
- Удалены частые обновления страницы после кнопки
- Polling обновляет только при появлении нового анализа
- Убраны snackbar уведомления → только баннеры
- Флаг `deepAnalysisProcessing` для отслеживания состояния

#### Ранее (из предыдущих сессий)

**Базовая функциональность:**
- ✅ Интеграция Telegram Bot (Grammy.js)
- ✅ TMA и Web приложения (Vue.js)
- ✅ Google Gemini AI для анализа снов
- ✅ HVdC контентный анализ
- ✅ Supabase база данных
- ✅ Система подписок (Telegram Stars)
- ✅ JWT авторизация для Web
- ✅ Cache система
- ✅ Error handling и logging

---

## Как работать с проектом

### Для Droid AI

**При получении задачи:**

1. **Изучите контекст:**
   - Проверьте `PROJECT_GUIDE.md` (этот файл)
   - Посмотрите `ARCHITECTURE.md` для деталей архитектуры
   - Изучите связанные компоненты

2. **Структура ответа:**
   ```
   1. Анализ задачи
   2. План изменений (TODO list)
   3. Поиск релевантных файлов
   4. Внесение изменений
   5. Тестирование (npm run build)
   6. Создание PR с описанием
   7. Merge в main
   ```

3. **Best Practices:**
   - ✅ Всегда создавайте feature branch
   - ✅ Запускайте build тесты перед PR
   - ✅ Создавайте информативные PR описания
   - ✅ Обновляйте документацию при значимых изменениях
   - ✅ Используйте TODO list для отслеживания прогресса
   - ✅ Merge в main после успешного build

4. **Частые задачи:**

   **Изменение UI компонента:**
   ```bash
   1. git checkout -b feature/ui-update
   2. Изменить tma/src/components/ComponentName.vue
   3. cd tma && npm run build
   4. git add + commit + push
   5. gh pr create + merge
   ```

   **Обновление Backend функции:**
   ```bash
   1. git checkout -b feature/backend-update
   2. Изменить bot/functions/function-name.js
   3. Если нужно, обновить shared services
   4. npm test (если есть тесты)
   5. git add + commit + push + PR
   ```

   **Изменение промпта Gemini:**
   ```bash
   1. Изменить bot/functions/shared/prompts/dream-prompts.js
   2. Проверить совместимость с парсингом JSON
   3. Деплой → тестирование на production
   ```

### Типичные сценарии

**Сценарий 1: Добавление нового поля в deep analysis**
```javascript
// 1. Обновить промпт
bot/functions/shared/prompts/dream-prompts.js
// Добавить поле в структуру deep_json

// 2. Обновить парсинг
bot/functions/deep-analysis-background.js
// Сохранить новое поле в deep_source

// 3. Обновить frontend
tma/src/components/DreamCard.vue
// Отобразить новое поле в UI
```

**Сценарий 2: Изменение стиля компонента**
```javascript
// 1. Найти компонент
tma/src/components/ComponentName.vue

// 2. Изменить CSS/Tailwind классы
<div class="new-classes">

// 3. Build test
cd tma && npm run build

// 4. Deploy через PR
```

**Сценарий 3: Оптимизация производительности**
```javascript
// 1. Идентифицировать узкое место
// - Gemini API время ответа
// - Размер запросов
// - Кэширование

// 2. Применить решение
// - Background functions
// - Увеличить TTL кэша
// - Уменьшить payload

// 3. Мониторинг
// - Проверить логи Netlify Functions
// - Измерить время ответа
```

### Debugging

**Backend (Netlify Functions):**
```bash
# Логи в Netlify Dashboard
https://app.netlify.com/sites/sparkling-cupcake-940504/logs

# Поиск ошибок
console.error('[FunctionName]', error);
```

**Frontend (TMA):**
```javascript
// Browser DevTools в Telegram Desktop
// Или используйте console.log
console.log('[Component]', data);
```

**Database (Supabase):**
```sql
-- Проверить таблицы
SELECT * FROM users WHERE telegram_user_id = XXX;
SELECT * FROM deep_analyses ORDER BY created_at DESC LIMIT 5;
```

### Полезные команды

```bash
# Frontend build
cd tma && npm run build
cd web && npm run build

# Тесты
npm test
npm test -- tests/gemini-service.test.js

# Git workflow
git checkout -b feature/name
git add .
git commit -m "feat: description"
git push -u origin feature/name
gh pr create --title "Title" --body "Description" --base main
gh pr merge NUMBER --merge --delete-branch

# Netlify CLI (если настроен)
netlify functions:list
netlify functions:invoke function-name
```

---

## Дополнительные ресурсы

### Документация
- `ARCHITECTURE.md` - Детальная архитектура
- `QUICK_START_GUIDE.md` - Быстрый старт
- `ERROR_HANDLING_GUIDE.md` - Обработка ошибок
- `DEPLOYMENT_INSTRUCTIONS.md` - Инструкции по деплою

### API Документация
- Gemini AI: https://ai.google.dev/docs
- Grammy.js: https://grammy.dev/
- Telegram Bot API: https://core.telegram.org/bots/api
- Telegram Mini Apps: https://core.telegram.org/bots/webapps
- Supabase: https://supabase.com/docs
- Netlify Functions: https://docs.netlify.com/functions/overview/

### Мониторинг
- Netlify Dashboard: https://app.netlify.com/
- Supabase Dashboard: https://supabase.com/dashboard
- Telegram Bot: @BotFather

---

## Заключение

Этот документ содержит всю необходимую информацию для работы с проектом **Dream Analyzer**. При добавлении новых функций или значительных изменений - обновляйте этот документ.

**Для Droid AI:** Используйте этот документ как reference при работе с проектом. Все основные паттерны, структуры и best practices описаны здесь.

**Последнее обновление:** 19.10.2025  
**Версия:** 1.0  
**Автор:** Droid AI + Gleb Zhigulin
