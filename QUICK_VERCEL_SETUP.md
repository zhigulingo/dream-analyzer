# 🚀 Быстрый старт миграции на Vercel

## Шаг 1: Создать ветку (2 минуты)

```bash
git checkout -b vercel-migration
```

## Шаг 2: Запустить скрипт создания оберток (1 минута)

```bash
node scripts/create-vercel-wrappers.js
```

Этот скрипт:
- ✅ Создаст `bot/api/` директорию
- ✅ Скопирует `shared/` модули
- ✅ Создаст обертки для всех функций

## Шаг 3: Создать проекты в Vercel (5 минут)

1. Зайти на [vercel.com](https://vercel.com) → New Project
2. Подключить GitHub репозиторий
3. Создать 3 проекта:

### Bot проект:
- **Name:** `dream-analyzer-bot`
- **Root Directory:** `bot`
- **Framework Preset:** Other
- **Build Command:** (оставить пустым или `echo "Functions only"`)
- **Output Directory:** (оставить пустым)

### Web проект:
- **Name:** `dream-analyzer-web`
- **Root Directory:** `web`
- **Framework Preset:** Vite (автоопределится)
- **Build Command:** `npm install && npm run build`
- **Output Directory:** `dist`

### TMA проект:
- **Name:** `dream-analyzer-tma`
- **Root Directory:** `tma`
- **Framework Preset:** Vite
- **Build Command:** `npm install && npm run build`
- **Output Directory:** `dist`

## Шаг 4: Добавить Environment Variables (5 минут)

Для каждого проекта скопировать переменные из Netlify:

### Bot проект:
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
BOT_TOKEN=...
GEMINI_API_KEY=...
JWT_SECRET=...
REFRESH_SECRET=...
ALLOWED_TMA_ORIGIN=...
ALLOWED_WEB_ORIGIN=...
WEBHOOK_URL=... (обновить после деплоя)
```

### Web проект:
```
VITE_API_BASE_URL=https://dream-analyzer-bot.vercel.app/api
```

### TMA проект:
```
VITE_API_BASE_URL=https://dream-analyzer-bot.vercel.app/api
```

## Шаг 5: Деплой (автоматически)

Vercel автоматически задеплоит при push в ветку или можно вручную:

```bash
# Установить Vercel CLI
npm i -g vercel

# В директории bot/
cd bot
vercel --prod

# В директории web/
cd ../web
vercel --prod

# В директории tma/
cd ../tma
vercel --prod
```

## Шаг 6: Обновить Webhook URL

После деплоя Bot проекта:

1. Получить URL из Vercel Dashboard: `https://dream-analyzer-bot.vercel.app/api/bot`
2. Обновить `WEBHOOK_URL` в Environment Variables
3. Вызвать функцию set-webhook или через Telegram API:
   ```bash
   curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -d "url=https://dream-analyzer-bot.vercel.app/api/bot"
   ```

## Шаг 7: Тестирование

```bash
# Health check
curl https://dream-analyzer-bot.vercel.app/api/health

# Должен вернуть JSON с статусом
```

## Что дальше?

✅ **Если все работает** - можно начинать постепенную миграцию функций  
✅ **Если что-то не работает** - проверьте логи в Vercel Dashboard  
✅ **Постепенно мигрируйте функции** - по одной, заменяя обертки на нативные Vercel функции  

## Полезные команды

```bash
# Локальное тестирование с Vercel CLI
cd bot
vercel dev

# Просмотр логов
vercel logs

# Откат к предыдущему деплою
vercel rollback
```

## Структура после запуска скрипта

```
bot/
├── api/                          # Vercel Functions
│   ├── _netlify-adapter.js       # Адаптер (создан)
│   ├── health-check.js           # Обертка (создана)
│   ├── user-profile.js           # Обертка (создана)
│   ├── bot.js                    # Обертка (создана)
│   └── shared/                   # Скопировано из functions/
├── functions/                    # Оригинальные Netlify функции (не трогаем)
└── vercel.json                   # Конфигурация (создана)
```

## Troubleshooting

### Функции не работают?
- Проверьте, что `_netlify-adapter.js` существует в `bot/api/`
- Проверьте логи в Vercel Dashboard → Functions → Logs

### CORS ошибки?
- Проверьте `ALLOWED_TMA_ORIGIN` и `ALLOWED_WEB_ORIGIN` в Environment Variables
- Убедитесь, что origins указаны без trailing slash

### 404 на endpoints?
- Проверьте `vercel.json` rewrites
- Убедитесь, что функции находятся в `bot/api/`

### Environment variables не работают?
- Проверьте, что они добавлены в Vercel Dashboard
- Передеплойте проект после добавления переменных

---

**Время на настройку:** ~15-20 минут  
**Риск:** Минимальный (оригинальные функции не трогаем)  
**Откат:** Легкий (просто переключиться обратно на Netlify)
