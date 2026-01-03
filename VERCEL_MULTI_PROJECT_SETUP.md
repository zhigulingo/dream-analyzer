# 🚀 Настройка нескольких проектов в Vercel

## Текущая ситуация

✅ **Bot проект** (`dream-analyzer`) - работает, деплоит функции из `bot/`

## Нужно создать еще 3 проекта:

1. **TMA** (Telegram Mini App) - фронтенд из `tma/`
2. **Web** (Веб-приложение) - фронтенд из `web/`
3. **Survey** (Опросник) - фронтенд + функции из `survey/`

---

## Проект 1: TMA (Telegram Mini App)

### Создание проекта:

1. **Vercel Dashboard** → **Add New** → **Project**
2. **Import Git Repository:**
   - Выберите `zhigulingo/dream-analyzer`
   - Нажмите **Import**

3. **Configure Project:**
   - **Project Name:** `dream-analyzer-tma`
   - **Framework Preset:** Vite (автоопределится)
   - **Root Directory:** `tma` ⚠️ **ВАЖНО!**
   - **Build Command:** `npm install && npm run build` (или оставить пустым - Vercel определит)
   - **Output Directory:** `dist`
   - **Install Command:** (оставить пустым)

4. **Environment Variables:**
   ```
   VITE_API_BASE_URL=https://dream-analyzer-seven.vercel.app/api
   ```
   (Замените на ваш реальный URL bot проекта)

5. **Deploy**

### Проверка:
- Откройте деплой → должен быть статус **Ready**
- Проверьте что файлы из `tma/dist/` задеплоены

---

## Проект 2: Web (Веб-приложение)

### Создание проекта:

1. **Vercel Dashboard** → **Add New** → **Project**
2. **Import Git Repository:**
   - Выберите `zhigulingo/dream-analyzer`
   - Нажмите **Import**

3. **Configure Project:**
   - **Project Name:** `dream-analyzer-web`
   - **Framework Preset:** Vite (автоопределится)
   - **Root Directory:** `web` ⚠️ **ВАЖНО!**
   - **Build Command:** `npm install && npm run build` (или оставить пустым)
   - **Output Directory:** `dist`
   - **Install Command:** (оставить пустым)

4. **Environment Variables:**
   ```
   VITE_API_BASE_URL=https://dream-analyzer-seven.vercel.app/api
   VITE_WEB_LOGIN_API_URL=https://dream-analyzer-seven.vercel.app/api/web-login
   VITE_REFRESH_TOKEN_API_URL=https://dream-analyzer-seven.vercel.app/api/refresh-token
   VITE_LOGOUT_API_URL=https://dream-analyzer-seven.vercel.app/api/logout
   ```
   (Замените на ваш реальный URL bot проекта)

5. **Deploy**

### Проверка:
- Откройте деплой → должен быть статус **Ready**
- Проверьте что файлы из `web/dist/` задеплоены

---

## Проект 3: Survey (Опросник)

### Создание проекта:

1. **Vercel Dashboard** → **Add New** → **Project**
2. **Import Git Repository:**
   - Выберите `zhigulingo/dream-analyzer`
   - Нажмите **Import**

3. **Configure Project:**
   - **Project Name:** `dream-analyzer-survey`
   - **Framework Preset:** Vite (автоопределится)
   - **Root Directory:** `survey` ⚠️ **ВАЖНО!**
   - **Build Command:** `npm install && npm run build` (или оставить пустым)
   - **Output Directory:** `dist`
   - **Install Command:** (оставить пустым)

4. **Environment Variables:**
   ```
   VITE_API_BASE_URL=https://dream-analyzer-seven.vercel.app/api
   ```
   (Замените на ваш реальный URL bot проекта)

5. **Если есть функции в survey:**
   - Проверьте структуру `survey/netlify/functions/`
   - Если есть функции, их нужно будет мигрировать в `survey/api/` (как мы делали для bot)

6. **Deploy**

### Проверка:
- Откройте деплой → должен быть статус **Ready**
- Проверьте что файлы из `survey/dist/` задеплоены

---

## Настройка Production Branch для каждого проекта

После создания проектов:

1. **Settings → Git → Production Branch:**
   - Для всех проектов: `vercel-export` (или `main` - как вам удобнее)

2. **Settings → General → Root Directory:**
   - Bot: `bot`
   - TMA: `tma`
   - Web: `web`
   - Survey: `survey`

---

## Обновление Environment Variables

После деплоя всех проектов, обновите `VITE_API_BASE_URL` в TMA и Web проектах:

1. Получите реальный URL bot проекта из Vercel Dashboard
2. Обновите переменные в каждом проекте:
   - **Settings → Environment Variables**
   - Измените `VITE_API_BASE_URL` на реальный URL

---

## Структура проектов в Vercel:

```
Vercel Dashboard:
├── dream-analyzer (bot)          Root: bot/
│   └── Functions: api/index.js
│
├── dream-analyzer-tma            Root: tma/
│   └── Static: dist/
│
├── dream-analyzer-web            Root: web/
│   └── Static: dist/
│
└── dream-analyzer-survey         Root: survey/
    └── Static: dist/
```

---

## Проверка после деплоя:

### TMA:
- Откройте URL проекта
- Проверьте что загружается Vue приложение
- Проверьте что API вызовы идут на bot проект

### Web:
- Откройте URL проекта
- Проверьте что загружается Vue приложение
- Проверьте что API вызовы идут на bot проект
- Проверьте авторизацию

### Survey:
- Откройте URL проекта
- Проверьте что загружается приложение
- Проверьте что API вызовы работают

---

## Полезные команды:

### Получить URL проекта:
```bash
# В Vercel Dashboard → Project → Settings → Domains
# Или в Overview → Deployment URL
```

### Локальное тестирование:
```bash
# TMA
cd tma
npm run dev

# Web
cd web
npm run dev

# Survey
cd survey
npm run dev
```

---

## Troubleshooting:

### Проблема: "Build failed"
- Проверьте Root Directory
- Проверьте Build Command
- Проверьте Output Directory
- Посмотрите Build Logs

### Проблема: "404 Not Found"
- Проверьте что `dist/` существует после сборки
- Проверьте Output Directory в настройках

### Проблема: "API calls fail"
- Проверьте `VITE_API_BASE_URL` в Environment Variables
- Проверьте что bot проект задеплоен и работает
- Проверьте CORS настройки в bot проекте

---

**Совет:** Создавайте проекты по одному, проверяйте каждый перед созданием следующего.
